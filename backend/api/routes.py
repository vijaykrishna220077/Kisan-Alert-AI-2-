import time
from fastapi import APIRouter, HTTPException
from backend.models.schemas import DetectRequest, DetectResponse, TrackedObject, AlertEvent
from backend.services.detection import DetectionService
from backend.services.tracking import Tracker
from backend.services.alerts import AlertsService

# Initialize Router and Core Services
router = APIRouter()
detector = DetectionService()
tracker = Tracker()
alerts_engine = AlertsService()

@router.get("/health")
def health():
    """Returns the operational status of the YOLO11 processing backend."""
    return {
        "status": "healthy",
        "yolo_active": detector.yolo_available,
        "cuda_available": False,  # Will show GPU availability if CUDA is integrated
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@router.post("/detect", response_model=DetectResponse)
def detect(payload: DetectRequest):
    """
    Decodes the base64 frame, runs YOLO11 detection, associates Track IDs, 
    evaluates security rules, and produces real-time alerts.
    """
    try:
        # Step 1: Decode Base64 Image to OpenCV Mat
        img = detector.base64_to_cv2(payload.image)
        if img is None:
            raise HTTPException(status_code=400, detail="Failed to parse base64 camera frame.")

        # Step 2: Run Inference (YOLO11 or Intelligent Edge fallback)
        raw_detections = detector.run_inference(img)

        # Step 3: Run Object Tracking (Matching Track IDs)
        tracked_objects = tracker.track(raw_detections)

        # Step 4: Run Safety Alert Rules Engine
        alert_event = alerts_engine.analyze_frame_for_alerts(tracked_objects, payload.cameraId)

        # Convert alert event dictionary to AlertEvent schema if it exists
        response_alert = None
        if alert_event:
            response_alert = AlertEvent(**alert_event)

        # Step 5: Format and Return Output
        pydantic_tracked_objects = []
        for obj in tracked_objects:
            pydantic_tracked_objects.append(
                TrackedObject(
                    id=obj["id"],
                    **{"class": obj["class"]},
                    confidence=obj["confidence"],
                    bbox=obj["bbox"],
                    tracking=obj["tracking"],
                    activity=obj.get("activity"),
                    location=obj.get("location")
                )
            )

        return DetectResponse(
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            objects=pydantic_tracked_objects,
            alert=response_alert,
            isFallback=not detector.yolo_available,
            isMotionDetected=True
        )

    except Exception as e:
        print(f"[API Error] Frame detection process crashed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/track")
def track(payload: dict):
    """
    Direct track endpoint for low-level associations. 
    Mainly used if client handles detections but delegates tracking state.
    """
    detections = payload.get("detections", [])
    tracked = tracker.track(detections)
    return {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "objects": tracked
    }
