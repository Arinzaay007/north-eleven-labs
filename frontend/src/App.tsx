import { useState, useRef, useEffect } from 'react'
import {
  Volume2,
  ArrowDown,
  Play,
  Github,
  Music,
  Upload,
  Mic,
  FileText,
  MessageSquare,
  ChevronDown,
  Zap,
  Headphones,
  Info,
  Twitter,
  Linkedin,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react'

// 开发环境使用 localhost，生产环境可通过环境变量配置
// HF Spaces 使用相對路徑（透過 Nginx 代理）
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname.includes('hf.space') || window.location.hostname.includes('huggingface.co')
    ? '' // HF Spaces: 使用相對路徑
    : 'http://localhost:8000' // 本地開發
)

function App() {
  // 狀態管理
  const [refAudioFile, setRefAudioFile] = useState<File | null>(null)
  const [refAudioId, setRefAudioId] = useState<string>('')
  const [refAudioUrl, setRefAudioUrl] = useState<string>('')  // 用於播放上傳的參考音訊
  const [refText, setRefText] = useState('')
  const [targetText, setTargetText] = useState('')
  const [language, setLanguage] = useState('Chinese')
  const [xVectorOnly, setXVectorOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('準備好複製聲音')
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info')
  const [generatedAudioId, setGeneratedAudioId] = useState<string>('')
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const refAudioRef = useRef<HTMLAudioElement>(null)

  // 清理 blob URL，避免記憶體洩漏
  useEffect(() => {
    return () => {
      if (refAudioUrl) {
        URL.revokeObjectURL(refAudioUrl)
      }
    }
  }, [refAudioUrl])

  // 處理檔案選擇
  const handleFileSelect = async (file: File) => {
    if (!file) return

    // 檢查檔案類型
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/flac', 'audio/mp3']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|flac)$/i)) {
      setStatus('❌ 不支援的檔案格式。請上傳 WAV、MP3 或 FLAC 檔案')
      setStatusType('error')
      return
    }

    setRefAudioFile(file)

    // 創建本地 URL 用於播放預覽
    const localUrl = URL.createObjectURL(file)
    setRefAudioUrl(localUrl)

    setUploading(true)
    setStatus('正在上傳音訊...')
    setStatusType('info')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '上傳失敗')
      }

      const data = await response.json()
      setRefAudioId(data.audio_id)
      setStatus(`✓ 音訊已上傳 (${data.duration.toFixed(1)}秒)`)
      setStatusType('success')
    } catch (error) {
      setStatus(`❌ 上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
      setStatusType('error')
      setRefAudioFile(null)
      setRefAudioId('')
    } finally {
      setUploading(false)
    }
  }

  // 處理拖放
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // 處理點擊上傳
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // 處理生成
  const handleGenerate = async () => {
    if (!refAudioId) {
      setStatus('❌ 請先上傳參考音訊')
      setStatusType('error')
      return
    }

    if (!xVectorOnly && !refText.trim()) {
      setStatus('❌ 請輸入參考文字')
      setStatusType('error')
      return
    }

    if (!targetText.trim()) {
      setStatus('❌ 請輸入目標文字')
      setStatusType('error')
      return
    }

    setLoading(true)
    setStatus('正在生成語音...')
    setStatusType('info')

    try {
      const response = await fetch(`${API_URL}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref_audio_id: refAudioId,
          ref_text: refText,
          target_text: targetText,
          language: language,
          x_vector_only: xVectorOnly,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '生成失敗')
      }

      const data = await response.json()
      setGeneratedAudioId(data.audio_id)
      setGeneratedAudioUrl(`${API_URL}/download/${data.audio_id}`)
      setStatus(`✓ 生成完成！音訊長度: ${data.duration.toFixed(1)}秒`)
      setStatusType('success')

      // 自動播放
      setTimeout(() => {
        audioRef.current?.play()
      }, 100)
    } catch (error) {
      setStatus(`❌ 生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-primary flex flex-col w-[1440px] mx-auto">
      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.flac,audio/wav,audio/mpeg,audio/flac"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="hidden"
      />

      {/* NavBar */}
      <nav className="flex items-center justify-between gap-4 bg-background-secondary px-12 py-5 border-b border-border w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-lg font-bold">Qwen3-TTS</span>
            <span className="text-text-subtle text-[11px]">Voice Clone Studio</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href={`${API_URL}/docs`} target="_blank" rel="noopener noreferrer" className="text-text-muted text-[13px] hover:text-text-tertiary cursor-pointer">說明文件</a>
          <a href={`${API_URL}/docs`} target="_blank" rel="noopener noreferrer" className="text-text-muted text-[13px] hover:text-text-tertiary cursor-pointer">API</a>
          <div className="flex items-center gap-1.5 bg-background-elevated rounded-md px-3.5 py-2">
            <Github className="w-4 h-4 text-text-muted" />
            <span className="text-text-tertiary text-[13px]">GitHub</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center gap-6 bg-background-secondary px-12 pt-[60px] pb-12 w-full">
        <div className="flex items-center gap-2 bg-[#1e25324d] border border-[#6366f133] rounded-full px-3.5 py-1.5 shadow-[0_0_8px_rgba(99,102,241,0.53)]">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(99,102,241,0.53)]" />
          <span className="text-brand-light text-xs font-medium">由阿里巴巴 Qwen 團隊提供</span>
        </div>
        <h1 className="text-white text-5xl font-bold text-center">用 AI 複製任何聲音</h1>
        <p className="text-text-muted text-lg text-center leading-[1.6] w-[600px]">
          上傳語音樣本，即可生成該聲音的自然語音內容。
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
            className="flex items-center gap-2 bg-gradient-to-b from-brand-primary to-brand-secondary rounded-lg px-7 py-3.5 shadow-[0_4px_16px_rgba(99,102,241,0.2)] hover:opacity-90 transition-opacity"
          >
            <ArrowDown className="w-[18px] h-[18px] text-white" />
            <span className="text-white text-[15px] font-semibold">開始使用</span>
          </button>
          <a
            href={`${API_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-background-elevated border border-border-light rounded-lg px-7 py-3.5 hover:bg-background-tertiary transition-colors"
          >
            <Play className="w-[18px] h-[18px] text-text-muted" />
            <span className="text-text-tertiary text-[15px] font-medium">檢視文件</span>
          </a>
        </div>
      </section>

      {/* Main Area */}
      <main className="flex flex-col gap-8 bg-background-primary px-12 pt-12 pb-[60px] w-full">
        <h2 className="text-text-subtle text-base font-medium">從參考音訊複製聲音</h2>

        <div className="flex flex-col gap-8 w-full">
          {/* Left Column */}
          <div className="flex flex-col gap-6 bg-background-tertiary border border-border rounded-xl p-7 w-full">
            {/* Reference Audio Section */}
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-2 bg-brand-primary rounded-md px-3 py-1.5 w-full">
                <Music className="w-4 h-4 text-white" />
                <span className="text-white text-[13px] font-semibold">參考音訊（上傳要複製的聲音樣本）</span>
              </div>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={handleUploadClick}
                className="flex flex-col items-center justify-center gap-3 bg-background-secondary border-2 border-border-light rounded-lg px-8 py-8 h-[200px] w-full cursor-pointer hover:border-brand-primary transition-colors"
              >
                <div className="flex flex-col items-center gap-2">
                  {uploading ? (
                    <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
                  ) : refAudioFile ? (
                    <>
                      <CheckCircle className="w-10 h-10 text-green-500" />
                      <span className="text-text-secondary text-[15px] font-medium">{refAudioFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-text-subtle" />
                      <span className="text-text-secondary text-[15px] font-medium">拖放音訊至此處</span>
                      <span className="text-text-muted text-xs">- 或 -</span>
                      <span className="text-text-subtle text-[13px]">點擊上傳</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="flex items-center gap-1.5 bg-background-elevated rounded-md px-4 py-2 hover:bg-background-secondary transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-text-tertiary text-xs">上傳</span>
                </button>
                <button className="flex items-center gap-1.5 bg-background-elevated rounded-md px-4 py-2 hover:bg-background-secondary transition-colors opacity-50 cursor-not-allowed">
                  <Mic className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-text-tertiary text-xs">錄音（即將推出）</span>
                </button>
              </div>

              {/* 參考音訊播放器 */}
              {refAudioUrl && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-brand-primary" />
                    <span className="text-text-tertiary text-xs">預覽參考音訊</span>
                  </div>
                  <audio
                    ref={refAudioRef}
                    src={refAudioUrl}
                    controls
                    className="w-full h-10"
                    style={{ backgroundColor: '#1e2532', borderRadius: '6px' }}
                  />
                </div>
              )}
            </div>

            {/* Reference Text Section */}
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-2 bg-brand-primary rounded-md px-3 py-1.5 w-full">
                <FileText className="w-4 h-4 text-white" />
                <span className="text-white text-[13px] font-semibold">參考文字（參考音訊的逐字稿）</span>
              </div>
              <textarea
                value={refText}
                onChange={(e) => setRefText(e.target.value)}
                placeholder="輸入參考音訊中說的完整內容..."
                disabled={xVectorOnly}
                className="bg-background-secondary border border-border-light rounded-lg p-4 h-[120px] w-full text-text-secondary text-[13px] placeholder-text-subtle focus:outline-none focus:border-brand-primary transition-colors resize-none disabled:opacity-50"
              />
            </div>

            {/* X-Vector Section */}
            <div
              onClick={() => setXVectorOnly(!xVectorOnly)}
              className="flex items-center gap-3 bg-background-secondary rounded-lg p-4 w-full cursor-pointer hover:bg-[#1a1e28] transition-colors"
            >
              <div className={`w-[18px] h-[18px] border-2 rounded-sm flex items-center justify-center transition-colors ${xVectorOnly ? 'border-brand-primary bg-brand-primary' : 'border-text-disabled'}`}>
                {xVectorOnly && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <span className="text-text-tertiary text-[13px]">僅使用 x-vector（無需參考文字，但品質較低）</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6 bg-background-tertiary border border-border rounded-xl p-7 w-full">
            {/* Target Text Section */}
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-2 bg-brand-primary rounded-md px-3 py-1.5 w-full">
                <MessageSquare className="w-4 h-4 text-white" />
                <span className="text-white text-[13px] font-semibold">目標文字（要用複製聲音合成的文字）</span>
              </div>
              <textarea
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                placeholder="輸入您想讓複製聲音說的內容..."
                className="bg-background-secondary border border-border-light rounded-lg p-4 h-[160px] w-full text-text-secondary text-[13px] placeholder-text-subtle focus:outline-none focus:border-brand-primary transition-colors resize-none"
              />
            </div>

            {/* Settings Row */}
            <div className="flex gap-4 w-full">
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-1.5 bg-brand-primary rounded-sm px-2.5 py-1.5">
                  <span className="text-white text-xs font-semibold">語言</span>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-background-secondary border border-border-dark rounded-md px-4 py-3 w-full text-text-secondary text-sm focus:outline-none focus:border-brand-primary transition-colors cursor-pointer"
                >
                  <option value="Chinese">中文</option>
                  <option value="English">英文</option>
                  <option value="Japanese">日文</option>
                  <option value="Korean">韓文</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-1.5 bg-brand-primary rounded-sm px-2.5 py-1.5">
                  <span className="text-white text-xs font-semibold">模型大小</span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-background-secondary border border-border-dark rounded-md px-4 py-3 w-full">
                  <span className="text-text-secondary text-sm">1.7B</span>
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !refAudioId || !targetText.trim() || (!xVectorOnly && !refText.trim())}
              className="flex items-center justify-center gap-2.5 bg-gradient-to-b from-brand-primary to-brand-secondary rounded-lg px-8 py-[18px] shadow-[0_6px_20px_rgba(99,102,241,0.27)] w-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <span className="text-white text-[15px] font-semibold">生成中...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-white" />
                  <span className="text-white text-[15px] font-semibold">複製並生成</span>
                </>
              )}
            </button>

            {/* Output Section */}
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-2 bg-brand-primary rounded-md px-3 py-1.5 w-full">
                <Headphones className="w-4 h-4 text-white" />
                <span className="text-white text-[13px] font-semibold">生成的音訊</span>
              </div>
              <div className="flex flex-col gap-4 bg-background-secondary rounded-lg p-5 w-full">
                {generatedAudioUrl ? (
                  <div className="flex flex-col gap-4">
                    <audio
                      ref={audioRef}
                      src={generatedAudioUrl}
                      controls
                      className="w-full"
                    />
                    <a
                      href={generatedAudioUrl}
                      download={`qwen3tts_${generatedAudioId}.wav`}
                      className="flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-secondary rounded-md px-4 py-2 transition-colors"
                    >
                      <Download className="w-4 h-4 text-white" />
                      <span className="text-white text-sm">下載音訊</span>
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center justify-center bg-[#1f2332] rounded-md p-8 w-full">
                    <Music className="w-8 h-8 text-text-disabled" />
                  </div>
                )}
              </div>
            </div>

            {/* Status Section */}
            <div className="flex items-center gap-2.5 bg-background-secondary border border-border rounded-md px-3.5 py-3.5 w-full">
              {statusType === 'info' && <Info className="w-[18px] h-[18px] text-brand-primary flex-shrink-0" />}
              {statusType === 'success' && <CheckCircle className="w-[18px] h-[18px] text-green-500 flex-shrink-0" />}
              {statusType === 'error' && <XCircle className="w-[18px] h-[18px] text-red-500 flex-shrink-0" />}
              <span className="text-text-muted text-[13px]">{status}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-8 bg-background-secondary border-t border-border px-12 py-12 w-full">
        <div className="flex gap-16 w-full">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-md flex items-center justify-center">
                <Volume2 className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="text-white text-base font-bold">Qwen3-TTS</span>
            </div>
            <p className="text-text-subtle text-[13px] leading-[1.6]">
              AI 驅動的語音複製
              <br />
              與文字轉語音平台。
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-white text-[13px] font-semibold">產品</span>
            <span className="text-text-subtle text-[13px] hover:text-text-tertiary cursor-pointer">功能特色</span>
            <span className="text-text-subtle text-[13px] hover:text-text-tertiary cursor-pointer">價格方案</span>
            <a href={`${API_URL}/docs`} target="_blank" rel="noopener noreferrer" className="text-text-subtle text-[13px] hover:text-text-tertiary">API 參考</a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-white text-[13px] font-semibold">資源</span>
            <a href={`${API_URL}/docs`} target="_blank" rel="noopener noreferrer" className="text-text-subtle text-[13px] hover:text-text-tertiary">說明文件</a>
            <span className="text-text-subtle text-[13px] hover:text-text-tertiary cursor-pointer">教學課程</span>
            <span className="text-text-subtle text-[13px] hover:text-text-tertiary cursor-pointer">社群</span>
          </div>
        </div>
        <div className="w-full h-px bg-border" />
        <div className="flex items-center justify-between gap-4 w-full">
          <span className="text-text-subtle text-xs">© 2024 Qwen3-TTS. 由阿里巴巴 Qwen 團隊提供技術支援。</span>
          <div className="flex gap-4">
            <Twitter className="w-[18px] h-[18px] text-text-subtle hover:text-text-tertiary cursor-pointer transition-colors" />
            <Github className="w-[18px] h-[18px] text-text-subtle hover:text-text-tertiary cursor-pointer transition-colors" />
            <Linkedin className="w-[18px] h-[18px] text-text-subtle hover:text-text-tertiary cursor-pointer transition-colors" />
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
