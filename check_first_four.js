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

async function checkSpecifics() {
  const emails = [
    'admin@sman2bandung.sch.id',
    '197805262022211002@lensa.smanda.id',
    '6637776677130032@lensa.smanda.id',
    '196711211991032005@lensa.smanda.id'
  ];

  const { data, error } = await supabase
    .from('sr_profiles')
    .select('id, email, full_name, role')
    .in('email', emails);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Specific profiles:", data);
  }
}

checkSpecifics();
