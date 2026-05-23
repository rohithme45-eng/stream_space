import { getAllVideos, getVideo, incrementStat } from './video-db.js?v=6';

const container = document.getElementById('videos');

async function render(){
  container.innerHTML = '';
  const all = await getAllVideos();
  if(!all || all.length === 0){
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 1.2rem;">No media content available yet. Admins can upload videos from the portal.</p>';
    return;
  }
  all.sort((a,b) => b.createdAt - a.createdAt);
  for(const item of all){
    const card = document.createElement('div');
    card.className = 'card';
    
    const title = document.createElement('div');
    title.className = 'card-title';
    title.innerHTML = `<i class="fa-solid fa-clapperboard" style="color: var(--accent); margin-right: 8px;"></i>${item.name}`;
    
    const videoEl = document.createElement('video');
    videoEl.controls = true;
    videoEl.playsInline = true;
    // set src from remote url
    if (item.url) {
      videoEl.src = item.url;
      videoEl.crossOrigin = 'anonymous';
      videoEl.addEventListener('play', () => {
        incrementStat(item.id, 'views');
      }, {once: true});
    }
    
    const dl = document.createElement('a');
    dl.className = 'btn';
    dl.innerHTML = '<i class="fa-solid fa-download"></i> Download Media';
    dl.href = '#';
    dl.addEventListener('click', async (e) =>{
      e.preventDefault();
      const oldHtml = dl.innerHTML;
      dl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';
      dl.style.pointerEvents = 'none';
      try {
        const res = await fetch(item.url);
        const b = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = item.name || ('video-' + item.id);
        document.body.appendChild(a);
        a.click();
        a.remove();
        incrementStat(item.id, 'downloads');
      } catch(err) {
        alert('Failed to download video.');
        console.error(err);
      }
      dl.innerHTML = oldHtml;
      dl.style.pointerEvents = 'auto';
    });
    
    card.appendChild(title);
    card.appendChild(videoEl);
    card.appendChild(dl);
    container.appendChild(card);
  }
}

render();

// Optional: refresh on visibility change
window.addEventListener('focus', () => render());

// Auto-update when admin adds/modifies/deletes video
window.addEventListener('db-update', () => render());
