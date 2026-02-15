# Lease OCR API

绉熸埧鍚堝悓OCR璇嗗埆鏈嶅姟锛岀敤浜巕iyoga.xyz缇庡浗绉熸埧閬垮潙搴旂敤銆?
## 鍔熻兘鐗规€?
- 鏀寔PDF銆丣PG銆丳NG鏍煎紡
- 鑷姩鎻愬彇鍚堝悓鍏抽敭淇℃伅锛堢閲戙€佺鏈熴€佹棩鏈熴€佹埧涓溿€佺瀹級
- 鍩轰簬RapidOCR鐨勯珮閫熸枃瀛楄瘑鍒?- 鑷姩娓呯悊涓存椂鏂囦欢
- RESTful API璁捐

## 瀹夎姝ラ

### 1. 瀹夎渚濊禆

\\\ash
# 婵€娲昏櫄鎷熺幆澧冿紙濡傛湭婵€娲伙級
venv\Scripts\activate

# 瀹夎渚濊禆鍖?pip install -r requirements.txt
\\\

### 2. 楠岃瘉OCR寮曟搸

纭繚宸插畨瑁卹apidocr-onnxruntime锛?
\\\ash
pip show rapidocr-onnxruntime
\\\

濡傛灉娌℃湁瀹夎锛岃鍏堝畨瑁咃細

\\\ash
pip install rapidocr-onnxruntime
\\\

## 鍚姩鏈嶅姟

\\\ash
# 鏂瑰紡1锛氫娇鐢≒ython鍚姩
python backend/app.py

# 鏂瑰紡2锛氫娇鐢╱vicorn鍚姩
uvicorn backend.app:app --reload --port 8000
\\\

鏈嶅姟灏嗗湪 http://localhost:8000 鍚姩

## API鎺ュ彛

### 1. 鍒嗘瀽绉熸埧鍚堝悓

**POST** \/api/lease/analyze\

**璇锋眰鍙傛暟锛?*
- \ile\: 鏂囦欢锛坢ultipart/form-data锛?- 鏀寔鏍煎紡锛歅DF, JPG, PNG
- 鏂囦欢澶у皬闄愬埗锛?5MB

**鍝嶅簲绀轰緥锛?*
\\\json
{
  "success": true,
  "data": {
    "full_text": "瀹屾暣璇嗗埆鏂囨湰...",
    "key_info": {
      "rent_amount": "/month",
      "lease_term": "12 months",
      "start_date": "2026-03-01",
      "landlord": "John Doe",
      "tenant": "Jane Smith"
    },
    "lines": [
      {"text": "RENTAL AGREEMENT", "confidence": 0.98},
      {"text": "Monthly Rent: ", "confidence": 0.95}
    ],
    "processing_time": 2.5,
    "page_count": 3
  }
}
\\\

### 2. 鍋ュ悍妫€鏌?
**GET** \/api/lease/health\

**鍝嶅簲绀轰緥锛?*
\\\json
{
  "status": "healthy",
  "service": "lease-ocr-api"
}
\\\

## 娴嬭瘯绀轰緥

### 浣跨敤curl娴嬭瘯

\\\ash
# 娴嬭瘯PDF鏂囦欢
curl -X POST "http://localhost:8000/api/lease/analyze" \
  -F "file=@path/to/lease.pdf"

# 娴嬭瘯鍥剧墖鏂囦欢
curl -X POST "http://localhost:8000/api/lease/analyze" \
  -F "file=@path/to/lease.jpg"
\\\

### 浣跨敤JavaScript fetch娴嬭瘯

\\\javascript
async function uploadLease(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('http://localhost:8000/api/lease/analyze', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('璇嗗埆鎴愬姛:', result.data);
      console.log('绉熼噾:', result.data.key_info.rent_amount);
      console.log('绉熸湡:', result.data.key_info.lease_term);
    }
  } catch (error) {
    console.error('涓婁紶澶辫触:', error);
  }
}

// 浣跨敤绀轰緥
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadLease(file);
  }
});
\\\

### React缁勪欢闆嗘垚绀轰緥

\\\jsx
import React, { useState } from 'react';

function LeaseUpload() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (file) => {
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/lease/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError('璇嗗埆澶辫触锛岃閲嶈瘯');
      }
    } catch (err) {
      setError('缃戠粶閿欒锛岃妫€鏌ユ湇鍔℃槸鍚﹀惎鍔?);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2>Start Your Review</h2>
      <p>Upload your agreement to see how our AI audits your terms.</p>
      
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      
      {uploading && <p>Analyzing...</p>}
      
      {result && (
        <div>
          <h3>Analysis Results</h3>
          <p>Rent: {result.key_info.rent_amount}</p>
          <p>Term: {result.key_info.lease_term}</p>
          <p>Start Date: {result.key_info.start_date}</p>
        </div>
      )}
      
      {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
}
\\\

## 閿欒澶勭悊

| 閿欒鐮?| 鎻忚堪 |
|--------|------|
| 400 | 鏂囦欢鏍煎紡閿欒鎴栨枃浠惰繃澶?|
| 500 | OCR璇嗗埆澶辫触鎴栨湇鍔″櫒閿欒 |

## 椤圭洰缁撴瀯

\\\
qiyoga-studio-landing-page-Fianl=1/
鈹溾攢鈹€ backend/
鈹?  鈹溾攢鈹€ app.py              # FastAPI涓诲簲鐢?鈹?  鈹溾攢鈹€ routes/
鈹?  鈹?  鈹斺攢鈹€ lease_routes.py # API璺敱
鈹?  鈹溾攢鈹€ services/
鈹?  鈹?  鈹溾攢鈹€ ocr_service.py  # OCR鏈嶅姟
鈹?  鈹?  鈹斺攢鈹€ pdf_service.py  # PDF澶勭悊
鈹?  鈹斺攢鈹€ utils/
鈹?      鈹溾攢鈹€ file_handler.py # 鏂囦欢澶勭悊
鈹?      鈹斺攢鈹€ text_parser.py  # 鏂囨湰瑙ｆ瀽
鈹溾攢鈹€ uploads/                # 涓存椂鏂囦欢鐩綍
鈹斺攢鈹€ requirements.txt        # Python渚濊禆
\\\

## 娉ㄦ剰浜嬮」

1. 纭繚Python铏氭嫙鐜宸叉縺娲?2. 纭繚鎵€鏈変緷璧栧凡姝ｇ‘瀹夎
3. 鏈嶅姟榛樿绔彛涓?000锛屽彲閫氳繃淇敼app.py涓殑閰嶇疆鏇存敼
4. 涓存椂鏂囦欢浼氳嚜鍔ㄦ竻鐞嗭紝浣嗗缓璁畾鏈熸鏌ploads鐩綍
5. OCR璇嗗埆鍑嗙‘鐜囧彇鍐充簬鏂囨。璐ㄩ噺鍜屾竻鏅板害

## 鎬ц兘浼樺寲

- 寮傛鏂囦欢澶勭悊
- 鑷姩娓呯悊涓存椂鏂囦欢
- 璇锋眰瓒呮椂鎺у埗
- 鎵归噺鍥剧墖骞惰澶勭悊

## 璁稿彲璇?
MIT License
