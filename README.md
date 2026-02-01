---
title: Qwen3-TTS Voice Clone
emoji: 🎤
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: apache-2.0
---

# 🎤 Qwen3-TTS 語音複製

基於 Qwen3-TTS-12Hz-1.7B-Base 的全功能語音複製應用。

## ✨ 功能特色

- 🎯 **3秒快速複製**: 僅需 3-10 秒參考音訊
- 🌏 **多語言支持**: 中、英、日、韓等 10 種語言
- 🎨 **高相似度**: 聲音相似度可達 95%
- 💻 **完整 Web UI**: React 前端 + FastAPI 後端
- 🚀 **即開即用**: 模型自動下載

## 🚀 使用方法

1. 上傳 3-10 秒的參考音訊（清晰人聲）
2. 輸入參考音訊的逐字稿
3. 輸入想要生成的目標文字
4. 選擇語言
5. 點擊「複製並生成」

## 📊 效能說明

- **CPU 模式**: 10-20 秒/次
- **記憶體**: 約 8-12GB
- **模型大小**: 4.3GB

## 🛠️ 技術棧

- **前端**: React + TypeScript + Tailwind CSS
- **後端**: FastAPI + Python
- **模型**: Qwen3-TTS-12Hz-1.7B-Base
- **部署**: Docker

## 📝 本地運行

```bash
# Clone 項目
git clone https://huggingface.co/spaces/你的用戶名/qwen3-tts-clone
cd qwen3-tts-clone

# 使用 Docker
docker build -f Dockerfile.huggingface -t qwen3-tts .
docker run -p 7860:7860 qwen3-tts
```

訪問: http://localhost:7860

## 🤝 貢獻

基於 [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) by Alibaba Qwen Team

## 📄 授權

Apache 2.0 License
