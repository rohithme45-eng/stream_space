const supabaseUrl = 'https://xtrrxjvwparskbtdguuy.supabase.co';
const supabaseKey = 'sb_publishable_M-7CyggKW6e3ZtWhVADdnA_E6bGmVzy';

async function testUpload() {
  const fileContent = "Hello World";
  const blob = new Blob([fileContent], { type: 'text/plain' });
  const fileId = "test-" + Date.now() + ".txt";
  
  const formData = new FormData();
  formData.append('', blob, fileId);

  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/videos/${fileId}`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: formData
    });
    const data = await res.json();
    console.log("Upload response status:", res.status);
    console.log("Upload response data:", data);
  } catch(e) {
    console.error("Upload error:", e);
  }
}

testUpload();
