# Bangla AudioBook — TTS Service

The **TTS Service** is the dedicated AI speech synthesis service for the Bangla AudioBook platform. It handles text processing and speech synthesis (TTS) for transforming documents into multi-speaker audiobooks.

---

## 🚀 Features

- **Native Bangladeshi Bangla TTS:** Powered by VITS (`EMTIAZZ/bangladeshi-bangla-tts-vits`) for natural, expressive Bangla speech.
- **Multilingual TTS (Coqui XTTS v2):** Multi-speaker support for English and other languages with emotion and timbre selection.
- **Direct Audio Synthesis (`POST /generate`):** Instant synthesis returning WAV audio streams.
- **Asynchronous Job Pipeline (`POST /jobs`):** Integrates directly with `platform-api` for asynchronous chapter audio generation.
- **Voice Catalog (`GET /speakers`):** Dynamic catalog of male and female voices for audiobooks.

---

## 🛠 Tech Stack

- **Framework:** FastAPI + Uvicorn
- **TTS Engines:** Coqui TTS, VITS (Hugging Face)
- **Deep Learning:** PyTorch, TorchAudio
- **Validation:** Pydantic v2

---

## 📦 Setup & Installation

### 1. Prerequisites
- Python 3.10 or 3.11 recommended
- (Optional) NVIDIA GPU with CUDA for faster-than-realtime generation

### 2. Create Virtual Environment
```bash
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

---

## 🏃 Running the Service

Start the FastAPI TTS service on port **8001**:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Once running:
- **API Documentation:** [http://localhost:8001/docs](http://localhost:8001/docs)
- **Health Check:** [http://localhost:8001/health](http://localhost:8001/health)

---

## 📡 API Endpoints

### 1. `GET /speakers`
Returns available voice profiles.

### 2. `POST /generate`
Generate speech audio on the fly.
```json
{
  "text": "একদিন সকালে রাহাত জানালা খুলে দেখলো...",
  "language": "bn",
  "speaker": null,
  "model_type": "bangla_vits"
}
```
*Returns audio/wav binary stream.*

### 3. `POST /jobs`
Called by Platform API's `HTTPGenerationDispatcher` to trigger background generation:
```json
{
  "job_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "audiobook_id": "1a2b3c4d-...",
  "source_document_url": "/uploads/documents/sample.pdf",
  "language": "bn"
}
```

### 4. `GET /jobs/{job_id}`
Check status and output path of an ongoing generation job.

---

## 🔗 Integrating with Platform API

In `audiobook-platform/platform-api/.env`, configure:
```env
MODEL_RUNNER_DISPATCHER="http"
```
When a user clicks **Generate Audiobook** in the mobile app, Platform API will dispatch the job directly to `http://localhost:8001/jobs`.
