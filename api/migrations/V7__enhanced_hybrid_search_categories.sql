-- =============================================================================
-- V7: Enhanced Hybrid Search with Category Name Integration
-- =============================================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trg_products_search_vector ON products;
DROP FUNCTION IF EXISTS products_search_vector_trigger();

-- Create enhanced function that includes category name with higher weight
CREATE OR REPLACE FUNCTION products_search_vector_trigger() RETURNS trigger AS $$
DECLARE
    category_name TEXT;
BEGIN
    -- Fetch category name for the product
    SELECT name INTO category_name
    FROM categories
    WHERE id = NEW.category_id AND is_deleted = FALSE;

    -- Build search vector with weighted components:
    -- A = Category name (highest weight)
    -- B = Product name (high weight)
    -- C = Product description (lower weight)
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(category_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated trigger that also fires on category_id changes
CREATE TRIGGER trg_products_search_vector
    BEFORE INSERT OR UPDATE OF name, description, category_id ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_vector_trigger();

-- Backfill search_vector for existing products with category names
UPDATE products p
SET search_vector = (
    SELECT
        setweight(to_tsvector('english', COALESCE(c.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(p.name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(p.description, '')), 'C')
    FROM categories c
    WHERE c.id = p.category_id AND c.is_deleted = FALSE
)
WHERE search_vector IS NOT NULL;

-- Update search configuration weights for better category matching
-- These comments document the search ranking strategy:
-- A-weight (Category): 1.0 - Highest priority for category matches
-- B-weight (Product name): 0.4 - High priority for product name matches
-- C-weight (Description): 0.2 - Lower priority for description matches
-- D-weight (Unused): 0.1 - Reserved for future use