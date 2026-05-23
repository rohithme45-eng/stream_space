Video Uploader - Frontend-only demo

What it does
- `admin.html`: Admin can enter a frontend-only password, record from camera, or upload video files. Videos are saved in the browser using IndexedDB.
- `index.html`: Public viewer lists saved videos and allows playback/download. Users cannot upload or delete in this frontend-only demo.

Notes
- This is frontend-only. The "admin password" is only a client-side gate (not secure). For real security and persistence across devices, add a server and authenticated API.
- Camera access and MediaRecorder require a secure context (HTTPS) or `http://localhost`.

Run locally

Quick static server (Python 3):

```bash
# from the repository root
python -m http.server 8000
# then open http://localhost:8000/index.html and http://localhost:8000/admin.html
```

Or use any static server (Node `http-server`, etc.).
