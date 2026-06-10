import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dejvhakpxqvnbniphdhf.supabase.co';
const supabaseKey = 'sb_publishable_vVxCp5XLDKYAbQW8WI9XfQ_hMh1BAnn';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const tables = ['staff', 'customers', 'products', 'expenses', 'stock_items', 'discounts', 'transactions'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('outlet_id').limit(1);
    if (error) {
      console.log(`- ${table}: NO outlet_id (${error.message})`);
    } else {
      console.log(`- ${table}: HAS outlet_id`);
    }
  }
}
checkColumns();
