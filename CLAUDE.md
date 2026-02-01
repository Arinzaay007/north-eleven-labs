# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack Qwen3-TTS voice cloning application with:
- **CLI tools** (voice_clone.py, quick_clone.py) for command-line usage
- **FastAPI backend** (backend/) providing REST API
- **React frontend** (frontend/) with responsive design and clean UI
- **Docker deployment** ready for Hugging Face Spaces and local hosting
- **Qwen3-TTS-12Hz-1.7B-Base model** for voice synthesis with 95% similarity

The project enables 3-10 second reference audio cloning across 10 languages (Chinese, English, Japanese, Korean, etc.).

**Deployment Options:**
1. Local development (separate backend + frontend)
2. Local Docker (unified container with Nginx)
3. Hugging Face Spaces (public Docker deployment with automatic model download)

## System Requirements

### Local Development
- **Python**: 3.12+ (managed via uv)
- **Node.js**: v18+ (frontend uses Yarn)
- **GPU** (optional): NVIDIA GPU with CUDA 11.8+ (uses ~4GB VRAM)
- **CPU mode**: Works without GPU (8-12GB RAM, slower generation)
- **Model**: Qwen3-TTS-12Hz-1.7B-Base (~4.3 GB, auto-downloaded or symlinked)

### Docker Deployment
- **Docker**: 20.10+
- **RAM**: 8-12GB minimum (for model loading)
- **Disk**: ~10GB (model + dependencies)
- **Network**: For Hugging Face model download on first run

## Development Commands

### Initial Setup

```bash
# Install Python dependencies
uv sync

# Install frontend dependencies
cd frontend && yarn install

# Download/link model (choose one)
./setup.sh           # Full setup with model download
./link_model.sh      # Link to existing model at /path/to/model
```

### Running the Full Stack

**Backend (Terminal 1):**
```bash
./backend/start_server.sh
# or manually:
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend (Terminal 2):**
```bash
cd frontend
yarn dev              # Local only (localhost:3000)
yarn dev --host       # Network accessible (0.0.0.0:3000)
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### CLI Tools (Alternative to Web UI)

```bash
# Interactive mode
uv run python voice_clone.py

# Quick test with predefined config
uv run python quick_clone.py
```

### Testing

```bash
# Test backend configuration
uv run python test_backend.py

# Test model import
uv run python -c "from qwen_tts import Qwen3TTSModel; print('Model import successful')"

# Test API endpoints
curl http://localhost:8000/api/status
```

### Building for Production

```bash
# Build frontend
cd frontend
yarn build    # Output: frontend/dist/

# Frontend build can be served with any static file server
```

## Docker Deployment

### Local Docker (Unified Container)

The project includes a complete Docker setup with Nginx serving both frontend and backend on port 7860.

**Build and run:**
```bash
# Build image
docker build -f Dockerfile -t qwen3-tts-hf .

# Run with model volume (avoids re-downloading)
docker run -d -p 7860:7860 \
  -v /path/to/models/Qwen3-TTS-12Hz-1.7B-Base:/app/models/Qwen3-TTS-12Hz-1.7B-Base:ro \
  --name qwen3-tts qwen3-tts-hf

# Or run without volume (auto-downloads model on first run)
docker run -d -p 7860:7860 --name qwen3-tts qwen3-tts-hf
```

**Access:**
- Frontend: http://localhost:7860
- Backend API: http://localhost:7860/api

**Architecture:**
- Nginx serves frontend from `/app/frontend/dist`
- Nginx reverse-proxies `/api/*` to backend on port 8000
- Backend runs with `uvicorn` on 127.0.0.1:8000
- Model auto-downloads from Hugging Face Hub if not present

### Hugging Face Spaces Deployment

The project is ready for deployment to Hugging Face Spaces with Docker SDK.

**Files for HF Spaces:**
- `Dockerfile` - Multi-stage build (frontend + backend)
- `docker-entrypoint.sh` - Startup script with automatic model download
- `.dockerignore` - Excludes unnecessary files from build
- `README-HF.md` - Hugging Face Spaces documentation

**Deploy to HF Spaces:**
```bash
# 1. Create Space at https://huggingface.co/new-space
#    - Choose Docker SDK
#    - Select CPU basic (free) or CPU upgrade (16GB RAM)

# 2. Push to HF Spaces
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/SPACE_NAME
git push hf main

# 3. HF Spaces will automatically:
#    - Build Docker image (~5-10 min)
#    - Download model on first run (~5 min)
#    - Start service on port 7860
```

