-- =============================================================================
-- V6: Hybrid Search (Full-Text Search + Vector Search)
-- =============================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add full-text search column (tsvector) for product name + description
ALTER TABLE products
    ADD COLUMN search_vector tsvector;

-- Add vector embedding column (1536 dimensions for OpenAI text-embedding-3-small)
ALTER TABLE products
    ADD COLUMN embedding vector(1536);

-- Create GIN index for full-text search
CREATE INDEX idx_products_search_vector ON products USING GIN (search_vector);

-- Create HNSW index for vector similarity search (cosine distance)
CREATE INDEX idx_products_embedding ON products USING hnsw (embedding vector_cosine_ops);

-- Function to automatically update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION products_search_vector_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search_vector
CREATE TRIGGER trg_products_search_vector
    BEFORE INSERT OR UPDATE OF name, description ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_vector_trigger();

-- Backfill search_vector for existing products
UPDATE products
SET search_vector =
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B')
WHERE search_vector IS NULL;
