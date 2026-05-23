import { getAllVideos, getVideo, incrementStat, addComment } from './video-db.js?v=7';

const container = document.getElementById('videos');

async function render(){
  const all = await getAllVideos();
  if(!all || all.length === 0){
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 1.2rem;">No media content available yet. Admins can upload videos from the portal.</p>';
    return;
  }
  all.sort((a,b) => b.createdAt - a.createdAt);
  
  // Create a signature to prevent re-rendering if only views/downloads changed
  const currentSignature = all.map(v => `${v.id}-${v.name}-${v.url}-${v.likes}-${v.comments?.length}`).join('|');
  if (container.dataset.signature === currentSignature) {
    return; // Nothing visual changed, do not interrupt playback
  }
  
  container.dataset.signature = currentSignature;
  container.innerHTML = '';
  
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
    dl.innerHTML = '<i class="fa-solid fa-download"></i> Download';
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
    
    const likeBtn = document.createElement('button');
    likeBtn.className = 'btn like-btn';
    likeBtn.innerHTML = `<i class="fa-solid fa-heart"></i> Like (${item.likes || 0})`;
    likeBtn.addEventListener('click', () => {
      likeBtn.disabled = true;
      incrementStat(item.id, 'likes');
    });

    const statsRow = document.createElement('div');
    statsRow.className = 'stats-row';
    statsRow.appendChild(likeBtn);
    statsRow.appendChild(dl);

    // Comments Section
    const commentsSection = document.createElement('div');
    commentsSection.className = 'comments-section';
    commentsSection.innerHTML = `<h3><i class="fa-solid fa-comments"></i> Comments (${(item.comments || []).length})</h3>`;
    
    const commentsList = document.createElement('div');
    commentsList.className = 'comments-list';
    (item.comments || []).forEach(c => {
      const cEl = document.createElement('div');
      cEl.className = 'comment';
      cEl.innerText = c.text;
      commentsList.appendChild(cEl);
    });
    commentsSection.appendChild(commentsList);

    const commentForm = document.createElement('form');
    commentForm.className = 'comment-form';
    commentForm.innerHTML = `
      <input type="text" placeholder="Add a comment..." required>
      <button type="submit" class="btn"><i class="fa-solid fa-paper-plane"></i></button>
    `;
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = commentForm.querySelector('input');
      const text = input.value.trim();
      if (text) {
        const btn = commentForm.querySelector('button');
        btn.disabled = true;
        await addComment(item.id, text);
        input.value = '';
      }
    });
    commentsSection.appendChild(commentForm);

    card.appendChild(title);
    card.appendChild(videoEl);
    card.appendChild(statsRow);
    card.appendChild(commentsSection);
    container.appendChild(card);
  }
}

render();

// Optional: refresh on visibility change
window.addEventListener('focus', () => render());

// Auto-update when admin adds/modifies/deletes video
window.addEventListener('db-update', () => render());
