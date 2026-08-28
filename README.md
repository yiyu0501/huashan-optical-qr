# Huashan Optical QR

為 2026/08/29 華山活動製作的輕量化光學檔案傳輸工具。透過「螢幕播放動態 QR → 手機相機掃描」的方式，在不需要兩台裝置互相配對的情況下，把活動圖卡與電子紀念卡傳到參加者手機。

## 直接使用

如果 GitHub Pages 已啟用，可以直接開啟以下頁面：

- **活動首頁**：https://yiyu0501.github.io/huashan-optical-qr/
- **工作人員傳送端**：https://yiyu0501.github.io/huashan-optical-qr/sender.html
- **參加者接收端**：https://yiyu0501.github.io/huashan-optical-qr/receiver.html

> 手機相機通常需要 HTTPS 才能正常使用，因此現場建議直接使用上方 GitHub Pages 網址，而不是直接開啟本機 HTML 檔案。

## 專案用途

這個專案是為華山現場互動流程製作的小型版本，主要處理幾十 KB 等級的活動圖卡。

流程如下：

1. 參加者先開啟接收端並允許相機權限。
2. 工作人員在傳送端播放「西洋棋挑戰」的動態 QR。
3. 手機持續對準 QR，系統會自動收集不同 frame。
4. 完成挑戰後，工作人員按下抽卡按鈕。
5. 系統以 50/50 機率抽出 **Black King** 或 **White King** 紀念卡。
6. 接收端掃描完成後，會在手機本機重組檔案並提供下載。

## Features

- 不需要兩台裝置互相連上同一個 Wi-Fi
- 不需要 Bluetooth、AirDrop 或帳號登入
- QR frame 可漏掃，下一輪會自動補齊
- 完整收到後會進行資料完整性驗證
- 支援離線快取，適合活動現場使用
- 手機端收到的內容不會上傳到伺服器
- Black King / White King 50/50 隨機抽卡

## How it works

傳送端會先把檔案包裝成 JSON，再轉成 Base64 並切成多個小段。每一段會產生一張 QR Code，並持續循環播放。

接收端使用手機相機讀取 QR frame。即使中間漏掉部分 frame，也可以在下一輪補齊。所有片段收到後，瀏覽器會在手機本機重新組合檔案並進行驗證。

每個 frame 的格式為：

```text
HY1~session~index~total~hash~chunk
```

目前使用：

- UTF-8 JSON payload
- Base64 編碼
- 預設每段 620 characters
- FNV-1a 完整性驗證
- 循環式 QR frame 傳輸

## Project structure

```text
huashan-optical-qr/
├── index.html              # 專案首頁與現場說明
├── sender.html             # 工作人員傳送端
├── receiver.html           # 手機接收端
├── protocol.js             # 分段、重組與驗證協定
├── styles.css              # 共用介面樣式
├── sw.js                   # Service Worker / 離線快取
├── manifest.webmanifest    # PWA 設定
└── assets/
    ├── challenge.svg       # 活動挑戰圖卡
    ├── badge-a.svg         # Black King
    └── badge-b.svg         # White King
```

## 替換活動素材

如果要更換活動內容，只需要保持檔名不變並替換以下檔案：

```text
assets/challenge.svg
assets/badge-a.svg
assets/badge-b.svg
```

JavaScript 不需要另外修改。

為了讓動態 QR 在現場能較快完成掃描，建議素材控制在數十 KB 左右，不建議直接傳送數 MB 的原始圖片。

## Offline support

傳輸資料本身只經由螢幕與手機相機移動，不需要伺服器參與。

網站第一次在線上開啟後，Service Worker 會快取主要頁面與前端資源。因此活動前建議：

1. 工作人員裝置先在線上開啟一次傳送端。
2. 參加者使用的測試手機先開啟一次接收端。
3. 確認相機權限正常。
4. 再進行離線測試。

## Deployment

本專案是純前端靜態網站，可以部署到 GitHub Pages、Vercel 或其他支援 HTTPS 的靜態網站服務。

### GitHub Pages

在 repository 中進入：

**Settings → Pages → Build and deployment**

選擇適合的 Pages 來源並部署 `main` branch。部署完成後，網站網址預期為：

```text
https://yiyu0501.github.io/huashan-optical-qr/
```

## Tech stack

- HTML / CSS / Vanilla JavaScript
- Service Worker / Web App Manifest
- qrcode.js — QR Code generation
- jsQR — QR Code decoding

## Limitations

這個版本是針對活動現場的小型圖卡傳輸最佳化，不適合大型檔案、影片或高解析度照片。

它也不是通用檔案傳輸協定，且不與 Decimen Optical Transfer 的 wire format 相容。

## Third-party licenses

- qrcode.js — MIT License
- jsQR — Apache License 2.0

詳細資訊請參考 [`THIRD_PARTY.md`](./THIRD_PARTY.md)。

## Acknowledgements

本專案的光學傳輸概念受到 Decimen Optical Transfer 啟發，但資料切割、frame 格式與重組流程為本專案獨立實作。

---

**Event:** Huashan 1914 Creative Park, Taipei · 2026/08/29  
**Project:** 臺北市青年局 × 臺北市立大學傑青社
