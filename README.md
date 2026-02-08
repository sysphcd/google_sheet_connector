# Google Sheet Connector 🚀

一個基於 Node.js 的數據同步與自動化通知系統，整合了 Google Sheets API 與 Nodemailer。

## 🌟 功能特點
- **數據同步**：自動從 Google Sheets 讀取數據並動態取得工作表名稱。
- **自動化郵件**：針對尚未處理的清單（「是否自動回覆」欄位為空）自動寄送 Gmail。
- **狀態回填**：郵件寄出後自動在 Google Sheets 標記「Y」。
- **實時監控**：現代化的前端 Dashboard 顯示系統連線狀態。

## 🛠 技術堆疊
- **後端**: Node.js, Express
- **前端**: HTML5, CSS3, JavaScript, Chart.js
- **整合**: `googleapis` (Sheets V4), `nodemailer` (Gmail Service)

## 📋 API 規格

### 1. 預覽數據
- **路徑**: `GET /api/preview`
- **功能**: 讀取試算表第一張工作表，將 A:Z 轉為物件陣列。
- **回傳**:
  ```json
  {
    "headers": ["姓名", "Email", "是否自動回覆"],
    "data": [
      { "_rowIndex": 2, "姓名": "王小明", "Email": "test@example.com", "是否自動回覆": "" }
    ]
  }
  ```

### 2. 執行自動化任務
- **路徑**: `POST /api/execute`
- **功能**:
  1. 掃描試算表。
  2. 若「是否自動回覆」為空，則寄送 Gmail 給該用戶。
  3. 寄送成功後將試算表該列回填 "Y"。
- **回傳**: `{ "message": "執行完成", "processed": 3 }`

## ⚙️ 環境變數 (.env)
請確保您的 `.env` 包含以下內容：
- `EMAIL_USER`: 您的 Gmail 帳號。
- `EMAIL_PASS`: Gmail 應用程式專用密碼 (會自動移除空白)。
- `SPREADSHEET_ID`: 目標試算表 ID。
- `GOOGLE_APPLICATION_CREDENTIALS`: GCP 服務帳戶金鑰路徑 (預設 `./credentials.json`)。
- `PORT`: 預設 3000。

## 🚀 快速開始

### 1. 安裝與設定
```bash
npm install
cp .env.example .env
# 請記得放入 credentials.json
```

### 2. Windows 設備環境變數 (選用)
若您是在 Windows 環境下且不使用 .env 檔案，可使用 SET 指令：
```cmd
SET EMAIL_USER=your_email@gmail.com
SET EMAIL_PASS=your_app_password
SET SPREADSHEET_ID=your_id
SET GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
node server.js
```

### 3. 啟動伺服器
```bash
npm start
```

## 📁 專案目錄結構
```text
.
├── server.js              # 核心邏輯 (包含 API 與 Helper)
├── package.json
├── .env.example
├── credentials.json       # (需自行提供)
├── public/                # 靜態網頁
└── README.md
```
