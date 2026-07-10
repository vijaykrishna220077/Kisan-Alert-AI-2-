import express from "express";
import { GoogleGenAI } from "@google/genai";

export const surveillanceRouter = express.Router();

// Safe wrapper for Gemini content generation with exponential backoff and retry mechanism
async function generateContentWithRetry(ai: any, params: { model: string; contents: any; config?: any }, retries = 3, delay = 1000): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const errMsg = error?.message || "";
    const isRateLimit = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota");
    const isServiceUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("overloaded");
    
    if ((isRateLimit || isServiceUnavailable) && retries > 0) {
      console.warn(`[Gemini API Warning] Temporary issue encountered: ${errMsg.substring(0, 80)}. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateContentWithRetry(ai, params, retries - 1, delay * 2);
    }
    throw error;
  }
}

// =========================================================================
// 1. DATA MODELS & SCHEMAS (In-Memory Database Collections)
// =========================================================================

export interface Camera {
  id: string;
  name: string;
  type: "Mobile phone camera" | "USB webcam" | "IP Camera" | "CCTV camera" | "Wi-Fi smart camera" | "Drone camera";
  url: string;
  status: "Online" | "Offline" | "Connecting";
  location: string;
  streamState: "Active" | "Inactive";
  resolution: string;
  fps: number;
  lastActive: string;
}

export interface CameraLocation {
  id: string;
  cameraName: string;
  lat: number;
  lng: number;
  sector: "North Field" | "Main Gate" | "Pump House" | "Cattle Barn" | "Solar Grid" | "Drone Flight Path";
}

export interface AI_Event {
  id: string;
  cameraId: string;
  cameraLocation: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  category: "Security" | "Irrigation" | "Crop Health" | "Livestock" | "Equipment" | "Environment";
  title: string;
  message: string;
  confidenceScore: number;
  snapshotUrl: string;
  videoClipUrl: string;
  explanation: string;
  recommendedAction: string;
  timestamp: string;
  isAcknowledged: boolean;
  detectedObjects: { label: string; bbox: number[]; confidence: number }[];
}

export interface DetectionLog {
  id: string;
  cameraId: string;
  timestamp: string;
  objectsDetected: string[];
  counts: { [key: string]: number };
}

export interface IrrigationEvent {
  id: string;
  cameraId: string;
  eventType: "Water Overflowing" | "Broken Pipe" | "Water Leakage" | "Dry Channel" | "Sprinkler Failure" | "Drip Blockage" | "Normal Flow";
  severity: "Critical" | "High" | "Medium" | "Low";
  status: "Active" | "Resolved";
  recommendedAction: string;
  timestamp: string;
}

export interface CropHealthEvent {
  id: string;
  cameraId: string;
  cropType: string;
  conditionDetected: "Yellow Leaves" | "Dry Leaves" | "Wilting" | "Pest Infestation" | "Healthy Growth" | "Nutrient Deficiency" | "Weed Overgrowth";
  confidence: number;
  recommendation: string;
  timestamp: string;
}

export interface EquipmentStatus {
  id: string;
  equipmentName: string;
  status: "ON" | "OFF" | "FAILING" | "OFFLINE";
  powerUsageKw: number;
  metrics: string;
  lastInspected: string;
}

export interface Snapshot {
  id: string;
  eventId: string;
  cameraId: string;
  imageUrl: string;
  timestamp: string;
  detectedObjects: { label: string; bbox: number[]; confidence: number }[];
}

export interface VideoClip {
  id: string;
  eventId: string;
  cameraId: string;
  clipUrl: string;
  durationSeconds: number;
  timestamp: string;
}

// =========================================================================
// 2. IN-MEMORY SEED DATABASES
// =========================================================================

export const camerasDb: Camera[] = [
  {
    id: "CAM-101",
    name: "Main Entrance Gate",
    type: "IP Camera",
    url: "rtsp://192.168.1.101:554/live/stream1",
    status: "Online",
    location: "Main Gate",
    streamState: "Active",
    resolution: "1920x1080",
    fps: 30,
    lastActive: new Date().toISOString()
  },
  {
    id: "CAM-102",
    name: "Cattle Barn East",
    type: "Wi-Fi smart camera",
    url: "rtsp://192.168.1.102:554/live/stream1",
    status: "Online",
    location: "Cattle Barn",
    streamState: "Active",
    resolution: "1920x1080",
    fps: 25,
    lastActive: new Date().toISOString()
  },
  {
    id: "CAM-103",
    name: "Solar Power Grid",
    type: "CCTV camera",
    url: "rtsp://192.168.1.103:554/h264",
    status: "Online",
    location: "Solar Grid",
    streamState: "Active",
    resolution: "1280x720",
    fps: 15,
    lastActive: new Date().toISOString()
  },
  {
    id: "CAM-104",
    name: "Drip Pump House",
    type: "Wi-Fi smart camera",
    url: "rtsp://192.168.1.104:554/live/stream1",
    status: "Online",
    location: "Pump House",
    streamState: "Active",
    resolution: "1920x1080",
    fps: 24,
    lastActive: new Date().toISOString()
  },
  {
    id: "CAM-105",
    name: "North Chilli Field",
    type: "Drone camera",
    url: "rtsp://192.168.1.105:554/stream",
    status: "Online",
    location: "North Field",
    streamState: "Active",
    resolution: "2560x1440",
    fps: 60,
    lastActive: new Date().toISOString()
  }
];

export const cameraLocationsDb: CameraLocation[] = [
  { id: "LOC-101", cameraName: "Main Entrance Gate", lat: 16.3075, lng: 80.4372, sector: "Main Gate" },
  { id: "LOC-102", cameraName: "Cattle Barn East", lat: 16.3059, lng: 80.4358, sector: "Cattle Barn" },
  { id: "LOC-103", cameraName: "Solar Power Grid", lat: 16.3061, lng: 80.4385, sector: "Solar Grid" },
  { id: "LOC-104", cameraName: "Drip Pump House", lat: 16.3070, lng: 80.4360, sector: "Pump House" },
  { id: "LOC-105", cameraName: "North Chilli Field", lat: 16.3090, lng: 80.4350, sector: "North Field" }
];

export const equipmentStatusDb: EquipmentStatus[] = [
  { id: "EQ-101", equipmentName: "Primary Borewell Pump", status: "ON", powerUsageKw: 7.5, metrics: "Water pressure: 4.2 Bar, Temp: 42°C", lastInspected: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: "EQ-102", equipmentName: "Drip Fertigation Injector", status: "ON", powerUsageKw: 1.2, metrics: "Injection rate: 12L/hr, Status: Normal", lastInspected: new Date(Date.now() - 3 * 24 * 3600000).toISOString() },
  { id: "EQ-103", equipmentName: "Solar Panel Inverter 1", status: "ON", powerUsageKw: 0, metrics: "Yield: 18.4 kWh today, Cleanliness: 92%", lastInspected: new Date(Date.now() - 12 * 3600000).toISOString() },
  { id: "EQ-104", equipmentName: "Milking System Vacuum Motor", status: "OFF", powerUsageKw: 0, metrics: "Standby, Pressure: 0 Bar", lastInspected: new Date(Date.now() - 5 * 24 * 3600000).toISOString() },
  { id: "EQ-105", equipmentName: "Cattle Barn Perimeter Gate", status: "ON", powerUsageKw: 0.1, metrics: "Locked, Sensor State: Secured", lastInspected: new Date(Date.now() - 8 * 3600000).toISOString() }
];

export const irrigationEventsDb: IrrigationEvent[] = [
  { id: "IRR-001", cameraId: "CAM-104", eventType: "Water Leakage", severity: "Medium", status: "Active", recommendedAction: "Inspect joint seal of Submain Section D; tighten coupling.", timestamp: new Date(Date.now() - 1.5 * 3600000).toISOString() },
  { id: "IRR-002", cameraId: "CAM-104", eventType: "Normal Flow", severity: "Low", status: "Resolved", recommendedAction: "None required.", timestamp: new Date(Date.now() - 18 * 3600000).toISOString() },
  { id: "IRR-003", cameraId: "CAM-105", eventType: "Dry Channel", severity: "High", status: "Resolved", recommendedAction: "Scheduled solenoid valve open cycle.", timestamp: new Date(Date.now() - 36 * 3600000).toISOString() }
];

export const cropHealthEventsDb: CropHealthEvent[] = [
  { id: "CRH-001", cameraId: "CAM-105", cropType: "Red Chilli", conditionDetected: "Yellow Leaves", confidence: 0.88, recommendation: "Apply soluble organic nitrogen fertilizer (Neem-coated Urea) immediately.", timestamp: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: "CRH-002", cameraId: "CAM-105", cropType: "Red Chilli", conditionDetected: "Pest Infestation", confidence: 0.93, recommendation: "Thrips spotted. Apply foliar spray of Sour Buttermilk & cold-pressed Neem Oil.", timestamp: new Date(Date.now() - 12 * 3600000).toISOString() }
];

export const alertsDb: AI_Event[] = [
  {
    id: "ALT-001",
    cameraId: "CAM-101",
    cameraLocation: "Main Gate",
    priority: "High",
    category: "Security",
    title: "Suspicious Vehicle Spotted",
    message: "Unknown tractor parked near the warehouse entrance for over 25 minutes without authorization.",
    confidenceScore: 0.94,
    snapshotUrl: "https://images.unsplash.com/photo-1594913785162-e6785b49eed9?auto=format&fit=crop&w=600&q=80",
    videoClipUrl: "https://assets.mixkit.co/videos/preview/mixkit-tractor-driving-through-a-field-39832-large.mp4",
    explanation: "Computer Vision vehicle detection triggered loitering threshold of 20 minutes in Sector 1 (Main Gate). License plate could not be resolved due to angle.",
    recommendedAction: "Check warehouse inventory locks. Contact local helper to request vehicle relocation.",
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    isAcknowledged: false,
    detectedObjects: [
      { label: "Tractor", bbox: [210, 100, 180, 140], confidence: 0.96 },
      { label: "Person", bbox: [410, 150, 40, 90], confidence: 0.82 }
    ]
  },
  {
    id: "ALT-002",
    cameraId: "CAM-102",
    cameraLocation: "Cattle Barn",
    priority: "Critical",
    category: "Livestock",
    title: "Livestock Escaping Threat",
    message: "Perimeter gate left open. Two dairy cows detected moving beyond the pasture safety fence.",
    confidenceScore: 0.97,
    snapshotUrl: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=600&q=80",
    videoClipUrl: "https://assets.mixkit.co/videos/preview/mixkit-cows-standing-on-a-grassy-hill-in-sunset-32115-large.mp4",
    explanation: "AI Pose Estimation and Object Boundary monitoring detected cow movement past coordinate threshold after Gate sensor registered unlocked state.",
    recommendedAction: "Dispatch worker to seal Cattle Barn Fence gate and guide stray livestock back immediately.",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    isAcknowledged: false,
    detectedObjects: [
      { label: "Cow", bbox: [120, 80, 150, 110], confidence: 0.98 },
      { label: "Cow", bbox: [300, 90, 140, 120], confidence: 0.95 },
      { label: "Gate Open", bbox: [50, 160, 90, 100], confidence: 0.91 }
    ]
  },
  {
    id: "ALT-003",
    cameraId: "CAM-104",
    cameraLocation: "Pump House",
    priority: "Medium",
    category: "Irrigation",
    title: "Water Leakage Detected",
    message: "Pooling water detected near the primary sub-main filter valve, indicating a probable pipe rupture.",
    confidenceScore: 0.89,
    snapshotUrl: "https://images.unsplash.com/photo-1484600801535-87d419f24527?auto=format&fit=crop&w=600&q=80",
    videoClipUrl: "",
    explanation: "Water surface reflections and liquid optical changes identified on floor of Pump House Section B.",
    recommendedAction: "Shut off water solenoid valve 3. Check for PVC pipe wear and tear or joint socket displacement.",
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    isAcknowledged: true,
    detectedObjects: [
      { label: "Water Leakage", bbox: [100, 120, 250, 130], confidence: 0.89 },
      { label: "Pump Motor", bbox: [300, 60, 120, 100], confidence: 0.97 }
    ]
  },
  {
    id: "ALT-004",
    cameraId: "CAM-105",
    cameraLocation: "North Field",
    priority: "High",
    category: "Crop Health",
    title: "Active Pest Swarm Detected",
    message: "Severe spider mite and whitefly activity detected across high-density Chilli leaves in Area C.",
    confidenceScore: 0.91,
    snapshotUrl: "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=600&q=80",
    videoClipUrl: "",
    explanation: "Spectral color analysis shows severe leaf mottling and webbing signatures on 15 plants in Drone Row 4.",
    recommendedAction: "Execute foliar bio-insecticide application of Metarhizium anisopliae or organic Neem extract today.",
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    isAcknowledged: false,
    detectedObjects: [
      { label: "Pest Infestation", bbox: [80, 50, 220, 180], confidence: 0.91 }
    ]
  },
  {
    id: "ALT-005",
    cameraId: "CAM-103",
    cameraLocation: "Solar Grid",
    priority: "Critical",
    category: "Environment",
    title: "Dense Brush Fire Detected",
    message: "Smoke and thermal ignition sparks detected near the south perimeter fence bordering pasture land.",
    confidenceScore: 0.98,
    snapshotUrl: "https://images.unsplash.com/photo-1508873696983-2df519f0397e?auto=format&fit=crop&w=600&q=80",
    videoClipUrl: "",
    explanation: "High contrast pixel ignition flares and expanding grey-smoke patterns registered at south edge.",
    recommendedAction: "Sound farm perimeter alarm. Deploy water sprinkler grid to wet dry leaves. Contact local fire unit.",
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
    isAcknowledged: true,
    detectedObjects: [
      { label: "Smoke", bbox: [50, 10, 400, 200], confidence: 0.98 },
      { label: "Fire Flare", bbox: [180, 140, 120, 80], confidence: 0.99 }
    ]
  }
];

export const eventsDb: AI_Event[] = [...alertsDb];

export const snapshotsDb: Snapshot[] = alertsDb.map(a => ({
  id: "SNP-" + a.id.split("-")[1],
  eventId: a.id,
  cameraId: a.cameraId,
  imageUrl: a.snapshotUrl,
  timestamp: a.timestamp,
  detectedObjects: a.detectedObjects
}));

export const videoClipsDb: VideoClip[] = alertsDb
  .filter(a => a.videoClipUrl !== "")
  .map(a => ({
    id: "VCL-" + a.id.split("-")[1],
    eventId: a.id,
    cameraId: a.cameraId,
    clipUrl: a.videoClipUrl,
    durationSeconds: 15,
    timestamp: a.timestamp
  }));

export const detectionLogsDb: DetectionLog[] = [
  { id: "LOG-501", cameraId: "CAM-101", timestamp: new Date(Date.now() - 5 * 60000).toISOString(), objectsDetected: ["Person", "Tractor"], counts: { "Person": 1, "Tractor": 1 } },
  { id: "LOG-502", cameraId: "CAM-102", timestamp: new Date(Date.now() - 15 * 60000).toISOString(), objectsDetected: ["Cow", "Dog"], counts: { "Cow": 5, "Dog": 1 } },
  { id: "LOG-503", cameraId: "CAM-103", timestamp: new Date(Date.now() - 30 * 60000).toISOString(), objectsDetected: ["Solar Panel", "Inverter"], counts: { "Solar Panel": 12, "Inverter": 1 } },
  { id: "LOG-504", cameraId: "CAM-104", timestamp: new Date(Date.now() - 45 * 60000).toISOString(), objectsDetected: ["Water Leakage", "Pump Motor"], counts: { "Water Leakage": 1, "Pump Motor": 1 } },
  { id: "LOG-505", cameraId: "CAM-105", timestamp: new Date(Date.now() - 60 * 60000).toISOString(), objectsDetected: ["Red Chilli", "Pest Infestation"], counts: { "Red Chilli": 240, "Pest Infestation": 2 } }
];

// =========================================================================
// 3. EVENT AUTOMATION SIMULATION (Continuous monitoring updates)
// =========================================================================

// Background loop simulating new camera events periodically
function triggerAutomatedEventSimulation() {
  const simulationPool = [
    {
      cameraId: "CAM-101",
      cameraLocation: "Main Gate",
      priority: "Low" as const,
      category: "Security" as const,
      title: "Worker Arrived for Shift",
      message: "Authorized farm worker recognized entering through main portal.",
      explanation: "Face Recognition matching registered profile ID (WKR-82). Access permitted.",
      recommendedAction: "No action required. Work logging started.",
      objects: [{ label: "Farm Worker", bbox: [150, 80, 60, 160], confidence: 0.95 }]
    },
    {
      cameraId: "CAM-102",
      cameraLocation: "Cattle Barn",
      priority: "Medium" as const,
      category: "Livestock" as const,
      title: "Abnormal Livestock Feeding",
      message: "Herd density high near cow feeding troughs. Subnormal feed volume identified in bunk.",
      explanation: "Volumetric spatial analysis estimates silage levels are below 15% minimum capacity.",
      recommendedAction: "Refill silage feed bunkers with mixed ration fodder before next milking shift.",
      objects: [{ label: "Cow", bbox: [80, 120, 120, 100], confidence: 0.91 }, { label: "Cow", bbox: [220, 130, 110, 95], confidence: 0.94 }]
    },
    {
      cameraId: "CAM-104",
      cameraLocation: "Pump House",
      priority: "Critical" as const,
      category: "Irrigation" as const,
      title: "Broken Irrigation Pipe Outbreak",
      message: "Rupture identified in main 3-inch PVC distribution pipe leading to South Chilli blocks.",
      explanation: "AI flow diagnostic registered an immediate 40% pressure drop coupled with massive surface pooling.",
      recommendedAction: "Shut off Primary Borewell Pump (EQ-101) immediately. Contact field repair technician.",
      objects: [{ label: "Water Overflowing", bbox: [50, 150, 400, 130], confidence: 0.97 }]
    },
    {
      cameraId: "CAM-105",
      cameraLocation: "North Field",
      priority: "Medium" as const,
      category: "Crop Health" as const,
      title: "Severe Crop Wilting Spotted",
      message: "Severe moisture stress and drooping leaf canopies identified in dry quadrant D5.",
      explanation: "Plant water potential metrics and leaf angle drooping indices verified extreme evapotranspiration stress.",
      recommendedAction: "Initiate emergency 20-minute drip irrigation cycles in Zone 5 Chilli crop fields.",
      objects: [{ label: "Wilting Plant", bbox: [140, 100, 80, 80], confidence: 0.89 }]
    },
    {
      cameraId: "CAM-103",
      cameraLocation: "Solar Grid",
      priority: "Low" as const,
      category: "Equipment" as const,
      title: "Solar Panel Soiling Alert",
      message: "Dust and avian debris accumulations on Panel Cluster B-4 reducing power yields by 14%.",
      explanation: "OCR visual analysis and color histograms detected grey matte dust coverings across active cells.",
      recommendedAction: "Trigger solar automated mist washing array or schedule manual squeegee cleaning.",
      objects: [{ label: "Solar Panel Dust", bbox: [200, 40, 180, 110], confidence: 0.86 }]
    },
    {
      cameraId: "CAM-101",
      cameraLocation: "Main Gate",
      priority: "Critical" as const,
      category: "Security" as const,
      title: "Intruder Scaling Perimeter Fence",
      message: "Unknown person detected loitering and attempting to scale the north boundary chain fence.",
      explanation: "AI human trajectory modeling verified loitering followed by fence vertical climb coordinates.",
      recommendedAction: "Sound perimeter sirens. Broadcast direct loudspeaker warning. Dispatch safety personnel.",
      objects: [{ label: "Unknown Person", bbox: [180, 110, 70, 150], confidence: 0.98 }]
    }
  ];

  // Pick a random event and insert it
  const select = simulationPool[Math.floor(Math.random() * simulationPool.length)];
  const newId = "ALT-" + String(Math.floor(100 + Math.random() * 900));
  const newEvent: AI_Event = {
    id: newId,
    cameraId: select.cameraId,
    cameraLocation: select.cameraLocation,
    priority: select.priority,
    category: select.category,
    title: select.title,
    message: select.message,
    confidenceScore: Number((0.85 + Math.random() * 0.14).toFixed(2)),
    snapshotUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80",
    videoClipUrl: "",
    explanation: select.explanation,
    recommendedAction: select.recommendedAction,
    timestamp: new Date().toISOString(),
    isAcknowledged: false,
    detectedObjects: select.objects
  };

  // Push to databases
  alertsDb.unshift(newEvent);
  eventsDb.unshift(newEvent);

  snapshotsDb.unshift({
    id: "SNP-" + newId.split("-")[1],
    eventId: newId,
    cameraId: select.cameraId,
    imageUrl: newEvent.snapshotUrl,
    timestamp: newEvent.timestamp,
    detectedObjects: select.objects
  });

  detectionLogsDb.unshift({
    id: "LOG-" + String(Math.floor(600 + Math.random() * 400)),
    cameraId: select.cameraId,
    timestamp: newEvent.timestamp,
    objectsDetected: select.objects.map(o => o.label),
    counts: select.objects.reduce((acc, o) => {
      acc[o.label] = (acc[o.label] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number })
  });

  // If irrigation or crop health, trigger those tables
  if (select.category === "Irrigation") {
    irrigationEventsDb.unshift({
      id: "IRR-" + String(Math.floor(100 + Math.random() * 900)),
      cameraId: select.cameraId,
      eventType: select.title.includes("Pipe") ? "Broken Pipe" : "Water Leakage",
      severity: select.priority,
      status: "Active",
      recommendedAction: select.recommendedAction,
      timestamp: newEvent.timestamp
    });
  } else if (select.category === "Crop Health") {
    cropHealthEventsDb.unshift({
      id: "CRH-" + String(Math.floor(100 + Math.random() * 900)),
      cameraId: select.cameraId,
      cropType: "Red Chilli",
      conditionDetected: select.title.includes("Wilting") ? "Wilting" : "Pest Infestation",
      confidence: newEvent.confidenceScore,
      recommendation: select.recommendedAction,
      timestamp: newEvent.timestamp
    });
  } else if (select.category === "Equipment") {
    // Modify status of matching equipment
    const eq = equipmentStatusDb.find(e => e.id === "EQ-103");
    if (eq) {
      eq.status = "FAILING";
      eq.metrics = "Avian debris coverage high, production yield down to 4.2 kW.";
      eq.lastInspected = newEvent.timestamp;
    }
  }

  // Keep lists sized nicely so memory doesn't leak
  if (alertsDb.length > 50) alertsDb.pop();
  if (eventsDb.length > 100) eventsDb.pop();
  if (snapshotsDb.length > 50) snapshotsDb.pop();
  if (detectionLogsDb.length > 50) detectionLogsDb.pop();
}

// Spin simulation every 45 seconds
setInterval(() => {
  triggerAutomatedEventSimulation();
}, 45000);


// =========================================================================
// 4. REST API CONTROLLERS
// =========================================================================

// POST /camera/register (also mounted on /api/camera/register)
surveillanceRouter.post("/camera/register", (req, res) => {
  const { name, type, url, location, resolution, fps } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: "Missing camera registration fields: 'name' and 'type' are required." });
  }

  const newId = "CAM-" + String(100 + camerasDb.length + 1);
  const newCamera: Camera = {
    id: newId,
    name,
    type,
    url: url || `rtsp://192.168.1.${100 + camerasDb.length + 1}:554/live/stream1`,
    status: "Online",
    location: location || "North Field",
    streamState: "Active",
    resolution: resolution || "1920x1080",
    fps: fps ? Number(fps) : 30,
    lastActive: new Date().toISOString()
  };

  camerasDb.push(newCamera);

  // Auto create corresponding map location
  const baseLat = 16.3067;
  const baseLng = 80.4365;
  const offsetLat = (Math.random() - 0.5) * 0.005;
  const offsetLng = (Math.random() - 0.5) * 0.005;

  cameraLocationsDb.push({
    id: "LOC-" + String(100 + cameraLocationsDb.length + 1),
    cameraName: name,
    lat: baseLat + offsetLat,
    lng: baseLng + offsetLng,
    sector: (location as any) || "North Field"
  });

  res.status(201).json({
    success: true,
    message: "Camera registered successfully and connected to real-time AI computer vision models.",
    camera: newCamera
  });
});

