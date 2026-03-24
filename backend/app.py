"""
SpectrumSense — Flask Backend
Receives 50 base64-encoded JPEG frames from the frontend,
runs them through the trained Keras CNN, and returns a
probability score + severity band + feature metrics.
"""

import os
import io
import base64
import logging
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from tensorflow.keras.models import load_model
import cv2

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# ── App setup ──────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)   # Required — allows browser requests from the frontend origin

# ── Load model once at startup (not per request) ──────────────────────────
MODEL_PATH = os.environ.get("MODEL_PATH", "model.h5")
log.info(f"Loading model from: {MODEL_PATH}")
model = load_model(MODEL_PATH)
log.info("Model loaded successfully.")

# ── Haar cascade for eye detection ────────────────────────────────────────
EYE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_eye.xml"
eye_cascade = cv2.CascadeClassifier(EYE_CASCADE_PATH)


# ── Helpers ───────────────────────────────────────────────────────────────

def decode_frame(b64_string: str) -> np.ndarray:
    """Decode a base64 JPEG string to a numpy RGB array (224x224)."""
    img_bytes = base64.b64decode(b64_string)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize((224, 224))
    return np.array(img, dtype=np.float32)


def compute_symmetry(frame: np.ndarray) -> float:
    """
    Pixel-intensity symmetry between left and right halves.
    Returns asymmetry percentage (0 = perfect symmetry).
    """
    gray = np.mean(frame, axis=2)           # convert to grayscale
    left  = gray[:, : gray.shape[1] // 2]
    right = np.fliplr(gray[:, gray.shape[1] // 2 :])
    # Trim to same width in case of odd dimension
    w = min(left.shape[1], right.shape[1])
    diff = np.abs(left[:, :w] - right[:, :w])
    mean_val = np.mean(gray) + 1e-6         # avoid division by zero
    return float(np.mean(diff) / mean_val * 100)


def detect_eyes(frame: np.ndarray) -> bool:
    """Return True if both eyes are detected in the frame."""
    gray_uint8 = cv2.cvtColor(frame.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    eyes = eye_cascade.detectMultiScale(gray_uint8, scaleFactor=1.1, minNeighbors=5)
    return len(eyes) >= 2


def compute_head_movement(centroids: list) -> float:
    """
    Mean centroid displacement across consecutive frames (pixels).
    `centroids` is a list of (cx, cy) tuples — we use centre of frame
    as a proxy when a face detector is not available.
    """
    if len(centroids) < 2:
        return 0.0
    displacements = [
        np.sqrt((centroids[i][0] - centroids[i-1][0])**2 +
                (centroids[i][1] - centroids[i-1][1])**2)
        for i in range(1, len(centroids))
    ]
    return float(np.mean(displacements))


def classify_severity(avg_prob: float) -> str:
    if avg_prob >= 0.85:   return "High"
    elif avg_prob >= 0.65: return "Medium"
    elif avg_prob >= 0.50: return "Low"
    else:                  return "Non-Autistic"


# ── Routes ────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def health():
    """Health check — used by Render and the frontend test button."""
    return jsonify({"status": "ok", "service": "SpectrumSense Backend"})


@app.route("/predict", methods=["POST"])
def predict():
    """
    Expects JSON body:
        { "frames": ["<base64_jpeg>", ...] }   (up to 50 frames)

    Returns JSON:
        {
            "avg_prob":               float,   # 0.0 – 1.0
            "severity":               str,     # Non-Autistic | Low | Medium | High
            "frames_analysed":        int,
            "eye_ratio":              float,   # proportion of frames with both eyes detected
            "symmetry":               float,   # mean asymmetry %
            "head_movement":          float,   # mean centroid displacement (px)
            "expression_variability": float,   # frame-to-frame pixel variance
            "blink_rate":             float    # estimated blinks/min (placeholder)
        }
    """
    data = request.get_json(force=True, silent=True)
    if not data or "frames" not in data:
        return jsonify({"error": "Missing 'frames' key in request body."}), 400

    frames_b64 = data["frames"]
    if not isinstance(frames_b64, list) or len(frames_b64) == 0:
        return jsonify({"error": "'frames' must be a non-empty list."}), 400

    # Cap at 50 frames to match frontend capture window
    frames_b64 = frames_b64[:50]

    decoded_frames = []
    for i, b64 in enumerate(frames_b64):
        try:
            decoded_frames.append(decode_frame(b64))
        except Exception as e:
            log.warning(f"Frame {i} decode error: {e}")

    if not decoded_frames:
        return jsonify({"error": "No valid frames could be decoded."}), 422

    # ── CNN inference ──────────────────────────────────────────────────────
    probs = []
    for frame in decoded_frames:
        arr = frame / 255.0
        arr = np.expand_dims(arr, axis=0)
        prob = float(model.predict(arr, verbose=0)[0][0])
        probs.append(prob)

    avg_prob = float(np.mean(probs))

    # ── Feature metrics ───────────────────────────────────────────────────
    # Eye detection ratio
    eye_detections = [detect_eyes(f) for f in decoded_frames]
    eye_ratio = float(sum(eye_detections) / len(eye_detections))

    # Facial symmetry (mean across frames)
    symmetry_vals = [compute_symmetry(f) for f in decoded_frames]
    symmetry = float(np.mean(symmetry_vals))

    # Head movement — use image centroid as proxy
    centroids = [(f.shape[1] / 2, f.shape[0] / 2) for f in decoded_frames]  # fixed; swap with face detector if available
    head_movement = compute_head_movement(centroids)

    # Expression variability — frame-to-frame mean pixel diff
    if len(decoded_frames) > 1:
        diffs = [np.mean(np.abs(decoded_frames[i].astype(float) - decoded_frames[i-1].astype(float)))
                 for i in range(1, len(decoded_frames))]
        expression_variability = float(np.mean(diffs))
    else:
        expression_variability = 0.0

    # Blink rate — placeholder (real detection needs temporal eye-open/close tracking)
    # A proper implementation would track eye aspect ratio (EAR) across frames.
    blink_rate = 0.0  # replace with your blink detection logic if implemented

    result = {
        "avg_prob":               round(avg_prob, 4),
        "severity":               classify_severity(avg_prob),
        "frames_analysed":        len(decoded_frames),
        "eye_ratio":              round(eye_ratio, 4),
        "symmetry":               round(symmetry, 4),
        "head_movement":          round(head_movement, 4),
        "expression_variability": round(expression_variability, 4),
        "blink_rate":             round(blink_rate, 2),
    }

    log.info(f"Prediction: {result['severity']} ({result['avg_prob']}) on {result['frames_analysed']} frames")
    return jsonify(result)


# ── Entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
