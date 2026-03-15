-- V5: Orders, order devices, order status history, and order payments

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES customers(id),
    product_id          UUID NOT NULL REFERENCES products(id),
    vendor_id           UUID NOT NULL REFERENCES vendors(id),
    address_id          UUID NOT NULL REFERENCES addresses(id),
    device_id           UUID NOT NULL REFERENCES devices(id),
    -- Date range
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    delivery_date       DATE NOT NULL,
    return_date         DATE NOT NULL,
    rental_days         INTEGER NOT NULL CHECK (rental_days > 0),
    delivery_type       VARCHAR(16) NOT NULL CHECK (delivery_type IN ('pickup', 'home_delivery')),
    -- Promo
    promo_code_id       UUID REFERENCES promo_codes(id),
    promo_code          VARCHAR(32),
    -- Amounts (all in INR)
    security_deposit    NUMERIC(10,2) NOT NULL CHECK (security_deposit >= 0),
    amount              NUMERIC(10,2) NOT NULL CHECK (amount > 0),     -- rental amount before tax/discount
    discount            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    net_amount          NUMERIC(10,2) NOT NULL CHECK (net_amount >= 0), -- after discount
    cgst_amount         NUMERIC(10,2) NOT NULL CHECK (cgst_amount >= 0),
    sgst_amount         NUMERIC(10,2) NOT NULL CHECK (sgst_amount >= 0),
    damage_amount       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (damage_amount >= 0),
    grand_total         NUMERIC(10,2) NOT NULL CHECK (grand_total > 0),
    -- Status
    status              VARCHAR(32) NOT NULL DEFAULT 'pending_payment'
                            CHECK (status IN ('pending_payment','confirmed','active','completed','cancelled')),
    cancellation_reason TEXT,
    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Constraints
    CONSTRAINT orders_dates_valid
        CHECK (start_date <= end_date),
    CONSTRAINT orders_delivery_date_valid
        CHECK (delivery_date >= start_date - INTERVAL '1 day' AND delivery_date <= start_date),
    CONSTRAINT orders_return_date_valid
        CHECK (return_date >= end_date AND return_date <= end_date + INTERVAL '1 day')
);

CREATE INDEX idx_orders_customer   ON orders(customer_id);
CREATE INDEX idx_orders_vendor     ON orders(vendor_id);
CREATE INDEX idx_orders_product    ON orders(product_id);
CREATE INDEX idx_orders_device     ON orders(device_id);
CREATE INDEX idx_orders_status     ON orders(status);

CREATE TABLE order_status_history (
    order_id    UUID NOT NULL REFERENCES orders(id),
    status      VARCHAR(32) NOT NULL,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (order_id, status)
);

CREATE TABLE order_payments (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                  UUID NOT NULL REFERENCES orders(id),
    customer_id               UUID NOT NULL REFERENCES customers(id),
    stripe_payment_intent_id  VARCHAR(255) NOT NULL,
    amount                    NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    status                    VARCHAR(16) NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','completed','failed','refunded')),
    gateway_response          JSONB,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_payments_order    ON order_payments(order_id);
CREATE INDEX idx_order_payments_customer ON order_payments(customer_id);

CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_order_payments_updated_at
    BEFORE UPDATE ON order_payments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