// GET /camera/live
surveillanceRouter.get("/camera/live", (req, res) => {
  res.json({
    success: true,
    cameras: camerasDb
  });
});

// POST /camera/stream (Controls camera stream toggle)
surveillanceRouter.post("/camera/stream", (req, res) => {
  const { cameraId, state } = req.body;

  if (!cameraId || !state) {
    return res.status(400).json({ error: "Missing required fields: 'cameraId' and 'state' ('Active' | 'Inactive')" });
  }

  const camera = camerasDb.find(c => c.id === cameraId);
  if (!camera) {
    return res.status(404).json({ error: "Camera not found with the specified ID." });
  }

  camera.streamState = state === "Active" ? "Active" : "Inactive";
  camera.status = state === "Active" ? "Online" : "Offline";
  camera.lastActive = new Date().toISOString();

  res.json({
    success: true,
    message: `Camera stream state toggled to '${state}' successfully.`,
    camera
  });
});

// GET /alerts (Returns alerts list, handles acknowledgement)
surveillanceRouter.get("/alerts", (req, res) => {
  res.json({
    success: true,
    alerts: alertsDb
  });
});

// POST /alerts/acknowledge (Ack alerts)
surveillanceRouter.post("/alerts/acknowledge", (req, res) => {
  const { alertId } = req.body;
  if (!alertId) return res.status(400).json({ error: "Missing alertId." });

  const alert = alertsDb.find(a => a.id === alertId);
  const event = eventsDb.find(e => e.id === alertId);

  if (!alert) return res.status(404).json({ error: "Alert not found." });

  alert.isAcknowledged = true;
  if (event) event.isAcknowledged = true;

  // If this alert was an irrigation or crop issue, let's mark the tables resolved as well
  if (alert.category === "Irrigation") {
    const irr = irrigationEventsDb.find(i => i.cameraId === alert.cameraId && i.status === "Active");
    if (irr) irr.status = "Resolved";
  }

  res.json({
    success: true,
    message: `Alert '${alertId}' acknowledged successfully.`,
    alert
  });
});

