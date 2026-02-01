#!/bin/bash
set -e

echo "🚀 啟動 Qwen3-TTS 服務..."

# 下載模型（如果不存在）
if [ ! -d "$MODEL_PATH" ]; then
    echo "📥 下載模型..."
    mkdir -p /app/models

    python3 << 'PYTHON'
from huggingface_hub import snapshot_download
import os

model_path = os.environ.get('MODEL_PATH', '/app/models/Qwen3-TTS-12Hz-1.7B-Base')
print(f"下載模型到: {model_path}")

snapshot_download(
    repo_id="Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    local_dir=model_path,
    local_dir_use_symlinks=False,
)
print("✅ 模型下載完成")
PYTHON
else
    echo "✅ 模型已存在"
fi

# 啟動 Nginx（前端）
echo "🌐 啟動 Nginx（端口 7860）..."
nginx

# 啟動後端
echo "🔧 啟動後端 API（端口 8000）..."
uvicorn backend.main:app --host 127.0.0.1 --port 8000
