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
const targetId = "2ff7c73e-97a6-48fc-b764-ee7b92902787"; // Asep Suryanto, S.Pd.

async function run() {
  console.log("Updating profile for:", targetId);
  const { data, error } = await supabase
    .from('sr_profiles')
    .update({ is_walikelas: true, kelas_binaan: 'X-C' })
    .eq('id', targetId)
    .select();
  
  if (error) {
    console.error("Error updating profile:", error);
    return;
  }
  
  console.log("Profile updated successfully:", data);
}

run();