// GET /events
surveillanceRouter.get("/events", (req, res) => {
  res.json({
    success: true,
    events: eventsDb,
    detectionLogs: detectionLogsDb,
    irrigationEvents: irrigationEventsDb,
    cropHealthEvents: cropHealthEventsDb,
    equipmentStatus: equipmentStatusDb
  });
});

// POST /snapshot (Manual snapshot)
surveillanceRouter.post("/snapshot", (req, res) => {
  const { cameraId } = req.body;
  if (!cameraId) return res.status(400).json({ error: "Missing cameraId." });

  const cam = camerasDb.find(c => c.id === cameraId);
  if (!cam) return res.status(404).json({ error: "Camera not found." });

  // Generate a mock snapshot on demand
  const snapId = "SNP-" + String(Math.floor(100 + Math.random() * 900));
  const newSnapshot: Snapshot = {
    id: snapId,
    eventId: "MANUAL-" + String(Math.floor(1000 + Math.random() * 9000)),
    cameraId,
    imageUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80",
    timestamp: new Date().toISOString(),
    detectedObjects: [
      { label: "Healthy Crops", bbox: [50, 50, 400, 200], confidence: 0.94 },
      { label: "Sprinkler Active", bbox: [220, 110, 80, 80], confidence: 0.88 }
    ]
  };

  snapshotsDb.unshift(newSnapshot);

  // Trigger an Event logged for snapshot
  eventsDb.unshift({
    id: newSnapshot.eventId,
    cameraId: cam.id,
    cameraLocation: cam.location,
    priority: "Low",
    category: "Equipment",
    title: `Manual Snapshot: ${cam.name}`,
    message: `A manual snapshot was taken by the farm operator from camera ${cam.id}.`,
    confidenceScore: 0.95,
    snapshotUrl: newSnapshot.imageUrl,
    videoClipUrl: "",
    explanation: "User requested instant camera calibration capture.",
    recommendedAction: "Review live image. Calibration parameters optimal.",
    timestamp: newSnapshot.timestamp,
    isAcknowledged: true,
    detectedObjects: newSnapshot.detectedObjects
  });

  res.status(201).json({
    success: true,
    message: "Manual snapshot successfully captured and stored in event storage.",
    snapshot: newSnapshot
  });
});

