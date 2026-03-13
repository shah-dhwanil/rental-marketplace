-- =============================================================================
-- V2: User Tables
-- =============================================================================

-- PostGIS extension for GEOGRAPHY columns (vendors, delivery_partners)
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- users
-- =============================================================================
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(32)  NOT NULL,
    email_id            VARCHAR(64)  NOT NULL,
    mobile_no           VARCHAR(15)  NOT NULL,
    password            VARCHAR(255) NOT NULL,
    role                VARCHAR(32)  NOT NULL,
    profile_photo_url   VARCHAR(512),
    profile_photo_id    VARCHAR(255),
    is_verified         BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    is_profile_complete BOOLEAN      NOT NULL DEFAULT FALSE,
    is_deleted          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_role_uq  UNIQUE (email_id, role),
    CONSTRAINT users_mobile_role_uq UNIQUE (mobile_no, role),
    CONSTRAINT users_role_chk       CHECK (role IN ('customer', 'vendor', 'delivery_partner', 'admin'))
);

CREATE INDEX idx_users_role      ON users (role);
CREATE INDEX idx_users_email_id  ON users (email_id);
CREATE INDEX idx_users_mobile_no ON users (mobile_no);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- customers
-- =============================================================================
CREATE TABLE customers (
    id             UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    loyalty_points INT NOT NULL DEFAULT 0
);

-- =============================================================================
-- vendors
-- =============================================================================
CREATE TABLE vendors (
    id           UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL DEFAULT '',
    gst_no       VARCHAR(15)  NOT NULL DEFAULT '',
    address      TEXT         NOT NULL DEFAULT '',
    city         VARCHAR(64)  NOT NULL DEFAULT '',
    pincode      VARCHAR(6)   NOT NULL DEFAULT '',
    location     GEOGRAPHY(Point, 4326),
    bank_details JSONB,
    is_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- delivery_partners
-- =============================================================================
CREATE TABLE delivery_partners (
    id           UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    name         VARCHAR(32)  NOT NULL DEFAULT '',
    gst_no       VARCHAR(15)  NOT NULL DEFAULT '',
    address      TEXT         NOT NULL DEFAULT '',
    city         VARCHAR(64)  NOT NULL DEFAULT '',
    pincode      VARCHAR(6)   NOT NULL DEFAULT '',
    location     GEOGRAPHY(Point, 4326),
    bank_details JSONB,
    is_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_delivery_partners_updated_at
    BEFORE UPDATE ON delivery_partners
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- otp_verifications
-- =============================================================================
CREATE TABLE otp_verifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    otp_type   VARCHAR(16) NOT NULL,
    otp_hash   VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT otp_type_chk CHECK (otp_type IN ('email', 'mobile'))
);

CREATE INDEX idx_otp_user_type_used
    ON otp_verifications (user_id, otp_type, is_used);
