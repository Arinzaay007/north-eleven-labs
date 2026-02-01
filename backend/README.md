# Qwen3-TTS 後端 API

FastAPI 後端服務，提供語音複製功能的 REST API。

## 快速開始

### 1. 安裝依賴

```bash
# 從專案根目錄執行
uv sync
```

這會安裝 FastAPI、Uvicorn 和其他必要的依賴。

### 2. 啟動服務

```bash
# 從專案根目錄執行
./backend/start_server.sh
```

或直接使用 uvicorn：

```bash
uv run uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 訪問 API 文件

啟動後訪問：
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API 端點

### 狀態檢查

#### `GET /`
取得 API 基本資訊

**回應範例：**
```json
{
  "message": "Qwen3-TTS API",
  "version": "1.0.0",
  "model_loaded": true,
  "device": "cuda"
}
```

#### `GET /api/status`
取得服務狀態

**回應範例：**
```json
{
  "status": "ready",
  "message": "準備好複製聲音"
}
```

### 音訊上傳

#### `POST /api/upload`
上傳參考音訊檔案

**請求：**
- Content-Type: `multipart/form-data`
- 欄位: `file` (音訊檔案)
- 支援格式: WAV, MP3, FLAC
- 建議長度: 3-10 秒

**回應範例：**
```json
{
  "audio_id": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "voice.wav",
  "duration": 5.2,
  "sample_rate": 16000
}
```

**cURL 範例：**
```bash
curl -X POST "http://localhost:8000/api/upload" \
  -F "file=@reference_audio.wav"
```

### 語音生成

#### `POST /api/clone`
複製聲音並生成語音

**請求體：**
```json
{
  "ref_audio_id": "123e4567-e89b-12d3-a456-426614174000",
  "ref_text": "這是參考音訊中說的內容",
  "target_text": "這是要生成的新內容",
  "language": "Chinese",
  "x_vector_only": false
}
```

**參數說明：**
- `ref_audio_id`: 參考音訊 ID（從 `/api/upload` 獲得）
- `ref_text`: 參考音訊的逐字稿（精確匹配可提升品質）
- `target_text`: 要生成的目標文字
- `language`: 語言（`Chinese`, `English`, `Japanese`, `Korean` 等）
- `x_vector_only`: 是否僅使用 x-vector（`true` = 無需參考文字但品質較低）

**回應範例：**
```json
{
  "audio_id": "456e7890-e89b-12d3-a456-426614174111",
  "filename": "456e7890-e89b-12d3-a456-426614174111.wav",
  "duration": 3.8,
  "sample_rate": 12000,
  "status": "success"
}
```

**cURL 範例：**
```bash
curl -X POST "http://localhost:8000/api/clone" \
  -H "Content-Type: application/json" \
  -d '{
    "ref_audio_id": "123e4567-e89b-12d3-a456-426614174000",
    "ref_text": "這是參考音訊",
    "target_text": "這是新生成的語音",
    "language": "Chinese"
  }'
```

### 音訊下載

#### `GET /api/download/{audio_id}`
下載生成的音訊檔案

**範例：**
```bash
curl -O "http://localhost:8000/api/download/456e7890-e89b-12d3-a456-426614174111"
```

或在瀏覽器中直接訪問：
```
http://localhost:8000/api/download/456e7890-e89b-12d3-a456-426614174111
```

### 檔案管理

#### `DELETE /api/audio/{audio_id}?audio_type=output`
刪除音訊檔案

**參數：**
- `audio_type`: `upload` (上傳的檔案) 或 `output` (生成的檔案)

**範例：**
```bash
# 刪除生成的檔案
curl -X DELETE "http://localhost:8000/api/audio/456e7890?audio_type=output"

