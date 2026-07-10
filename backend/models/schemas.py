from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class DetectRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded JPEG frame from the camera stream")
    cameraId: Optional[str] = Field("LOCAL-WEBCAM", description="Unique identifier for the camera source")
    saveToLog: Optional[bool] = Field(True, description="Whether to store alerts and logs for this frame")

class TrackedObject(BaseModel):
    id: int = Field(..., description="Unique track ID assigned by ByteTrack")
    cls: str = Field(..., alias="class", description="Detected object class name")
    confidence: float = Field(..., description="Detection confidence score between 0.0 and 1.0")
    bbox: List[float] = Field(..., description="Bounding box coordinates normalized from 0 to 100: [xmin, ymin, xmax, ymax]")
    tracking: bool = Field(True, description="Indicates if active tracking is engaged")
    activity: Optional[str] = Field(None, description="Optional activity label (e.g. Walking, Stationary, Falling)")
    location: Optional[str] = Field(None, description="Spatial location relative to frame (e.g. Center, Left, Foreground)")

class AlertEvent(BaseModel):
    title: str
    priority: str  # Critical, High, Medium, Low
    category: str  # Security, Equipment, etc.
    message: str
    explanation: str
    recommendedAction: str

class DetectResponse(BaseModel):
    timestamp: str
    objects: List[TrackedObject]
    alert: Optional[AlertEvent] = None
    isFallback: bool = False
    isMotionDetected: bool = True
