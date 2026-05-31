const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let envUrl = '';
let envKey = '';
try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        envUrl = line.split('=')[1].trim();
      }
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        envKey = line.split('=')[1].trim();
      }
    });
  }
} catch (e) {
  console.error("Error reading env:", e);
}

const supabase = createClient(envUrl, envKey);

async function checkAllNames() {
  const { data, error } = await supabase
    .from('sr_profiles')
    .select('id, email, full_name, role');
  
  if (error) {
    console.error("Error:", error);
  } else {
    data.forEach(p => {
      console.log(`Email: ${p.email} | Name: "${p.full_name}" | Role: ${p.role}`);
    });
  }
}

checkAllNames();
