# Backend Dockerfile for Qwen3-TTS
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# 設置工作目錄
WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    python3.12 \
    python3-pip \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安裝 uv（快速的 Python 套件管理器）
RUN pip3 install uv

# 複製專案檔案
COPY pyproject.toml /app/
COPY backend /app/backend

# 安裝 Python 依賴
RUN uv pip install --system --no-cache \
    torch \
    qwen-tts \
    fastapi \
    uvicorn[standard] \
    python-multipart \
    soundfile \
    huggingface-hub \
    tqdm

# 嘗試安裝 FlashAttention（可選，失敗不影響運行）
RUN uv pip install --system flash-attn --no-build-isolation || echo "FlashAttention installation failed, will use standard attention"

# 創建必要目錄
RUN mkdir -p /app/backend/uploads /app/backend/outputs /app/models

# 設置環境變數
ENV PYTHONUNBUFFERED=1
ENV MODEL_PATH=/app/models/Qwen3-TTS-12Hz-1.7B-Base
ENV UPLOAD_DIR=/app/backend/uploads
ENV OUTPUT_DIR=/app/backend/outputs

# 暴露端口
EXPOSE 8000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/status || exit 1

# 啟動命令
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
