import { saveVideo, getAllVideos, deleteVideo, updateVideo, getVideo, bc } from './video-db.js?v=4';

bc.onmessage = (e) => {
  if (e.data === 'update') updateAnalytics();
};

const ADMIN_PASSWORD = 'actress@69'; // frontend-only password
const MAX_FILE_SIZE_MB = 100; // 100 MB limit
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const login = document.getElementById('login');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const adminUI = document.getElementById('adminUI');
const preview = document.getElementById('preview');
const startRec = document.getElementById('startRec');
const stopRec = document.getElementById('stopRec');
const status = document.getElementById('status');
const fileInput = document.getElementById('fileInput');

// Editor elements
const videoEditor = document.getElementById('video-editor');
const editorVideo = document.getElementById('editor-video');
const videoWrapper = document.getElementById('video-wrapper');
const cropOverlay = document.getElementById('crop-overlay');
const cropHandle = document.getElementById('crop-handle');
const trimStart = document.getElementById('trim-start');
const trimEnd = document.getElementById('trim-end');
const enableCrop = document.getElementById('enable-crop');
const cropSettings = document.getElementById('crop-settings');
const cropX = document.getElementById('crop-x');
const cropY = document.getElementById('crop-y');
const cropW = document.getElementById('crop-w');
const cropH = document.getElementById('crop-h');
const cancelEdit = document.getElementById('cancel-edit');
const processVideoBtn = document.getElementById('process-video');
const processStatus = document.getElementById('process-status');
const customVideoName = document.getElementById('custom-video-name');

let currentOriginalBlob = null;
let currentOriginalName = null;

let editingVideoId = null;
let editingVideoViews = 0;
let editingVideoDownloads = 0;
let editingVideoCreatedAt = null;

enableCrop.addEventListener('change', () => {
  cropSettings.style.opacity = enableCrop.checked ? '1' : '0.5';
  cropSettings.style.pointerEvents = enableCrop.checked ? 'auto' : 'none';
  cropOverlay.style.display = enableCrop.checked ? 'block' : 'none';
});

let isDragging = false;
let isResizing = false;
let startX, startY, startW, startH, startTop, startLeft;

cropOverlay.addEventListener('mousedown', (e) => {
  if (e.target === cropHandle) isResizing = true;
  else isDragging = true;
  
  startX = e.clientX;
  startY = e.clientY;
  startW = cropOverlay.offsetWidth;
  startH = cropOverlay.offsetHeight;
  startTop = cropOverlay.offsetTop;
  startLeft = cropOverlay.offsetLeft;
  e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging && !isResizing) return;
  
  if (isResizing) {
    let newW = startW + (e.clientX - startX);
    let newH = startH + (e.clientY - startY);
    if (startLeft + newW > videoWrapper.offsetWidth) newW = videoWrapper.offsetWidth - startLeft;
    if (startTop + newH > videoWrapper.offsetHeight) newH = videoWrapper.offsetHeight - startTop;
    
    cropOverlay.style.width = Math.max(30, newW) + 'px';
    cropOverlay.style.height = Math.max(30, newH) + 'px';
  } else if (isDragging) {
    let newL = startLeft + (e.clientX - startX);
    let newT = startTop + (e.clientY - startY);
    if (newL < 0) newL = 0;
    if (newT < 0) newT = 0;
    if (newL + startW > videoWrapper.offsetWidth) newL = videoWrapper.offsetWidth - startW;
    if (newT + startH > videoWrapper.offsetHeight) newT = videoWrapper.offsetHeight - startH;
    
    cropOverlay.style.left = newL + 'px';
    cropOverlay.style.top = newT + 'px';
  }
  updateCropInputsFromVisual();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  isResizing = false;
});

