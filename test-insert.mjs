const supabaseUrl = 'https://xtrrxjvwparskbtdguuy.supabase.co';
const supabaseKey = 'sb_publishable_M-7CyggKW6e3ZtWhVADdnA_E6bGmVzy';

async function testInsert() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/videos`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: "Test Video",
        url: "https://example.com/test.mp4",
        storagePath: "videos/test.mp4",
        size: 1234,
        type: "video/mp4",
        createdAt: Date.now(),
        views: 0,
        downloads: 0
      })
    });
    const data = await res.json();
    console.log("Insert response status:", res.status);
    console.log("Insert response data:", data);
  } catch(e) {
    console.error("Insert error:", e);
  }
}

testInsert();
