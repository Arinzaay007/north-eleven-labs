#!/usr/bin/env python3
"""
Qwen3-TTS FastAPI 後端
提供語音複製的 REST API 接口
"""

import os
import uuid
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime

import torch
import soundfile as sf
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from qwen_tts import Qwen3TTSModel

# 配置（支援環境變數）
MODEL_PATH = os.getenv("MODEL_PATH", "models/Qwen3-TTS-12Hz-1.7B-Base")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "backend/uploads"))
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "backend/outputs"))
USE_CPU = os.getenv("USE_CPU", "false").lower() == "true"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# FastAPI 應用
app = FastAPI(
    title="Qwen3-TTS API",
    description="AI 語音複製與文字轉語音 API",
    version="1.0.0"
)

# CORS 設定（允許前端訪問，支援環境變數）
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://localhost"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全域模型實例
model = None
model_loading = False


# Pydantic 模型
class CloneRequest(BaseModel):
    ref_audio_id: str
    ref_text: str
    target_text: str
    language: str = "Chinese"
    x_vector_only: bool = False


class GenerateResponse(BaseModel):
    audio_id: str
    filename: str
    duration: float
    sample_rate: int
    status: str


class StatusResponse(BaseModel):
    status: str
    message: str


@app.on_event("startup")
async def load_model():
    """啟動時載入模型"""
    global model, model_loading

    if model is not None:
        return

    model_loading = True

    # 檢查模型路徑
    if not Path(MODEL_PATH).exists():
        print(f"❌ 找不到模型路徑: {MODEL_PATH}")
        print("請確保模型已下載或正確掛載")
        model_loading = False
        return

    print("🚀 正在載入 Qwen3-TTS 模型...")
    print(f"📁 模型路徑: {MODEL_PATH}")

    # 確定設備和精度
    use_cuda = torch.cuda.is_available() and not USE_CPU
    device_map = "cuda:0" if use_cuda else "cpu"
    dtype = torch.bfloat16 if use_cuda else torch.float32

    print(f"🖥️  設備: {device_map}")
    print(f"📊 精度: {dtype}")

    try:
        # 嘗試使用 FlashAttention 2（僅 CUDA）
        if use_cuda:
            model = Qwen3TTSModel.from_pretrained(
                MODEL_PATH,
                device_map=device_map,
                dtype=dtype,
                attn_implementation="flash_attention_2",
            )
            print("✓ 模型載入成功 (使用 FlashAttention 2)")
        else:
            raise Exception("CPU 模式不支援 FlashAttention 2")
    except Exception as e:
        print(f"⚠ FlashAttention 2 載入失敗: {e}")
        try:
            model = Qwen3TTSModel.from_pretrained(
                MODEL_PATH,
                device_map=device_map,
                dtype=dtype,
            )
            print("✓ 模型載入成功 (使用標準 attention)")
        except Exception as e2:
            print(f"❌ 模型載入失敗: {e2}")
            model = None

    model_loading = False

    if use_cuda:
        allocated = torch.cuda.memory_allocated() / 1024**3
        print(f"📊 GPU 記憶體使用: {allocated:.2f} GB")
    else:
        print("⚠️  注意: 使用 CPU 模式，生成速度會較慢")


@app.get("/")
async def root():
    """根路由"""
    return {
        "message": "Qwen3-TTS API",
        "version": "1.0.0",
        "model_loaded": model is not None,
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }


@app.get("/api/status")
async def get_status():
    """獲取 API 狀態"""
    if model_loading:
        return StatusResponse(
            status="loading",
            message="模型載入中，請稍候..."
        )

    if model is None:
        return StatusResponse(
            status="error",
            message="模型載入失敗"
        )

    return StatusResponse(
        status="ready",
        message="準備好複製聲音"
    )


@app.post("/api/upload")
async def upload_audio(file: UploadFile = File(...)):
    """
    上傳參考音訊檔案

    接受格式: WAV, MP3, FLAC
    建議長度: 3-10 秒
    """
    # 檢查檔案格式
    allowed_extensions = {".wav", ".mp3", ".flac"}
    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"不支援的檔案格式。請上傳 {', '.join(allowed_extensions)} 檔案"
        )

    # 生成唯一 ID
    audio_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{audio_id}{file_ext}"

    # 儲存檔案
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 讀取音訊
        data, sr = sf.read(str(file_path))
        original_duration = len(data) / sr

        # 處理音訊長度
        warning = None
        was_trimmed = False

        if original_duration < 3:
            # 太短：警告但接受
            warning = f"音訊長度 {original_duration:.1f} 秒，建議 3-10 秒以獲得最佳效果"
            duration = original_duration
        elif original_duration > 10:
            # 太長：自動裁切到前 10 秒
            max_samples = int(10 * sr)
            data = data[:max_samples]

            # 儲存裁切後的音訊
            sf.write(str(file_path), data, sr)

            duration = 10.0
            was_trimmed = True
            warning = f"原始音訊 {original_duration:.1f} 秒已自動裁切為前 10 秒"
        else:
            # 長度適中
            duration = original_duration

        response_data = {
            "audio_id": audio_id,
            "filename": file.filename,
            "duration": duration,
            "sample_rate": sr,
        }

        if warning:
            response_data["warning"] = warning
            response_data["was_trimmed"] = was_trimmed
            response_data["original_duration"] = original_duration

        return response_data

    except Exception as e:
        # 清理失敗的檔案
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"上傳失敗: {str(e)}")