**Frontend Environment Detection:**
The frontend automatically detects Hugging Face Spaces environment and adjusts API URLs accordingly:
```typescript
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname.includes('hf.space') || window.location.hostname.includes('huggingface.co')
    ? '' // HF Spaces: relative path (Nginx proxy)
    : 'http://localhost:8000' // Local development
)
```

**Docker Build Process:**
1. **Stage 1 (frontend-builder)**: Builds React app with `yarn build`
2. **Stage 2 (production)**:
   - Installs Python dependencies (CPU-only PyTorch)
   - Copies built frontend to `/app/frontend/dist`
   - Configures Nginx for unified serving
   - Sets up model auto-download via `docker-entrypoint.sh`

## Architecture

### Architecture Diagrams

**Local Development (Separate Servers):**
```
┌─────────────────────────────────────────┐
│  Frontend (Vite Dev Server)            │
│  - Port 3000 or 5173                   │
│  - Hot Module Replacement               │
└──────────────┬──────────────────────────┘
               │ HTTP/REST (CORS)
┌──────────────▼──────────────────────────┐
│  Backend (Uvicorn)                      │
│  - Port 8000                            │
│  - FastAPI + CORS middleware            │
└──────────────┬──────────────────────────┘
               │ Python API
┌──────────────▼──────────────────────────┐
│  Qwen3-TTS Model                        │
│  - GPU/CPU auto-detection               │
│  - FlashAttention 2 (optional)          │
└─────────────────────────────────────────┘
```

**Docker Deployment (Unified Container):**
```
┌─────────────────────────────────────────┐
│  Nginx (Port 7860)                      │
│  - Serves frontend static files         │
│  - Reverse proxy /api → backend         │
└──────┬──────────────────────┬───────────┘
       │                      │
       │ Static Files         │ Proxy /api/*
       │                      │
┌──────▼──────────┐    ┌──────▼──────────┐
│  Frontend Dist  │    │  Backend        │
│  /app/frontend/ │    │  127.0.0.1:8000 │
│  dist/          │    │  (Uvicorn)      │
└─────────────────┘    └──────┬──────────┘
                              │
                       ┌──────▼──────────┐
                       │  Qwen3-TTS      │
                       │  CPU-only mode  │
                       │  /app/models/   │
                       └─────────────────┘
```

### Backend API (backend/main.py)

FastAPI application with 7 endpoints:

- `GET /` - API info (version, model status, device)
- `GET /api/status` - Service status (ready/loading/error)
- `POST /api/upload` - Upload reference audio (returns audio_id)
- `POST /api/clone` - Generate cloned voice (requires ref_audio_id, ref_text, target_text)
- `GET /api/download/{audio_id}` - Download generated audio
- `DELETE /api/audio/{audio_id}` - Delete uploaded/generated audio
- `GET /api/cleanup` - Clean up old files (default: >24h)

**Key Backend Patterns:**

1. **Model singleton**: Global `model` instance loaded once at startup
2. **UUID-based file management**: All uploads/outputs use UUID filenames
3. **Automatic directory creation**: `backend/uploads/` and `backend/outputs/` created on startup
4. **CORS**: Pre-configured for localhost:3000 and localhost:5173 (Vite)

**API Request Example:**
```python
# 1. Upload reference audio
response = requests.post('http://localhost:8000/api/upload', files={'file': open('voice.wav', 'rb')})
audio_id = response.json()['audio_id']

# 2. Generate cloned voice
response = requests.post('http://localhost:8000/api/clone', json={
    'ref_audio_id': audio_id,
    'ref_text': '參考音訊中的文字',
    'target_text': '要生成的新文字',
    'language': 'Chinese',
    'x_vector_only': False
})
output_id = response.json()['audio_id']

# 3. Download result
response = requests.get(f'http://localhost:8000/api/download/{output_id}')
with open('output.wav', 'wb') as f:
    f.write(response.content)
```

### Frontend (frontend/src/App.tsx)

Modern single-page React application with responsive design and clean UI:

