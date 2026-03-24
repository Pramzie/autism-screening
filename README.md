# SpectrumSense

A CNN-based autism screening system that analyses facial cues via webcam — blink rate, facial symmetry, expression variability, and gaze patterns — to produce a non-invasive screening indicator.

> **Disclaimer:** This is a research and educational tool developed as a minor project at KIIT University. It is not a clinical diagnostic instrument. Always consult a qualified developmental paediatrician or psychologist.

---

## Project Structure

```
spectrumsense/
├── frontend/
│   ├── index.html          # Main page (links to css/ and js/)
│   ├── css/
│   │   └── styles.css      # All styling
│   └── js/
│       └── main.js         # Three.js, Leaflet, screening logic
│
├── backend/
│   ├── app.py              # Flask server — /predict endpoint
│   ├── requirements.txt    # Python dependencies
│   └── model.h5            # ← Place your trained Keras model here
│
├── render.yaml             # Render deployment config
├── .gitattributes          # Git LFS config for model files
├── .gitignore
└── README.md
```

---

## Quick Start

### 1. Clone and set up

```bash
git clone https://github.com/your-username/spectrumsense.git
cd spectrumsense
```

### 2. Add your model

Copy your trained Keras model into the backend folder:

```bash
cp /path/to/your/model.h5 backend/model.h5
```

### 3. Run the backend locally

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend will start at `http://localhost:5000`.

### 4. Connect the frontend

Open `frontend/js/main.js` and set the backend URL:

```js
// Line near the bottom of main.js — change this:
const BACKEND_URL = 'https://your-app.onrender.com';

// To this for local development:
const BACKEND_URL = 'http://localhost:5000';
```

Then open `frontend/index.html` directly in your browser (or serve it — see below).

### 5. Open the frontend

You can open `frontend/index.html` directly as a file, or serve it with any static server:

```bash
# Python one-liner from the frontend/ folder:
cd frontend
python -m http.server 8080
# Then open http://localhost:8080
```

---

## Deploying to Render

### Step 1 — Set up Git LFS for your model file

Your `.h5` model is likely too large for a regular Git commit. Use Git LFS:

```bash
git lfs install
git add .gitattributes
git add backend/model.h5
git commit -m "add model via Git LFS"
git push
```

### Step 2 — Deploy

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repository
3. Render auto-detects `render.yaml` and fills in all settings
4. Choose **Free** instance type
5. Click **Deploy** — first build takes ~10 minutes (TensorFlow install)

### Step 3 — Update the frontend URL

Once deployed, Render gives you a URL like:
```
https://spectrumsense-backend.onrender.com
```

Update `frontend/js/main.js`:

```js
const BACKEND_URL = 'https://spectrumsense-backend.onrender.com';
```

Then redeploy or re-open your frontend — the screening panel will now call your live backend.

---

## API Reference

### `GET /`
Health check.
```json
{ "status": "ok", "service": "SpectrumSense Backend" }
```

### `POST /predict`

**Request body:**
```json
{
  "frames": ["<base64_jpeg>", "<base64_jpeg>", "..."]
}
```
Up to 50 frames, each a base64-encoded JPEG at 224×224px.

**Response:**
```json
{
  "avg_prob":               0.7821,
  "severity":               "Medium",
  "frames_analysed":        50,
  "eye_ratio":              0.84,
  "symmetry":               3.21,
  "head_movement":          0.0,
  "expression_variability": 12.44,
  "blink_rate":             0.0
}
```

| Field | Description |
|---|---|
| `avg_prob` | Mean CNN output probability (0–1) |
| `severity` | `Non-Autistic` / `Low` / `Medium` / `High` |
| `eye_ratio` | Proportion of frames where both eyes were detected |
| `symmetry` | Mean facial asymmetry % (lower = more symmetric) |
| `head_movement` | Mean centroid displacement across frames (px) |
| `expression_variability` | Frame-to-frame mean pixel difference |
| `blink_rate` | Estimated blinks/min (implement EAR tracking for accuracy) |

---

## Notes on Free Render Tier

Render free services **spin down after 15 minutes of inactivity**. The first request after sleeping takes 30–60 seconds while TensorFlow reloads. This is fine for demos. For always-on, upgrade to Render Starter ($7/month) or use Hugging Face Spaces (free, better for ML workloads).

---

## Built With

- **Frontend:** Vanilla HTML/CSS/JS, Three.js, Leaflet.js, OpenStreetMap
- **Backend:** Python, Flask, TensorFlow/Keras, OpenCV, NumPy
- **Deployment:** Render (backend), static hosting or direct file open (frontend)
- **Model:** Trained Keras CNN on ASD facial image dataset