function updateCropInputsFromVisual() {
  const scaleX = editorVideo.videoWidth / editorVideo.offsetWidth;
  const scaleY = editorVideo.videoHeight / editorVideo.offsetHeight;
  
  cropX.value = Math.round(cropOverlay.offsetLeft * scaleX);
  cropY.value = Math.round(cropOverlay.offsetTop * scaleY);
  cropW.value = Math.round(cropOverlay.offsetWidth * scaleX);
  cropH.value = Math.round(cropOverlay.offsetHeight * scaleY);
}

let mediaStream = null;
let recorder = null;
let chunks = [];

loginBtn.addEventListener('click', () => {
  if(passwordInput.value === ADMIN_PASSWORD){
    login.hidden = true;
    adminUI.hidden = false;
    updateAnalytics();
    initCamera().catch(err => {
      status.textContent = 'Camera not available: ' + err.message;
    });
  } else {
    alert('Wrong password');
  }
});

async function initCamera(){
  try{
    mediaStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    preview.srcObject = mediaStream;
  }catch(e){
    throw e;
  }
}

startRec.addEventListener('click', () => {
  if(!mediaStream) return;
  chunks = [];
  recorder = new MediaRecorder(mediaStream);
  recorder.ondataavailable = (ev) => chunks.push(ev.data);
  recorder.onstop = async () => {
    const blob = new Blob(chunks, {type: recorder.mimeType || 'video/webm'});
    
    if (blob.size > MAX_FILE_SIZE_BYTES) {
      status.style.color = 'var(--danger)';
      status.textContent = `Error: Recording exceeds the ${MAX_FILE_SIZE_MB}MB limit.`;
      return;
    }
    
    const name = 'camera-' + new Date().toISOString();
    status.style.color = 'var(--success)';
    
    try {
      await saveVideo(blob, name);
      updateAnalytics();
      status.textContent = 'Saved ' + name;
    } catch (err) {
      status.style.color = 'var(--danger)';
      status.textContent = 'Save failed: ' + err.message;
    }
  };
  recorder.start();
  startRec.disabled = true;
  stopRec.disabled = false;
});

stopRec.addEventListener('click', () => {
  if(recorder && recorder.state === 'recording') recorder.stop();
  startRec.disabled = false;
  stopRec.disabled = true;
});

fileInput.addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  
  if (f.size > MAX_FILE_SIZE_BYTES) {
    status.style.color = 'var(--danger)';
    status.textContent = `Error: File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.`;
    e.target.value = ''; // Reset input
    return;
  }
  
  currentOriginalBlob = f;
  currentOriginalName = f.name || ('upload-' + Date.now());
  customVideoName.value = currentOriginalName;
  
  videoEditor.hidden = false;
  fileInput.disabled = true;
  
  const url = URL.createObjectURL(f);
  editorVideo.src = url;
  
  editorVideo.onloadedmetadata = () => {
    trimStart.value = 0;
    trimEnd.value = editorVideo.duration.toFixed(1);
    trimEnd.max = editorVideo.duration.toFixed(1);
    
    const aspect = editorVideo.videoWidth / editorVideo.videoHeight;
    const maxH = 300;
    let dispH = maxH;
    let dispW = maxH * aspect;
    
    const containerW = videoEditor.clientWidth - 40; 
    if (dispW > containerW) {
      dispW = containerW;
      dispH = dispW / aspect;
    }
    
    editorVideo.style.width = dispW + 'px';
    editorVideo.style.height = dispH + 'px';
    videoWrapper.style.width = dispW + 'px';
    videoWrapper.style.height = dispH + 'px';
    
    cropW.value = editorVideo.videoWidth;
    cropH.value = editorVideo.videoHeight;
    cropX.value = 0;
    cropY.value = 0;
    
    cropOverlay.style.width = dispW + 'px';
    cropOverlay.style.height = dispH + 'px';
    cropOverlay.style.left = '0px';
    cropOverlay.style.top = '0px';
  };
});

