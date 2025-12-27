-- Create Enums (conditional check)
DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    off_id TEXT UNIQUE, -- Open Food Facts ID / Barcode
    name TEXT UNIQUE NOT NULL,
    brand TEXT,
    ingredients_text TEXT,
    risk_level risk_level DEFAULT 'unknown',
    labels TEXT[], -- Extracted certificates (e.g., Halal, Vegan)
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Ingredients Dictionary Table
CREATE TABLE IF NOT EXISTS ingredients_dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL, -- Normalized ingredient name (e.g., "gelatin")
    risk_level risk_level NOT NULL,
    explanation TEXT,
    alternatives TEXT[]
);

-- Create Saved Products Table (for users)
CREATE TABLE IF NOT EXISTS saved_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Add some initial common ingredients to the dictionary (with conflict handling)
INSERT INTO ingredients_dictionary (name, risk_level, explanation, alternatives) VALUES
('pork gelatin', 'high', 'Derived from porcine sources.', ARRAY['bovine halal gelatin', 'agar-agar', 'pectin']::TEXT[]),
('gelatin', 'medium', 'Source unspecified; commonly from bovine or porcine.', ARRAY['halal certified gelatin', 'fish gelatin']::TEXT[]),
('carmine', 'high', 'Derived from insects (E120); considered non-halal by many scholars.', ARRAY['beetroot red', 'anthocyanins']::TEXT[]),
('confectioners glaze', 'medium', 'Shellac (E904); source status varies by school of thought.', ARRAY['pectin-based glaze']::TEXT[]),
('l-cysteine', 'medium', 'Commonly derived from hair or feathers; needs verification for source.', ARRAY['synthetic l-cysteine', 'vegetable-based l-cysteine']::TEXT[]),
('whey', 'low', 'Generally halal if enzymes used are microbial or from halal slaughtered animals.', ARRAY[]::TEXT[]),
('rennet', 'medium', 'Animal-derived enzyme; needs verification for source.', ARRAY['microbial rennet', 'vegetable rennet']::TEXT[])
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

-- Policies for products (select for all, insert for authenticated)
CREATE POLICY "Allow public read access to products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert products" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update products" ON products FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for saved_products (user specific)
CREATE POLICY "Users can manage their own saved products" ON saved_products
    FOR ALL USING (auth.uid() = user_id);