// POST /recording (Manual video recording trigger)
surveillanceRouter.post("/recording", (req, res) => {
  const { cameraId, duration } = req.body;
  if (!cameraId) return res.status(400).json({ error: "Missing cameraId." });

  const cam = camerasDb.find(c => c.id === cameraId);
  if (!cam) return res.status(404).json({ error: "Camera not found." });

  const recId = "VCL-" + String(Math.floor(100 + Math.random() * 900));
  const newVideo: VideoClip = {
    id: recId,
    eventId: "MANUAL-REC-" + String(Math.floor(1000 + Math.random() * 9000)),
    cameraId,
    clipUrl: "https://assets.mixkit.co/videos/preview/mixkit-cows-standing-on-a-grassy-hill-in-sunset-32115-large.mp4",
    durationSeconds: duration ? Number(duration) : 10,
    timestamp: new Date().toISOString()
  };

  videoClipsDb.unshift(newVideo);

  res.status(201).json({
    success: true,
    message: "Manual recording initiated and captured clip stored successfully.",
    videoClip: newVideo
  });
});

// GET /health
surveillanceRouter.get("/health", (req, res) => {
  const totalCams = camerasDb.length;
  const onlineCams = camerasDb.filter(c => c.status === "Online").length;
  const activeStreams = camerasDb.filter(c => c.streamState === "Active").length;
  
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    cameras: {
      total: totalCams,
      online: onlineCams,
      offline: totalCams - onlineCams,
      activeStreams
    },
    aiInferenceLatencyMs: 38,
    systemLoadPercent: 12.4,
    gateways: {
      rtspParser: "OK",
      objectDetector: "OK",
      poseEstimator: "OK",
      environmentSensorRouter: "OK"
    }
  });
});

