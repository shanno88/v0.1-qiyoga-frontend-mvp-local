# create_files.ps1 - 一键创建QiYoga OCR API项目文件

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  QiYoga Lease OCR API - Project Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/13] Creating directory structure..." -ForegroundColor Yellow

# 创建文件夹
New-Item -ItemType Directory -Force -Path "backend" | Out-Null
New-Item -ItemType Directory -Force -Path "backend/routes" | Out-Null
New-Item -ItemType Directory -Force -Path "backend/services" | Out-Null
New-Item -ItemType Directory -Force -Path "backend/utils" | Out-Null
New-Item -ItemType Directory -Force -Path "uploads" | Out-Null

Write-Host "       - Created backend/" -ForegroundColor Green
Write-Host "       - Created backend/routes/" -ForegroundColor Green
Write-Host "       - Created backend/services/" -ForegroundColor Green
Write-Host "       - Created backend/utils/" -ForegroundColor Green
Write-Host "       - Created uploads/" -ForegroundColor Green
Write-Host ""

Write-Host "[2/13] Creating requirements.txt..." -ForegroundColor Yellow
@"
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
PyMuPDF==1.23.8
Pillow==10.1.0
python-dotenv==1.0.0
"@ | Out-File -FilePath "requirements.txt" -Encoding UTF8
Write-Host "       - Created requirements.txt" -ForegroundColor Green
Write-Host ""

Write-Host "[3/13] Creating backend/__init__.py..." -ForegroundColor Yellow
@"
"@ | Out-File -FilePath "backend/__init__.py" -Encoding UTF8
Write-Host "       - Created backend/__init__.py" -ForegroundColor Green
Write-Host ""

Write-Host "[4/13] Creating backend/app.py..." -ForegroundColor Yellow
@"
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.lease_routes import router as lease_router

app = FastAPI(
    title="Lease OCR API",
    description="API for analyzing lease agreements using OCR",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lease_router)


@app.get("/")
async def root():
    return {
        "message": "Lease OCR API",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "/api/lease/analyze",
            "health": "/api/lease/health",
            "docs": "/docs",
        },
    }


@app.on_event("startup")
async def startup_event():
    from backend.services.ocr_service import get_ocr_service
    get_ocr_service()
    print("Lease OCR API started successfully")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
"@ | Out-File -FilePath "backend/app.py" -Encoding UTF8
Write-Host "       - Created backend/app.py" -ForegroundColor Green
Write-Host ""

Write-Host "[5/13] Creating backend/routes/__init__.py..." -ForegroundColor Yellow
@"
"@ | Out-File -FilePath "backend/routes/__init__.py" -Encoding UTF8
Write-Host "       - Created backend/routes/__init__.py" -ForegroundColor Green
Write-Host ""

Write-Host "[6/13] Creating backend/routes/lease_routes.py..." -ForegroundColor Yellow
@"
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import time
from typing import List

from backend.utils.file_handler import save_upload_file, cleanup_file
from backend.utils.text_parser import extract_key_info
from backend.services.ocr_service import get_ocr_service
from backend.services.pdf_service import get_pdf_service


router = APIRouter(prefix="/api/lease", tags=["lease"])


