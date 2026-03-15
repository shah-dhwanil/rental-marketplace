-- V4: Delivery addresses, encrypted payment methods, promo codes (multi-scope), wishlists

-- -----------------------------------------------------------------------
-- 1. Delivery addresses (customer-owned, location required)
-- -----------------------------------------------------------------------
CREATE TABLE addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name            VARCHAR(64) NOT NULL,                -- e.g. "Home", "Office"
    person_name     VARCHAR(64) NOT NULL,
    contact_no      VARCHAR(15) NOT NULL,
    address         TEXT NOT NULL,
    city            VARCHAR(64) NOT NULL,
    pincode         VARCHAR(6) NOT NULL,
    location        GEOGRAPHY(Point, 4326) NOT NULL,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_customer ON addresses (customer_id) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_addresses_updated_at
    BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- -----------------------------------------------------------------------
-- 2. Stored payment methods
--    `details` is BYTEA — encrypted XChaCha20-Poly1305 ciphertext of JSON blob.
--    `display_label` is the non-sensitive preview shown in the UI (e.g. "•••• 4242").
-- -----------------------------------------------------------------------
CREATE TABLE stored_payment_methods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type            VARCHAR(32) NOT NULL,        -- 'card' | 'upi' | 'net_banking' | 'wallet'
    display_label   VARCHAR(64) NOT NULL,        -- safe preview, stored plain
    details         BYTEA NOT NULL,              -- encrypted JSON; never plain text
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_type_chk CHECK (type IN ('card', 'upi', 'net_banking', 'wallet'))
);

CREATE INDEX idx_payment_methods_customer ON stored_payment_methods (customer_id) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_payment_methods_updated_at
    BEFORE UPDATE ON stored_payment_methods
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- -----------------------------------------------------------------------
-- 3. Promo codes
--    Three scopes:
--      'product'  — tied to a specific product (vendor-owned; product_id required)
--      'vendor'   — applies to all products of a vendor (vendor_id required)
--      'platform' — admin-created; applies platform-wide (both ids null)
-- -----------------------------------------------------------------------
CREATE TABLE promo_codes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code             VARCHAR(32) NOT NULL,
    scope            VARCHAR(16) NOT NULL,        -- 'product' | 'vendor' | 'platform'
    product_id       UUID REFERENCES products(id) ON DELETE CASCADE,
    vendor_id        UUID REFERENCES vendors(id) ON DELETE CASCADE,
    discount_type    VARCHAR(16) NOT NULL,        -- 'percentage' | 'fixed'
    discount_value   NUMERIC(10,2) NOT NULL,
    min_order_value  NUMERIC(10,2),              -- NULL = no minimum
    max_discount     NUMERIC(10,2),              -- NULL = no cap (meaningful for percentage)
    valid_from       TIMESTAMPTZ NOT NULL,
    valid_until      TIMESTAMPTZ NOT NULL,
    max_uses         INT,                         -- NULL = unlimited
    uses_count       INT NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT promo_scope_chk CHECK (scope IN ('product', 'vendor', 'platform')),
    CONSTRAINT promo_discount_type_chk CHECK (discount_type IN ('percentage', 'fixed')),
    CONSTRAINT promo_discount_value_pos CHECK (discount_value > 0),
    -- scope-referential integrity
    CONSTRAINT promo_product_scope_chk CHECK (scope != 'product' OR product_id IS NOT NULL),
    CONSTRAINT promo_vendor_scope_chk  CHECK (scope != 'vendor'  OR vendor_id IS NOT NULL),
    CONSTRAINT promo_platform_scope_chk CHECK (
        scope != 'platform' OR (vendor_id IS NULL AND product_id IS NULL)
    ),
    -- percentage cap
    CONSTRAINT promo_pct_chk CHECK (
        discount_type != 'percentage' OR discount_value <= 100
    ),
    CONSTRAINT promo_valid_range_chk CHECK (valid_until > valid_from)
);

-- Unique code lookup (case-insensitive) — only among active, non-deleted rows
CREATE UNIQUE INDEX idx_promo_code_unique ON promo_codes (UPPER(code)) WHERE is_deleted = FALSE;
CREATE INDEX idx_promo_vendor   ON promo_codes (vendor_id)  WHERE is_deleted = FALSE;
CREATE INDEX idx_promo_product  ON promo_codes (product_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_promo_active   ON promo_codes (is_active, valid_from, valid_until) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_promo_codes_updated_at
    BEFORE UPDATE ON promo_codes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- -----------------------------------------------------------------------
-- 4. Wishlists (composite PK — one row per customer+product pair)
-- -----------------------------------------------------------------------
CREATE TABLE wishlists (
    customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id   UUID NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (customer_id, product_id)
);

-- Fast "list all wishlisted products for customer" lookup
CREATE INDEX idx_wishlist_customer ON wishlists (customer_id);
-- Fast "how many times a product is wishlisted" lookup (analytics)
CREATE INDEX idx_wishlist_product  ON wishlists (product_id);
