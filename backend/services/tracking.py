import time
from typing import List, Dict, Any

class Tracker:
    def __init__(self, max_disappeared_frames: int = 15, iou_threshold: float = 0.3):
        self.next_track_id = 1
        self.tracks = {}  # Format: {track_id: {"class": str, "bbox": [], "last_seen": int, "confidence": float}}
        self.max_disappeared_frames = max_disappeared_frames
        self.iou_threshold = iou_threshold
        self.frame_count = 0

    def calculate_iou(self, bbox1: List[float], bbox2: List[float]) -> float:
        """Calculates Intersection over Union (IoU) between two bounding boxes."""
        x1_1, y1_1, x2_1, y2_1 = bbox1
        x1_2, y1_2, x2_2, y2_2 = bbox2

        # Calculate intersection rectangle coordinates
        x_left = max(x1_1, x1_2)
        y_top = max(y1_1, y1_2)
        x_right = min(x2_1, x2_2)
        y_bottom = min(y2_1, y2_2)

        if x_right < x_left or y_bottom < y_top:
            return 0.0

        # Calculate intersection area
        intersection_area = (x_right - x_left) * (y_bottom - y_top)

        # Calculate union area
        area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
        area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
        union_area = area1 + area2 - intersection_area

        if union_area == 0.0:
            return 0.0

        return intersection_area / union_area

    def track(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Associates incoming detections with active tracks using IoU matching.
        Returns the detections with persistent tracking ids.
        """
        self.frame_count += 1
        updated_tracks = []
        
        # Keep track of matched detection indices and matched track IDs
        matched_detections = set()
        matched_tracks = set()

        # Step 1: Match existing tracks with new detections using high-priority IoU
        for track_id, track_data in list(self.tracks.items()):
            best_iou = 0.0
            best_det_idx = -1

            for idx, det in enumerate(detections):
                if idx in matched_detections:
                    continue
                
                # Only match same class
                if det["class"] != track_data["class"]:
                    continue

                iou = self.calculate_iou(track_data["bbox"], det["bbox"])
                if iou > best_iou:
                    best_iou = iou
                    best_det_idx = idx

            # If a match is found above our IoU threshold, update the track
            if best_iou >= self.iou_threshold and best_det_idx != -1:
                det = detections[best_det_idx]
                self.tracks[track_id] = {
                    "class": det["class"],
                    "bbox": det["bbox"],
                    "last_seen": self.frame_count,
                    "confidence": det["confidence"]
                }
                matched_detections.add(best_det_idx)
                matched_tracks.add(track_id)
                
                # Activity assessment based on movement
                old_center_x = (track_data["bbox"][0] + track_data["bbox"][2]) / 2
                new_center_x = (det["bbox"][0] + det["bbox"][2]) / 2
                old_center_y = (track_data["bbox"][1] + track_data["bbox"][3]) / 2
                new_center_y = (det["bbox"][1] + det["bbox"][3]) / 2
                
                movement = ((new_center_x - old_center_x) ** 2 + (new_center_y - old_center_y) ** 2) ** 0.5
                activity = "Stationary"
                if movement > 1.8:
                    activity = "Moving Fast"
                elif movement > 0.4:
                    activity = "Walking"

                # Check for fall-like characteristics (box height becomes small, width large rapidly)
                h_prev = track_data["bbox"][3] - track_data["bbox"][1]
                w_prev = track_data["bbox"][2] - track_data["bbox"][0]
                h_new = det["bbox"][3] - det["bbox"][1]
                w_new = det["bbox"][2] - det["bbox"][0]
                
                if det["class"] == "person" and h_new < h_prev * 0.65 and w_new > w_prev * 1.1:
                    activity = "Fallen / Person Down"

                updated_tracks.append({
                    "id": track_id,
                    "class": det["class"],
                    "confidence": det["confidence"],
                    "bbox": det["bbox"],
                    "tracking": True,
                    "activity": activity,
                    "location": self._get_spatial_location(det["bbox"])
                })

        # Step 2: For unmatched detections, create new tracks
        for idx, det in enumerate(detections):
            if idx in matched_detections:
                continue

            track_id = self.next_track_id
            self.next_track_id += 1

            self.tracks[track_id] = {
                "class": det["class"],
                "bbox": det["bbox"],
                "last_seen": self.frame_count,
                "confidence": det["confidence"]
            }

            updated_tracks.append({
                "id": track_id,
                "class": det["class"],
                "confidence": det["confidence"],
                "bbox": det["bbox"],
                "tracking": True,
                "activity": "Appeared",
                "location": self._get_spatial_location(det["bbox"])
            })

        # Step 3: Clean up expired tracks
        for track_id, track_data in list(self.tracks.items()):
            if self.frame_count - track_data["last_seen"] > self.max_disappeared_frames:
                del self.tracks[track_id]

        return updated_tracks

    def _get_spatial_location(self, bbox: List[float]) -> str:
        """Determines the rough location label in the frame grid."""
        xmin, ymin, xmax, ymax = bbox
        cx = (xmin + xmax) / 2
        cy = (ymin + ymax) / 2

        loc_str = ""
        if cy < 35:
            loc_str += "Background "
        elif cy > 65:
            loc_str += "Foreground "
        else:
            loc_str += "Midground "

        if cx < 35:
            loc_str += "Left"
        elif cx > 65:
            loc_str += "Right"
        else:
            loc_str += "Center"

        return loc_str
