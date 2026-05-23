import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://xtrrxjvwparskbtdguuy.supabase.co';
const supabaseKey = 'sb_publishable_M-7CyggKW6e3ZtWhVADdnA_E6bGmVzy';
const supabase = createClient(supabaseUrl, supabaseKey);

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const callScreen = document.getElementById('call-screen');
const createBtn = document.getElementById('create-room-btn');
const joinBtn = document.getElementById('join-room-btn');
const roomInput = document.getElementById('room-input');
const setupStatus = document.getElementById('setup-status');
const roomDisplay = document.getElementById('room-display');
const copyLinkBtn = document.getElementById('copy-link-btn');

const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const remoteLabel = document.getElementById('remote-label');

const micBtn = document.getElementById('toggle-mic-btn');
const camBtn = document.getElementById('toggle-cam-btn');
const leaveBtn = document.getElementById('leave-call-btn');

// WebRTC State
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let roomId = null;
let supabaseChannel = null;
let isCaller = false;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Start Media
async function initMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    return true;
  } catch (err) {
    console.error("Error accessing media devices.", err);
    setupStatus.textContent = "Could not access camera/microphone. Please grant permissions.";
    return false;
  }
}

// Setup Peer Connection
function createPeerConnection() {
  peerConnection = new RTCPeerConnection(rtcConfig);
  
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;
  
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });
  
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    });
    remoteLabel.textContent = "Connected";
  };
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      supabaseChannel.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: { candidate: event.candidate, sender: isCaller ? 'caller' : 'callee' }
      });
    }
  };
  
  peerConnection.onconnectionstatechange = () => {
    if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
      remoteLabel.textContent = "Disconnected";
    }
  };
}

// Signaling via Supabase
async function joinRoom(room) {
  roomId = room;
  roomDisplay.textContent = `Room: ${roomId}`;
  
  const success = await initMedia();
  if (!success) return;
  
  setupScreen.hidden = true;
  callScreen.hidden = false;
  
  supabaseChannel = supabase.channel(`webrtc-${roomId}`);
  
  supabaseChannel.on('broadcast', { event: 'offer' }, async (payload) => {
    if (isCaller) return; // Caller created the offer, shouldn't receive it
    console.log('Received offer');
    if (!peerConnection) createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    supabaseChannel.send({ type: 'broadcast', event: 'answer', payload: { answer } });
  });
  
  supabaseChannel.on('broadcast', { event: 'answer' }, async (payload) => {
    if (!isCaller) return; // Only caller receives answers
    console.log('Received answer');
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
  });
  
  supabaseChannel.on('broadcast', { event: 'ice-candidate' }, async (payload) => {
    if (!peerConnection) return;
    // Don't process our own candidates
    if ((isCaller && payload.payload.sender === 'caller') || (!isCaller && payload.payload.sender === 'callee')) return;
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
    } catch (e) {
      console.error('Error adding ICE candidate', e);
    }
  });
  
  supabaseChannel.on('broadcast', { event: 'peer-joined' }, async () => {
    if (isCaller) {
      console.log('Peer joined, creating offer');
      createPeerConnection();
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      supabaseChannel.send({ type: 'broadcast', event: 'offer', payload: { offer } });
    }
  });

  await supabaseChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      if (!isCaller) {
        // Let the caller know we joined so they can send the offer
        supabaseChannel.send({ type: 'broadcast', event: 'peer-joined', payload: {} });
      }
    }
  });
}

// UI Event Listeners
createBtn.addEventListener('click', () => {
  isCaller = true;
  const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  joinRoom(newRoomId);
  // Update URL so it can be easily copied
  window.history.pushState({}, '', `?room=${newRoomId}`);
});

joinBtn.addEventListener('click', () => {
  const room = roomInput.value.trim().toUpperCase();
  if (room) {
    isCaller = false;
    joinRoom(room);
  } else {
    setupStatus.textContent = "Please enter a valid room ID.";
  }
});

copyLinkBtn.addEventListener('click', () => {
  const url = window.location.origin + window.location.pathname + '?room=' + roomId;
  navigator.clipboard.writeText(url).then(() => {
    const oldText = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => copyLinkBtn.innerHTML = oldText, 2000);
  });
});

micBtn.addEventListener('click', () => {
  if (!localStream) return;
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    micBtn.innerHTML = audioTrack.enabled ? '<i class="fa-solid fa-microphone"></i>' : '<i class="fa-solid fa-microphone-slash"></i>';
    micBtn.style.color = audioTrack.enabled ? 'white' : 'var(--danger)';
  }
});

camBtn.addEventListener('click', () => {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    camBtn.innerHTML = videoTrack.enabled ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-video-slash"></i>';
    camBtn.style.color = videoTrack.enabled ? 'white' : 'var(--danger)';
  }
});

leaveBtn.addEventListener('click', () => {
  if (peerConnection) {
    peerConnection.close();
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  window.location.href = 'index.html';
});

// Check if joined via URL
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
if (roomParam) {
  roomInput.value = roomParam;
}
