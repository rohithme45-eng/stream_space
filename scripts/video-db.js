import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://xtrrxjvwparskbtdguuy.supabase.co';
const supabaseKey = 'sb_publishable_M-7CyggKW6e3ZtWhVADdnA_E6bGmVzy';
const supabase = createClient(supabaseUrl, supabaseKey);

export const bc = new BroadcastChannel('streamspace_channel');

bc.onmessage = (e) => {
  if (e.data === 'update') {
    window.dispatchEvent(new Event('db-update'));
  }
};

// Global real-time updates without needing complex Postgres Realtime setup!
const channel = supabase.channel('global-updates');
channel.on('broadcast', { event: 'db-update' }, () => {
  window.dispatchEvent(new Event('db-update'));
  bc.postMessage('update');
}).subscribe();

function notifyUpdate() {
  window.dispatchEvent(new Event('db-update'));
  bc.postMessage('update');
  channel.send({ type: 'broadcast', event: 'db-update', payload: {} });
}

function mapVideo(d) {
  if (!d) return null;
  return {
    ...d,
    storagePath: d.storagepath,
    createdAt: parseInt(d.createdat, 10) || 0
  };
}

export async function saveVideo(blob, name = 'video') {
  const fileId = Date.now().toString() + '-' + Math.random().toString(36).substring(2) + '.webm';
  
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(fileId, blob, {
      contentType: blob.type || 'video/webm'
    });
    
  if (uploadError) throw new Error("Storage Upload Failed: " + uploadError.message);

  const { data: publicUrlData } = supabase.storage
    .from('videos')
    .getPublicUrl(fileId);
    
  const url = publicUrlData.publicUrl;
  
  const { error: dbError } = await supabase
    .from('videos')
    .insert([{
      name,
      url,
      storagepath: fileId,
      size: blob.size,
      type: blob.type || 'video/webm',
      createdat: Date.now(),
      views: 0,
      downloads: 0
    }]);
    
  if (dbError) throw new Error("Database Insert Failed: " + dbError.message);
  
  notifyUpdate();
}

export async function updateVideo(id, blob, name, views = 0, downloads = 0, createdAt = null) {
  const fileId = Date.now().toString() + '-' + Math.random().toString(36).substring(2) + '.webm';
  
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(fileId, blob, {
      contentType: blob.type || 'video/webm'
    });
    
  if (uploadError) throw new Error("Storage Upload Failed: " + uploadError.message);

  const { data: publicUrlData } = supabase.storage
    .from('videos')
    .getPublicUrl(fileId);
    
  const url = publicUrlData.publicUrl;
  
  const { data: oldDoc } = await supabase.from('videos').select('storagepath').eq('id', id).single();
  if (oldDoc && oldDoc.storagepath) {
    try {
       await supabase.storage.from('videos').remove([oldDoc.storagepath]);
    } catch(e) {
       console.warn("Failed to delete old storage file", e);
    }
  }

  const { error: dbError } = await supabase
    .from('videos')
    .update({
      name,
      url,
      storagepath: fileId,
      size: blob.size,
      type: blob.type || 'video/webm',
      createdat: createdAt || Date.now(),
      views,
      downloads
    })
    .eq('id', id);
    
  if (dbError) throw new Error("Database Update Failed: " + dbError.message);
  
  notifyUpdate();
}

export async function getAllVideos() {
  const { data, error } = await supabase.from('videos').select('*');
  if (error) throw new Error("Database Fetch Failed: " + error.message);
  return data.map(mapVideo);
}

export async function getVideo(id) {
  const { data, error } = await supabase.from('videos').select('*').eq('id', id).single();
  if (error) return null;
  return mapVideo(data);
}

export async function deleteVideo(id) {
  const { data: oldDoc } = await supabase.from('videos').select('storagepath').eq('id', id).single();
  if (oldDoc && oldDoc.storagepath) {
    try {
      await supabase.storage.from('videos').remove([oldDoc.storagepath]);
    } catch(e) {
      console.warn("Failed to delete storage file", e);
    }
  }
  
  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) throw new Error("Database Delete Failed: " + error.message);
  
  notifyUpdate();
}

export async function incrementStat(id, statName) {
  const { data: doc } = await supabase.from('videos').select(statName).eq('id', id).single();
  if (doc) {
    const newVal = (doc[statName] || 0) + 1;
    await supabase.from('videos').update({ [statName]: newVal }).eq('id', id);
    notifyUpdate();
  }
}
