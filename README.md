# 華山 8/29｜一局棋，一個行動：離線動態 QR

這是為華山現場縮小製作的「螢幕 → 相機」檔案傳輸工具。活動端把圖卡切成多個 QR frame 並循環播放，手機端掃描任意順序的 frame、補齊後在本機重組並驗證。

## 現場流程

1. 手機先開 `receiver.html`，允許相機。第一次建議有網路開一次，讓 Service Worker 快取頁面與 QR 解碼器。
2. 工作人員開 `sender.html`，按「傳送西洋棋挑戰」。
3. 參加者掃描完成後進行快棋。
4. 工作人員按「挑戰完成」，系統以 50/50 隨機抽 Badge A / Badge B 並立即播放對應動態 QR。
5. 按停止或直接開始下一位。

## 離線能力

- 傳輸資料本身只走螢幕與相機，兩台裝置之間不需要 Wi‑Fi、藍牙、配對或伺服器。
- 網站第一次載入會快取本機檔案；外部 QR library 也會在首次請求後被 runtime cache。
- 手機相機在 iOS/Android 瀏覽器通常要求 HTTPS secure context，所以接收端建議部署到 GitHub Pages / Vercel，並在活動前先打開一次。

## 替換活動素材

直接替換：

- `assets/challenge.svg`
- `assets/badge-a.svg`
- `assets/badge-b.svg`

檔名不變即可，不必改 JavaScript。

## GitHub Pages

此 repo 內含 `.github/workflows/pages.yml`。在 GitHub Repo → Settings → Pages 將 Source 設為 **GitHub Actions**，push 到 `main` 後就會自動部署。

## 協定

每個 frame：`HY1~session~index~total~hash~chunk`

- payload 為 UTF‑8 JSON → Base64
- 每段預設 620 chars
- frame 循環播放；漏掃的 frame 下一輪再補
- 完成後用 FNV-1a 驗證完整 payload

這個版本是為小型活動圖卡最佳化，不是通用大型檔案傳輸，也不與 Decimen wire format 相容。

## Third-party

- qrcode.js — MIT
- jsQR — Apache-2.0

技術概念受 Decimen Optical Transfer 啟發，但本專案使用獨立的小型分段協定。
