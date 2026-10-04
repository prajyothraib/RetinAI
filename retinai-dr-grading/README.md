<div align="center">

# 🔬 RetinAI

### Diabetic Retinopathy Severity Grading with Deep Learning

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**RetinAI** is a full-stack research prototype that automatically grades the severity of Diabetic Retinopathy (DR) from fundus photographs using a hybrid **CNN + Attention-LSTM** architecture built on **EfficientNet-B0**.

> ⚠️ **Disclaimer:** This is a research prototype and is **not** a medical device or a clinical diagnosis tool.

</div>

---

## 📖 Table of Contents

- [How It Works](#-how-it-works)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
  - [1 · Backend Setup](#1--backend-setup)
  - [2 · Frontend Setup](#2--frontend-setup)
- [Running the App](#-running-the-app)
- [API Reference](#-api-reference)
- [Grading Scale](#-grading-scale)
- [Deployment](#-deployment)

---

## ✨ How It Works

1. A fundus image is uploaded via the web interface.
2. The backend preprocesses the image (crop → pad square → resize → Ben Graham normalisation).
3. An **EfficientNet-B0 CNN** extracts spatial feature maps.
4. An **Attention-LSTM decoder** performs autoregressive severity-stage prediction.
5. The API returns the DR grade, per-class probabilities, and an **attention heatmap** showing which retinal regions influenced the decision.

---

## 🏗 Architecture

```
fundus image
     │
     ▼
┌─────────────────────────────┐
│  Preprocessing Pipeline     │
│  crop → pad → resize (320)  │
│  Ben Graham normalisation   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  EfficientNet-B0 Backbone   │  ← pretrained feature extractor
│  + 1×1 Conv projection      │
└────────────┬────────────────┘
             │  spatial feature map (H×W×256)
             ▼
┌─────────────────────────────┐
│  Attention-LSTM Decoder     │
│  Bahdanau attention         │
│  Autoregressive token gen.  │
└────────────┬────────────────┘
             │
             ▼
   DR Grade (0 – 4) + probabilities + heatmap
```

---

## 📁 Project Structure

```
retinai/
├── backend/
│   ├── main.py                                   # FastAPI app + model definition
│   ├── requirements.txt                          # Python dependencies
│   └── best_cnnlstm_efficientnet_b0_fold0.pth   # trained model weights
├── frontend/
│   ├── src/                                      # React source files
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

## ✅ Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Python | 3.10 | `python --version` |
| pip | 22+ | `pip --version` |
| Node.js | 18 | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |

> **GPU (optional):** PyTorch will automatically use CUDA if available. CPU inference works fine for a single image.

---

## 🚀 Installation

### 1 · Backend Setup

```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment
python -m venv .venv

# Activate it — Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Activate it — macOS / Linux
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

The model weights file (`best_cnnlstm_efficientnet_b0_fold0.pth`) is already included in the repo next to `main.py`. No separate download is needed.

> **Custom weights path:** Set the `WEIGHTS` environment variable to point to a different checkpoint:
> ```bash
> set WEIGHTS=C:\path\to\your_weights.pth   # Windows
> export WEIGHTS=/path/to/your_weights.pth  # macOS/Linux
> ```

---

### 2 · Frontend Setup

```bash
# Navigate to the frontend folder
cd frontend

# Install Node dependencies
npm install
```

> **Custom API URL:** If your backend runs on a port other than `8000`, create `frontend/.env`:
> ```env
> VITE_API_URL=http://localhost:8000
> ```

---

## ▶️ Running the App

Open **two separate terminals**:

**Terminal 1 — Backend**
```bash
cd backend
.venv\Scripts\Activate.ps1    # activate venv (Windows)
uvicorn main:app --port 8000 --reload
```

The API will be live at:
- **Base URL:** http://localhost:8000
- **Health check:** http://localhost:8000/health
- **Interactive docs (Swagger):** http://localhost:8000/docs

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Open your browser at **http://localhost:5173**.

---

## 📡 API Reference

### `GET /health`

Returns server status.

```json
{ "status": "ok", "backbone": "efficientnet_b0" }
```

### `POST /predict`

Upload a fundus image (JPEG / PNG, max 15 MB) and receive a grading result.

**Request:** `multipart/form-data` with field `file`.

**Response:**

```json
{
  "grade": 2,
  "label": "Moderate",
  "sequence": ["mild", "moderate"],
  "confidence": 0.8731,
  "probabilities": [0.05, 0.12, 0.61, 0.15, 0.07],
  "processed": "data:image/jpeg;base64,...",
  "heatmap":   "data:image/jpeg;base64,...",
  "disclaimer": "Research prototype. Not a medical device or a diagnosis."
}
```

| Field | Description |
|-------|-------------|
| `grade` | DR severity level (0 – 4) |
| `label` | Human-readable label |
| `sequence` | Predicted stage progression tokens |
| `confidence` | Joint probability of the predicted sequence |
| `probabilities` | Per-class probability distribution |
| `processed` | Base-64 preprocessed input image |
| `heatmap` | Base-64 attention-weighted heatmap overlay |

---

## 🩺 Grading Scale

| Grade | Label | Description |
|-------|-------|-------------|
| 0 | **No DR** | No signs of diabetic retinopathy |
| 1 | **Mild** | Microaneurysms only |
| 2 | **Moderate** | More than just microaneurysms but less than severe |
| 3 | **Severe** | Severe NPDR — significant lesions, neovascularisation risk |
| 4 | **Proliferative** | Advanced PDR — highest risk, requires urgent treatment |

---

## 🌐 Deployment

### Backend (API server)

Deploy as a single Uvicorn worker on **Render**, **Railway**, or **Docker**:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Set the environment variable to allow your production frontend:

```
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### Frontend (static site)

```bash
cd frontend
npm run build      # outputs to frontend/dist/
```

Host `dist/` on **Vercel** or **Netlify**. Remember to set:

```
VITE_API_URL=https://your-api-domain.com
```

---

<div align="center">

Made with ❤️ for retinal health research.

</div>
