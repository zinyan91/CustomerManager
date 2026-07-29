import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xkzntlaybrjlkcymqius.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrebnRsYXlicmpsa2N5bXFpdXMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczODE0ODcyNywiZXhwIjoyMDUzNzI0NzI3fQ.7i5Wc9eFv8Q3O3X5pX5W7V7_X_W_W_W_W_W_W_W';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing Supabase SDK query for LoanContracts with customer...");
  const { data, error } = await supabase.from('LoanContracts').select('*, customer:Customers(*)');
  if (error) {
    console.error("SUPABASE SDK ERROR:", error);
  } else {
    console.log("SUCCESS! Returned contracts count:", data.length);
    if (data.length > 0) console.log("Sample contract:", data[0]);
  }
}

test();