**Features:**
- Responsive layout (mobile/tablet/desktop with Tailwind breakpoints)
- Increased font sizes for better readability
- File upload via drag-and-drop or click
- Audio preview for uploaded reference audio
- Real-time status updates during generation
- Clean interface with removed non-functional links

**UI Improvements (Latest):**
- Larger fonts across all components (base, lg, xl sizes)
- Responsive container with `max-w-7xl` and flexible columns
- Two-column layout on desktop, single column on mobile
- Simplified navigation and footer (removed dummy links)
- Enhanced spacing and padding for better UX

**API Integration:**
- Environment-aware `API_URL` configuration
- Automatic detection of HF Spaces vs local development
- Uses native `fetch()` for all API calls
- Blob URL management for audio preview with cleanup

**Key Frontend Patterns:**

1. **useState hooks**: Form state (refAudioId, refText, targetText, language, etc.)
2. **useRef hooks**: File input, audio players (ref + generated)
3. **useEffect hooks**: Blob URL cleanup to prevent memory leaks
4. **Event handlers**: handleFileSelect, handleGenerate, handleDrop
5. **Conditional rendering**: Upload status, loading states, audio players

### CLI Tools (voice_clone.py, quick_clone.py)

Direct Python scripts that bypass the web stack:
- Load model directly
- Read local files from `reference_audios/`
- Write output to `outputs/`
- Useful for batch processing or server-side automation

**voice_clone.py modes:**
- `interactive_mode()`: User prompts for audio selection, text input, language
- `batch_mode()`: Generate multiple texts with same voice prompt

## Voice Cloning Workflow

### Core Workflow (All Interfaces)

1. **Create voice clone prompt** from reference audio + text:
   ```python
   voice_clone_prompt = model.create_voice_clone_prompt(
       ref_audio="path/to/audio.wav",
       ref_text="transcript of the audio",
       x_vector_only_mode=False,  # True = no ref_text needed but lower quality
   )
   ```

2. **Generate cloned voice**:
   ```python
   wavs, sr = model.generate_voice_clone(
       text="text to synthesize",
       language="Chinese",  # or "English", "Japanese", "Korean"
       voice_clone_prompt=voice_clone_prompt,
   )
   ```

3. **Save output**:
   ```python
   import soundfile as sf
   sf.write("output.wav", wavs[0], sr)
   ```

### Model Loading Pattern

All components use consistent model loading with FlashAttention 2 fallback:

```python
try:
    model = Qwen3TTSModel.from_pretrained(
        "models/Qwen3-TTS-12Hz-1.7B-Base",
        device_map="cuda:0" if torch.cuda.is_available() else "cpu",
        dtype=torch.bfloat16,
        attn_implementation="flash_attention_2",
    )
except Exception:
    # Fallback to standard attention if FlashAttention 2 unavailable
    model = Qwen3TTSModel.from_pretrained(
        "models/Qwen3-TTS-12Hz-1.7B-Base",
        device_map="cuda:0" if torch.cuda.is_available() else "cpu",
        dtype=torch.bfloat16,
    )
```

## Directory Structure

```
qwen3clone/
├── backend/                    # FastAPI backend
│   ├── main.py                # API endpoints and model loading
│   ├── start_server.sh        # Backend startup script
│   ├── uploads/               # Temporary uploaded reference audio (created at runtime)
│   └── outputs/               # Generated audio files (created at runtime)
│
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── App.tsx           # Main application (responsive UI, all logic)
│   │   ├── main.tsx          # React entry point
│   │   ├── index.css         # Global styles (Tailwind directives)
│   │   └── vite-env.d.ts     # Vite environment types
│   ├── package.json          # Frontend dependencies
│   ├── tailwind.config.js    # Tailwind color theme (custom palette)
│   ├── vite.config.ts        # Vite dev server config
│   └── dist/                 # Built static files (created by yarn build)
│
├── models/                    # TTS model directory
│   └── Qwen3-TTS-12Hz-1.7B-Base/  # Symlink or actual model files
│
├── reference_audios/          # Input: 3-10s reference audio for CLI tools
├── outputs/                   # Output: CLI-generated .wav files
│
├── voice_clone.py            # CLI interactive tool
├── quick_clone.py            # CLI quick test script
├── test_backend.py           # Backend configuration tests
│
├── Dockerfile                # Docker multi-stage build for HF Spaces
├── docker-entrypoint.sh      # Container startup script (auto model download)
├── .dockerignore             # Docker build exclusions
│
├── README-HF.md              # Hugging Face Spaces documentation
├── CLAUDE.md                 # This file (project guidance for Claude Code)
├── setup.sh                  # Full environment + model setup
├── link_model.sh             # Link to existing model
└── pyproject.toml            # Python dependencies (uv)
```