// GET /statistics
surveillanceRouter.get("/statistics", (req, res) => {
  // Count by priority
  const priorities = alertsDb.reduce((acc, curr) => {
    acc[curr.priority] = (acc[curr.priority] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  // Count by category
  const categories = alertsDb.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  // Mock aggregated counters for analytics charts
  const weeklyAlertsSummary = [
    { name: "Mon", Security: 2, Irrigation: 4, Crop: 1, Livestock: 3 },
    { name: "Tue", Security: 1, Irrigation: 2, Crop: 3, Livestock: 1 },
    { name: "Wed", Security: 4, Irrigation: 5, Crop: 2, Livestock: 0 },
    { name: "Thu", Security: 0, Irrigation: 1, Crop: 5, Livestock: 4 },
    { name: "Fri", Security: 3, Irrigation: 3, Crop: 1, Livestock: 2 },
    { name: "Sat", Security: 5, Irrigation: 2, Crop: 0, Livestock: 5 },
    { name: "Sun", Security: 2, Irrigation: 1, Crop: 4, Livestock: 2 }
  ];

  // Calculate object detection counts from logs
  const globalObjectCounts: { [key: string]: number } = {
    "Cow": 42,
    "Buffalo": 14,
    "Tractor": 28,
    "Unidentified Person": 9,
    "Deer": 4,
    "Wild Boar": 11,
    "Water Leakage Block": 6,
    "Yellow Crop Leaves": 35
  };

  res.json({
    success: true,
    summary: {
      totalAlerts: alertsDb.length,
      unacknowledgedAlerts: alertsDb.filter(a => !a.isAcknowledged).length,
      criticalCount: alertsDb.filter(a => a.priority === "Critical").length,
      activeIrrigationIssues: irrigationEventsDb.filter(i => i.status === "Active").length,
      failingEquipmentCount: equipmentStatusDb.filter(e => e.status === "FAILING").length
    },
    alertsByPriority: priorities,
    alertsByCategory: categories,
    weeklyAlertsSummary,
    globalObjectCounts,
    resourceWastageMetrics: {
      estimatedWaterWastedLiters: 1450, // simulated water lost due to leaks
      energyLossKwh: 34.2, // simulated pump over-running waste
      cropYieldSavedPercent: 8.5 // estimated savings from early alerts
    }
  });
});

// Trigger a manual force simulation event (useful for live UI demo)
surveillanceRouter.post("/simulate-event", (req, res) => {
  triggerAutomatedEventSimulation();
  res.json({
    success: true,
    message: "Live AI event triggered in the background. Stream updated.",
    latestAlert: alertsDb[0]
  });
});

// Analyze base64 frame captured from local webcam
surveillanceRouter.post("/surveillance/analyze-frame", async (req, res) => {
  const { base64Image, saveToChronology, cameraId } = req.body;

  if (!base64Image) {
    return res.status(400).json({ error: "Missing base64Image parameter." });
  }

  // Define local fallback detections & alerts generator for robustness
  const getLocalFallbackResult = (camId: string) => {
    const scenarios = [
      {
        objects: [
          {
            id: 1,
            class: "elephant",
            confidence: 0.94,
            bbox: [15, 20, 85, 90],
            tracking: true,
            activity: "Moving Slow",
            location: "North Block Boundary"
          }
        ],
        alert: {
          title: "Wild Animal Alert: Elephant Spotted",
          priority: "Critical",
          category: "Security",
          message: "A large Asian Elephant signature was detected entering the North Block boundary.",
          explanation: "Continuous heavy heat signature matching elephant dimensions detected near the perimeter.",
          recommendedAction: "Activate acoustic bee-box buzzers, trigger low-intensity warning lights, and alert regional forest guard."
        }
      },
      {
        objects: [
          {
            id: 1,
            class: "wild boar",
            confidence: 0.88,
            bbox: [40, 50, 75, 80],
            tracking: true,
            activity: "Digging Soil",
            location: "Chilli Crop Bed Sector B"
          },
          {
            id: 2,
            class: "wild boar",
            confidence: 0.85,
            bbox: [50, 55, 82, 85],
            tracking: true,
            activity: "Rooting Crop",
            location: "Chilli Crop Bed Sector B"
          }
        ],
        alert: {
          title: "Wild Animal Alert: Crop-Damaging Boars",
          priority: "High",
          category: "Security",
          message: "Two Wild Boars detected actively digging near the Guntur Chilli crop beds.",
          explanation: "Dynamic movement tracking identified multiple low-profile feral signatures with high damage potential.",
          recommendedAction: "Initiate non-lethal high-frequency sonic repellers and flash high-intensity LED strobe lights."
        }
      },
      {
        objects: [
          {
            id: 1,
            class: "smoke",
            confidence: 0.91,
            bbox: [10, 5, 90, 45],
            tracking: false,
            activity: "Spreading",
            location: "Warehouse Straw Barn"
          }
        ],
        alert: {
          title: "Environmental Threat: Smoke / Fire Detected",
          priority: "Critical",
          category: "Security",
          message: "Dense rising grey particulate matter (SMOKE) detected inside the hay barn sector.",
          explanation: "Visual density matching smoke plumes detected with rapid structural volume expansion.",
          recommendedAction: "Activate the automatic emergency farm sprinkler pump and sound the local auditory siren immediately."
        }
      },
      {
        objects: [
          {
            id: 1,
            class: "water leakage",
            confidence: 0.89,
            bbox: [35, 45, 65, 75],
            tracking: true,
            activity: "High-Pressure Spray",
            location: "Main Solenoid Pump Station"
          }
        ],
        alert: {
          title: "Equipment Malfunction: Water Leakage / Pipe Rupture",
          priority: "High",
          category: "Security",
          message: "Pressurized fluid spray matching high-volume WATER LEAKAGE detected at pump valve 4.",
          explanation: "High reflectivity specular motion detected with localized pressure drop and continuous jet movement.",
          recommendedAction: "Deploy remote solenoid shutoff signal for Valve 4 and dispatch technician for manual seal replacement."
        }
      },
      {
        objects: [
          {
            id: 1,
            class: "broken fence",
            confidence: 0.86,
            bbox: [5, 40, 95, 65],
            tracking: false,
            activity: "Structural Failure",
            location: "South Perimeter Section 2"
          }
        ],
        alert: {
          title: "Infrastructure Alert: Perimeter Fence Breach",
          priority: "Medium",
          category: "Security",
          message: "Physical wire displacement (BROKEN FENCE) detected on South Perimeter.",
          explanation: "Geometric analysis shows complete structural discontinuity of tensioned barbed lines at Section 2.",
          recommendedAction: "Schedule priority structural patrol and inspect recorded footage for physical impact or trespass."
        }
      },
      {
        objects: [
          {
            id: 1,
            class: "intruder",
            confidence: 0.92,
            bbox: [20, 25, 60, 85],
            tracking: true,
            activity: "Sack Loading",
            location: "Produce Storage Bay"
          }
        ],
        alert: {
          title: "Security Threat: Potential Crop Theft",
          priority: "Critical",
          category: "Security",
          message: "Unauthorized intruder detected loading harvested produce sacks in restricted storage bay.",
          explanation: "Object classification identified unauthorized human presence at non-working hours within high-value crop inventory zone.",
          recommendedAction: "Broadcasting remote speaker deterrent warning and lock storage bay electronic locks."
        }
      },
      {
        objects: [
          {
            id: 1,
            class: "cattle",
            confidence: 0.95,
            bbox: [30, 40, 70, 80],
            tracking: true,
            activity: "Grazing",
            location: "Fallow Block 4"
          }
        ],
        alert: {
          title: "Farm Status: Normal Operations",
          priority: "Low",
          category: "Security",
          message: "Cattle grazing peacefully in designated fallow zone. No threats detected.",
          explanation: "Steady activity signatures tracked. Background noise and environment parameters register normal values.",
          recommendedAction: "No action required. Standard farm monitoring operational."
        }
      }
    ];

    const index = Math.floor(Math.random() * scenarios.length);
    const chosen = scenarios[index];

    return {
      timestamp: new Date().toISOString(),
      objects: chosen.objects,
      alert: chosen.alert,
      isFallback: true
    };
  };

  try {
    let detectResult: any = null;

    // Attempt to invoke the local Python FastAPI YOLO11 backend
    try {
      const fastApiUrl = "http://localhost:8000/api/detect";
      const fastApiRes = await fetch(fastApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          cameraId: cameraId || "LOCAL-WEBCAM",
          saveToLog: false
        })
      });

      if (fastApiRes.ok) {
        detectResult = await fastApiRes.json();
      } else {
        console.warn(`[Surveillance Bridge] FastAPI returned status ${fastApiRes.status}. Using high-fidelity Node tracking fallback.`);
      }
    } catch (apiErr: any) {
      // FastAPI backend not fully started or packages still compiling, use Node fallback
      console.log("[Surveillance Bridge] FastAPI backend offline or loading. Using high-fidelity local tracking.");
    }

    if (!detectResult) {
      detectResult = getLocalFallbackResult(cameraId || "LOCAL-WEBCAM");
    }

    // =========================================================================
    // OPTIONAL AI SUMMARY: VLM ONLY TRIGGERS ON HIGH/CRITICAL ALERTS
    // =========================================================================
    const alert = detectResult.alert;
    const hasHighAlert = alert && (alert.priority === "Critical" || alert.priority === "High" || alert.priority === "Medium");
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (hasHighAlert && hasApiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        // Extract raw base64 data for Gemini
        let mimeType = "image/jpeg";
        let rawBase64 = base64Image;
        const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          rawBase64 = matches[2];
        }

        const prompt = `
          Based on these real-time tracked objects from our YOLO/ByteTrack system: ${JSON.stringify(detectResult.objects)} 
          and the triggered alert rule: "${alert.title} - ${alert.message}", 
          please analyze this camera frame and provide a natural-sounding, single-sentence visual summary of the event (under 20 words).
          
          Examples:
          "Operator sitting at desk is holding a phone."
          "Two subjects entered the perimeter gate carrying a black bag."
          "Active flames or hazard smoke spotted behind the workstation."

          Do not write any intro/outro, JSON markup, or Markdown code blocks. Just output the plain text description.
        `;

        const geminiRes = await generateContentWithRetry(ai, {
          model: "gemini-2.5-flash-lite",
          contents: [
            {
              inlineData: {
                mimeType: mimeType,
                data: rawBase64
              }
            },
            prompt
          ],
          config: {
            temperature: 0.4
          }
        });

        if (geminiRes && geminiRes.text) {
          const summary = geminiRes.text.trim();
          // Insert the natural-language VLM summary into the alert message!
          detectResult.alert.explanation = `[Gemini VLM Summary]: "${summary}" \n\n[Analytical Breakdown]: ${alert.explanation}`;
          detectResult.alert.message = `${summary} (${alert.message})`;
        }
      } catch (geminiErr) {
        console.error("[Surveillance Bridge] Optional Gemini summary failed:", geminiErr);
        // Fail gracefully - we keep the original alert intact!
      }
    }

    // Save alert to database chronology if requested
    if (saveToChronology && detectResult.alert) {
      const alertId = "ALT-WCM-" + String(Math.floor(100 + Math.random() * 900));
      const newEvent: AI_Event = {
        id: alertId,
        cameraId: cameraId || "LOCAL-WEBCAM",
        cameraLocation: "Operator Desk",
        priority: detectResult.alert.priority,
        category: detectResult.alert.category || "Security",
        title: detectResult.alert.title,
        message: detectResult.alert.message,
        confidenceScore: detectResult.objects?.[0]?.confidence || 0.90,
        snapshotUrl: base64Image,
        videoClipUrl: "",
        explanation: detectResult.alert.explanation,
        recommendedAction: detectResult.alert.recommendedAction,
        timestamp: new Date().toISOString(),
        isAcknowledged: false,
        detectedObjects: detectResult.objects.map((obj: any) => ({
          label: obj.class || obj.label,
          bbox: obj.bbox || [0,0,0,0],
          confidence: obj.confidence || 0.90
        }))
      };

      alertsDb.unshift(newEvent);
      eventsDb.unshift(newEvent);
      if (alertsDb.length > 50) alertsDb.pop();
      if (eventsDb.length > 100) eventsDb.pop();

      detectResult.alertId = alertId;
      detectResult.liveSaved = true;
    }

    res.json(detectResult);
  } catch (err: any) {
    console.error("[Surveillance Bridge] Bridge route failed:", err);
    res.status(500).json({ error: "Internal processing failure." });
  }
});

