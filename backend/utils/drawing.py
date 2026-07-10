import cv2
import numpy as np
from typing import List, Dict, Any

def draw_tracked_objects(img: np.ndarray, tracked_objects: List[Dict[str, Any]]) -> np.ndarray:
    """
    Overlays bounding boxes, labels, confidence, and track IDs onto the image.
    Expects tracked_objects coordinate format to be normalized (0 to 100).
    """
    if img is None:
        return None
        
    h, w, _ = img.shape
    annotated = img.copy()

    for obj in tracked_objects:
        # Denormalize coordinates
        xmin = int((obj["bbox"][0] / 100.0) * w)
        ymin = int((obj["bbox"][1] / 100.0) * h)
        xmax = int((obj["bbox"][2] / 100.0) * w)
        ymax = int((obj["bbox"][3] / 100.0) * h)

        track_id = obj["id"]
        cls = obj["class"]
        conf = obj["confidence"]
        activity = obj.get("activity", "")

        # Select color based on category/class
        color = (16, 185, 129)  # Green for general
        if cls in ["knife", "gun", "fire"]:
            color = (239, 68, 68)  # Red for threats
        elif cls == "person":
            color = (59, 130, 246)  # Blue for people

        # Draw Bounding Box
        cv2.rectangle(annotated, (xmin, ymin), (xmax, ymax), color, 2)

        # Build Label
        label_text = f"#{track_id} {cls.upper()} ({int(conf * 100)}%)"
        if activity and activity != "Stationary":
            label_text += f" [{activity}]"

        # Draw Label Background
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.4
        thickness = 1
        (text_w, text_h), baseline = cv2.getTextSize(label_text, font, font_scale, thickness)
        
        cv2.rectangle(annotated, (xmin, ymin - text_h - 6), (xmin + text_w + 4, ymin), color, -1)
        cv2.putText(annotated, label_text, (xmin + 2, ymin - 3), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

    return annotated
