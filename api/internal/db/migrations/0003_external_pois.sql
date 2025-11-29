-- Add columns to support external POI publishing from microservices

-- Add source and external_id columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'local',
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Create unique constraint for external POIs
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_source_external_id 
ON businesses(source, external_id) 
WHERE external_id IS NOT NULL;

-- Add index for source
CREATE INDEX IF NOT EXISTS idx_businesses_source ON businesses(source);

-- Add metadata column for flexible data storage
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_businesses_metadata ON businesses USING GIN(metadata);

-- Comment on columns
COMMENT ON COLUMN businesses.source IS 'Source of the POI: local, food_service, grocery_service, pharmacy_service, etc.';
COMMENT ON COLUMN businesses.external_id IS 'External ID from the source microservice';
COMMENT ON COLUMN businesses.metadata IS 'Additional metadata from source service (cuisine, price_range, etc.)';
