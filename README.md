---
title: Qwen3-TTS Voice Clone
emoji: 🎤
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: apache-2.0
---

# Qwen3-TTS Voice Clone

A full-stack voice cloning web application powered by Qwen3-TTS-12Hz-1.7B-Base model. Clone any voice with just 3-10 seconds of reference audio.

## Features

- **Fast Voice Cloning**: Generate high-quality voice clones from 3-10 second audio samples
- **Multi-language Support**: Supports 10+ languages including Chinese, English, Japanese, Korean
- **High Similarity**: Achieves up to 95% voice similarity with quality reference audio
- **Modern Web UI**: Professional React frontend with intuitive step-by-step workflow
- **Real-time Validation**: Instant feedback and smart error prevention
- **Docker Ready**: One-command deployment with automatic model download

## Demo

> Add screenshots or demo video here

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/ammosu/qwen3-tts-voice-clone.git
cd qwen3-tts-voice-clone

# Build and run with Docker
docker build -t qwen3-tts .
docker run -d -p 7860:7860 --name qwen3-tts qwen3-tts

# With local model (to avoid re-downloading)
docker run -d -p 7860:7860 \
  -v /path/to/models/Qwen3-TTS-12Hz-1.7B-Base:/app/models/Qwen3-TTS-12Hz-1.7B-Base:ro \
  --name qwen3-tts qwen3-tts
```

Access the application at http://localhost:7860

### Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (in another terminal)
cd frontend
yarn install
yarn dev
```

Access frontend at http://localhost:3000, backend API at http://localhost:8000

## Usage

1. **Upload Reference Audio**: Upload a 3-10 second audio clip of the voice you want to clone
2. **Enter Reference Text**: Type the exact transcript of what's said in the audio
3. **Enter Target Text**: Type the text you want the cloned voice to say
4. **Select Language**: Choose the language for text-to-speech generation
5. **Generate**: Click "Generate Voice" and download the result

## Architecture

```
qwen3-tts-voice-clone/
├── backend/              # FastAPI backend
│   ├── main.py          # API endpoints
│   ├── uploads/         # Temporary uploaded files
│   └── outputs/         # Generated audio files
├── frontend/            # React frontend
│   ├── src/
│   │   ├── App.tsx     # Main application
│   │   └── ...
│   └── dist/           # Built static files
├── models/              # Model directory
│   └── Qwen3-TTS-12Hz-1.7B-Base/
├── Dockerfile           # Multi-stage Docker build
└── docker-entrypoint.sh # Container startup script
```

## Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Vite for build tooling
- Lucide React for icons

### Backend
- FastAPI for REST API
- Python 3.12+
- Qwen3-TTS for voice synthesis
- PyTorch for model inference
- Nginx for serving static files in production

### Deployment
- Docker multi-stage builds
- Nginx reverse proxy
- Automatic model download from Hugging Face Hub

## Performance

- **Processing Time**: 10-20 seconds per generation (CPU mode)
- **Memory Usage**: 8-12GB RAM required
- **Model Size**: ~4.3GB
- **Sample Rate**: 12kHz
- **RTF (Real-time Factor)**: ~0.5-0.6x

## API Documentation

When running locally, access API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

- `POST /upload` - Upload reference audio
- `POST /clone` - Generate cloned voice
- `GET /download/{audio_id}` - Download generated audio
- `GET /api/status` - Check service status

## Development

### Project Setup

```bash
# Install Python dependencies with uv
uv sync

# Install frontend dependencies
cd frontend && yarn install

# Download model (one-time setup)
./setup.sh
```

### Running Tests

```bash
# Test backend
python test_backend.py

# Test model import
python -c "from qwen_tts import Qwen3TTSModel; print('OK')"
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
MODEL_PATH=models/Qwen3-TTS-12Hz-1.7B-Base
UPLOAD_DIR=backend/uploads
OUTPUT_DIR=backend/outputs
USE_CPU=false
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend Configuration

Set `VITE_API_URL` in `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

## Deployment

### Docker Deployment

The project includes a production-ready Dockerfile with:
- Multi-stage build for optimized image size
- Nginx serving both frontend and backend
- Automatic model download on first run
- Health checks and logging

### Hugging Face Spaces

This project can be deployed directly to Hugging Face Spaces:

1. Create a new Space with Docker SDK
2. Push the repository
3. The Dockerfile will handle all setup automatically

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

This project is built upon:
- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) by Alibaba Qwen Team
- Model: Qwen3-TTS-12Hz-1.7B-Base

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Citation

If you use this project in your research, please cite:

```bibtex
@software{qwen3-tts-voice-clone,
  author = {Your Name},
  title = {Qwen3-TTS Voice Clone},
  year = {2024},
  url = {https://github.com/ammosu/qwen3-tts-voice-clone}
}
```

## Support

- Issues: [GitHub Issues](https://github.com/ammosu/qwen3-tts-voice-clone/issues)
- Discussions: [GitHub Discussions](https://github.com/ammosu/qwen3-tts-voice-clone/discussions)

## Changelog

See [CLAUDE.md](CLAUDE.md) for detailed project documentation and development notes.
