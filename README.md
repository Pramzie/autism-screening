# SpectrumSense — Frontend

## Folder Structure

```
SpectrumSense-frontend/
├── index.html          ← entry point
├── css/
│   └── styles.css
├── js/
│   └── main.js
└── vercel.json         ← fixes Vercel 404 routing
```

## Running Locally (with backend)

1. Start your **Python/Flask backend** on the other machine (or locally) and note its URL.
2. Open `js/main.js` and update line 418:
   ```js
   const BACKEND_URL = 'http://localhost:5000'; // or your LAN IP, e.g. http://192.168.x.x:5000
   ```
3. Serve the frontend with any static server:
   ```bash
   # Option A — Python (no install needed)
   python -m http.server 8080

   # Option B — Node (npx, no install needed)
   npx serve .

   # Option C — VS Code Live Server extension
   Right-click index.html → "Open with Live Server"
   ```
4. Visit http://localhost:8080 in your browser.

## CORS note
Your Flask backend must allow requests from the frontend origin.
Add this to your Flask app if not already present:
```python
from flask_cors import CORS
CORS(app)
```