## Configuration

### Backend Configuration (backend/main.py)

```python
# Environment variable support (with defaults)
MODEL_PATH = os.getenv("MODEL_PATH", "models/Qwen3-TTS-12Hz-1.7B-Base")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "backend/uploads"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "backend/outputs"))
USE_CPU = os.getenv("USE_CPU", "false").lower() == "true"

# CORS origins (environment variable or defaults)
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost"
).split(",")
```

**Docker Environment Variables:**
- `MODEL_PATH`: Model directory path (default: `/app/models/Qwen3-TTS-12Hz-1.7B-Base`)
- `UPLOAD_DIR`: Upload directory (default: `/app/backend/uploads`)
- `OUTPUT_DIR`: Output directory (default: `/app/backend/outputs`)
- `USE_CPU`: Force CPU mode (default: `true` in Docker, auto-detect in dev)
- `CORS_ORIGINS`: Comma-separated allowed origins

### Frontend Configuration (frontend/src/App.tsx)

```typescript
// Environment-aware configuration (automatic)
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname.includes('hf.space') || window.location.hostname.includes('huggingface.co')
    ? '' // HF Spaces: use relative path
    : 'http://localhost:8000' // Local development
)
```

**Configuration Methods:**

1. **Local Development**: Uses `http://localhost:8000` by default
2. **Docker/HF Spaces**: Set `VITE_API_URL=/api` in Dockerfile (already configured)
3. **Custom Network**: Set environment variable `VITE_API_URL=http://your-server:8000`

**For network deployment**, update:
1. Backend CORS `allow_origins` to include frontend URL
2. Set `VITE_API_URL` environment variable or update `API_URL` constant
3. Run frontend with `yarn dev --host` to bind to 0.0.0.0

### CLI Configuration (quick_clone.py)

Edit variables at top of file:
```python
REF_AUDIO = "reference_audios/ref_audio.wav"
REF_TEXT = "參考音訊的完整內容"
LANGUAGE = "Chinese"
TEST_TEXTS = ["要生成的第一句", "要生成的第二句"]
```

## Reference Audio Requirements

- **Duration**: 3-10 seconds (optimal balance of features vs noise)
- **Content**: Single-speaker, clear speech, minimal background noise
- **Format**: WAV, MP3, or FLAC
- **Transcript**: `ref_text` must **exactly match** spoken content for best quality
- **Quality impact**: Clean audio + accurate transcript = up to 0.95 similarity

## Performance Metrics

- **RTF**: ~0.5-0.6x (generates 2s audio in ~1s)
- **Sample rate**: 12kHz
- **Voice similarity**: Up to 0.95 with quality reference
- **GPU memory**: ~4GB VRAM
- **Startup time**: ~5-10s (model loading)
- **Supported languages**: Chinese, English, Japanese, Korean, + 6 more

## Key Implementation Details

### CORS and Network Access

Backend CORS is pre-configured for local development. For network deployment:

1. Update backend `allow_origins` in `main.py`:
   ```python
   allow_origins=["http://10.0.0.85:3000"]  # Your server IP
   ```

2. Update frontend `API_URL` in `App.tsx`:
   ```typescript
   const API_URL = 'http://10.0.0.85:8000'
   ```

3. Start backend with `--host 0.0.0.0` (already default in start_server.sh)

4. Start frontend with `yarn dev --host` to expose on network

### File Cleanup

Generated files persist indefinitely. Use cleanup endpoint or cron job:

```bash
# Manual cleanup via API
curl "http://localhost:8000/api/cleanup?max_age_hours=24"

# Or delete directories
rm -rf backend/uploads/* backend/outputs/*
```

### Model Symlink vs Download

Two options for model setup:

1. **Download** (setup.sh): Downloads ~4GB model to `models/`
2. **Symlink** (link_model.sh): Links to existing model elsewhere
   - Useful if model already downloaded in another project
   - Example: Links to `/home/user/models/Qwen3-TTS-12Hz-1.7B-Base`

### FlashAttention 2 Behavior

