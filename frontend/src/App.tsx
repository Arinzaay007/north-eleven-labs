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

const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname.includes('hf.space') || window.location.hostname.includes('huggingface.co')
    ? ''
    : 'http://localhost:8000'
)

function App() {
  const [refAudioFile, setRefAudioFile] = useState<File | null>(null)
  const [refAudioId, setRefAudioId] = useState<string>('')
  const [refAudioUrl, setRefAudioUrl] = useState<string>('')
  const [refText, setRefText] = useState('')
  const [targetText, setTargetText] = useState('')
  const [language, setLanguage] = useState('English')
  const [xVectorOnly, setXVectorOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('Ready to clone a voice')
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info')
  const [generatedAudioId, setGeneratedAudioId] = useState<string>('')
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string>('')
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [refTextError, setRefTextError] = useState<string>('')
  const [targetTextError, setTargetTextError] = useState<string>('')
  const [uploadWarning, setUploadWarning] = useState<string>('')
  const [loadingExample, setLoadingExample] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const refAudioRef = useRef<HTMLAudioElement>(null)
  const targetTextRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (refAudioUrl) {
        URL.revokeObjectURL(refAudioUrl)
      }
    }
  }, [refAudioUrl])

  const handleFileSelect = async (file: File) => {
    if (!file) return

    setUploadWarning('')

    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/flac', 'audio/mp3']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|flac)$/i)) {
      setStatus('Unsupported file format. Please upload a WAV, MP3, or FLAC file.')
      setStatusType('error')
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setStatus('File too large. Please upload an audio file smaller than 10MB.')
      setStatusType('error')
      return
    }

    setRefAudioFile(file)

    const localUrl = URL.createObjectURL(file)
    setRefAudioUrl(localUrl)

    setUploading(true)
    setStatus('Uploading audio...')
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
        throw new Error(error.detail || 'Upload failed')
      }

      const data = await response.json()
      setRefAudioId(data.audio_id)

      if (data.warning) {
        setUploadWarning(data.warning)
        if (data.was_trimmed) {
          setStatus(`Audio uploaded and trimmed to ${data.duration.toFixed(1)}s (original: ${data.original_duration.toFixed(1)}s)`)
        } else {
          setStatus(`Audio uploaded (${data.duration.toFixed(1)}s)`)
        }
        setStatusType('success')
      } else {
        setStatus(`Audio uploaded (${data.duration.toFixed(1)}s)`)
        setStatusType('success')
      }

      setCurrentStep(2)
    } catch (error) {
      setStatus(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setStatusType('error')
      setRefAudioFile(null)
      setRefAudioId('')
    } finally {
      setUploading(false)
    }
  }

  const isStep1Complete = refAudioId !== ''
  const isStep2Complete = isStep1Complete && (xVectorOnly || refText.trim() !== '')
  const canGenerate = isStep2Complete && targetText.trim() !== ''

  const getDisabledReason = (): string => {
    if (!refAudioId) return 'Please upload a reference audio first'
    if (!xVectorOnly && !refText.trim()) return 'Please enter the reference text'
    if (!targetText.trim()) return 'Please enter the target text'
    return ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleUploadClick = () => {
    setCurrentStep(1)
    fileInputRef.current?.click()
  }

  const handleLoadExample = async () => {
    setLoadingExample(true)
    setCurrentStep(1)

    try {
      const response = await fetch('/example.wav')
      if (!response.ok) throw new Error('Could not load example audio')

      const blob = await response.blob()
      const file = new File([blob], 'example.wav', { type: 'audio/wav' })

      await handleFileSelect(file)

      const exampleRefText = 'Today let me go over some of the most useful keyboard shortcuts in Mac Finder. The goal is simple — help you ditch the mouse and work more intuitively.'
      setRefText(exampleRefText)
      setRefTextError('')

      const exampleTargetText = 'Welcome to North Eleven Labs, where we clone voices with cutting-edge AI technology.'
      setTargetText(exampleTargetText)
      setTargetTextError('')

      setCurrentStep(3)

      setStatus('Example loaded! You can generate now or edit the text first.')
      setStatusType('info')

      setTimeout(() => {
        targetTextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 500)
    } catch (error) {
      setStatus(`Failed to load example: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setStatusType('error')
    } finally {
      setLoadingExample(false)
    }
  }

  useEffect(() => {
    if (currentStep === 3 && targetTextRef.current) {
      targetTextRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentStep])

  const handleGenerate = async () => {
    if (!refAudioId) {
      setStatus('Please upload a reference audio first')
      setStatusType('error')
      return
    }

    if (!xVectorOnly && !refText.trim()) {
      setStatus('Please enter the reference text')
      setStatusType('error')
      return
    }

    if (!targetText.trim()) {
      setStatus('Please enter the target text')
      setStatusType('error')
      return
    }

    setLoading(true)
    setStatus('Generating voice...')
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
        throw new Error(error.detail || 'Generation failed')
      }

      const data = await response.json()
      setGeneratedAudioId(data.audio_id)
      setGeneratedAudioUrl(`${API_URL}/download/${data.audio_id}`)
      setStatus(`Generation complete! Audio length: ${data.duration.toFixed(1)}s`)
      setStatusType('success')

      setTimeout(() => {
        audioRef.current?.play()
      }, 100)
    } catch (error) {
      setStatus(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
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
            <span className="text-white text-xl font-bold">North Eleven Labs</span>
            <span className="text-text-subtle text-sm">Voice Cloning Studio</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center gap-8 bg-background-secondary px-6 md:px-12 pt-16 pb-16 w-full">
        <div className="flex items-center gap-2 bg-[#1e25324d] border border-[#6366f133] rounded-full px-4 py-2 shadow-[0_0_8px_rgba(99,102,241,0.53)] transition-all duration-200 hover:shadow-[0_0_12px_rgba(99,102,241,0.6)]">
          <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(99,102,241,0.53)] animate-pulse" />
          <span className="text-brand-light text-sm font-medium">Built by Arinzaay</span>
        </div>
        <h1 className="text-white text-5xl md:text-6xl font-bold text-center px-4">Clone Any Voice with AI</h1>
        <p className="text-text-muted text-xl text-center leading-[1.6] max-w-2xl px-4">
          Upload a 3–10 second voice sample and generate natural speech in that voice. Supports English, Chinese, Japanese, Korean, and more.
        </p>
        <button
          onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
          className="flex items-center gap-2 bg-gradient-to-b from-brand-primary to-brand-secondary rounded-lg px-8 py-4 shadow-[0_4px_16px_rgba(99,102,241,0.2)] hover:shadow-[0_6px_24px_rgba(99,102,241,0.35)] hover:transform hover:scale-[1.02] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-background-secondary"
        >
          <ArrowDown className="w-5 h-5 text-white" />
          <span className="text-white text-lg font-semibold">Get Started</span>
        </button>
      </section>

      {/* Main Area */}
      <main className="flex flex-col gap-8 bg-background-primary px-6 md:px-12 lg:px-24 pt-12 pb-16 w-full max-w-7xl mx-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 w-full">
          {/* Step 1 */}
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
            }`}>Upload Audio</span>
          </div>

          <div className={`h-0.5 w-12 md:w-20 transition-colors duration-200 ${isStep1Complete ? 'bg-green-500' : 'bg-border'}`} />

          {/* Step 2 */}
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
            }`}>Set Reference</span>
          </div>

          <div className={`h-0.5 w-12 md:w-20 transition-colors duration-200 ${isStep2Complete ? 'bg-green-500' : 'bg-border'}`} />

          {/* Step 3 */}
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
            }`}>Generate Voice</span>
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
                  <span className="text-white text-base font-semibold">Reference Audio (voice to clone)</span>
                </div>
                {isStep1Complete && <CheckCircle className="w-5 h-5 text-green-400" />}
              </div>

              {!refAudioFile && (
                <button
                  onClick={handleLoadExample}
                  disabled={loadingExample}
                  className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 rounded-lg px-4 py-3 w-full transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loadingExample ? (
                    <>
                      <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
                      <span className="text-green-400 text-sm font-medium">Loading...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
                      <span className="text-green-400 text-sm font-medium">Quick Test: Use Example Audio (10s)</span>
                    </>
                  )}
                </button>
              )}

              {!refAudioFile && (
                <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-400 text-sm">
                    Upload <strong>3–10 seconds</strong> of clear audio. Single speaker, no background noise works best.
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
                aria-label="Upload reference audio file"
              >
                <div className="flex flex-col items-center gap-3">
                  {uploading ? (
                    <>
                      <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
                      <span className="text-text-secondary text-base font-medium">Uploading...</span>
                    </>
                  ) : refAudioFile ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                      <span className="text-text-secondary text-base font-medium">{refAudioFile.name}</span>
                      <span className="text-text-subtle text-sm">Click to re-upload</span>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-brand-primary" />
                      </div>
                      <span className="text-text-secondary text-lg font-medium">Drag & drop audio here</span>
                      <span className="text-text-muted text-sm">or click to browse files</span>
                      <span className="text-text-subtle text-xs mt-1">Supports WAV, MP3, FLAC</span>
                    </>
                  )}
                </div>
              </div>

              {uploadWarning && (
                <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-400 text-sm">{uploadWarning}</p>
                </div>
              )}

              {refAudioUrl && (
                <div className="flex flex-col gap-3 w-full p-4 bg-background-secondary rounded-lg border border-border transition-all duration-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
                      <Play className="w-4 h-4 text-brand-primary" />
                    </div>
                    <span className="text-text-tertiary text-sm font-medium">Preview Reference Audio</span>
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
                  <span className="text-white text-base font-semibold">Reference Text (transcript of the audio)</span>
                </div>
                {!xVectorOnly && refText.trim() && <CheckCircle className="w-5 h-5 text-green-400" />}
              </div>

              {!xVectorOnly && (
                <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-400 text-sm">
                    Type the <strong>exact words</strong> spoken in the reference audio. More accurate = better quality.
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
                      setRefTextError('Reference text is needed for best quality')
                    }
                  }}
                  placeholder="e.g. Hey everyone, welcome back to my channel..."
                  disabled={xVectorOnly}
                  className={`bg-background-secondary border rounded-lg p-4 h-[140px] w-full text-text-secondary text-base placeholder-text-subtle focus:outline-none focus:ring-2 transition-all duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    refTextError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : !xVectorOnly && refText.trim()
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : 'border-border-light focus:border-brand-primary focus:ring-brand-primary/20'
                  }`}
                  aria-label="Reference text input"
                />
                <div className="absolute bottom-3 right-3 text-text-subtle text-xs">
                  {refText.length} chars
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
            <label className="flex items-center gap-3 bg-background-secondary rounded-lg p-4 w-full cursor-pointer hover:bg-[#1a1e28] transition-all duration-200 group">
              <input
                type="checkbox"
                checked={xVectorOnly}
                onChange={(e) => setXVectorOnly(e.target.checked)}
                className="sr-only"
                aria-label="Use x-vector only mode"
              />
              <div className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center transition-all duration-200 ${xVectorOnly ? 'border-brand-primary bg-brand-primary' : 'border-text-disabled group-hover:border-brand-primary/50'}`}>
                {xVectorOnly && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className="text-text-tertiary text-sm">Use x-vector only (no reference text needed, but lower quality)</span>
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
                  <span className="text-white text-base font-semibold">Target Text (what the cloned voice will say)</span>
                </div>
                {targetText.trim() && <CheckCircle className="w-5 h-5 text-green-400" />}
              </div>

              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-400 text-sm">
                  Enter what you want the cloned voice to say. Supports English, Chinese, Japanese, Korean, and more.
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
                      setTargetTextError('Please enter the text you want to generate')
                    }
                  }}
                  placeholder="e.g. Welcome to North Eleven Labs, the future of voice cloning..."
                  className={`bg-background-secondary border rounded-lg p-4 h-[180px] w-full text-text-secondary text-base placeholder-text-subtle focus:outline-none focus:ring-2 transition-all duration-200 resize-none ${
                    targetTextError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : targetText.trim()
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : 'border-border-light focus:border-brand-primary focus:ring-brand-primary/20'
                  }`}
                  aria-label="Target text input"
                />
                <div className="absolute bottom-3 right-3 text-text-subtle text-xs">
                  {targetText.length} chars
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
                <span className="text-text-tertiary text-sm font-medium">Language</span>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-background-secondary border border-border-dark rounded-md px-4 py-3 w-full text-text-secondary text-base focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all duration-200 cursor-pointer hover:border-brand-primary/50"
                aria-label="Select language"
              >
                <option value="English">English</option>
                <option value="Chinese">Chinese</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
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
                aria-label="Generate cloned voice"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                    <span className="text-white text-lg font-semibold">Generating...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6 text-white" />
                    <span className="text-white text-lg font-semibold">Generate Voice</span>
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
                <span className="text-white text-base font-semibold">Generated Audio</span>
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
                      download={`northelevenlabs_${generatedAudioId}.wav`}
                      className="flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-secondary rounded-md px-5 py-3 transition-all duration-200 hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-background-secondary"
                      aria-label="Download generated audio"
                    >
                      <Download className="w-5 h-5 text-white" />
                      <span className="text-white text-base font-medium">Download Audio</span>
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 bg-[#1f2332] rounded-md p-10 w-full">
                    <div className="w-16 h-16 rounded-full bg-text-disabled/10 flex items-center justify-center">
                      <Music className="w-8 h-8 text-text-disabled" />
                    </div>
                    <span className="text-text-disabled text-sm">No audio generated yet</span>
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
              {statusType === 'info' && <Info className="w-5 h-5 text-brand-primary flex-shrink-0" />}
              {statusType === 'success' && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
              {statusType === 'error' && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
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
              <span className="text-white text-lg font-bold">North Eleven Labs</span>
              <span className="text-text-subtle text-sm">Voice Cloning Studio</span>
            </div>
          </div>
          <span className="text-text-subtle text-sm text-center md:text-right">
            © 2025 North Eleven Labs. Built by Arinzaay.
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