@router.post("/analyze")
async def analyze_lease(file: UploadFile = File(...)):
    start_time = time.time()
    uploaded_file_path = None
    temp_image_paths = []

    try:
        uploaded_file_path = await save_upload_file(file)
        uploaded_path = Path(uploaded_file_path)

        pdf_service = get_pdf_service()
        ocr_service = get_ocr_service()

        image_paths = []

        if pdf_service.is_pdf(uploaded_path):
            image_paths = pdf_service.pdf_to_images(uploaded_path)
            temp_image_paths = image_paths
        elif pdf_service.is_image(uploaded_path):
            image_paths = [uploaded_path]
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        if not image_paths:
            raise HTTPException(
                status_code=400, detail="No pages found in the document"
            )

        ocr_result = ocr_service.recognize_images(image_paths)

        key_info = extract_key_info(ocr_result["full_text"])

        processing_time = time.time() - start_time

        return {
            "success": True,
            "data": {
                "full_text": ocr_result["full_text"],
                "key_info": key_info,
                "lines": [
                    {"text": line["text"], "confidence": line["confidence"]}
                    for line in ocr_result["lines"]
                ],
                "processing_time": round(processing_time, 2),
                "page_count": ocr_result["page_count"],
            },
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to analyze lease: {str(e)}"
        )

    finally:
        if uploaded_file_path:
            cleanup_file(uploaded_file_path)

        for temp_path in temp_image_paths:
            cleanup_file(temp_path)


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "lease-ocr-api"}
"@ | Out-File -FilePath "backend/routes/lease_routes.py" -Encoding UTF8
Write-Host "       - Created backend/routes/lease_routes.py" -ForegroundColor Green
Write-Host ""

Write-Host "[7/13] Creating backend/services/__init__.py..." -ForegroundColor Yellow
@"
"@ | Out-File -FilePath "backend/services/__init__.py" -Encoding UTF8
Write-Host "       - Created backend/services/__init__.py" -ForegroundColor Green
Write-Host ""

Write-Host "[8/13] Creating backend/services/ocr_service.py..." -ForegroundColor Yellow
@"
from pathlib import Path
from typing import List, Dict, Any
from rapidocr_onnxruntime import RapidOCR


class OCRService:
    def __init__(self):
        self.ocr = RapidOCR()

    def recognize_image(self, image_path: Path) -> List[Dict[str, Any]]:
        try:
            result, _ = self.ocr(str(image_path))

            if not result:
                return []

            lines = []
            for line_data in result:
                if len(line_data) >= 2:
                    bbox = line_data[0]
                    text = line_data[1]
                    confidence = line_data[2] if len(line_data) > 2 else 0.0

                    lines.append(
                        {"text": text, "confidence": float(confidence), "bbox": bbox}
                    )

            return lines
        except Exception as e:
            raise Exception(f"OCR failed: {str(e)}")

    def recognize_images(self, image_paths: List[Path]) -> Dict[str, Any]:
        all_lines = []
        full_text_parts = []
        total_pages = len(image_paths)

        for idx, image_path in enumerate(image_paths):
            try:
                lines = self.recognize_image(image_path)
                all_lines.extend(lines)
                page_text = "\n".join([line["text"] for line in lines])
                full_text_parts.append(f"--- Page {idx + 1} ---\n{page_text}")
            except Exception as e:
                print(f"Warning: Failed to process page {idx + 1}: {e}")
                continue

        full_text = "\n\n".join(full_text_parts)

        return {"lines": all_lines, "full_text": full_text, "page_count": total_pages}


_ocr_service = None


def get_ocr_service() -> OCRService:
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OCRService()
    return _ocr_service
"@ | Out-File -FilePath "backend/services/ocr_service.py" -Encoding UTF8
Write-Host "       - Created backend/services/ocr_service.py" -ForegroundColor Green
Write-Host ""

Write-Host "[9/13] Creating backend/services/pdf_service.py..." -ForegroundColor Yellow
@"
from pathlib import Path
from typing import List
import fitz
from PIL import Image
import io


class PDFService:
    def __init__(self, dpi: int = 200):
        self.dpi = dpi

    def pdf_to_images(self, pdf_path: Path) -> List[Path]:
        temp_image_paths = []

        try:
            doc = fitz.open(str(pdf_path))

            for page_num in range(len(doc)):
                page = doc[page_num]
                zoom = self.dpi / 72
                mat = fitz.Matrix(zoom, zoom)

                pix = page.get_pixmap(matrix=mat)

                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))

                temp_image_path = (
                    pdf_path.parent / f"{pdf_path.stem}_page_{page_num + 1}.png"
                )
                img.save(temp_image_path, "PNG")
                temp_image_paths.append(temp_image_path)

            doc.close()

            return temp_image_paths

        except Exception as e:
            for temp_path in temp_image_paths:
                if temp_path.exists():
                    temp_path.unlink()
            raise Exception(f"Failed to convert PDF to images: {str(e)}")

    def is_pdf(self, file_path: Path) -> bool:
        return file_path.suffix.lower() == ".pdf"

    def is_image(self, file_path: Path) -> bool:
        return file_path.suffix.lower() in {".jpg", ".jpeg", ".png"}