@app.post("/api/clone", response_model=GenerateResponse)
async def clone_voice(request: CloneRequest):
    """
    複製聲音並生成語音

    參數:
    - ref_audio_id: 參考音訊 ID（從 /api/upload 獲得）
    - ref_text: 參考音訊的逐字稿
    - target_text: 要生成的目標文字
    - language: 語言（Chinese, English, Japanese, Korean 等）
    - x_vector_only: 是否僅使用 x-vector（無需參考文字但品質較低）
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="模型未載入或載入失敗"
        )

    # 查找參考音訊檔案
    ref_audio_path = None
    for ext in [".wav", ".mp3", ".flac"]:
        path = UPLOAD_DIR / f"{request.ref_audio_id}{ext}"
        if path.exists():
            ref_audio_path = path
            break

    if ref_audio_path is None:
        raise HTTPException(
            status_code=404,
            detail="找不到參考音訊檔案。請先上傳音訊。"
        )

    try:
        # 建立聲音複製 prompt
        print(f"📝 建立聲音複製 prompt...")
        voice_clone_prompt = model.create_voice_clone_prompt(
            ref_audio=str(ref_audio_path),
            ref_text=request.ref_text if not request.x_vector_only else None,
            x_vector_only_mode=request.x_vector_only,
        )

        # 生成語音
        print(f"🎤 生成語音: {request.target_text[:50]}...")
        wavs, sr = model.generate_voice_clone(
            text=request.target_text,
            language=request.language,
            voice_clone_prompt=voice_clone_prompt,
        )

        # 儲存輸出
        audio_id = str(uuid.uuid4())
        output_path = OUTPUT_DIR / f"{audio_id}.wav"
        sf.write(str(output_path), wavs[0], sr)

        duration = len(wavs[0]) / sr

        print(f"✓ 生成完成: {duration:.2f}s")

        return GenerateResponse(
            audio_id=audio_id,
            filename=f"{audio_id}.wav",
            duration=duration,
            sample_rate=sr,
            status="success"
        )

    except Exception as e:
        print(f"❌ 生成失敗: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"語音生成失敗: {str(e)}"
        )


@app.get("/api/download/{audio_id}")
async def download_audio(audio_id: str):
    """
    下載生成的音訊檔案
    """
    audio_path = OUTPUT_DIR / f"{audio_id}.wav"

    if not audio_path.exists():
        raise HTTPException(
            status_code=404,
            detail="找不到音訊檔案"
        )

    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        filename=f"qwen3tts_{audio_id}.wav"
    )


@app.delete("/api/audio/{audio_id}")
async def delete_audio(audio_id: str, audio_type: str = "output"):
    """
    刪除音訊檔案

    audio_type: "upload" 或 "output"
    """
    if audio_type == "upload":
        # 刪除上傳的檔案
        for ext in [".wav", ".mp3", ".flac"]:
            path = UPLOAD_DIR / f"{audio_id}{ext}"
            if path.exists():
                path.unlink()
                return {"status": "success", "message": "檔案已刪除"}
    else:
        # 刪除輸出的檔案
        path = OUTPUT_DIR / f"{audio_id}.wav"
        if path.exists():
            path.unlink()
            return {"status": "success", "message": "檔案已刪除"}

    raise HTTPException(status_code=404, detail="找不到檔案")


@app.get("/api/cleanup")
async def cleanup_old_files(max_age_hours: int = 24):
    """
    清理超過指定時間的舊檔案
    """
    import time

    now = time.time()
    max_age_seconds = max_age_hours * 3600

    deleted_count = 0

    # 清理上傳目錄
    for file_path in UPLOAD_DIR.glob("*"):
        if file_path.is_file():
            age = now - file_path.stat().st_mtime
            if age > max_age_seconds:
                file_path.unlink()
                deleted_count += 1

    # 清理輸出目錄
    for file_path in OUTPUT_DIR.glob("*"):
        if file_path.is_file():
            age = now - file_path.stat().st_mtime
            if age > max_age_seconds:
                file_path.unlink()
                deleted_count += 1

    return {
        "status": "success",
        "deleted_count": deleted_count,
        "message": f"已刪除 {deleted_count} 個超過 {max_age_hours} 小時的檔案"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
