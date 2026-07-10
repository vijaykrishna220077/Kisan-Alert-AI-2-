import os

# Configuration variables for the YOLO11 / FastAPI surveillance backend
API_HOST = os.getenv("SURVEILLANCE_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("SURVEILLANCE_API_PORT", "8000"))

# Detection Settings
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.25"))
YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "yolo11n.pt")  # Auto-downloads YOLO11 nano model from Ultralytics

# Classes of Interest to detect and track
CLASSES_OF_INTEREST = [
    "person", "face", "car", "truck", "bus", "motorcycle", "bicycle",
    "bag", "backpack", "suitcase", "box", "helmet", "knife", "gun",
    "fire", "smoke", "dog", "cat"
]

# Restricted Area Zones (Norm coordinates from 0 to 100)
# Example zone representing a gate or critical perimeter
RESTRICTED_ZONES = [
    {
        "name": "Perimeter A (Gate Entrance)",
        "x1": 15, "y1": 15, "x2": 85, "y2": 85
    }
]

# Path to local logs
LOG_FILE_PATH = os.getenv("SURVEILLANCE_LOG_PATH", "surveillance.log")
