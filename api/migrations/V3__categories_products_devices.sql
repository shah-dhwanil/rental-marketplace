-- =============================================================================
-- V3: Categories, Products, Devices
-- =============================================================================

-- =============================================================================
-- categories
-- =============================================================================
CREATE TABLE categories (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name               VARCHAR(64)  NOT NULL,
    slug               VARCHAR(64)  NOT NULL,
    description        TEXT         NOT NULL DEFAULT '',
    parent_category_id UUID         REFERENCES categories (id) ON DELETE SET NULL,
    image_url          TEXT,
    image_id           VARCHAR(255),               -- Cloudinary public_id for deletion
    is_deleted         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT categories_name_uq  UNIQUE (name),
    CONSTRAINT categories_slug_uq  UNIQUE (slug)
);

CREATE INDEX idx_categories_parent   ON categories (parent_category_id) WHERE parent_category_id IS NOT NULL;
CREATE INDEX idx_categories_deleted  ON categories (is_deleted);

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- products
-- =============================================================================
CREATE TABLE products (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(128)   NOT NULL,
    description      TEXT           NOT NULL DEFAULT '',
    properties       JSONB          NOT NULL DEFAULT '{}',
    image_urls       TEXT[]         NOT NULL DEFAULT '{}',
    image_ids        TEXT[]         NOT NULL DEFAULT '{}',   -- Cloudinary public_ids (parallel array)
    reserved_qty     INT            NOT NULL DEFAULT 0,
    category_id      UUID           NOT NULL REFERENCES categories (id),
    vendor_id        UUID           NOT NULL REFERENCES vendors (id),
    price_day        NUMERIC(10,2)  NOT NULL,
    price_week       NUMERIC(10,2)  NOT NULL,
    price_month      NUMERIC(10,2)  NOT NULL,
    security_deposit NUMERIC(10,2)  NOT NULL DEFAULT 0,
    defect_charge    NUMERIC(10,2)  NOT NULL DEFAULT 0,
    is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
    is_deleted       BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT products_price_day_pos      CHECK (price_day > 0),
    CONSTRAINT products_price_week_pos     CHECK (price_week > 0),
    CONSTRAINT products_price_month_pos    CHECK (price_month > 0),
    CONSTRAINT products_security_dep_nn    CHECK (security_deposit >= 0),
    CONSTRAINT products_defect_chg_nn      CHECK (defect_charge >= 0),
    CONSTRAINT products_reserved_qty_nn    CHECK (reserved_qty >= 0)
);

CREATE INDEX idx_products_vendor_id    ON products (vendor_id)    WHERE is_deleted = FALSE;
CREATE INDEX idx_products_category_id  ON products (category_id)  WHERE is_deleted = FALSE;
CREATE INDEX idx_products_is_active    ON products (is_active)    WHERE is_deleted = FALSE;
CREATE INDEX idx_products_name         ON products (name)          WHERE is_deleted = FALSE;

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- devices
-- =============================================================================
CREATE TABLE devices (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID         NOT NULL REFERENCES products (id),
    serial_no  VARCHAR(64),
    condition  VARCHAR(16)  NOT NULL DEFAULT 'good',
    properties JSONB        NOT NULL DEFAULT '{}',
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT devices_condition_chk CHECK (condition IN ('new', 'good', 'fair', 'poor')),
    CONSTRAINT devices_serial_no_uq  UNIQUE (serial_no)
);

CREATE INDEX idx_devices_product_id  ON devices (product_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_devices_is_active   ON devices (is_active)  WHERE is_deleted = FALSE;

CREATE TRIGGER trg_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
