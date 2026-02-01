#!/bin/bash
# FastAPI 後端啟動腳本

echo "🚀 啟動 Qwen3-TTS 後端服務..."
echo ""

# 檢查是否在專案根目錄
if [ ! -f "pyproject.toml" ]; then
    echo "❌ 錯誤: 請在專案根目錄執行此腳本"
    echo "請確保在包含 pyproject.toml 的目錄中執行"
    exit 1
fi

# 檢查模型是否存在
if [ ! -d "models/Qwen3-TTS-12Hz-1.7B-Base" ]; then
    echo "❌ 錯誤: 找不到模型目錄"
    echo "請先執行 ./setup.sh 或 ./link_model.sh"
    exit 1
fi

# 建立必要目錄
mkdir -p backend/uploads
mkdir -p backend/outputs

echo "✓ 目錄檢查完成"
echo ""

# 顯示資訊
echo "📡 服務資訊:"
echo "  - API 文件: http://localhost:8000/docs"
echo "  - 後端 URL: http://localhost:8000"
echo "  - 前端 URL: http://localhost:3000"
echo ""

# 啟動服務
echo "🎯 啟動 FastAPI 服務..."
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