# 刪除上傳的檔案
curl -X DELETE "http://localhost:8000/api/audio/123e4567?audio_type=upload"
```

#### `GET /api/cleanup?max_age_hours=24`
清理超過指定時間的舊檔案

**參數：**
- `max_age_hours`: 檔案保留時間（小時），預設 24

**範例：**
```bash
curl "http://localhost:8000/api/cleanup?max_age_hours=12"
```

## 完整使用流程

### Python 範例

```python
import requests

# 1. 上傳參考音訊
with open("my_voice.wav", "rb") as f:
    upload_response = requests.post(
        "http://localhost:8000/api/upload",
        files={"file": f}
    )
audio_id = upload_response.json()["audio_id"]

# 2. 生成語音
clone_response = requests.post(
    "http://localhost:8000/api/clone",
    json={
        "ref_audio_id": audio_id,
        "ref_text": "這是我的聲音",
        "target_text": "今天天氣真好",
        "language": "Chinese"
    }
)
output_id = clone_response.json()["audio_id"]

# 3. 下載生成的音訊
download_response = requests.get(
    f"http://localhost:8000/api/download/{output_id}"
)
with open("output.wav", "wb") as f:
    f.write(download_response.content)
```

### JavaScript (Fetch API) 範例

```javascript
// 1. 上傳參考音訊
const formData = new FormData();
formData.append('file', audioFile);

const uploadResponse = await fetch('http://localhost:8000/api/upload', {
  method: 'POST',
  body: formData
});
const { audio_id } = await uploadResponse.json();

// 2. 生成語音
const cloneResponse = await fetch('http://localhost:8000/api/clone', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ref_audio_id: audio_id,
    ref_text: '這是我的聲音',
    target_text: '今天天氣真好',
    language: 'Chinese'
  })
});
const { audio_id: outputId } = await cloneResponse.json();

// 3. 下載音訊
window.location.href = `http://localhost:8000/api/download/${outputId}`;
```

## 架構說明

```
backend/
├── main.py              # FastAPI 應用主檔案
├── uploads/             # 上傳的參考音訊（自動建立）
├── outputs/             # 生成的音訊檔案（自動建立）
├── start_server.sh      # 啟動腳本
└── README.md            # 本文件
```

## CORS 設定

預設允許以下來源訪問 API：
- `http://localhost:3000` (Vite 前端)
- `http://localhost:5173` (備用 Vite 埠)

如需新增其他來源，編輯 `main.py` 中的 `allow_origins`：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://your-domain.com"],
    ...
)
```

## 效能最佳化

### GPU 加速

確保已安裝 CUDA 和 PyTorch GPU 版本：

```bash
# 檢查 GPU 可用性
python -c "import torch; print(torch.cuda.is_available())"
```

### FlashAttention 2

FastAPI 會自動嘗試使用 FlashAttention 2 來加速推理。如果載入失敗，會自動退回到標準 attention。

### 模型預載入

模型會在服務啟動時自動載入（`@app.on_event("startup")`），避免首次請求時的延遲。

## 錯誤處理

API 使用標準 HTTP 狀態碼：

- `200 OK`: 請求成功
- `400 Bad Request`: 請求參數錯誤
- `404 Not Found`: 資源不存在
- `500 Internal Server Error`: 伺服器錯誤
- `503 Service Unavailable`: 模型未載入

**錯誤回應範例：**
```json
{
  "detail": "不支援的檔案格式。請上傳 .wav, .mp3, .flac 檔案"
}
```

## 日誌

啟動服務時會顯示：
- 模型載入狀態
- GPU 記憶體使用
- 每個請求的處理狀態

**範例輸出：**
```
🚀 正在載入 Qwen3-TTS 模型...
✓ 模型載入成功 (使用 FlashAttention 2)
📊 GPU 記憶體使用: 3.85 GB
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## 生產環境部署

### 使用 Gunicorn + Uvicorn Workers

```bash
gunicorn backend.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### 使用 Docker

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY . .

RUN pip install uv && uv sync

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 授權

遵循主專案的 Apache 2.0 授權條款。
