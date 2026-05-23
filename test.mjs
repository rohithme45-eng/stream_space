const supabaseUrl = 'https://xtrrxjvwparskbtdguuy.supabase.co';
const supabaseKey = 'sb_publishable_M-7CyggKW6e3ZtWhVADdnA_E6bGmVzy';

async function test() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/videos?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const data = await res.json();
    console.log("Videos in DB:", data.length);
    console.log(data);
  } catch(e) {
    console.error("Error:", e);
  }
}

test();