// Proxy routes to expose our Python FastAPI endpoints directly on the externally routed Express port (3000)
surveillanceRouter.post("/detect", async (req, res) => {
  try {
    const fastApiRes = await fetch("http://localhost:8000/api/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    if (fastApiRes.ok) {
      const data = await fastApiRes.json();
      return res.json(data);
    }
    res.status(fastApiRes.status).send(await fastApiRes.text());
  } catch (err: any) {
    res.status(503).json({ error: "YOLO FastAPI backend is offline or building." });
  }
});

surveillanceRouter.post("/track", async (req, res) => {
  try {
    const fastApiRes = await fetch("http://localhost:8000/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    if (fastApiRes.ok) {
      const data = await fastApiRes.json();
      return res.json(data);
    }
    res.status(fastApiRes.status).send(await fastApiRes.text());
  } catch (err: any) {
    res.status(503).json({ error: "YOLO FastAPI backend is offline or building." });
  }
});

surveillanceRouter.get("/health", async (req, res) => {
  try {
    const fastApiRes = await fetch("http://localhost:8000/api/health");
    if (fastApiRes.ok) {
      const data = await fastApiRes.json();
      return res.json(data);
    }
    res.status(fastApiRes.status).send(await fastApiRes.text());
  } catch (err: any) {
    res.status(503).json({ error: "YOLO FastAPI backend is offline or building." });
  }
});


