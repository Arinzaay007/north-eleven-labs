# Dockerfile for Hugging Face Spaces
# 完整的前端 + 後端部署

# Stage 1: 構建前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 複製前端文件
COPY frontend/package.json frontend/yarn.lock ./
COPY frontend/node_modules ./node_modules
COPY frontend/ ./

# 設置 API URL（HF Spaces 使用同一域名）
ENV VITE_API_URL=/api

# 構建前端
RUN yarn build

# Stage 2: 後端 + 前端服務
FROM python:3.12-slim

WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    build-essential \
    libsndfile1 \
    libsndfile1-dev \
    ffmpeg \
    sox \
    libsox-dev \
    libsox-fmt-all \
    libavcodec-dev \
    libavformat-dev \
    libavutil-dev \
    libswresample-dev \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# 安裝 uv
RUN pip install --no-cache-dir uv

# 複製後端代碼
COPY pyproject.toml /app/
COPY backend /app/backend

# 安裝 Python 依賴
RUN uv pip install --system --no-cache \
    torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 \
    --index-url https://download.pytorch.org/whl/cpu && \
    uv pip install --system --no-cache \
    qwen-tts \
    fastapi \
    uvicorn[standard] \
    python-multipart \
    soundfile \
    huggingface-hub \
    tqdm

# 從前端構建階段複製靜態文件
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# 創建必要目錄
RUN mkdir -p /app/backend/uploads /app/backend/outputs

# Nginx 配置
RUN echo 'server { \n\
    listen 7860; \n\
    server_name _; \n\
    \n\
    # 前端靜態文件 \n\
    location / { \n\
        root /app/frontend/dist; \n\
        try_files $uri $uri/ /index.html; \n\
    } \n\
    \n\
    # API 代理到後端 \n\
    location /api { \n\
        proxy_pass http://127.0.0.1:8000; \n\
        proxy_http_version 1.1; \n\
        proxy_set_header Upgrade $http_upgrade; \n\
        proxy_set_header Connection "upgrade"; \n\
        proxy_set_header Host $host; \n\
        proxy_set_header X-Real-IP $remote_addr; \n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \n\
        proxy_set_header X-Forwarded-Proto $scheme; \n\
        proxy_read_timeout 300s; \n\
    } \n\
}' > /etc/nginx/sites-available/default

# 環境變數
ENV PYTHONUNBUFFERED=1
ENV MODEL_PATH=/app/models/Qwen3-TTS-12Hz-1.7B-Base
ENV UPLOAD_DIR=/app/backend/uploads
ENV OUTPUT_DIR=/app/backend/outputs
ENV USE_CPU=true

# 暴露 HF Spaces 端口
EXPOSE 7860

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:7860/api/status || exit 1

# 啟動腳本
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

CMD ["/app/docker-entrypoint.sh"]
