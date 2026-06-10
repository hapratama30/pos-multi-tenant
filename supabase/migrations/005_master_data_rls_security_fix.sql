-- Migration: Memperbaiki celah keamanan RLS pada master data (product_categories, product_units, duration_units)
-- Menghindari tenant menghapus atau merubah data global (tenant_id IS NULL)
-- Dan melakukan seeding data master bawaan (default global) agar tidak kosong melompong

-- 1. Seeding Data Master Bawaan (Default Global) secara aman jika belum ada
INSERT INTO product_categories (name, type, code, tenant_id)
SELECT name, type, code, tenant_id FROM (
  VALUES 
    ('Umum', 'ritel', 'umum', NULL::varchar),
    ('Jasa', 'jasa', 'jasa', NULL::varchar),
    ('Ritel', 'ritel', 'ritel', NULL::varchar),
    ('Laundry Kiloan', 'jasa', 'laundry-kiloan', NULL::varchar),
    ('Laundry Satuan', 'jasa', 'laundry-satuan', NULL::varchar)
) AS v(name, type, code, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM product_categories WHERE product_categories.name = v.name AND product_categories.tenant_id IS NULL
);

INSERT INTO product_units (name, tenant_id)
SELECT name, tenant_id FROM (
  VALUES 
    ('Pcs', NULL::varchar),
    ('Kg', NULL::varchar),
    ('Liter', NULL::varchar),
    ('Meter', NULL::varchar),
    ('Box', NULL::varchar)
) AS v(name, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM product_units WHERE product_units.name = v.name AND product_units.tenant_id IS NULL
);

INSERT INTO duration_units (name, tenant_id)
SELECT name, tenant_id FROM (
  VALUES 
    ('Menit', NULL::varchar),
    ('Jam', NULL::varchar),
    ('Hari', NULL::varchar)
) AS v(name, tenant_id)
WHERE NOT EXISTS (
  SELECT 1 FROM duration_units WHERE duration_units.name = v.name AND duration_units.tenant_id IS NULL
);


-- 2. Kebijakan RLS Baru untuk product_categories
DROP POLICY IF EXISTS product_categories_isolation ON product_categories;
DROP POLICY IF EXISTS product_categories_select ON product_categories;
DROP POLICY IF EXISTS product_categories_write ON product_categories;

-- Policy untuk melihat data (boleh melihat data milik sendiri atau data global)
CREATE POLICY product_categories_select ON product_categories
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = get_auth_tenant_id());

-- Policy untuk modifikasi (INSERT, UPDATE, DELETE hanya boleh untuk data miliknya sendiri)
CREATE POLICY product_categories_write ON product_categories
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());


-- 3. Kebijakan RLS Baru untuk product_units
DROP POLICY IF EXISTS product_units_isolation ON product_units;
DROP POLICY IF EXISTS product_units_select ON product_units;
DROP POLICY IF EXISTS product_units_write ON product_units;

-- Policy untuk melihat data
CREATE POLICY product_units_select ON product_units
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = get_auth_tenant_id());

-- Policy untuk modifikasi
CREATE POLICY product_units_write ON product_units
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());


-- 4. Kebijakan RLS Baru untuk duration_units
DROP POLICY IF EXISTS duration_units_isolation ON duration_units;
DROP POLICY IF EXISTS duration_units_select ON duration_units;
DROP POLICY IF EXISTS duration_units_write ON duration_units;

-- Policy untuk melihat data
CREATE POLICY duration_units_select ON duration_units
  FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = get_auth_tenant_id());

-- Policy untuk modifikasi
CREATE POLICY duration_units_write ON duration_units
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());
