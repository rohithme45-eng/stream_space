import { getAllVideos, getVideo, incrementStat, decrementStat, addComment } from './video-db.js?v=8';

const videosContainer = document.getElementById('videos');
const photosContainer = document.getElementById('photos');

const tabVideos = document.getElementById('tab-videos');
const tabPhotos = document.getElementById('tab-photos');

tabVideos.addEventListener('click', () => {
  tabVideos.style.background = 'var(--accent)';
  tabPhotos.style.background = 'rgba(0,0,0,0.4)';
  videosContainer.style.display = 'grid';
  photosContainer.style.display = 'none';
});

tabPhotos.addEventListener('click', () => {
  tabPhotos.style.background = 'var(--accent)';
  tabVideos.style.background = 'rgba(0,0,0,0.4)';
  photosContainer.style.display = 'grid';
  videosContainer.style.display = 'none';
});

async function render(){
  const all = await getAllVideos();
  if(!all || all.length === 0){
    videosContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 1.2rem;">No media content available yet. Admins can upload media from the portal.</p>';
    photosContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 1.2rem;">No media content available yet. Admins can upload media from the portal.</p>';
    return;
  }
  all.sort((a,b) => b.createdAt - a.createdAt);
  
  const currentIds = new Set(all.map(v => `media-card-${v.id}`));
  
  const clearStale = (container) => {
    Array.from(container.children).forEach(child => {
      if (child.className === 'card' && !currentIds.has(child.id)) {
        child.remove();
      } else if (child.tagName === 'P') {
        child.remove();
      }
    });
  };
  
  clearStale(videosContainer);
  clearStale(photosContainer);
  
  for(const item of all){
    const isImage = item.type && item.type.startsWith('image/');
    const targetContainer = isImage ? photosContainer : videosContainer;
    
    let card = document.getElementById(`media-card-${item.id}`);
    const hasLiked = localStorage.getItem('liked_' + item.id) === 'true';
    
    if (card) {
      const likeBtn = document.getElementById(`like-btn-${item.id}`);
      if (likeBtn && !likeBtn.disabled) {
        if (hasLiked) {
          likeBtn.innerHTML = `<i class="fa-solid fa-heart" style="color: white;"></i> Liked (${item.likes || 0})`;
          likeBtn.style.background = 'linear-gradient(135deg, #ff416c, #ff4b2b)';
        } else {
          likeBtn.innerHTML = `<i class="fa-regular fa-heart"></i> Like (${item.likes || 0})`;
          likeBtn.style.background = 'rgba(0,0,0,0.4)';
        }
      }
      
      const commentsTitle = document.getElementById(`comments-title-${item.id}`);
      if (commentsTitle) {
        commentsTitle.innerHTML = `<i class="fa-solid fa-comments"></i> Comments (${(item.comments || []).length})`;
      }
      
      const commentsList = document.getElementById(`comments-list-${item.id}`);
      if (commentsList && commentsList.children.length !== (item.comments || []).length) {
        commentsList.innerHTML = '';
        (item.comments || []).forEach(c => {
          const cEl = document.createElement('div');
          cEl.className = 'comment';
          cEl.innerText = c.text;
          commentsList.appendChild(cEl);
        });
      }
      
      const commentBtn = document.getElementById(`comment-btn-${item.id}`);
      if (commentBtn) commentBtn.disabled = false;
      
      continue;
    }
    
    card = document.createElement('div');
    card.className = 'card';
    card.id = `media-card-${item.id}`;
    
    const title = document.createElement('div');
    title.className = 'card-title';
    title.innerHTML = `<i class="fa-solid ${isImage ? 'fa-image' : 'fa-clapperboard'}" style="color: var(--accent); margin-right: 8px;"></i>${item.name}`;
    
    let mediaEl;
    if (isImage) {
      mediaEl = document.createElement('img');
      mediaEl.style.width = '100%';
      mediaEl.style.borderRadius = '12px';
      mediaEl.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
      mediaEl.style.marginBottom = '12px';
      if (item.url) mediaEl.src = item.url;
    } else {
      mediaEl = document.createElement('video');
      mediaEl.controls = true;
      mediaEl.playsInline = true;
      if (item.url) {
        mediaEl.src = item.url;
        if (item.coverUrl) {
          mediaEl.poster = item.coverUrl;
        }
        mediaEl.crossOrigin = 'anonymous';
        mediaEl.addEventListener('play', () => {
          incrementStat(item.id, 'views');
        }, {once: true});
      }
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
        a.download = item.name || ('media-' + item.id);
        document.body.appendChild(a);
        a.click();
        a.remove();
        incrementStat(item.id, 'downloads');
      } catch(err) {
        alert('Failed to download media.');
        console.error(err);
      }
      dl.innerHTML = oldHtml;
      dl.style.pointerEvents = 'auto';
    });
    
    const likeBtn = document.createElement('button');
    likeBtn.className = 'btn like-btn';
    likeBtn.id = `like-btn-${item.id}`;
    
    if (hasLiked) {
      likeBtn.innerHTML = `<i class="fa-solid fa-heart" style="color: white;"></i> Liked (${item.likes || 0})`;
      likeBtn.style.background = 'linear-gradient(135deg, #ff416c, #ff4b2b)';
    } else {
      likeBtn.innerHTML = `<i class="fa-regular fa-heart"></i> Like (${item.likes || 0})`;
      likeBtn.style.background = 'rgba(0,0,0,0.4)';
    }
    
    likeBtn.addEventListener('click', async () => {
      likeBtn.disabled = true;
      if (localStorage.getItem('liked_' + item.id) === 'true') {
        localStorage.removeItem('liked_' + item.id);
        likeBtn.innerHTML = `<i class="fa-regular fa-heart"></i> Like (${Math.max((item.likes || 0) - 1, 0)})`;
        likeBtn.style.background = 'rgba(0,0,0,0.4)';
        await decrementStat(item.id, 'likes');
      } else {
        localStorage.setItem('liked_' + item.id, 'true');
        likeBtn.innerHTML = `<i class="fa-solid fa-heart" style="color: white;"></i> Liked (${(item.likes || 0) + 1})`;
        likeBtn.style.background = 'linear-gradient(135deg, #ff416c, #ff4b2b)';
        await incrementStat(item.id, 'likes');
      }
      likeBtn.disabled = false;
    });

    const statsRow = document.createElement('div');
    statsRow.className = 'stats-row';
    statsRow.appendChild(likeBtn);
    statsRow.appendChild(dl);

    const commentsSection = document.createElement('div');
    commentsSection.className = 'comments-section';
    
    const commentsTitle = document.createElement('h3');
    commentsTitle.id = `comments-title-${item.id}`;
    commentsTitle.innerHTML = `<i class="fa-solid fa-comments"></i> Comments (${(item.comments || []).length})`;
    commentsSection.appendChild(commentsTitle);
    
    const commentsList = document.createElement('div');
    commentsList.className = 'comments-list';
    commentsList.id = `comments-list-${item.id}`;
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
      <button type="submit" class="btn" id="comment-btn-${item.id}"><i class="fa-solid fa-paper-plane"></i></button>
    `;
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = commentForm.querySelector('input');
      const text = input.value.trim();
      if (text) {
        const btn = document.getElementById(`comment-btn-${item.id}`);
        if (btn) btn.disabled = true;
        await addComment(item.id, text);
        input.value = '';
      }
    });
    commentsSection.appendChild(commentForm);

    card.appendChild(title);
    card.appendChild(mediaEl);
    card.appendChild(statsRow);
    card.appendChild(commentsSection);
    targetContainer.appendChild(card);
  }
}

render();
window.addEventListener('focus', () => render());
window.addEventListener('db-update', () => render());
