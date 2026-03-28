-- Migration: V8 - Product Reviews and Order Defects
-- Description: Adds product review and rating system with defect charge tracking

-- Product Reviews Table
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL CHECK (char_length(comment) >= 10 AND char_length(comment) <= 1000),
    images JSONB DEFAULT '[]'::jsonb,
    vendor_response TEXT,
    vendor_responded_at TIMESTAMPTZ,
    helpful_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one review per order
    UNIQUE(order_id)
);

-- Order Defects Table
CREATE TABLE IF NOT EXISTS order_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL CHECK (char_length(description) >= 10 AND char_length(description) <= 500),
    images JSONB DEFAULT '[]'::jsonb,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'disputed', 'waived')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_order_id ON product_reviews(order_id);
CREATE INDEX idx_product_reviews_customer_id ON product_reviews(customer_id);
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_product_reviews_created_at ON product_reviews(created_at DESC);

CREATE INDEX idx_order_defects_order_id ON order_defects(order_id);
CREATE INDEX idx_order_defects_vendor_id ON order_defects(vendor_id);
CREATE INDEX idx_order_defects_status ON order_defects(status);
CREATE INDEX idx_order_defects_payment_intent ON order_defects(stripe_payment_intent_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_product_reviews_updated_at
    BEFORE UPDATE ON product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_defects_updated_at
    BEFORE UPDATE ON order_defects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate average product rating
CREATE OR REPLACE FUNCTION get_product_rating_stats(p_product_id UUID)
RETURNS TABLE (
    average_rating NUMERIC,
    total_reviews BIGINT,
    rating_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(rating)::numeric, 2) as average_rating,
        COUNT(*) as total_reviews,
        jsonb_object_agg(
            rating::text,
            count
        ) as rating_distribution
    FROM (
        SELECT 
            rating,
            COUNT(*) as count
        FROM product_reviews
        WHERE product_id = p_product_id
        GROUP BY rating
    ) rating_counts;
END;
$$ LANGUAGE plpgsql;

-- Add average_rating cache column to products table for performance
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Function to update product rating cache
CREATE OR REPLACE FUNCTION update_product_rating_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the products table with new average rating
    UPDATE products
    SET 
        average_rating = (
            SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
            FROM product_reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM product_reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update product rating cache
CREATE TRIGGER update_product_rating_on_review
    AFTER INSERT OR UPDATE OR DELETE ON product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_rating_cache();

-- Add comments for documentation
COMMENT ON TABLE product_reviews IS 'Customer reviews and ratings for products after order completion';
COMMENT ON TABLE order_defects IS 'Defect charges added by vendors when marking orders as complete';
COMMENT ON COLUMN product_reviews.is_verified IS 'Indicates review is from verified purchase (always true for completed orders)';
COMMENT ON COLUMN product_reviews.helpful_count IS 'Number of users who found this review helpful';
COMMENT ON COLUMN order_defects.status IS 'Payment status: pending (awaiting payment), paid (customer paid), disputed (customer disputes charge), waived (vendor waived charge)';
