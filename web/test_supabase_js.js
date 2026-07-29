import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xkzntlaybrjlkcymqius.supabase.co';
// Test with anon key
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrebnRsYXlicmpsa2N5bXFpdXMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczODE0ODcyNywiZXhwIjoyMDUzNzI0NzI3fQ.7i5Wc9eFv8Q3O3X5pX5W7V7_X_W_W_W_W_W_W_W';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Querying Customers with Supabase JS client...");
  const { data, error } = await supabase.from('Customers').select('*').order('Id', { ascending: false });
  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("SUCCESS! Returned customers count:", data.length);
    if (data.length > 0) {
      console.log("First Customer:", data[0]);
    }
  }
}

test();