_pdf_service = None


def get_pdf_service() -> PDFService:
    global _pdf_service
    if _pdf_service is None:
        _pdf_service = PDFService()
    return _pdf_service
"@ | Out-File -FilePath "backend/services/pdf_service.py" -Encoding UTF8
Write-Host "       - Created backend/services/pdf_service.py" -ForegroundColor Green
Write-Host ""

Write-Host "[10/13] Creating backend/utils/__init__.py..." -ForegroundColor Yellow
@"
"@ | Out-File -FilePath "backend/utils/__init__.py" -Encoding UTF8
Write-Host "       - Created backend/utils/__init__.py" -ForegroundColor Green
Write-Host ""

Write-Host "[11/13] Creating backend/utils/file_handler.py..." -ForegroundColor Yellow
@"
import os
import uuid
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException
from typing import Optional

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 15 * 1024 * 1024


def validate_file(file: UploadFile) -> None:
    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024):.0f}MB",
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")


async def save_upload_file(file: UploadFile) -> Path:
    validate_file(file)

    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    return file_path


def cleanup_file(file_path: Path) -> None:
    try:
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        print(f"Warning: Failed to cleanup file {file_path}: {e}")


def cleanup_temp_files(older_than_seconds: int = 3600) -> None:
    try:
        import time

        current_time = time.time()
        for file_path in UPLOAD_DIR.glob("*"):
            if file_path.is_file():
                file_age = current_time - file_path.stat().st_mtime
                if file_age > older_than_seconds:
                    file_path.unlink()
    except Exception as e:
        print(f"Warning: Failed to cleanup temp files: {e}")
"@ | Out-File -FilePath "backend/utils/file_handler.py" -Encoding UTF8
Write-Host "       - Created backend/utils/file_handler.py" -ForegroundColor Green
Write-Host ""

Write-Host "[12/13] Creating backend/utils/text_parser.py..." -ForegroundColor Yellow
@"
import re
from typing import Optional, Dict, Any


def extract_rent_amount(text: str) -> Optional[str]:
    rent_patterns = [
        r"\$\s*[\d,]+\.?\d*\s*(?:per\s+)?(?:month|mo)",
        r"[\d,]+\.?\d*\s*(?:per\s+)?(?:month|mo)",
        r"\$\s*[\d,]+\.?\d*\s*/\s*month",
        r"\$\s*[\d,]+\.?\d*\s*/\s*mo",
        r"Rent:\s*\$\s*[\d,]+\.?\d*",
        r"Monthly Rent:\s*\$\s*[\d,]+\.?\d*",
    ]

    for pattern in rent_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            return match.group().strip()

    return None


def extract_lease_term(text: str) -> Optional[str]:
    term_patterns = [
        r"(\d+)\s*(?:month|months)",
        r"(\d+)\s*(?:year|years)",
        r"Lease Term:\s*(\d+)\s*(?:month|months|year|years)",
        r"Term:\s*(\d+)\s*(?:month|months|year|years)",
        r"(\d+)\s*(?:-|\s+to\s+-)\s*(\d+)\s*months",
    ]

    for pattern in term_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group().strip()

    return None


def extract_date(text: str) -> Optional[str]:
    date_patterns = [
        r"\b(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/\d{4}\b",
        r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+\d{4}\b",
        r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+\d{4}\b",
        r"\b\d{4}-\d{2}-\d{2}\b",
    ]

    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group().strip()

    return None


