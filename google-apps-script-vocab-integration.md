# 管理者新增單字資料：前端表單與 Google Apps Script 後端整合步驟

## 1. 前端：新增單字表單欄位與送出邏輯

你目前的前端檔案包含：
- `index.html`
- `style.css`
- `script.js`

### 1.1 表單欄位清單
表單中應包含以下輸入欄位：
- 英文單字 (`word`)
- 中文翻譯 (`translate`)
- 詞性 (`pos`)
- 例句 (`example`)
- 字根分析 (`root`)

這些欄位已經存在於 `index.html` 的管理頁面表單中。

### 1.2 前端送出資料至後端
在 `script.js` 中已新增以下功能：
- `sendWordToBackend(item)`：將單字資料以 JSON POST 送到 Google Apps Script Web App。
- `handleFormSubmit(event)`：表單送出時，先檢查英文單字欄位；
  1. 將資料記錄到本機 `localStorage`。
  2. 再呼叫 `sendWordToBackend` 同步到後端。
- 若後端同步失敗，仍會保留本機資料，但會顯示警告訊息。

### 1.3 重要設定
在 `script.js` 頂端，請將 `GAS_WEB_APP_URL` 改成你自己的 Apps Script Web App URL：

```js
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/你的部署ID/exec';
```

如果這裡仍保留 `XXXXXXXXXXXX`，前端會回報「請先在 script.js 中設定 GAS_WEB_APP_URL。」

## 2. 後端：建立 Google 試算表與 Apps Script 專案

### 2.1 建立 Google 試算表
1. 開啟 Google 試算表。
2. 建立新的工作表，建議名稱為 `Vocabulary` 或 `Words`。
3. 在第一列加入欄位標題：
   - `created_at`
   - `word`
   - `translate`
   - `pos`
   - `example`
   - `root`

### 2.2 建立 Apps Script
1. 在試算表選單中點選 `擴充功能` -> `Apps Script`。
2. 建立新專案，並貼上以下程式碼：

```javascript
function doPost(e) {
  try {
    const sheetName = 'Vocabulary';
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = book.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`找不到工作表：${sheetName}`);
    }

    const data = JSON.parse(e.postData.contents || '{}');
    const row = [
      new Date(),
      data.word || '',
      data.translate || '',
      data.pos || '',
      data.example || '',
      data.root || ''
    ];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST');
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST');
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ready' }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST');
}
```

### 2.3 儲存 Apps Script 並部署為 Web 應用程式
1. 在 Apps Script 右上角點選 `部署`。
2. 選擇 `新增部署`。
3. 類型選 `網頁應用程式`。
4. `執行應用程式的身份` 選擇 `我自己`。
5. `誰有存取權` 選 `任何人，包括匿名者`。
6. 部署後，複製 Web 應用程式 URL。

> 注意：若你只想讓內部管理者使用，也可以改成 `任何有 Google 帳戶者`，但測試時需確認前端與後端的存取權限相容。

## 3. 連結前端與後端

### 3.1 更新前端 `script.js`
將 `GAS_WEB_APP_URL` 改成你剛才部署後得到的 Web 應用程式 URL：

```js
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/你的部署ID/exec';
```

### 3.2 測試儲存功能
1. 開啟 `index.html`。
2. 切換到「管理頁」。
3. 輸入：
   - 英文單字
   - 中文翻譯
   - 詞性
   - 例句
   - 字根分析
4. 點擊「儲存單字」。
5. 表單應該會：
   - 先存入本機 `localStorage`。
   - 再送到 Google Apps Script 後端。
   - 若成功，顯示「已新增單字，已同步至後端。」

### 3.3 確認試算表資料
打開 Google 試算表，確認是否有新增一列資料，欄位順序對應：
`created_at`, `word`, `translate`, `pos`, `example`, `root`。

## 4. 進階注意事項

### 4.1 CORS 與本機檔案問題
- 若你直接用 `file://` 開啟 `index.html`，瀏覽器可能會因為 CORS 或本機檔案限制而無法正常送出請求。
- 建議使用本機伺服器執行，例如：
  - `python3 -m http.server 8000`
  - 或 `npx http-server .`

### 4.2 權限與授權
- 第一次部署 Google Apps Script 時，系統會要求授權存取試算表。
- 請依提示授權，才能讓 `doPost` 正確寫入試算表。

### 4.3 欄位格式與錯誤處理
- `word` 為必填欄位；如果空值不送出，前端會顯示錯誤。
- 後端目前會直接 appendRow，不會檢查欄位是否為空。
- 若需要更嚴格的驗證，可在 `doPost` 中加入欄位檢查與錯誤回傳。

## 5. 進一步優化建議

1. 如果要讓管理者在後端資料庫中「編輯」或「刪除」，可擴充 Apps Script，讓前端傳遞 `mode: 'edit'` / `mode: 'delete'`。
2. 若要避免重複單字，可在 Apps Script 中先搜尋是否已存在相同 `word`，再決定是新增或更新。
3. 如果希望後端回傳更完整結果，可將 `status: 'ok'` 改為包含 `rowNumber`、`timestamp`。
