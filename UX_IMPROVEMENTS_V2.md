# UX 改進 V2 - 直覺化使用體驗

## 改進目標

讓使用者能更直覺地理解操作流程，減少困惑，提升完成任務的效率。

## 主要改進項目

### 1. ✅ 視覺化步驟指示器

**問題**: 使用者不知道要按什麼順序操作，也不清楚目前進度

**解決方案**:
- 添加頂部三步驟進度指示器：上傳音訊 → 設定參考 → 生成語音
- 每個步驟顯示編號和狀態（未完成/進行中/已完成）
- 完成的步驟顯示綠色勾選標記
- 當前步驟高亮顯示藍色
- 響應式設計：桌面顯示文字標籤，移動版只顯示圖標

**實作**:
```tsx
{/* 步驟 1: 上傳音訊 */}
<div className={`w-10 h-10 rounded-full ${
  isStep1Complete ? 'border-green-500 bg-green-500/10' :
  currentStep === 1 ? 'border-brand-primary bg-brand-primary/10' :
  'border-border bg-background-tertiary'
}`}>
  {isStep1Complete ? <CheckCircle /> : <span>1</span>}
</div>
```

### 2. ✅ 即時表單驗證與視覺反饋

**問題**: 使用者不知道輸入是否正確，直到點擊生成按鈕才發現錯誤

**解決方案**:
- **即時邊框顏色變化**:
  - 預設: 灰色邊框
  - 有內容且正確: 綠色邊框 + 勾選標記
  - 有錯誤: 紅色邊框 + 錯誤圖標
- **字元計數器**: 即時顯示輸入字元數
- **成功指示**: 欄位完成時在標題欄顯示綠色勾選

**實作**:
```tsx
<textarea
  className={`${
    error ? 'border-red-500 focus:ring-red-500/20' :
    hasContent ? 'border-green-500 focus:ring-green-500/20' :
    'border-border-light focus:ring-brand-primary/20'
  }`}
/>
<div className="absolute bottom-3 right-3">
  {text.length} 字元
</div>
```

### 3. ✅ 智能提示與說明

**問題**: 使用者不清楚要輸入什麼內容或格式要求

**解決方案**:
- **藍色提示框**: 每個輸入區域都有藍色背景的提示說明
- **具體範例**: Placeholder 提供實際範例而非空泛描述
- **重點標示**: 使用 `<strong>` 標記關鍵資訊

**範例**:
```tsx
{/* 上傳提示 */}
<div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
  <HelpCircle className="w-4 h-4 text-blue-400" />
  <p className="text-blue-400 text-sm">
    上傳 <strong>3-10 秒</strong>的清晰語音，單一說話者，無背景噪音效果最佳
  </p>
</div>

{/* 參考文字提示 */}
<p className="text-blue-400 text-sm">
  輸入參考音訊中說的<strong>完整內容</strong>，逐字稿越準確，生成品質越好
</p>
```

### 4. ✅ 智能按鈕狀態與禁用原因

**問題**: 按鈕被禁用時，使用者不知道為什麼無法點擊

**解決方案**:
- **禁用提示框**: 當按鈕無法點擊時，上方顯示黃色提示框說明原因
- **動態訊息**: 根據實際缺少的內容顯示對應提示
- **自動隱藏**: 條件滿足後提示框自動消失

**實作**:
```tsx
{!canGenerate && !loading && (
  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
    <Info className="w-4 h-4 text-yellow-400" />
    <span>{getDisabledReason()}</span>
  </div>
)}

// 動態判斷原因
const getDisabledReason = (): string => {
  if (!refAudioId) return '請先上傳參考音訊'
  if (!xVectorOnly && !refText.trim()) return '請輸入參考文字'
  if (!targetText.trim()) return '請輸入目標文字'
  return ''
}
```

### 5. ✅ 改進錯誤訊息顯示

**問題**: 錯誤訊息顯示在底部，使用者可能看不到

**解決方案**:
- **欄位級錯誤**: 錯誤訊息直接顯示在相關輸入欄位下方
- **紅色圖標**: 使用 AlertCircle 圖標標示錯誤
- **即時清除**: 使用者開始輸入時自動清除錯誤訊息

**實作**:
```tsx
{refTextError && (
  <div className="flex items-center gap-2 text-red-400 text-sm">
    <AlertCircle className="w-4 h-4" />
    <span>{refTextError}</span>
  </div>
)}
```

### 6. ✅ 自動流程引導

**問題**: 使用者完成一個步驟後不知道接下來要做什麼

**解決方案**:
- **自動步驟切換**:
  - 上傳成功 → 自動切換到步驟 2
  - 輸入目標文字 → 自動切換到步驟 3
- **平滑滾動**: 進入步驟 3 時自動滾動到目標文字區域
- **視覺引導**: 當前步驟高亮，未完成步驟變暗

