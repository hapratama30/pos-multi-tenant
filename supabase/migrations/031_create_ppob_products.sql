-- Create ppob_products table for Digiflazz catalog synchronization
CREATE TABLE IF NOT EXISTS public.ppob_products (
  sku_code TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  type TEXT,
  seller_name TEXT,
  base_price NUMERIC DEFAULT 0,
  buyer_product_status BOOLEAN DEFAULT true,
  seller_product_status BOOLEAN DEFAULT true,
  unlimited_stock BOOLEAN DEFAULT true,
  stock INTEGER DEFAULT 0,
  multi BOOLEAN DEFAULT true,
  start_cut_off TEXT,
  end_cut_off TEXT,
  desc_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.ppob_products ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to all authenticated users for ppob_products" ON public.ppob_products FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ppob_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ppob_products_updated_at_trigger
BEFORE UPDATE ON public.ppob_products
FOR EACH ROW
EXECUTE FUNCTION update_ppob_products_updated_at();
