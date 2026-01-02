# ✨ PromptNano - AI 靈感資料庫 (Node.js Version)

PromptNano 是一個輕量級、溫暖可愛風格的 AI 提示詞（Prompt）管理工具。透過視覺化的圖庫介面，讓使用者能輕鬆收藏、檢索與管理 AI 生成圖片的提示詞。

本專案使用 **Node.js + SQLite** 架構，支援本地運行與更流暢的操作體驗。

![PromptNano Banner](https://github.com/max32002/PromptNano-Node/raw/main/preview/banner.jpg) 


## 🚀 特色功能

- **溫暖可愛 UI**：精心設計的草莓牛奶（淺色）與黑巧克力（深色）雙主題介面。
- **視覺化管理**：透過瀑布流與卡片式設計，直觀瀏覽圖片與對應提示詞。
- **本地端運行**：基於 Node.js 與 SQLite，資料完全掌握在自己手中，無需依賴雲端服務限制。
- **拖放上傳**：支援 Drag & Drop 直觀上傳圖片，自動建立預覽。
- **智能檔名**：上傳時自動添加時間戳，避免檔名重複覆蓋。
- **完整 CRUD**：支援新增、讀取、更新、刪除靈感與標籤。
- **一鍵複製**：快速複製 Prompt 與風格關鍵字，提升創作效率。
- **資料備份**：支援將靈感資料庫匯出為 CSV 格式，方便備份或二次運用。
- **數據統計**：即時查看目前的靈感總數與標籤使用狀況。

## 🛠️ 技術架構

- **Backend**: Node.js, Express.js
- **Database**: SQLite (via `sql.js` / `better-sqlite3`)
- **File Storage**: Local filesystem (`uploads/`)
- **Frontend**: Vanilla HTML/CSS/JS (SPA Architecture)
- **Styling**: Native CSS Variables for theming

## 📦 安裝與執行

1. **Clone 專案**

   ```bash
   git clone https://github.com/max32002/PromptNano-Node.git
   cd PromptNano-Node
   ```

2. **安裝依賴**

   ```bash
   npm install
   ```

3. **啟動伺服器**

   ```bash
   npm start
   ```

   _(Windows 用戶可直接雙擊 `run.bat`，Mac/Linux 用戶可執行 `./run.sh`)_

4. **開啟瀏覽器**
   前往 `http://localhost:3000` 即可開始使用！

## 📂 專案結構

```
PromptNano-Node/
├── public/
│   ├── assets/         # 靜態資源 (CSS, Icon)
│   ├── index.html      # 主頁面結構
│   └── app.js          # 前端邏輯 (API 串接、UI 互動)
├── uploads/            # 圖片儲存目錄
│   └── thumbs/         # 縮圖目錄 (自動生成)
├── database.js         # SQLite 資料庫模組
├── server.js           # Express 伺服器入口
├── run.bat             # Windows 啟動腳本
├── run.sh              # Mac/Linux 啟動腳本
├── promptnano.db       # SQLite 資料庫檔案 (自動生成)
└── package.json        # 專案配置
```

## 📝 使用說明

- **切換主題**：點擊右上角「🌓 切換模式」可切換深/淺色主題。
- **系統設定**：點擊「⚙️」設定按鈕，可查看資料統計或匯出 CSV 備份。
- **新增靈感**：點擊「＋ 新增靈感」，可拖拉圖片上傳並填寫 Prompt。
- **秘籍**：點擊「📘 秘籍」查看常用的風格與光影提示詞，點擊即可複製。
- **搜尋**：上方搜尋列支援關鍵字搜尋，或輸入 `#` 搜尋標籤。

## 📄 授權

本專案採用 [MIT License](LICENSE) 授權。
歡迎自由修改、使用或作為學習用途。