cancelEdit.addEventListener('click', () => {
  videoEditor.hidden = true;
  fileInput.disabled = false;
  fileInput.value = '';
  editorVideo.pause();
  URL.revokeObjectURL(editorVideo.src);
  currentOriginalBlob = null;
  processStatus.textContent = '';
  editingVideoId = null;
  editingVideoViews = 0;
  editingVideoDownloads = 0;
  editingVideoCreatedAt = null;
});

processVideoBtn.addEventListener('click', async () => {
  try {
    const start = parseFloat(trimStart.value);
    const end = parseFloat(trimEnd.value);
    
    if (start >= end) {
      processStatus.textContent = 'Error: Start must be before End.';
      return;
    }
    
    if (!editorVideo.captureStream && !editorVideo.mozCaptureStream) {
      throw new Error("Your browser doesn't support video captureStream API.");
    }
    
    processStatus.textContent = 'Processing... Please wait (this takes real time).';
    processVideoBtn.disabled = true;
    cancelEdit.disabled = true;
    editorVideo.currentTime = start;
    
    await editorVideo.play();
    
    let stream;
    let canvas;
    let ctx;
    let animFrame;
    let processing = true;
    
    if (enableCrop.checked) {
      canvas = document.createElement('canvas');
      canvas.width = parseInt(cropW.value);
      canvas.height = parseInt(cropH.value);
      ctx = canvas.getContext('2d');
      
      const draw = () => {
        if (!processing) return;
        ctx.drawImage(editorVideo, parseInt(cropX.value), parseInt(cropY.value), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        animFrame = requestAnimationFrame(draw);
      };
      draw();
      stream = canvas.captureStream(30);
      const origStream = editorVideo.captureStream ? editorVideo.captureStream() : editorVideo.mozCaptureStream();
      if (origStream) {
        const audioTracks = origStream.getAudioTracks();
        if (audioTracks.length > 0) stream.addTrack(audioTracks[0]);
      }
    } else {
      stream = editorVideo.captureStream ? editorVideo.captureStream() : editorVideo.mozCaptureStream();
    }
    
    if (!stream || stream.getTracks().length === 0) {
      throw new Error("Failed to capture video stream.");
    }
    
    const recChunks = [];
    const finalRec = new MediaRecorder(stream);
    finalRec.ondataavailable = e => { if (e.data.size > 0) recChunks.push(e.data); };
    finalRec.onstop = async () => {
      processing = false;
      if (animFrame) cancelAnimationFrame(animFrame);
      const mime = finalRec.mimeType || 'video/webm';
      const finalBlob = new Blob(recChunks, { type: mime });
      try {
        const finalNameToSave = customVideoName.value.trim() || currentOriginalName;
        if (editingVideoId) {
          await updateVideo(editingVideoId, finalBlob, finalNameToSave, editingVideoViews, editingVideoDownloads, editingVideoCreatedAt);
        } else {
          await saveVideo(finalBlob, finalNameToSave);
        }
        updateAnalytics();
        status.style.color = 'var(--success)';
        status.textContent = (editingVideoId ? 'Updated ' : 'Uploaded ') + finalNameToSave;
      } catch (err) {
        status.style.color = 'var(--danger)';
        status.textContent = 'Operation failed: ' + err.message;
      }
      
      videoEditor.hidden = true;
      fileInput.disabled = false;
      fileInput.value = '';
      processVideoBtn.disabled = false;
      cancelEdit.disabled = false;
      processStatus.textContent = '';
      editorVideo.pause();
      URL.revokeObjectURL(editorVideo.src);
      editingVideoId = null;
    };
    
    finalRec.start();
    
    const timeUpdateHandler = () => {
      if (editorVideo.currentTime >= end) {
        editorVideo.removeEventListener('timeupdate', timeUpdateHandler);
        editorVideo.pause();
        if(finalRec.state === 'recording') finalRec.stop();
      }
    };
    editorVideo.addEventListener('timeupdate', timeUpdateHandler);
  } catch (err) {
    processStatus.textContent = 'Error: ' + err.message;
    processVideoBtn.disabled = false;
    cancelEdit.disabled = false;
  }
});

async function updateAnalytics() {
  const container = document.getElementById('analytics-container');
  if (!container) return;
  
  const all = await getAllVideos();
  
  if (!all || all.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">No videos uploaded yet.</p>';
    return;
  }
  
  all.sort((a,b) => b.createdAt - a.createdAt);
  
  const existingNodes = container.querySelectorAll('.analytics-row');
  if (existingNodes.length !== all.length || existingNodes.length === 0) {
    container.innerHTML = '';
    for (const item of all) {
      const row = document.createElement('div');
      row.className = 'analytics-row';
      row.id = 'analytics-row-' + item.id;
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '10px';
      row.style.background = 'rgba(0,0,0,0.2)';
      row.style.borderRadius = '8px';
      row.style.border = '1px solid var(--glass-border)';
      
      const info = document.createElement('div');
      info.id = 'analytics-info-' + item.id;
      
      const actionsDiv = document.createElement('div');
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '10px';
      
      const editBtn = document.createElement('button');
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
      editBtn.className = 'btn';
      editBtn.style.padding = '6px 12px';
      editBtn.onclick = async () => {
        const fullVideo = await getVideo(item.id);
        if(!fullVideo) return;
        
        editingVideoId = fullVideo.id;
        editingVideoViews = fullVideo.views;
        editingVideoDownloads = fullVideo.downloads;
        editingVideoCreatedAt = fullVideo.createdAt;
        
        currentOriginalBlob = fullVideo.blob;
        currentOriginalName = fullVideo.name;
        customVideoName.value = currentOriginalName;
        
        videoEditor.hidden = false;
        fileInput.disabled = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const url = URL.createObjectURL(fullVideo.blob);
        editorVideo.src = url;
        
        editorVideo.onloadedmetadata = () => {
          trimStart.value = 0;
          trimEnd.value = editorVideo.duration.toFixed(1);
          trimEnd.max = editorVideo.duration.toFixed(1);
          
          const aspect = editorVideo.videoWidth / editorVideo.videoHeight;
          const maxH = 300;
          let dispH = maxH;
          let dispW = maxH * aspect;
          
          const containerW = videoEditor.clientWidth - 40; 
          if (dispW > containerW) {
            dispW = containerW;
            dispH = dispW / aspect;
          }
          
          editorVideo.style.width = dispW + 'px';
          editorVideo.style.height = dispH + 'px';
          videoWrapper.style.width = dispW + 'px';
          videoWrapper.style.height = dispH + 'px';
          
          cropW.value = editorVideo.videoWidth;
          cropH.value = editorVideo.videoHeight;
          cropX.value = 0;
          cropY.value = 0;
          
          cropOverlay.style.width = dispW + 'px';
          cropOverlay.style.height = dispH + 'px';
          cropOverlay.style.left = '0px';
          cropOverlay.style.top = '0px';
        };
      };
      
      const delBtn = document.createElement('button');
      delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      delBtn.style.background = 'var(--danger)';
      delBtn.style.padding = '6px 12px';
      delBtn.onclick = async () => {
        if(confirm('Delete this video?')) {
          await deleteVideo(item.id);
          updateAnalytics();
        }
      };
      
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(delBtn);
      
      row.appendChild(info);
      row.appendChild(actionsDiv);
      container.appendChild(row);
    }
  }
  
  for (const item of all) {
    const info = document.getElementById('analytics-info-' + item.id);
    if (info) {
      info.innerHTML = `<strong>${item.name}</strong><br>
        <span style="font-size: 0.85rem; color: var(--text-secondary);">
          <i class="fa-solid fa-eye"></i> ${item.views || 0} Views &nbsp;|&nbsp; 
          <i class="fa-solid fa-download"></i> ${item.downloads || 0} Downloads
        </span>`;
    }
  }
}