**實作**:
```tsx
// 上傳成功後
setCurrentStep(2)

// 輸入目標文字後
if (e.target.value.trim() && isStep2Complete) {
  setCurrentStep(3)
}

// 自動滾動
useEffect(() => {
  if (currentStep === 3 && targetTextRef.current) {
    targetTextRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }
}, [currentStep])
```

### 7. ✅ 更好的 Placeholder 範例

**改進前**:
- 參考文字: "輸入參考音訊中說的完整內容..."
- 目標文字: "輸入您想讓複製聲音說的內容..."

**改進後**:
- 參考文字: "例如：今天天氣真好，我們一起去公園散步吧..."
- 目標文字: "例如：歡迎來到我的頻道，今天要跟大家分享..."

**優點**: 具體範例讓使用者更清楚輸入格式和長度

## UX 設計原則應用

### 1. 即時反饋 (Immediate Feedback)
- ✅ 輸入時即時邊框顏色變化
- ✅ 字元計數即時更新
- ✅ 步驟完成立即顯示勾選

### 2. 清晰的視覺層次 (Visual Hierarchy)
- ✅ 當前步驟高亮 (藍色)
- ✅ 完成步驟次要 (綠色)
- ✅ 未完成步驟最低 (灰色)

### 3. 錯誤預防 (Error Prevention)
- ✅ 提示框說明要求
- ✅ 範例 Placeholder
- ✅ 禁用按鈕時說明原因

### 4. 可見性原則 (Visibility)
- ✅ 步驟進度清楚可見
- ✅ 每個欄位的完成狀態可見
- ✅ 錯誤訊息顯示在相關位置

### 5. 引導與協助 (Guidance)
- ✅ 藍色提示框提供幫助
- ✅ 自動步驟切換減少認知負擔
- ✅ 視覺引導使用者注意力

## 技術實現

### 新增狀態管理
```tsx
const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
const [refTextError, setRefTextError] = useState<string>('')
const [targetTextError, setTargetTextError] = useState<string>('')
```

### 步驟完成檢查
```tsx
const isStep1Complete = refAudioId !== ''
const isStep2Complete = isStep1Complete && (xVectorOnly || refText.trim() !== '')
const canGenerate = isStep2Complete && targetText.trim() !== ''
```

### 新增圖標
```tsx
import { AlertCircle, HelpCircle } from 'lucide-react'
```

## 檔案修改

- `frontend/src/App.tsx`: 主要改進實作
  - 添加步驟指示器組件
  - 添加即時驗證邏輯
  - 添加智能提示系統
  - 改進錯誤顯示機制

## 使用者體驗改善指標

### 改進前的問題
1. ❌ 不知道要按什麼順序操作
2. ❌ 不清楚為什麼按鈕無法點擊
3. ❌ 錯誤發生後才知道輸入有問題
4. ❌ 不確定輸入格式是否正確
5. ❌ 完成一步後不知道下一步

### 改進後的優勢
1. ✅ 清楚的三步驟視覺引導
2. ✅ 按鈕禁用時顯示原因
3. ✅ 輸入時即時顯示對錯
4. ✅ 每個欄位都有範例和說明
5. ✅ 自動引導到下一步驟

## 無障礙性改進

- ✅ 所有互動元素都有 `aria-label`
- ✅ 錯誤訊息與對應欄位關聯
- ✅ 顏色搭配圖標，不僅依賴顏色
- ✅ 鍵盤導航順序符合視覺流程

## 響應式設計

- **桌面 (≥768px)**: 顯示完整步驟文字標籤
- **平板/手機 (<768px)**: 只顯示步驟編號，節省空間

## 測試建議

### 使用者測試場景

1. **新使用者首次使用**:
   - 觀察是否能在無指導下完成流程
   - 記錄遇到困惑的步驟

2. **錯誤處理**:
   - 嘗試不上傳音訊就點生成
   - 嘗試不輸入文字就生成
   - 觀察錯誤提示是否清楚

3. **流程順暢度**:
   - 測量從上傳到生成的時間
   - 觀察是否有卡住的步驟

## 未來可以改進的方向

1. **進階引導**:
   - 首次使用時顯示引導遮罩 (Tooltip tour)
   - 添加「跳過引導」選項

2. **更多範例**:
   - 提供「使用範例」按鈕快速填入示範內容
   - 多語言範例切換

3. **歷史記錄**:
   - 保存最近使用的設定
   - 快速重複生成功能

4. **進度動畫**:
   - 生成時顯示進度條而非只有 spinner
   - 預估剩餘時間

5. **音訊波形預覽**:
   - 上傳後顯示音訊波形
   - 可視化音訊長度和品質

## 總結

這次 UX 改進專注於「直覺性」和「即時反饋」，透過視覺化的步驟指示、智能提示系統和即時驗證，大幅降低使用者的認知負擔，讓整個語音複製流程更加順暢和易用。
