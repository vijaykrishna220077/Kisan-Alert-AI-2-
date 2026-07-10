from typing import List, Dict, Any, Optional
from backend.config import RESTRICTED_ZONES

class AlertsService:
    def __init__(self):
        # Dictionary to track how long objects have been stationary to detect abandoned objects
        # Format: {track_id: {"first_seen_stationary": float, "last_bbox": List[float], "class": str}}
        self.stationary_timers = {}

    def analyze_frame_for_alerts(self, tracked_objects: List[Dict[str, Any]], camera_id: str) -> Optional[Dict[str, Any]]:
        """
        Evaluates safety and security rules on active tracked objects.
        Returns a structured AlertEvent dict if a trigger matches, prioritizing critical alarms.
        """
        counts = {}
        for obj in tracked_objects:
            cls = obj["class"]
            counts[cls] = counts.get(cls, 0) + 1

        # Check 1: Fire & Smoke (Critical Priority)
        if "fire" in counts:
            return {
                "title": "Hazardous Event: Fire Detected",
                "priority": "Critical",
                "category": "Environment",
                "message": f"Active flames identified in the camera field of view.",
                "explanation": "Computer vision models detected active fire signatures. Thermal plume or glowing thermal structures match emergency fire categories.",
                "recommendedAction": "sound the main site evacuation alarm and engage automatic fire suppression systems immediately."
            }
        
        if "smoke" in counts:
            return {
                "title": "Hazardous Event: Smoke Signatures Detected",
                "priority": "High",
                "category": "Environment",
                "message": "Potential combustion plume identified.",
                "explanation": "Volumetric moving smoke signatures detected rising in the zone of interest.",
                "recommendedAction": "Dispatch immediate patrol to inspect the perimeter zone for smoldering materials."
            }

        # Check 2: Weapons Detected (Critical Priority)
        weapons = [w for w in ["knife", "gun"] if w in counts]
        if weapons:
            weapon_type = " / ".join(weapons).upper()
            return {
                "title": "Security Threat: Weapon Detected",
                "priority": "Critical",
                "category": "Security",
                "message": f"Potential lethal instrument ({weapon_type}) identified in public view.",
                "explanation": f"Lethal shape profile matching a {weapon_type} weapon was detected with high visual clarity.",
                "recommendedAction": "Notify local law enforcement / security team and engage locking mechanisms for secured entryways."
            }

        # Check 3: Person Falls / Down (High Priority)
        for obj in tracked_objects:
            if obj["class"] == "person" and obj.get("activity") == "Fallen / Person Down":
                return {
                    "title": "Medical Alert: Person Down / Fall Detected",
                    "priority": "High",
                    "category": "Security",
                    "message": f"Subject (ID #{obj['id']}) has fallen and remains prone.",
                    "explanation": "The vertical height of the person track collapsed below normal ratios rapidly while horizontal width expanded, typical of a trip, slip, or medical collapse.",
                    "recommendedAction": "Send immediate medical or guard support to the local Operator Desk area."
                }

        # Check 4: Restricted Area Intrusion (High Priority)
        for obj in tracked_objects:
            if obj["class"] == "person":
                xmin, ymin, xmax, ymax = obj["bbox"]
                cx = (xmin + xmax) / 2
                cy = (ymin + ymax) / 2
                
                # Check against restricted zones
                for zone in RESTRICTED_ZONES:
                    if zone["x1"] <= cx <= zone["x2"] and zone["y1"] <= cy <= zone["y2"]:
                        return {
                            "title": "Security Alert: Restricted Area Intrusion",
                            "priority": "High",
                            "category": "Security",
                            "message": f"Unauthorized person (ID #{obj['id']}) entered {zone['name']}.",
                            "explanation": "Active human track has crossed virtual guard lines and resides inside restricted coordinates.",
                            "recommendedAction": "Initiate operator speaker intercom warning and lock active gate valves."
                        }

        # Check 5: Abandoned Object (Medium Priority)
        # We track bags/backpacks/suitcases that are completely stationary
        current_ids = {obj["id"] for obj in tracked_objects}
        
        # Clean up old tracks from stationary list
        self.stationary_timers = {tid: val for tid, val in self.stationary_timers.items() if tid in current_ids}
        
        for obj in tracked_objects:
            if obj["class"] in ["bag", "backpack", "suitcase", "box"]:
                tid = obj["id"]
                if obj.get("activity") == "Stationary":
                    if tid not in self.stationary_timers:
                        self.stationary_timers[tid] = {
                            "first_seen": int(time.time()),
                            "bbox": obj["bbox"],
                            "class": obj["class"]
                        }
                    else:
                        stationary_duration = int(time.time()) - self.stationary_timers[tid]["first_seen"]
                        # If stationary for more than 15 seconds, trigger alarm
                        if stationary_duration >= 15:
                            return {
                                "title": "Security Threat: Unattended / Abandoned Baggage",
                                "priority": "Medium",
                                "category": "Security",
                                "message": f"A stationary {obj['class']} (ID #{tid}) has been left unattended.",
                                "explanation": "A luggage item track has been separated from any moving person track and remained in a fixed location for over 15 seconds.",
                                "recommendedAction": "Inspect video logs to locate owner or deploy a security team to secure the container."
                            }
                else:
                    # Reset if it's moving
                    if tid in self.stationary_timers:
                        del self.stationary_timers[tid]

        # Check 6: Crowd Detected (Medium Priority)
        person_count = counts.get("person", 0)
        if person_count >= 4:
            return {
                "title": "Operations Alert: Crowd Gathering Detected",
                "priority": "Medium",
                "category": "Security",
                "message": f"Crowd event identified with {person_count} active subjects.",
                "explanation": "Human track density exceeded threshold limit of 4 persons clustered closely within a single camera sector.",
                "recommendedAction": "Monitor the feed closely for potential egress blockages or policy violations."
            }

        # Check 7: Multiple Persons Detected (Low Priority)
        if person_count >= 2:
            return {
                "title": "Operator Alert: Multiple Subjects Identified",
                "priority": "Low",
                "category": "Security",
                "message": f"Co-presence of {person_count} persons logged at Operator desk.",
                "explanation": "Multiple active human tracks detected in the monitoring region.",
                "recommendedAction": "Continue regular surveillance monitoring of the sector."
            }

        # Check 8: Single Person Detected (Low Priority)
        if person_count == 1:
            return {
                "title": "Surveillance Log: Operator Area Access",
                "priority": "Low",
                "category": "Security",
                "message": "One active human track identified.",
                "explanation": "Single individual track entered the perimeter of the Operator desk scanning region.",
                "recommendedAction": "No action required. Surveillance logging running."
            }

        # Check 9: Vehicle Detected (Low Priority)
        vehicles = [v for v in ["car", "truck", "bus", "motorcycle", "bicycle"] if v in counts]
        if vehicles:
            v_name = vehicles[0].upper()
            return {
                "title": "Perimeter Log: Vehicle Sighted",
                "priority": "Low",
                "category": "Equipment",
                "message": f"Active {v_name} detected.",
                "explanation": "A vehicle profile has been identified within the secure camera lane.",
                "recommendedAction": "Validate license plate logs against registered visitor schedules."
            }

        return None
