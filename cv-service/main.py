# FastAPI entry point for the computer vision microservice
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import io
from detector import TrafficDetector

app = FastAPI(title="RouteViz CV Service")

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize detector on startup
detector = None

@app.on_event("startup")
async def startup_event():
    global detector
    detector = TrafficDetector()

class UrlRequest(BaseModel):
    url: str

@app.get("/health")
async def health():
    return { "status": "ok", "service": "routeviz-cv", "model": "yolov8n" }

@app.post("/detect")
async def detect(image: UploadFile = File(...)):
    if image.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=422, detail="File must be JPEG or PNG")
    
    try:
        image_bytes = await image.read()
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=422, detail="File too large (max 10MB)")
            
        result = detector.analyze(image_bytes)
        return {
            **result,
            "filename": image.filename,
            "file_size_kb": round(len(image_bytes) / 1024, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/url")
async def detect_url(req: UrlRequest):
    try:
        response = requests.get(req.url, timeout=5)
        if response.status_code != 200:
            raise HTTPException(status_code=422, detail="Failed to download image")
        
        image_bytes = response.content
        result = detector.analyze(image_bytes)
        return {
            **result,
            "url": req.url,
            "file_size_kb": round(len(image_bytes) / 1024, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

@app.get("/model/info")
async def model_info():
    return {
        "model": "yolov8n",
        "classes_monitored": ["car", "motorcycle", "bus", "truck", "traffic light", "stop sign"],
        "congestion_thresholds": { "low": "0-5", "medium": "6-15", "high": "16+" }
    }