def extract_landlord_name(text: str) -> Optional[str]:
    patterns = [
        r"(?:Landlord|Owner|Lessor|Property Manager):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        r"(?:Landlord|Owner|Lessor|Property Manager)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        r"Landlord\s+Name:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return None


def extract_tenant_name(text: str) -> Optional[str]:
    patterns = [
        r"(?:Tenant|Lessee|Renter):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        r"(?:Tenant|Lessee|Renter)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        r"Tenant\s+Name:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return None


def extract_key_info(text: str) -> Dict[str, Any]:
    rent_amount = extract_rent_amount(text)
    lease_term = extract_lease_term(text)
    start_date = extract_date(text)
    landlord = extract_landlord_name(text)
    tenant = extract_tenant_name(text)

    return {
        "rent_amount": rent_amount or "Not found",
        "lease_term": lease_term or "Not found",
        "start_date": start_date or "Not found",
        "landlord": landlord or "Not found",
        "tenant": tenant or "Not found",
    }
"@ | Out-File -FilePath "backend/utils/text_parser.py" -Encoding UTF8
Write-Host "       - Created backend/utils/text_parser.py" -ForegroundColor Green
Write-Host ""

Write-Host "[13/13] Creating README_API.md..." -ForegroundColor Yellow
@"
# Lease OCR API

租房合同OCR识别服务，用于qiyoga.xyz美国租房避坑应用。

## 功能特性

- 支持PDF、JPG、PNG格式
- 自动提取合同关键信息（租金、租期、日期、房东、租客）
- 基于RapidOCR的高速文字识别
- 自动清理临时文件
- RESTful API设计

## 安装步骤

### 1. 安装依赖

\`\`\`bash
# 激活虚拟环境（如未激活）
venv\Scripts\activate

# 安装依赖包
pip install -r requirements.txt
\`\`\`

### 2. 验证OCR引擎

确保已安装rapidocr-onnxruntime：

\`\`\`bash
pip show rapidocr-onnxruntime
\`\`\`

如果没有安装，请先安装：

\`\`\`bash
pip install rapidocr-onnxruntime
\`\`\`

## 启动服务

\`\`\`bash
# 方式1：使用Python启动
python backend/app.py

# 方式2：使用uvicorn启动
uvicorn backend.app:app --reload --port 8000
\`\`\`

服务将在 http://localhost:8000 启动

## API接口

### 1. 分析租房合同

**POST** \`/api/lease/analyze\`

**请求参数：**
- \`file\`: 文件（multipart/form-data）
- 支持格式：PDF, JPG, PNG
- 文件大小限制：15MB

**响应示例：**
\`\`\`json
{
  "success": true,
  "data": {
    "full_text": "完整识别文本...",
    "key_info": {
      "rent_amount": "$1500/month",
      "lease_term": "12 months",
      "start_date": "2026-03-01",
      "landlord": "John Doe",
      "tenant": "Jane Smith"
    },
    "lines": [
      {"text": "RENTAL AGREEMENT", "confidence": 0.98},
      {"text": "Monthly Rent: $1500", "confidence": 0.95}
    ],
    "processing_time": 2.5,
    "page_count": 3
  }
}
\`\`\`

### 2. 健康检查

**GET** \`/api/lease/health\`

**响应示例：**
\`\`\`json
{
  "status": "healthy",
  "service": "lease-ocr-api"
}
\`\`\`

## 测试示例

### 使用curl测试

\`\`\`bash
# 测试PDF文件
curl -X POST "http://localhost:8000/api/lease/analyze" \
  -F "file=@path/to/lease.pdf"

# 测试图片文件
curl -X POST "http://localhost:8000/api/lease/analyze" \
  -F "file=@path/to/lease.jpg"
\`\`\`

### 使用JavaScript fetch测试

\`\`\`javascript
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
      console.log('识别成功:', result.data);
      console.log('租金:', result.data.key_info.rent_amount);
      console.log('租期:', result.data.key_info.lease_term);
    }
  } catch (error) {
    console.error('上传失败:', error);
  }
}

// 使用示例
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadLease(file);
  }
});
\`\`\`

### React组件集成示例

\`\`\`jsx
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
        setError('识别失败，请重试');
      }
    } catch (err) {
      setError('网络错误，请检查服务是否启动');
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
\`\`\`

## 错误处理

| 错误码 | 描述 |
|--------|------|
| 400 | 文件格式错误或文件过大 |
| 500 | OCR识别失败或服务器错误 |

## 项目结构

\`\`\`
qiyoga-studio-landing-page-Fianl=1/
├── backend/
│   ├── app.py              # FastAPI主应用
│   ├── routes/
│   │   └── lease_routes.py # API路由
│   ├── services/
│   │   ├── ocr_service.py  # OCR服务
│   │   └── pdf_service.py  # PDF处理
│   └── utils/
│       ├── file_handler.py # 文件处理
│       └── text_parser.py  # 文本解析
├── uploads/                # 临时文件目录
└── requirements.txt        # Python依赖
\`\`\`

## 注意事项

1. 确保Python虚拟环境已激活
2. 确保所有依赖已正确安装
3. 服务默认端口为8000，可通过修改app.py中的配置更改
4. 临时文件会自动清理，但建议定期检查uploads目录
5. OCR识别准确率取决于文档质量和清晰度

## 性能优化

- 异步文件处理
- 自动清理临时文件
- 请求超时控制
- 批量图片并行处理

## 许可证

MIT License
"@ | Out-File -FilePath "README_API.md" -Encoding UTF8
Write-Host "       - Created README_API.md" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ All files created successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Project structure created:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  backend/" -ForegroundColor Cyan
Write-Host "  ├── __init__.py" -ForegroundColor Gray
Write-Host "  ├── app.py" -ForegroundColor Gray
Write-Host "  ├── routes/" -ForegroundColor Gray
Write-Host "  │   ├── __init__.py" -ForegroundColor DarkGray
Write-Host "  │   └── lease_routes.py" -ForegroundColor DarkGray
Write-Host "  ├── services/" -ForegroundColor Gray
Write-Host "  │   ├── __init__.py" -ForegroundColor DarkGray
Write-Host "  │   ├── ocr_service.py" -ForegroundColor DarkGray
Write-Host "  │   └── pdf_service.py" -ForegroundColor DarkGray
Write-Host "  └── utils/" -ForegroundColor Gray
Write-Host "      ├── __init__.py" -ForegroundColor DarkGray
Write-Host "      ├── file_handler.py" -ForegroundColor DarkGray
Write-Host "      └── text_parser.py" -ForegroundColor DarkGray
Write-Host "  uploads/" -ForegroundColor Cyan
Write-Host "  requirements.txt" -ForegroundColor Cyan
Write-Host "  README_API.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Activate virtual environment:" -ForegroundColor Yellow
Write-Host "   venv\Scripts\activate" -ForegroundColor White
Write-Host ""
Write-Host "2. Install dependencies:" -ForegroundColor Yellow
Write-Host "   pip install -r requirements.txt" -ForegroundColor White
Write-Host ""
Write-Host "3. Verify OCR engine (if needed):" -ForegroundColor Yellow
Write-Host "   pip show rapidocr-onnxruntime" -ForegroundColor White
Write-Host "   pip install rapidocr-onnxruntime" -ForegroundColor White
Write-Host ""
Write-Host "4. Start the server:" -ForegroundColor Yellow
Write-Host "   python backend/app.py" -ForegroundColor White
Write-Host "   or" -ForegroundColor Gray
Write-Host "   uvicorn backend.app:app --reload --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "5. Test the API:" -ForegroundColor Yellow
Write-Host "   curl -X POST http://localhost:8000/api/lease/analyze -F \"file=@test.pdf\"" -ForegroundColor White
Write-Host ""
Write-Host "6. View API documentation:" -ForegroundColor Yellow
Write-Host "   http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
