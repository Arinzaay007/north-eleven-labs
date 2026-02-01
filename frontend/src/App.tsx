import { useState, useRef, useEffect } from 'react'
import {
  Volume2,
  ArrowDown,
  Music,
  Upload,
  FileText,
  MessageSquare,
  Zap,
  Headphones,
  Info,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Play,
  AlertCircle,
  HelpCircle,
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [refTextError, setRefTextError] = useState<string>('')
  const [targetTextError, setTargetTextError] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const refAudioRef = useRef<HTMLAudioElement>(null)
  const targetTextRef = useRef<HTMLDivElement>(null)

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
      setStatus('不支援的檔案格式。請上傳 WAV、MP3 或 FLAC 檔案')
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
      setStatus(`音訊已上傳 (${data.duration.toFixed(1)}秒)`)
      setStatusType('success')
      setCurrentStep(2) // 自動進到下一步
    } catch (error) {
      setStatus(`上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
      setStatusType('error')
      setRefAudioFile(null)
      setRefAudioId('')
    } finally {
      setUploading(false)
    }
  }

  // 檢查步驟完成狀態
  const isStep1Complete = refAudioId !== ''
  const isStep2Complete = isStep1Complete && (xVectorOnly || refText.trim() !== '')
  const canGenerate = isStep2Complete && targetText.trim() !== ''

  // 取得禁用原因
  const getDisabledReason = (): string => {
    if (!refAudioId) return '請先上傳參考音訊'
    if (!xVectorOnly && !refText.trim()) return '請輸入參考文字'
    if (!targetText.trim()) return '請輸入目標文字'
    return ''
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
    setCurrentStep(1)
    fileInputRef.current?.click()
  }

  // 當步驟改變時滾動到相應位置
  useEffect(() => {
    if (currentStep === 3 && targetTextRef.current) {
      targetTextRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep])

  // 處理生成
  const handleGenerate = async () => {
    if (!refAudioId) {
      setStatus('請先上傳參考音訊')
      setStatusType('error')
      return
    }

    if (!xVectorOnly && !refText.trim()) {
      setStatus('請輸入參考文字')
      setStatusType('error')
      return
    }

    if (!targetText.trim()) {
      setStatus('請輸入目標文字')
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
      setStatus(`生成完成！音訊長度: ${data.duration.toFixed(1)}秒`)
      setStatusType('success')

      // 自動播放
      setTimeout(() => {
        audioRef.current?.play()
      }, 100)
    } catch (error) {
      setStatus(`生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.flac,audio/wav,audio/mpeg,audio/flac"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="hidden"
      />

      {/* NavBar */}
      <nav className="flex items-center justify-between gap-4 bg-background-secondary px-6 md:px-12 py-6 border-b border-border w-full">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
            <Volume2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-xl font-bold">Qwen3-TTS</span>
            <span className="text-text-subtle text-sm">語音複製工作室</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center gap-8 bg-background-secondary px-6 md:px-12 pt-16 pb-16 w-full">
        <div className="flex items-center gap-2 bg-[#1e25324d] border border-[#6366f133] rounded-full px-4 py-2 shadow-[0_0_8px_rgba(99,102,241,0.53)] transition-all duration-200 hover:shadow-[0_0_12px_rgba(99,102,241,0.6)]">
          <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(99,102,241,0.53)] animate-pulse" />
          <span className="text-brand-light text-sm font-medium">由阿里巴巴 Qwen 團隊提供</span>
        </div>
        <h1 className="text-white text-5xl md:text-6xl font-bold text-center px-4">用 AI 複製任何聲音</h1>
        <p className="text-text-muted text-xl text-center leading-[1.6] max-w-2xl px-4">
          上傳 3-10 秒語音樣本，即可生成該聲音的自然語音內容。支援中、英、日、韓等多種語言。
        </p>
        <button
          onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
          className="flex items-center gap-2 bg-gradient-to-b from-brand-primary to-brand-secondary rounded-lg px-8 py-4 shadow-[0_4px_16px_rgba(99,102,241,0.2)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.35)] hover:transform hover:scale-[1.02] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-background-secondary"
        >
          <ArrowDown className="w-5 h-5 text-white" />
          <span className="text-white text-lg font-semibold">開始使用</span>
        </button>
      </section>

      {/* Main Area */}
      <main className="flex flex-col gap-8 bg-background-primary px-6 md:px-12 lg:px-24 pt-12 pb-16 w-full max-w-7xl mx-auto">
        {/* 步驟指示器 */}
        <div className="flex items-center justify-center gap-4 w-full">
          {/* 步驟 1 */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
              isStep1Complete
                ? 'border-green-500 bg-green-500/10'
                : currentStep === 1
                ? 'border-brand-primary bg-brand-primary/10'
                : 'border-border bg-background-tertiary'
            }`}>
              {isStep1Complete ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <span className={`text-sm font-semibold ${currentStep === 1 ? 'text-brand-primary' : 'text-text-disabled'}`}>1</span>
              )}
            </div>
            <span className={`text-sm font-medium hidden md:block ${
              isStep1Complete ? 'text-green-500' : currentStep === 1 ? 'text-text-secondary' : 'text-text-disabled'
            }`}>上傳音訊</span>
          </div>

          {/* 連接線 */}
          <div className={`h-0.5 w-12 md:w-20 transition-colors duration-200 ${
            isStep1Complete ? 'bg-green-500' : 'bg-border'
          }`} />

          {/* 步驟 2 */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
              isStep2Complete
                ? 'border-green-500 bg-green-500/10'
                : currentStep === 2
                ? 'border-brand-primary bg-brand-primary/10'
                : 'border-border bg-background-tertiary'
            }`}>
              {isStep2Complete ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <span className={`text-sm font-semibold ${currentStep === 2 ? 'text-brand-primary' : 'text-text-disabled'}`}>2</span>
              )}
            </div>
            <span className={`text-sm font-medium hidden md:block ${
              isStep2Complete ? 'text-green-500' : currentStep === 2 ? 'text-text-secondary' : 'text-text-disabled'
            }`}>設定參考</span>
          </div>

          {/* 連接線 */}
          <div className={`h-0.5 w-12 md:w-20 transition-colors duration-200 ${
            isStep2Complete ? 'bg-green-500' : 'bg-border'
          }`} />

          {/* 步驟 3 */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
              generatedAudioUrl
                ? 'border-green-500 bg-green-500/10'
                : currentStep === 3
                ? 'border-brand-primary bg-brand-primary/10'
                : 'border-border bg-background-tertiary'
            }`}>
              {generatedAudioUrl ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <span className={`text-sm font-semibold ${currentStep === 3 ? 'text-brand-primary' : 'text-text-disabled'}`}>3</span>
              )}
            </div>
            <span className={`text-sm font-medium hidden md:block ${
              generatedAudioUrl ? 'text-green-500' : currentStep === 3 ? 'text-text-secondary' : 'text-text-disabled'
            }`}>生成語音</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 w-full">
          {/* Left Column */}
          <div className="flex flex-col gap-6 bg-background-tertiary border border-border rounded-xl p-6 md:p-8 w-full lg:w-1/2">
            {/* Reference Audio Section */}
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg px-4 py-3 w-full shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                    <Music className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white text-base font-semibold">參考音訊（上傳要複製的聲音樣本）</span>
                </div>
                {isStep1Complete && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>

              {/* 提示訊息 */}
              {!refAudioFile && (
                <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-400 text-sm">
                    上傳 <strong>3-10 秒</strong>的清晰語音，單一說話者，無背景噪音效果最佳
                  </p>
                </div>
              )}

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={handleUploadClick}
                className="flex flex-col items-center justify-center gap-4 bg-background-secondary border-2 border-border-light rounded-lg px-8 py-10 min-h-[220px] w-full cursor-pointer hover:border-brand-primary hover:bg-[#161923] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                role="button"
                tabIndex={0}
                aria-label="上傳參考音訊檔案"
              >
                <div className="flex flex-col items-center gap-3">
                  {uploading ? (
                    <>
                      <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
                      <span className="text-text-secondary text-base font-medium">上傳中...</span>
                    </>
                  ) : refAudioFile ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                      <span className="text-text-secondary text-base font-medium">{refAudioFile.name}</span>
                      <span className="text-text-subtle text-sm">點擊以重新上傳</span>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-brand-primary" />
                      </div>
                      <span className="text-text-secondary text-lg font-medium">拖放音訊至此處</span>
                      <span className="text-text-muted text-sm">或點擊選擇檔案</span>
                      <span className="text-text-subtle text-xs mt-1">支援 WAV、MP3、FLAC 格式</span>
                    </>
                  )}
                </div>
              </div>

              {/* 參考音訊播放器 */}
              {refAudioUrl && (
                <div className="flex flex-col gap-3 w-full p-4 bg-background-secondary rounded-lg border border-border transition-all duration-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
                      <Play className="w-4 h-4 text-brand-primary" />
                    </div>
                    <span className="text-text-tertiary text-sm font-medium">預覽參考音訊</span>
                  </div>
                  <audio
                    ref={refAudioRef}
                    src={refAudioUrl}
                    controls
                    className="w-full h-12 rounded-md"
                    style={{ backgroundColor: '#1e2532' }}
                  />
                </div>
              )}
            </div>

            {/* Reference Text Section */}
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg px-4 py-3 w-full shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white text-base font-semibold">參考文字（參考音訊的逐字稿）</span>
                </div>
                {!xVectorOnly && refText.trim() && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>

              {/* 提示訊息 */}
              {!xVectorOnly && (
                <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-400 text-sm">
                    輸入參考音訊中說的<strong>完整內容</strong>，逐字稿越準確，生成品質越好
                  </p>
                </div>
              )}

              <div className="relative">
                <textarea
                  value={refText}
                  onChange={(e) => {
                    setRefText(e.target.value)
                    setRefTextError('')
                  }}
                  onBlur={() => {
                    if (!xVectorOnly && !refText.trim() && refAudioId) {
                      setRefTextError('需要參考文字才能獲得最佳品質')
                    }
                  }}
                  placeholder="例如：今天天氣真好，我們一起去公園散步吧..."
                  disabled={xVectorOnly}
                  className={`bg-background-secondary border rounded-lg p-4 h-[140px] w-full text-text-secondary text-base placeholder-text-subtle focus:outline-none focus:ring-2 transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    refTextError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : !xVectorOnly && refText.trim()
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : 'border-border-light focus:border-brand-primary focus:ring-brand-primary/20'
                  }`}
                  aria-label="參考文字輸入"
                />
                <div className="absolute bottom-3 right-3 text-text-subtle text-xs">
                  {refText.length} 字元
                </div>
              </div>

              {refTextError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{refTextError}</span>
                </div>
              )}
            </div>

            {/* X-Vector Section */}
            <label
              className="flex items-center gap-3 bg-background-secondary rounded-lg p-4 w-full cursor-pointer hover:bg-[#1a1e28] transition-all duration-200 group"
            >
              <input
                type="checkbox"
                checked={xVectorOnly}
                onChange={(e) => setXVectorOnly(e.target.checked)}
                className="sr-only"
                aria-label="僅使用 x-vector 模式"
              />
              <div className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center transition-all duration-200 ${xVectorOnly ? 'border-brand-primary bg-brand-primary' : 'border-text-disabled group-hover:border-brand-primary/50'}`}>
                {xVectorOnly && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="text-text-tertiary text-sm">僅使用 x-vector（無需參考文字，但品質較低）</span>
            </label>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6 bg-background-tertiary border border-border rounded-xl p-6 md:p-8 w-full lg:w-1/2">
            {/* Target Text Section */}
            <div ref={targetTextRef} className="flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg px-4 py-3 w-full shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white text-base font-semibold">目標文字（要用複製聲音合成的文字）</span>
                </div>
                {targetText.trim() && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>

              {/* 提示訊息 */}
              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-400 text-sm">
                  輸入您想要複製聲音說的內容，支援中、英、日、韓等多種語言
                </p>
              </div>

              <div className="relative">
                <textarea
                  value={targetText}
                  onChange={(e) => {
                    setTargetText(e.target.value)
                    setTargetTextError('')
                    if (e.target.value.trim() && isStep2Complete) {
                      setCurrentStep(3)
                    }
                  }}
                  onBlur={() => {
                    if (!targetText.trim() && isStep2Complete) {
                      setTargetTextError('請輸入要生成的文字內容')
                    }
                  }}
                  placeholder="例如：歡迎來到我的頻道，今天要跟大家分享..."
                  className={`bg-background-secondary border rounded-lg p-4 h-[180px] w-full text-text-secondary text-base placeholder-text-subtle focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                    targetTextError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : targetText.trim()
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : 'border-border-light focus:border-brand-primary focus:ring-brand-primary/20'
                  }`}
                  aria-label="目標文字輸入"
                />
                <div className="absolute bottom-3 right-3 text-text-subtle text-xs">
                  {targetText.length} 字元
                </div>
              </div>

              {targetTextError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{targetTextError}</span>
                </div>
              )}
            </div>

            {/* Language Selection */}
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-2 px-1 py-1">
                <span className="text-text-tertiary text-sm font-medium">語言選擇</span>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-background-secondary border border-border-dark rounded-md px-4 py-3 w-full text-text-secondary text-base focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all duration-200 cursor-pointer hover:border-brand-primary/50"
                aria-label="選擇語言"
              >
                <option value="Chinese">中文</option>
                <option value="English">英文</option>
                <option value="Japanese">日文</option>
                <option value="Korean">韓文</option>
              </select>
            </div>

            {/* Generate Button */}
            <div className="flex flex-col gap-3 w-full">
              {!canGenerate && !loading && (
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <Info className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-yellow-400 text-sm">{getDisabledReason()}</span>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading || !canGenerate}
                className="flex items-center justify-center gap-3 bg-gradient-to-b from-brand-primary to-brand-secondary rounded-lg px-8 py-5 shadow-[0_6px_20px_rgba(99,102,241,0.27)] w-full hover:shadow-[0_8px_28px_rgba(99,102,241,0.4)] hover:transform hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_6px_20px_rgba(99,102,241,0.27)] focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-background-tertiary cursor-pointer"
                aria-label="開始複製並生成語音"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                    <span className="text-white text-lg font-semibold">生成中...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6 text-white" />
                    <span className="text-white text-lg font-semibold">開始生成語音</span>
                  </>
                )}
              </button>
            </div>

            {/* Output Section */}
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center gap-3 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg px-4 py-3 w-full shadow-sm">
                <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-white" />
                </div>
                <span className="text-white text-base font-semibold">生成的音訊</span>
              </div>
              <div className="flex flex-col gap-4 bg-background-secondary rounded-lg p-6 w-full">
                {generatedAudioUrl ? (
                  <div className="flex flex-col gap-4">
                    <audio
                      ref={audioRef}
                      src={generatedAudioUrl}
                      controls
                      className="w-full h-12 rounded-md"
                      style={{ backgroundColor: '#1e2532' }}
                    />
                    <a
                      href={generatedAudioUrl}
                      download={`qwen3tts_${generatedAudioId}.wav`}
                      className="flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-secondary rounded-md px-5 py-3 transition-all duration-200 hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-background-secondary"
                      aria-label="下載生成的音訊檔案"
                    >
                      <Download className="w-5 h-5 text-white" />
                      <span className="text-white text-base font-medium">下載音訊</span>
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 bg-[#1f2332] rounded-md p-10 w-full">
                    <div className="w-16 h-16 rounded-full bg-text-disabled/10 flex items-center justify-center">
                      <Music className="w-8 h-8 text-text-disabled" />
                    </div>
                    <span className="text-text-disabled text-sm">尚無生成的音訊</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Section */}
            <div className={`flex items-center gap-3 rounded-md px-4 py-4 w-full transition-all duration-200 ${
              statusType === 'info' ? 'bg-brand-primary/10 border border-brand-primary/30' :
              statusType === 'success' ? 'bg-green-500/10 border border-green-500/30' :
              'bg-red-500/10 border border-red-500/30'
            }`}>
              {statusType === 'info' && (
                <div className="w-5 h-5 flex-shrink-0">
                  <Info className="w-5 h-5 text-brand-primary" />
                </div>
              )}
              {statusType === 'success' && (
                <div className="w-5 h-5 flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              )}
              {statusType === 'error' && (
                <div className="w-5 h-5 flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
              )}
              <span className={`text-base ${
                statusType === 'info' ? 'text-brand-light' :
                statusType === 'success' ? 'text-green-400' :
                'text-red-400'
              }`}>{status}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-6 bg-background-secondary border-t border-border px-6 md:px-12 py-8 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-md flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-white text-lg font-bold">Qwen3-TTS</span>
              <span className="text-text-subtle text-sm">語音複製工作室</span>
            </div>
          </div>
          <span className="text-text-subtle text-sm text-center md:text-right">
            © 2024 Qwen3-TTS. 由阿里巴巴 Qwen 團隊提供技術支援。
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
