# update_files.ps1 - 更新修复后的文件

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Updating Backend Files" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查文件是否存在
Write-Host "[1/4] Checking files..." -ForegroundColor Yellow

if (!(Test-Path "backend/app.py")) {
    Write-Host "❌ Error: backend/app.py not found!" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "backend/routes/lease_routes.py")) {
    Write-Host "❌ Error: backend/routes/lease_routes.py not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ All required files exist" -ForegroundColor Green
Write-Host ""

# 备份原文件
Write-Host "[2/4] Creating backups..." -ForegroundColor Yellow

$backupTimestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Copy-Item "backend/app.py" "backend/app.py.backup_$backupTimestamp" -Force
Write-Host "✅ backend/app.py → backend/app.py.backup_$backupTimestamp" -ForegroundColor Green

Copy-Item "backend/routes/lease_routes.py" "backend/routes/lease_routes.py.backup_$backupTimestamp" -Force
Write-Host "✅ backend/routes/lease_routes.py → backend/routes/lease_routes.py.backup_$backupTimestamp" -ForegroundColor Green
Write-Host ""

# 更新 backend/app.py
Write-Host "[3/4] Updating backend/app.py..." -ForegroundColor Yellow
@"
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# 修复：修改导入路径
from routes import lease_routes

app = FastAPI(
    title="QiYoga Lease OCR API",
    description="API for analyzing lease agreements using OCR",
    version="1.0.0",
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 修复：路由注册时指定前缀
app.include_router(lease_routes.router, prefix="/api/lease", tags=["lease"])


@app.get("/")
async def root():
    return {
        "message": "QiYoga Lease OCR API is running",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "/api/lease/analyze",
            "health": "/api/lease/health",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    print("Lease OCR API started successfully")


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
"@ | Out-File -FilePath "backend/app.py" -Encoding UTF8
Write-Host "✅ backend/app.py updated" -ForegroundColor Green
Write-Host ""

# 更新 backend/routes/lease_routes.py
Write-Host "[4/4] Updating backend/routes/lease_routes.py..." -ForegroundColor Yellow
@"
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import time
from typing import List

from utils.file_handler import save_upload_file, cleanup_file
from utils.text_parser import extract_key_info
from services.ocr_service import get_ocr_service
from services.pdf_service import get_pdf_service


# 修复：移除prefix，只在app.py中统一管理
router = APIRouter(tags=["lease"])


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
Write-Host "✅ backend/routes/lease_routes.py updated" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Files updated successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Changes made:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. backend/app.py:" -ForegroundColor Cyan
Write-Host "   - Fixed import: from routes import lease_routes" -ForegroundColor Gray
Write-Host "   - Added router prefix: /api/lease" -ForegroundColor Gray
Write-Host "   - Updated uvicorn path: app:app" -ForegroundColor Gray
Write-Host ""
Write-Host "2. backend/routes/lease_routes.py:" -ForegroundColor Cyan
Write-Host "   - Removed duplicate prefix from router" -ForegroundColor Gray
Write-Host "   - Fixed import paths (removed 'backend.' prefix)" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Restart the server:" -ForegroundColor Yellow
Write-Host "   python backend/app.py" -ForegroundColor White
Write-Host "   or" -ForegroundColor Gray
Write-Host "   uvicorn backend.app:app --reload --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "2. Test API endpoints:" -ForegroundColor Yellow
Write-Host "   curl http://localhost:8000/api/lease/health" -ForegroundColor White
Write-Host ""
Write-Host "3. View API documentation:" -ForegroundColor Yellow
Write-Host "   http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "4. Test file upload:" -ForegroundColor Yellow
Write-Host "   curl -X POST http://localhost:8000/api/lease/analyze -F \"file=@test.pdf\"" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backup files created:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "backend/app.py.backup_$backupTimestamp" -ForegroundColor Gray
Write-Host "backend/routes/lease_routes.py.backup_$backupTimestamp" -ForegroundColor Gray
Write-Host ""
