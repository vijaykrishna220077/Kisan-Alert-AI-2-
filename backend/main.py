import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router as api_router
from backend.config import API_HOST, API_PORT

app = FastAPI(
    title="Real-Time AI Surveillance Platform - YOLO11 Backend",
    description="High-performance object detection and tracking endpoint using Ultralytics YOLOv11 and ByteTrack IoU matching.",
    version="1.0.0"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix="/api")
# Fallback root route
app.include_router(api_router, prefix="")

@app.get("/")
def read_root():
    return {
        "message": "AI Surveillance Platform YOLO11 FastAPI Backend is running.",
        "docs_url": "/docs",
        "health_url": "/health"
    }

if __name__ == "__main__":
    print(f"[Surveillance Backend] Booting FastAPI server on http://{API_HOST}:{API_PORT}...")
    uvicorn.run("backend.main:app", host=API_HOST, port=API_PORT, reload=False)