- Automatically attempts to load FlashAttention 2 for faster inference
- Gracefully falls back to standard attention if unavailable
- No code changes needed - handled transparently
- Setup script installs flash-attn but may fail on some systems

### Output Naming Conventions

- **Backend API**: UUID-based (`a1b2c3d4-...-xyz.wav`)
- **CLI voice_clone.py**: `{ref_audio_stem}_clone_{count:03d}.wav`
- **CLI quick_clone.py**: `clone_{count:02d}.wav`
- **CLI batch_mode**: `batch_{count:03d}.wav`

## Dependencies

### Python (pyproject.toml)
- `qwen-tts`: Core TTS library
- `torch>=2.0.0`: Deep learning framework
- `fastapi>=0.109.0`: Web framework
- `uvicorn[standard]>=0.27.0`: ASGI server
- `python-multipart>=0.0.6`: File upload support
- `soundfile`: Audio I/O
- `flash-attn` (optional): Accelerated attention

### Frontend (package.json)
- `react` + `react-dom`: UI framework
- `lucide-react`: Icon library
- `typescript`: Type safety
- `vite`: Build tool and dev server
- `tailwindcss`: Utility-first CSS

## Recent Improvements

### Frontend UI Enhancements (Latest)

**Increased Font Sizes:**
- Navigation: `text-xl` (from `text-lg`)
- Hero title: `text-5xl md:text-6xl` (from `text-5xl`)
- Descriptions: `text-xl` (from `text-lg`)
- Buttons: `text-lg` (from `text-[15px]`)
- Form labels: `text-base` (from `text-[13px]`)
- Input/textarea: `text-base` (from `text-[13px]`)
- Status messages: `text-base` (from `text-[13px]`)

**Responsive Design:**
- Removed fixed width `w-[1440px]`
- Added responsive container: `max-w-7xl mx-auto`
- Two-column layout on large screens: `lg:w-1/2` for each panel
- Mobile-first with breakpoints: `md:`, `lg:` prefixes
- Responsive padding: `px-6 md:px-12 lg:px-24`

**Cleaned Interface:**
- Removed non-functional navigation links (API docs, GitHub)
- Removed dummy footer links (features, pricing, tutorials)
- Removed social media icons (Twitter, LinkedIn, GitHub)
- Removed "Model Size" dropdown (non-functional)
- Removed redundant "Choose File" button (upload area is clickable)
- Simplified footer to logo + copyright only

**Audio Preview:**
- Added reference audio preview with play controls
- Blob URL management with proper cleanup (useEffect)
- Prevents memory leaks from unreleased object URLs

## Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check logs
docker logs qwen3-tts

# Common issues:
# 1. Port 7860 already in use
docker ps | grep 7860
# 2. Model download failed (network issue)
# 3. Insufficient memory (need 8-12GB RAM)
```

**Model not downloading:**
- Check internet connection
- Verify Hugging Face Hub is accessible
- Try manual download: `huggingface-cli download Qwen/Qwen3-TTS-12Hz-1.7B-Base`

**Frontend shows 404 on API calls:**
- Verify Nginx is running: `docker exec qwen3-tts nginx -t`
- Check backend is healthy: `docker exec qwen3-tts curl http://127.0.0.1:8000/api/status`
- Review `API_URL` configuration in frontend

### Local Development Issues

**Backend won't start:**
- Check model exists: `ls models/Qwen3-TTS-12Hz-1.7B-Base/`
- If missing, run `./setup.sh` or `./link_model.sh`
- Verify Python version: `python --version` (need 3.12+)

**Port already in use:**
```bash
# Check what's using the port
lsof -i :8000  # Backend
lsof -i :3000  # Frontend (Yarn)
lsof -i :7860  # Docker

# Kill process or change port in configuration
```

**Frontend can't connect to backend:**
- Verify backend is running: `curl http://localhost:8000/api/status`
- Check CORS settings in `backend/main.py`
- Ensure `API_URL` in `frontend/src/App.tsx` matches backend address
- For network access, use `yarn dev --host` and update CORS origins

**Model loading fails:**
- Verify CUDA availability: `python -c "import torch; print(torch.cuda.is_available())"`
- Check GPU memory: Should have ~4GB free
- Try CPU mode: Set `USE_CPU=true` environment variable
- CPU mode slower but works without GPU (8-12GB RAM needed)
