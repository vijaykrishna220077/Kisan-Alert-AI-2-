import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { 
  Camera as CameraIcon, 
  MapPin, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Tv, 
  Activity, 
  ShieldAlert, 
  Droplet, 
  TrendingUp, 
  UserCheck, 
  Plus, 
  Video, 
  CheckCircle, 
  CloudRain, 
  RefreshCw, 
  Wrench, 
  Volume2, 
  VolumeX, 
  Trash2,
  Info
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell,
  PieChart,
  Pie
} from "recharts";

// TypeScript declarations for backend models locally
interface Camera {
  id: string;
  name: string;
  type: string;
  url: string;
  status: "Online" | "Offline" | "Connecting";
  location: string;
  streamState: "Active" | "Inactive";
  resolution: string;
  fps: number;
  lastActive: string;
}

interface CameraLocation {
  id: string;
  cameraName: string;
  lat: number;
  lng: number;
  sector: string;
}

interface AI_Event {
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

interface Statistics {
  summary: {
    totalAlerts: number;
    unacknowledgedAlerts: number;
    criticalCount: number;
    activeIrrigationIssues: number;
    failingEquipmentCount: number;
  };
  alertsByPriority: { [key: string]: number };
  alertsByCategory: { [key: string]: number };
  weeklyAlertsSummary: any[];
  globalObjectCounts: { [key: string]: number };
  resourceWastageMetrics: {
    estimatedWaterWastedLiters: number;
    energyLossKwh: number;
    cropYieldSavedPercent: number;
  };
}

export function SurveillanceDashboard() {
  // DB States loaded from REST APIs
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<AI_Event[]>([]);
  const [events, setEvents] = useState<AI_Event[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [activeCamera, setActiveCamera] = useState<Camera | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AI_Event | null>(null);

  // UI Control states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [localWebcamActive, setLocalWebcamActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Webcam AI analysis states
  const [webcamDetections, setWebcamDetections] = useState<{ label: string; bbox: number[]; confidence: number; category?: string; activity?: string }[]>([]);
  const [webcamAnalyzing, setWebcamAnalyzing] = useState(false);
  const [autoAnalyzeWebcam, setAutoAnalyzeWebcam] = useState(false);
  const [logWebcamToChronology, setLogWebcamToChronology] = useState(true);
  const [webcamStatusText, setWebcamStatusText] = useState("Connected. Ready for real-time AI scanning.");
  const [webcamScanInterval, setWebcamScanInterval] = useState(33); // Default to 33ms (30 FPS) real-time YOLO mode

  // Store previous frame downscaled pixels for client-side motion detection
  const prevFramePixelsRef = useRef<Uint8ClampedArray | null>(null);

  // Form states for new camera
  const [camName, setCamName] = useState("");
  const [camType, setCamType] = useState("IP Camera");
  const [camLocation, setCamLocation] = useState("North Field");
  const [camResolution, setCamResolution] = useState("1920x1080");
  const [camFps, setCamFps] = useState(30);

  // References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.FeatureGroup | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sidebarVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeCameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    activeCameraRef.current = activeCamera;
  }, [activeCamera]);

  // Fetch initial system states
  const refreshSurveillanceData = async () => {
    setLoading(true);
    try {
      const camRes = await fetch("/camera/live");
      const camData = await camRes.json();
      if (camData.success) {
        setCameras(camData.cameras);
        const currentActive = activeCameraRef.current;
        // Default select first camera if none active
        if (!currentActive && camData.cameras.length > 0) {
          setActiveCamera(camData.cameras[0]);
        } else if (currentActive) {
          if (currentActive.id === "LOCAL-WEBCAM") {
            // Keep the local operator webcam active, do not reset or search in server-provided cameras
          } else {
            const updatedActive = camData.cameras.find((c: Camera) => c.id === currentActive.id);
            if (updatedActive) setActiveCamera(updatedActive);
          }
        }
      }

      const alertRes = await fetch("/alerts");
      const alertData = await alertRes.json();
      if (alertData.success) {
        setAlerts(alertData.alerts);
        // Default highlight the first unacknowledged critical/high alert if available
        const urgent = alertData.alerts.find((a: AI_Event) => !a.isAcknowledged && (a.priority === "Critical" || a.priority === "High"));
        if (urgent && !selectedAlert) {
          setSelectedAlert(urgent);
          // Play audio alert
          if (soundEnabled) {
            triggerBeep(800, 0.1);
          }
        }
      }

      const eventRes = await fetch("/events");
      const eventData = await eventRes.json();
      if (eventData.success) {
        setEvents(eventData.events);
      }

      const statsRes = await fetch("/statistics");
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error loading surveillance states:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sound generator
  const triggerBeep = (freq = 440, duration = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Ignored browser audio policy
    }
  };

  // Poll data periodically
  useEffect(() => {
    refreshSurveillanceData();
    const interval = setInterval(() => {
      refreshSurveillanceData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Web camera activation controller
  const toggleLocalWebcam = async () => {
    if (localWebcamActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setLocalWebcamActive(false);
      streamRef.current = null;
      setWebcamDetections([]);
      setAutoAnalyzeWebcam(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        if (sidebarVideoRef.current) {
          sidebarVideoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
        setLocalWebcamActive(true);
        setAutoAnalyzeWebcam(true);

        // Switch active camera selection to indicate local webcam is streaming
        const webcamPlaceholder: Camera = {
          id: "LOCAL-WEBCAM",
          name: "Local USB Webcam / Phone",
          type: "USB webcam",
          url: "local://stream",
          status: "Online",
          location: "Operator Desk",
          streamState: "Active",
          resolution: "640x480",
          fps: 30,
          lastActive: new Date().toISOString()
        };
        setActiveCamera(webcamPlaceholder);

        // Run an initial scan after the camera feed has settled and started streaming
        setTimeout(() => {
          captureAndAnalyzeFrame();
        }, 1200);
      } catch (err) {
        alert("Could not access local camera. Please verify camera permissions inside your browser.");
        console.error(err);
      }
    }
  };

  // Synchronize webcam stream to the video element(s) whenever they are mounted/unmounted or activeCamera changes
  useEffect(() => {
    if (localWebcamActive && streamRef.current) {
      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      if (sidebarVideoRef.current && sidebarVideoRef.current.srcObject !== streamRef.current) {
        sidebarVideoRef.current.srcObject = streamRef.current;
      }
    }
  }, [localWebcamActive, activeCamera, activeCamera?.id]);

  // Capture a frame from the live video and send it to Gemini Vision on the backend
  const captureAndAnalyzeFrame = async (saveToLog = logWebcamToChronology) => {
    const video = videoRef.current || sidebarVideoRef.current;
    if (!video || !localWebcamActive) return;
    
    if (video.readyState < 2) {
      setWebcamStatusText("Waiting for camera feed stream buffer...");
      return;
    }

    setWebcamAnalyzing(true);
    setWebcamStatusText("AI Vision scanning active frame...");
    
    try {
      const canvas = document.createElement("canvas");
      // Scale down image to optimized 640 max dimension to save bandwidth & latency (Recommendation #3)
      const maxDim = 640;
      let w = video.videoWidth || 640;
      let h = video.videoHeight || 480;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        // Draw matched orientation frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Fast client-side pixel-difference motion detection (Recommendation #2)
        const imgData = ctx.getImageData(0, 0, w, h);
        const pixels = imgData.data;
        
        let hasMotion = true;
        if (prevFramePixelsRef.current && prevFramePixelsRef.current.length === pixels.length) {
          let diffSum = 0;
          const prev = prevFramePixelsRef.current;
          // Sample every 16th pixel to keep it extremely fast
          for (let i = 0; i < pixels.length; i += 64) {
            const rDiff = Math.abs(pixels[i] - prev[i]);
            const gDiff = Math.abs(pixels[i + 1] - prev[i + 1]);
            const bDiff = Math.abs(pixels[i + 2] - prev[i + 2]);
            diffSum += rDiff + gDiff + bDiff;
          }
          const numSamples = pixels.length / 64;
          const avgDiff = diffSum / (numSamples * 3);
          
          // If average color change is under 3.5, consider it completely still/no-motion and skip API requests!
          if (avgDiff < 3.5) {
            hasMotion = false;
          }
        }
        
        // Save current frame as previous frame for next comparison
        prevFramePixelsRef.current = new Uint8ClampedArray(pixels);
        
        if (!hasMotion) {
          setWebcamStatusText("Monitoring (No visual motion detected. Skipping API scan to save quota).");
          setWebcamAnalyzing(false);
          return;
        }

        const base64Image = canvas.toDataURL("image/jpeg", 0.75);
        
        const res = await fetch("/surveillance/analyze-frame", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Image,
            saveToChronology: saveToLog
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success !== false && (data.objects || data.alert)) {
            const mappedObjects = (data.objects || []).map((obj: any) => {
              const label = obj.class || obj.label || "Object";
              const cleanLabel = label.charAt(0).toUpperCase() + label.slice(1);
              const isThreat = ["knife", "gun", "fire", "smoke"].includes((obj.class || "").toLowerCase());
              return {
                ...obj,
                label: cleanLabel,
                category: isThreat ? "Security" : (obj.category || "Standard"),
                activity: obj.activity || "Stationary"
              };
            });
            setWebcamDetections(mappedObjects);
            
            const alert = data.alert || data.event;
            if (alert) {
              setWebcamStatusText(alert.message || "Analyzed successfully.");
              
              if (data.liveSaved) {
                if (soundEnabled) {
                  triggerBeep(900, 0.15);
                }
                await refreshSurveillanceData();
                
                const tempAlert: AI_Event = {
                  id: data.alertId || ("ALT-WCM-" + Math.floor(100 + Math.random() * 900)),
                  cameraId: "LOCAL-WEBCAM",
                  cameraLocation: "Operator Desk",
                  priority: alert.priority || "Low",
                  category: alert.category || "Security",
                  title: alert.title || "Live Webcam Alert",
                  message: alert.message || "An object was analyzed via real-time webcam feed.",
                  confidenceScore: mappedObjects[0]?.confidence || 0.90,
                  snapshotUrl: base64Image,
                  videoClipUrl: "",
                  explanation: alert.explanation || "Real-time user webcam vision frame analysis via YOLOv11.",
                  recommendedAction: alert.recommendedAction || "None.",
                  timestamp: new Date().toISOString(),
                  isAcknowledged: false,
                  detectedObjects: mappedObjects.map((o: any) => ({
                    label: o.label,
                    bbox: o.bbox,
                    confidence: o.confidence
                  }))
                };
                setSelectedAlert(tempAlert);
              }
            } else {
              setWebcamStatusText("No outstanding security anomalies detected.");
            }
          } else {
            setWebcamStatusText("AI Vision parse error: " + (data.error || "Unknown error"));
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          setWebcamStatusText("AI Analysis failed: " + (errData.error || "Server error"));
        }
      }
    } catch (err: any) {
      console.error(err);
      setWebcamStatusText("Camera capture error: " + err.message);
    } finally {
      setWebcamAnalyzing(false);
    }
  };

  // Continuous auto-analysis loop supporting dual-speed tracking (requestAnimationFrame vs interval)
  useEffect(() => {
    if (!localWebcamActive || !autoAnalyzeWebcam) return;

    if (webcamScanInterval === 33) {
      // Real-time 30 FPS YOLO loop using requestAnimationFrame and frame throttle
      let animId: number;
      let lastScanTime = 0;

      const tick = async (timestamp: number) => {
        if (!lastScanTime) lastScanTime = timestamp;
        const elapsed = timestamp - lastScanTime;

        // Cap at ~30 FPS (33ms ticks)
        if (elapsed >= 33) {
          if (!videoRef.current && !sidebarVideoRef.current) {
            animId = requestAnimationFrame(tick);
            return;
          }
          // Only trigger a new scan if the previous fetch is not still in flight (backpressure handling)
          if (!webcamAnalyzing) {
            lastScanTime = timestamp;
            await captureAndAnalyzeFrame();
          }
        }
        animId = requestAnimationFrame(tick);
      };

      animId = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(animId);
      };
    } else {
      // Standard interval periodic scanning loop
      const interval = setInterval(() => {
        captureAndAnalyzeFrame();
      }, webcamScanInterval);

      return () => {
        clearInterval(interval);
      };
    }
  }, [localWebcamActive, autoAnalyzeWebcam, logWebcamToChronology, webcamScanInterval, webcamAnalyzing]);

  // Handle register camera
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!camName.trim()) return;

    try {
      const res = await fetch("/camera/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: camName,
          type: camType,
          location: camLocation,
          resolution: camResolution,
          fps: camFps
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setCamName("");
        await refreshSurveillanceData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle stream state toggle
  const toggleCameraStream = async (cameraId: string, currentState: "Active" | "Inactive") => {
    const nextState = currentState === "Active" ? "Inactive" : "Active";
    setActionLoading("stream-" + cameraId);
    try {
      const res = await fetch("/camera/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId, state: nextState })
      });
      if (res.ok) {
        await refreshSurveillanceData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle manual snapshot capture
  const triggerManualSnapshot = async (cameraId: string) => {
    setActionLoading("snap-" + cameraId);
    try {
      const res = await fetch("/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId })
      });
      if (res.ok) {
        triggerBeep(600, 0.05);
        await refreshSurveillanceData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle manual video recording trigger
  const triggerManualRecording = async (cameraId: string) => {
    setActionLoading("rec-" + cameraId);
    try {
      const res = await fetch("/recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraId, duration: 15 })
      });
      if (res.ok) {
        triggerBeep(400, 0.2);
        await refreshSurveillanceData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    setActionLoading("ack-" + alertId);
    try {
      const res = await fetch("/alerts/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId })
      });
      if (res.ok) {
        await refreshSurveillanceData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle simulation trigger
  const triggerLiveSimulation = async () => {
    setActionLoading("simulate");
    try {
      const res = await fetch("/simulate-event", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          triggerBeep(1000, 0.25);
          await refreshSurveillanceData();
          setSelectedAlert(data.latestAlert);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Leaflet map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Centered around the main agricultural district of Guntur, India
      mapRef.current = L.map(mapContainerRef.current, {
        center: [16.3075, 80.4372],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(mapRef.current);

      markerGroupRef.current = L.featureGroup().addTo(mapRef.current);
    }

    return () => {
      // Clean up on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync camera locations on map markers
  useEffect(() => {
    if (!mapRef.current || !markerGroupRef.current || cameras.length === 0) return;

    // Clear existing markers
    markerGroupRef.current.clearLayers();

    // Leaflet camera icons
    const presetPositions: { [key: string]: [number, number] } = {
      "Main Entrance Gate": [16.3078, 80.4385],
      "Cattle Barn East": [16.3059, 80.4358],
      "Solar Power Grid": [16.3061, 80.4385],
      "Drip Pump House": [16.3070, 80.4360],
      "North Chilli Field": [16.3090, 80.4350]
    };

    cameras.forEach((camera) => {
      const pos = presetPositions[camera.name] || [16.3075 + (Math.random() - 0.5) * 0.003, 80.4372 + (Math.random() - 0.5) * 0.003];
      
      const isOnline = camera.status === "Online" && camera.streamState === "Active";
      const markerColor = isOnline ? "#2D5A27" : "#E63946";

      // Glowing dot HTML marker
      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-6 h-6 rounded-full animate-ping opacity-25" style="background-color: ${markerColor}"></div>
            <div class="w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center shadow-md text-[8px] font-bold text-white" style="background-color: ${markerColor}">
            </div>
          </div>
        `,
        iconSize: [24, 24]
      });

      const marker = L.marker(pos, { icon: customIcon }).addTo(markerGroupRef.current!);
      
      // Popup on click
      marker.bindPopup(`
        <div class="p-2 text-xs font-sans">
          <p class="font-extrabold text-[#2D5A27]">${camera.name}</p>
          <p class="text-gray-500 font-medium">Type: ${camera.type}</p>
          <p class="text-[9px] font-bold mt-1 uppercase" style="color: ${isOnline ? '#2D5A27' : '#E63946'}">
            ● ${camera.status} (${camera.resolution})
          </p>
        </div>
      `);

      marker.on("click", () => {
        setActiveCamera(camera);
      });
    });

    // Fit map bounds to encompass all markers nicely
    try {
      const bounds = markerGroupRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch (e) {
      // Ignored
    }
  }, [cameras]);

  // Clean webcam stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-6 text-[#2D3628]">
      
      {/* HEADER CONTROLS CARD */}
      <div className="bg-white/90 backdrop-blur border border-[#E0E5D8] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-[#EBF3E5] border border-[#D5E2CC] text-[10px] font-extrabold text-[#2D5A27] uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <Activity className="w-3 h-3 animate-pulse text-emerald-600" />
            24/7 AI Farm Supervisor Engine
          </span>
          <h2 className="text-2xl font-black text-[#1A2E1A] mt-2 tracking-tight">AI Surveillance &amp; Live Monitoring Center</h2>
          <p className="text-xs text-[#8A9A8A] mt-1 max-w-xl">
            Proactively monitor security boundaries, irrigation lines, crop stress anomalies, livestock escapes, and solar equipment metrics with low-latency AI computer vision.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sound toggle */}
          <button 
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              triggerBeep(600, 0.05);
            }}
            className={`p-2.5 rounded-xl border transition-all ${soundEnabled ? "bg-[#EBF3E5] border-[#D5E2CC] text-[#2D5A27]" : "bg-[#F8F9F5] border-[#E0E5D8] text-gray-400"}`}
            title={soundEnabled ? "Mute audio alarms" : "Unmute audio alarms"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Trigger Live simulation event */}
          <button 
            onClick={triggerLiveSimulation}
            disabled={actionLoading === "simulate"}
            className="px-4 py-2 bg-[#E63946] hover:bg-[#D62828] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {actionLoading === "simulate" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Trigger Security Intrusion
          </button>

          {/* Register new Camera */}
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#2D5A27] hover:bg-[#20401C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Smart Camera
          </button>

          {/* Connect Live USB Webcam */}
          <button 
            onClick={toggleLocalWebcam}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
              localWebcamActive 
                ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            {localWebcamActive ? "Stop Live Camera" : "Start Live Camera"}
          </button>
        </div>
      </div>

      {/* THREE-COLUMN BENTO SYSTEM GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: ACTIVE CAMERA FEED VIEWPORT & CAMERA DIRECTORY (Col Span: 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* MAIN STREAM VIEWPORT CARD */}
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 relative group min-h-[440px] flex flex-col justify-between">
            
            {/* Viewport Header overlay */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
              <div className="px-3 py-1.5 bg-black/70 backdrop-blur rounded-xl border border-white/10 flex items-center gap-2 pointer-events-auto">
                <div className={`w-2.5 h-2.5 rounded-full ${activeCamera?.status === "Online" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></div>
                <span className="text-[11px] font-black text-white">{activeCamera?.name || "No Camera Active"}</span>
                <span className="text-[10px] text-gray-400 font-mono">[{activeCamera?.resolution} @ {activeCamera?.fps} FPS]</span>
              </div>

              <div className="px-3 py-1.5 bg-black/70 backdrop-blur rounded-xl border border-white/10 flex items-center gap-1 text-[10px] text-emerald-400 font-bold tracking-wider uppercase pointer-events-auto">
                <Activity className="w-3 h-3 text-emerald-400 animate-bounce" />
                AI Analysis Live
              </div>
            </div>

            {/* Viewport Video/Stream canvas container */}
            <div className="flex-1 w-full bg-black relative flex items-center justify-center min-h-[380px]">
              
              {/* Actual browser webcam element if active & selected */}
              {localWebcamActive && activeCamera?.id === "LOCAL-WEBCAM" ? (
                <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-black">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  
                  {/* Glowing AI Bounding HUD overlay */}
                  <div className="absolute inset-0 pointer-events-none border-[3px] border-emerald-500/30 m-6">
                    <svg className="w-full h-full absolute inset-0 z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {webcamDetections.length > 0 ? (
                        webcamDetections.map((det, index) => {
                          const [xmin, ymin, xmax, ymax] = det.bbox;
                          return (
                            <g key={index}>
                              <rect 
                                x={100 - xmax} 
                                y={ymin} 
                                width={xmax - xmin} 
                                height={ymax - ymin} 
                                fill="none" 
                                stroke={det.category === "Security" ? "#EF4444" : "#10B981"} 
                                strokeWidth="1" 
                                className="animate-pulse" 
                              />
                              <rect
                                x={100 - xmax}
                                y={Math.max(0, ymin - 8)}
                                width={Math.min(xmax, 38)}
                                height="8"
                                fill={det.category === "Security" ? "#EF4444" : "#10B981"}
                              />
                              <text 
                                x={100 - xmax + 1} 
                                y={Math.max(0, ymin - 2)} 
                                fill="white" 
                                className="text-[5px] font-mono font-bold uppercase"
                                style={{ fontSize: "5px", fill: "white" }}
                              >
                                {det.label} ({Math.round(det.confidence * 100)}%)
                              </text>
                            </g>
                          );
                        })
                      ) : (
                        <g transform="translate(30, 25)">
                          <rect width="40" height="50" fill="none" stroke="#10B981" strokeWidth="0.8" strokeDasharray="2, 1" className="animate-pulse" />
                          <text x="1" y="-2" fill="#10B981" className="text-[4px] font-mono font-bold uppercase" style={{ fontSize: "4px" }}>
                            OPERATOR AREA [WAITING SCAN]
                          </text>
                          <line x1="0" y1="0" x2="5" y2="0" stroke="#10B981" strokeWidth="1" />
                          <line x1="0" y1="0" x2="0" y2="5" stroke="#10B981" strokeWidth="1" />
                          <line x1="40" y1="0" x2="35" y2="0" stroke="#10B981" strokeWidth="1" />
                          <line x1="40" y1="0" x2="40" y2="5" stroke="#10B981" strokeWidth="1" />
                          <line x1="0" y1="50" x2="5" y2="50" stroke="#10B981" strokeWidth="1" />
                          <line x1="0" y1="50" x2="0" y2="45" stroke="#10B981" strokeWidth="1" />
                          <line x1="40" y1="50" x2="35" y2="50" stroke="#10B981" strokeWidth="1" />
                          <line x1="40" y1="50" x2="40" y2="45" stroke="#10B981" strokeWidth="1" />
                        </g>
                      )}
                    </svg>

                    {webcamAnalyzing && (
                      <div className="absolute inset-x-0 h-1 bg-emerald-400 opacity-60 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-[bounce_2s_infinite] pointer-events-none"></div>
                    )}
                    
                    <div className="absolute bottom-4 left-4 bg-slate-950/95 border border-slate-800 text-slate-300 font-mono text-[9px] p-3 rounded-xl backdrop-blur flex flex-col gap-1 z-10 pointer-events-auto max-w-xs sm:max-w-md shadow-2xl">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold uppercase text-[10px]">
                        <span className={`w-2 h-2 rounded-full ${webcamAnalyzing ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`}></span>
                        {webcamAnalyzing ? "AI Scanning Frame..." : "Webcam AI Active"}
                      </div>
                      <p className="text-white mt-1 leading-relaxed text-[11px] font-sans font-medium">{webcamStatusText}</p>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-800">
                        <button
                          onClick={() => captureAndAnalyzeFrame()}
                          disabled={webcamAnalyzing}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black transition-all cursor-pointer disabled:opacity-50"
                        >
                          Scan Frame Now
                        </button>
                        
                        <button
                          onClick={() => setAutoAnalyzeWebcam(!autoAnalyzeWebcam)}
                          className={`px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${autoAnalyzeWebcam ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                        >
                          {autoAnalyzeWebcam ? "Auto-Scan ON" : "Auto-Scan OFF"}
                        </button>

                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] text-slate-400 hover:text-white ml-1">
                          <input 
                            type="checkbox" 
                            checked={logWebcamToChronology}
                            onChange={(e) => setLogWebcamToChronology(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                          />
                          Log detections
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeCamera?.id === "LOCAL-WEBCAM" && !localWebcamActive ? (
                <div className="text-center p-8 space-y-4 z-10 max-w-md">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-emerald-400 border border-slate-700 shadow-lg animate-pulse">
                    <Video className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-white font-black text-lg">Webcam AI Integration Not Started</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Enable your browser's webcam to feed live visual input directly into the Gemini-3.5 Vision engine for real-time safety, intrusion, and boundary violation analysis.
                    </p>
                  </div>
                  <button 
                    onClick={toggleLocalWebcam}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" />
                    Start Live Camera
                  </button>
                </div>
              ) : activeCamera?.streamState === "Inactive" ? (
                <div className="text-center p-6 space-y-3 z-0">
                  <EyeOff className="w-12 h-12 text-slate-700 mx-auto" />
                  <p className="text-slate-500 text-sm font-bold">This stream is currently paused / offline.</p>
                  <button 
                    onClick={() => toggleCameraStream(activeCamera!.id, "Inactive")}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all"
                  >
                    Turn ON Stream
                  </button>
                </div>
              ) : (
                // Mock Farm Video / Snapshot Display with AI Bounding Boxes overlay
                <div className="w-full h-full absolute inset-0 bg-black flex items-center justify-center">
                  
                  {/* Select photo based on camera name */}
                  <img 
                    src={
                      activeCamera?.name === "Main Entrance Gate" ? "https://images.unsplash.com/photo-1594913785162-e6785b49eed9?auto=format&fit=crop&w=1200&q=80" :
                      activeCamera?.name === "Cattle Barn East" ? "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=1200&q=80" :
                      activeCamera?.name === "Solar Power Grid" ? "https://images.unsplash.com/photo-1508873696983-2df519f0397e?auto=format&fit=crop&w=1200&q=80" :
                      activeCamera?.name === "Drip Pump House" ? "https://images.unsplash.com/photo-1484600801535-87d419f24527?auto=format&fit=crop&w=1200&q=80" :
                      "https://images.unsplash.com/photo-1560493676-04071c5f467b?auto=format&fit=crop&w=1200&q=80"
                    }
                    referrerPolicy="no-referrer"
                    alt={activeCamera?.name}
                    className="w-full h-full object-cover opacity-80"
                  />

                  {/* SVG overlay to render bounding boxes dynamically! */}
                  <svg className="w-full h-full absolute inset-0 z-0" viewBox="0 0 500 300" preserveAspectRatio="none">
                    {activeCamera?.name === "Main Entrance Gate" && (
                      <g>
                        {/* Vehicle Box */}
                        <rect x="180" y="80" width="160" height="130" fill="none" stroke="#E63946" strokeWidth="2.5" />
                        <rect x="180" y="58" width="130" height="22" fill="#E63946" />
                        <text x="185" y="73" fill="white" className="text-[10px] font-bold font-sans" style={{ fontSize: "10px", fontWeight: "bold" }}>
                          Tractor (96%)
                        </text>

                        {/* Person box */}
                        <rect x="360" y="110" width="40" height="110" fill="none" stroke="#3A86C8" strokeWidth="2" />
                        <rect x="360" y="93" width="90" height="17" fill="#3A86C8" />
                        <text x="363" y="105" fill="white" className="text-[8px] font-bold font-sans" style={{ fontSize: "8px", fontWeight: "bold" }}>
                          Farm Worker (82%)
                        </text>
                      </g>
                    )}

                    {activeCamera?.name === "Cattle Barn East" && (
                      <g>
                        <rect x="100" y="70" width="130" height="100" fill="none" stroke="#10B981" strokeWidth="2" />
                        <rect x="100" y="52" width="80" height="18" fill="#10B981" />
                        <text x="103" y="65" fill="white" className="text-[9px] font-bold font-sans" style={{ fontSize: "9px" }}>
                          Cow (98%)
                        </text>

                        <rect x="260" y="85" width="140" height="110" fill="none" stroke="#10B981" strokeWidth="2" />
                        <rect x="260" y="67" width="80" height="18" fill="#10B981" />
                        <text x="263" y="80" fill="white" className="text-[9px] font-bold font-sans" style={{ fontSize: "9px" }}>
                          Cow (95%)
                        </text>
                      </g>
                    )}

                    {activeCamera?.name === "Drip Pump House" && (
                      <g>
                        <rect x="80" y="100" width="220" height="120" fill="none" stroke="#F59E0B" strokeWidth="2.5" className="animate-pulse" />
                        <rect x="80" y="78" width="140" height="22" fill="#F59E0B" />
                        <text x="85" y="93" fill="white" className="text-[10px] font-bold font-sans" style={{ fontSize: "10px" }}>
                          Water Leakage (89%)
                        </text>
                      </g>
                    )}

                    {activeCamera?.name === "Solar Power Grid" && (
                      <g>
                        <rect x="160" y="110" width="130" height="90" fill="none" stroke="#E63946" strokeWidth="2.5" />
                        <rect x="160" y="88" width="110" height="22" fill="#E63946" />
                        <text x="165" y="103" fill="white" className="text-[10px] font-bold font-sans" style={{ fontSize: "10px" }}>
                          Smoke Flare (98%)
                        </text>
                      </g>
                    )}

                    {activeCamera?.name === "North Chilli Field" && (
                      <g>
                        <rect x="60" y="40" width="200" height="160" fill="none" stroke="#EF4444" strokeWidth="2" />
                        <rect x="60" y="22" width="130" height="18" fill="#EF4444" />
                        <text x="63" y="35" fill="white" className="text-[9px] font-bold font-sans" style={{ fontSize: "9px" }}>
                          Pest Infestation (91%)
                        </text>
                      </g>
                    )}
                  </svg>
                </div>
              )}
            </div>

            {/* Viewport footer panel with live controllers */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Stream URL:</span>
                <span className="text-xs text-slate-300 font-mono truncate max-w-[240px] sm:max-w-xs">{activeCamera?.url}</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {activeCamera?.id === "LOCAL-WEBCAM" ? (
                  <>
                    <button 
                      onClick={() => captureAndAnalyzeFrame(true)}
                      disabled={!localWebcamActive || webcamAnalyzing}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-gray-200 disabled:opacity-40 cursor-pointer"
                      title="Capture live webcam frame and run AI analysis"
                    >
                      <CameraIcon className="w-3.5 h-3.5" />
                      Take Snapshot
                    </button>

                    <button 
                      disabled
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-900 text-slate-500 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-not-allowed opacity-40"
                      title="Webcam video clips not supported"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Record Clip
                    </button>

                    <button 
                      onClick={toggleLocalWebcam}
                      className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${localWebcamActive ? "bg-red-950 border border-red-800/40 text-red-400 hover:bg-red-900" : "bg-emerald-950 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900"} cursor-pointer`}
                    >
                      {localWebcamActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {localWebcamActive ? "Stop Camera" : "Start Camera"}
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => triggerManualSnapshot(activeCamera!.id)}
                      disabled={actionLoading === "snap-" + activeCamera?.id || activeCamera?.streamState === "Inactive"}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-gray-200 disabled:opacity-40 cursor-pointer"
                    >
                      <CameraIcon className="w-3.5 h-3.5" />
                      Take Snapshot
                    </button>

                    <button 
                      onClick={() => triggerManualRecording(activeCamera!.id)}
                      disabled={actionLoading === "rec-" + activeCamera?.id || activeCamera?.streamState === "Inactive"}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-gray-200 disabled:opacity-40 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Record Clip
                    </button>

                    <button 
                      onClick={() => toggleCameraStream(activeCamera!.id, activeCamera!.streamState)}
                      disabled={actionLoading === "stream-" + activeCamera?.id}
                      className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeCamera?.streamState === "Active" ? "bg-red-950 border border-red-800/40 text-red-400 hover:bg-red-900" : "bg-emerald-950 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900"} cursor-pointer`}
                    >
                      {activeCamera?.streamState === "Active" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {activeCamera?.streamState === "Active" ? "Pause" : "Resume"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* REGISTERED CAMERA FEED DIRECTORY */}
          <div className="bg-white border border-[#E0E5D8] rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-base text-[#1A2E1A]">Connected Farm Cameras</h3>
                <p className="text-[10px] text-[#8A9A8A]">Select any feed to inspect live AI detection boxes and controls.</p>
              </div>
              <span className="text-[10px] font-black text-[#2D5A27] bg-[#EBF3E5] px-2 py-0.5 rounded-full">
                {cameras.filter(c => c.status === "Online").length} / {cameras.length} Active
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {[
                ...cameras,
                {
                  id: "LOCAL-WEBCAM",
                  name: "Operator Local Webcam",
                  type: "USB webcam" as "USB webcam",
                  url: "local://stream",
                  status: (localWebcamActive ? "Online" : "Offline") as "Online" | "Offline" | "Connecting",
                  location: "Operator Desk",
                  streamState: (localWebcamActive ? "Active" : "Inactive") as "Active" | "Inactive",
                  resolution: "640x480",
                  fps: 30,
                  lastActive: new Date().toISOString()
                }
              ].map((cam) => {
                const isActive = activeCamera?.id === cam.id;
                const isOnline = cam.status === "Online" && cam.streamState === "Active";

                return (
                  <button
                    key={cam.id}
                    onClick={() => setActiveCamera(cam)}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden group ${isActive ? "border-[#2D5A27] bg-[#F4F9F2] ring-1 ring-[#2D5A27]" : "border-[#E0E5D8] hover:border-[#2D5A27] bg-[#F8F9F5]"}`}
                  >
                    {/* Glowing status light */}
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: isOnline ? "#10B981" : "#EF4444" }}></div>

                    <div>
                      <CameraIcon className={`w-5 h-5 mb-1.5 ${isActive ? "text-[#2D5A27]" : "text-[#8A9A8A]"}`} />
                      <p className="text-xs font-black text-[#1A2E1A] line-clamp-1 group-hover:text-[#2D5A27] transition-colors">{cam.name}</p>
                    </div>

                    <div className="mt-2 text-[9px] text-[#8A9A8A] font-medium uppercase font-mono">
                      <p>{cam.location}</p>
                      <p className={isOnline ? "text-[#2D5A27] font-bold" : "text-red-500 font-bold"}>
                        {isOnline ? "ACTIVE" : "OFFLINE"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* COMPREHENSIVE AI ANALYTICS & CHARTS PANEL */}
          <div className="bg-white border border-[#E0E5D8] rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-base text-[#1A2E1A]">AI Surveillance Diagnostics &amp; Analytics</h3>
              <p className="text-[11px] text-[#8A9A8A]">Aggregated data pipelines reporting object trends, alert frequencies, and calculated savings.</p>
            </div>

            {/* Smart Statistics Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 bg-[#FBFDFB] border border-[#E8ECE0] rounded-2xl">
                <p className="text-[9px] font-bold text-[#8A9A8A] uppercase tracking-wide">Threat Alerts (Unack)</p>
                <p className="text-2xl font-black text-red-600 mt-1">{stats?.summary.unacknowledgedAlerts || 0}</p>
                <div className="text-[9px] text-gray-500 font-medium mt-1">Critical Priority: {stats?.summary.criticalCount || 0}</div>
              </div>

              <div className="p-3.5 bg-[#FBFDFB] border border-[#E8ECE0] rounded-2xl">
                <p className="text-[9px] font-bold text-[#8A9A8A] uppercase tracking-wide">Water Lost Saved</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{stats?.resourceWastageMetrics.estimatedWaterWastedLiters || 0} L</p>
                <div className="text-[9px] text-gray-500 font-medium mt-1">Leakage alerts prevented waste</div>
              </div>

              <div className="p-3.5 bg-[#FBFDFB] border border-[#E8ECE0] rounded-2xl">
                <p className="text-[9px] font-bold text-[#8A9A8A] uppercase tracking-wide">Power Waste Overrun</p>
                <p className="text-2xl font-black text-[#2D5A27] mt-1">{stats?.resourceWastageMetrics.energyLossKwh || 0} kWh</p>
                <div className="text-[9px] text-gray-500 font-medium mt-1">Pump auto-OFF alert trigger</div>
              </div>

              <div className="p-3.5 bg-[#FBFDFB] border border-[#E8ECE0] rounded-2xl">
                <p className="text-[9px] font-bold text-[#8A9A8A] uppercase tracking-wide">Est. Crops Yield Saved</p>
                <p className="text-2xl font-black text-blue-600 mt-1">+{stats?.resourceWastageMetrics.cropYieldSavedPercent || 0}%</p>
                <div className="text-[9px] text-gray-500 font-medium mt-1">Early pest &amp; wilt detections</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Chart 1: Weekly Alert Trends */}
              <div className="space-y-2 border border-[#F0F4E8] p-4 rounded-2xl bg-white shadow-sm">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black text-[#2D3628]">Weekly AI Event Frequency by Domain</p>
                  <span className="text-[8px] uppercase font-bold text-gray-400 font-mono">Last 7 Days</span>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.weeklyAlertsSummary || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="secColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2D5A27" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#2D5A27" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="irrColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#8A9A8A" fontSize={10} tickLine={false} />
                      <YAxis stroke="#8A9A8A" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "8px", border: "1px solid #E0E5D8" }} />
                      <Area type="monotone" dataKey="Security" stroke="#2D5A27" fillOpacity={1} fill="url(#secColor)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Irrigation" stroke="#F59E0B" fillOpacity={1} fill="url(#irrColor)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Object Detection Counts */}
              <div className="space-y-2 border border-[#F0F4E8] p-4 rounded-2xl bg-white shadow-sm">
                <p className="text-xs font-black text-[#2D3628]">Global AI Class Detection Counts (YTD)</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats ? Object.entries(stats.globalObjectCounts).map(([k, v]) => ({ name: k, count: v })) : []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#8A9A8A" fontSize={8} tickLine={false} angle={-15} textAnchor="end" height={40} />
                      <YAxis stroke="#8A9A8A" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "8px" }} />
                      <Bar dataKey="count" fill="#2D5A27" radius={[4, 4, 0, 0]}>
                        {(stats ? Object.entries(stats.globalObjectCounts) : []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#2D5A27" : "#F59E0B"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: RADAR MAP, AI ALERT LOGS & RECENT INCIDENTS (Col Span: 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* OPERATOR LIVE WEBCAM MONITOR PANEL */}
          <div className="bg-[#1A2E1A] text-white rounded-3xl p-5 shadow-lg border border-emerald-800/20 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${localWebcamActive ? "bg-emerald-400" : "bg-slate-400"}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${localWebcamActive ? "bg-emerald-400" : "bg-slate-400"}`}></span>
                  </span>
                  Operator Desk Monitor
                </h3>
                <p className="text-[10px] text-emerald-300/75">Live browser feed with real-time face &amp; object scanning.</p>
              </div>
              <button
                onClick={toggleLocalWebcam}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${localWebcamActive ? "bg-rose-600/20 hover:bg-rose-600/30 text-rose-300" : "bg-white/10 hover:bg-white/20 text-white"}`}
                title={localWebcamActive ? "Stop Live Camera" : "Start Live Camera"}
              >
                <Video className="w-4 h-4" />
              </button>
            </div>

            {localWebcamActive ? (
              <div className="space-y-3">
                <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-black border border-emerald-500/20">
                  <video
                    ref={sidebarVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />

                  {/* SVG overlay to render bounding boxes dynamically! */}
                  <svg className="w-full h-full absolute inset-0 z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {webcamDetections.length > 0 ? (
                      webcamDetections.map((det, index) => {
                        const [xmin, ymin, xmax, ymax] = det.bbox;
                        return (
                          <g key={index}>
                            <rect
                              x={100 - xmax}
                              y={ymin}
                              width={xmax - xmin}
                              height={ymax - ymin}
                              fill="none"
                              stroke={det.category === "Security" ? "#EF4444" : "#10B981"}
                              strokeWidth="1.5"
                              className="animate-pulse"
                            />
                            <rect
                              x={100 - xmax}
                              y={Math.max(0, ymin - 10)}
                              width={Math.min(xmax, 45)}
                              height="10"
                              fill={det.category === "Security" ? "#EF4444" : "#10B981"}
                            />
                            <text
                              x={100 - xmax + 1}
                              y={Math.max(0, ymin - 2)}
                              fill="white"
                              className="text-[6px] font-mono font-bold uppercase"
                              style={{ fontSize: "6px", fill: "white" }}
                            >
                              {det.label} ({Math.round(det.confidence * 100)}%)
                            </text>
                          </g>
                        );
                      })
                    ) : (
                      <g transform="translate(30, 25)">
                        <rect width="40" height="50" fill="none" stroke="#10B981" strokeWidth="0.8" strokeDasharray="2, 1" className="animate-pulse" />
                        <text x="1" y="-2" fill="#10B981" className="text-[4px] font-mono font-bold uppercase" style={{ fontSize: "4px" }}>
                          OPERATOR AREA [WAITING SCAN]
                        </text>
                        <line x1="0" y1="0" x2="5" y2="0" stroke="#10B981" strokeWidth="1" />
                        <line x1="0" y1="0" x2="0" y2="5" stroke="#10B981" strokeWidth="1" />
                        <line x1="40" y1="0" x2="35" y2="0" stroke="#10B981" strokeWidth="1" />
                        <line x1="40" y1="0" x2="40" y2="5" stroke="#10B981" strokeWidth="1" />
                        <line x1="0" y1="50" x2="5" y2="50" stroke="#10B981" strokeWidth="1" />
                        <line x1="0" y1="50" x2="0" y2="45" stroke="#10B981" strokeWidth="1" />
                        <line x1="40" y1="50" x2="35" y2="50" stroke="#10B981" strokeWidth="1" />
                        <line x1="40" y1="50" x2="40" y2="45" stroke="#10B981" strokeWidth="1" />
                      </g>
                    )}
                  </svg>

                  {webcamAnalyzing && (
                    <div className="absolute inset-x-0 h-1 bg-emerald-400 opacity-70 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-[bounce_2s_infinite] pointer-events-none z-20"></div>
                  )}
                </div>

                <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/30 text-[10px] space-y-1 text-emerald-100">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={`w-1.5 h-1.5 rounded-full ${webcamAnalyzing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}></span>
                    Status: <span className="text-white">{webcamAnalyzing ? "Analyzing..." : "Monitoring"}</span>
                  </div>
                  <p className="text-slate-300 font-sans leading-relaxed text-[10px]">{webcamStatusText}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => captureAndAnalyzeFrame()}
                    disabled={webcamAnalyzing}
                    className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer disabled:opacity-50 text-center"
                  >
                    Scan Now
                  </button>
                  
                  <button
                    onClick={() => setAutoAnalyzeWebcam(!autoAnalyzeWebcam)}
                    className={`flex-1 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center ${autoAnalyzeWebcam ? "bg-amber-600 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
                  >
                    {autoAnalyzeWebcam ? "Auto ON" : "Auto OFF"}
                  </button>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-[9px] text-slate-300 hover:text-white pl-1">
                    <input 
                      type="checkbox" 
                      checked={logWebcamToChronology}
                      onChange={(e) => setLogWebcamToChronology(e.target.checked)}
                      className="rounded border-emerald-700/50 bg-emerald-950 text-emerald-600 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                    />
                    Log
                  </label>
                </div>

                {autoAnalyzeWebcam && (
                  <div className="flex items-center justify-between text-[9px] text-slate-300 bg-emerald-950/35 px-2.5 py-1.5 rounded-xl border border-emerald-800/20">
                    <span className="font-medium text-emerald-400">Scan Frequency:</span>
                    <div className="flex gap-1.5">
                      {[33, 3000, 8000, 15000].map((ms) => (
                        <button
                          key={ms}
                          onClick={() => setWebcamScanInterval(ms)}
                          className={`px-2 py-0.5 rounded text-[8px] font-black cursor-pointer transition-all ${webcamScanInterval === ms ? "bg-emerald-500 text-[#0f2d11]" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
                        >
                          {ms === 33 ? "YOLO (30 FPS)" : ms === 3000 ? "Fast (3s)" : ms === 8000 ? "Normal (8s)" : "Eco (15s)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-emerald-800/30 rounded-2xl p-6 text-center space-y-3 bg-[#112211]">
                <Video className="w-8 h-8 text-emerald-600/80 mx-auto animate-pulse" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200">Operator Monitor Standby</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                    Activate live operator webcam stream to enable dedicated face recognition and perimeter access logging.
                  </p>
                </div>
                <button
                  onClick={toggleLocalWebcam}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm cursor-pointer inline-flex items-center gap-1"
                >
                  <Video className="w-3 h-3" />
                  Start Live Camera
                </button>
              </div>
            )}
          </div>
          
          {/* RADAR PERIMETER MAP */}
          <div className="bg-white border border-[#E0E5D8] rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-[#1A2E1A] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#2D5A27]" />
                Perimeter Radar map
              </h3>
              <p className="text-[10px] text-[#8A9A8A]">Interactive farm coordinates showing camera field of view alignments.</p>
            </div>

            <div className="relative h-60 w-full rounded-2xl overflow-hidden bg-slate-150 border border-[#E0E5D8] z-0">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>
          </div>

          {/* SELECTED ALERT SNAPSHOT / ACTION CARD */}
          {selectedAlert && (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden animate-fade-in">
              <div className="flex justify-between items-start">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase text-white bg-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {selectedAlert.priority} priority
                </span>
                <span className="text-[9px] font-mono font-bold text-gray-500">
                  {new Date(selectedAlert.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase text-red-700 tracking-wider font-mono">{selectedAlert.category} Incident</p>
                <h4 className="font-extrabold text-base text-red-950 mt-1">{selectedAlert.title}</h4>
                <p className="text-xs text-red-900 mt-2 font-medium">{selectedAlert.message}</p>
              </div>

              {selectedAlert.snapshotUrl && (
                <div className="relative h-32 w-full rounded-xl overflow-hidden bg-slate-100 border border-red-200">
                  <img src={selectedAlert.snapshotUrl} referrerPolicy="no-referrer" alt="Snapshot" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2">
                    <p className="text-[8px] font-mono text-white/90">AI Snapshot Event ID: {selectedAlert.id}</p>
                  </div>
                </div>
              )}

              <div className="bg-white/80 p-3 rounded-xl border border-red-200/50 space-y-2 text-xs">
                <div className="flex gap-1">
                  <Info className="w-3.5 h-3.5 text-red-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-red-950">AI Explanation:</span>
                    <p className="text-red-900 text-[11px] mt-0.5">{selectedAlert.explanation}</p>
                  </div>
                </div>

                <div className="flex gap-1 border-t border-red-200/30 pt-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-red-950">Recommended Action:</span>
                    <p className="text-red-900 text-[11px] mt-0.5 font-bold">{selectedAlert.recommendedAction}</p>
                  </div>
                </div>
              </div>

              {/* Action trigger button */}
              {!selectedAlert.isAcknowledged ? (
                <button
                  onClick={() => acknowledgeAlert(selectedAlert.id)}
                  disabled={actionLoading === "ack-" + selectedAlert.id}
                  className="w-full bg-[#2D5A27] hover:bg-[#20401C] text-white text-xs font-black py-2.5 rounded-xl transition-all shadow flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading === "ack-" + selectedAlert.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Acknowledge &amp; Dispatch Field Unit
                </button>
              ) : (
                <div className="py-2 px-3 bg-emerald-100 border border-emerald-300 rounded-xl text-center text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                  Incident Resolved &amp; Logged
                </div>
              )}
            </div>
          )}

          {/* REAL-TIME ACTIVE ALERTS & CHRONOLOGY TIMELINE */}
          <div className="bg-white border border-[#E0E5D8] rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-[#1A2E1A]">AI Incident Chronology</h3>
                <p className="text-[10px] text-[#8A9A8A]">Chronological record of automated farm detections.</p>
              </div>
              <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                {alerts.filter(a => !a.isAcknowledged).length} Unack
              </span>
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">No active alerts recorded.</div>
              ) : (
                alerts.map((alert) => {
                  const isHighlighted = selectedAlert?.id === alert.id;
                  
                  // Color mapped styles based on priority
                  const priorityColors = {
                    Critical: { bg: "bg-red-50 border-red-100 text-red-700 hover:bg-red-100" },
                    High: { bg: "bg-orange-50 border-orange-100 text-orange-700 hover:bg-orange-100" },
                    Medium: { bg: "bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100" },
                    Low: { bg: "bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100" }
                  };

                  const colors = priorityColors[alert.priority] || priorityColors.Low;

                  return (
                    <button
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className={`w-full p-3 text-left border rounded-2xl transition-all cursor-pointer flex gap-3 relative ${isHighlighted ? "border-[#2D5A27] bg-[#F4F9F2] shadow-sm" : "border-gray-150 hover:bg-gray-50 bg-[#FBFDFB]"}`}
                    >
                      {/* Priority indicator stripe */}
                      <div className={`w-1.5 rounded-full shrink-0 ${alert.priority === "Critical" ? "bg-red-500" : alert.priority === "High" ? "bg-orange-500" : alert.priority === "Medium" ? "bg-amber-400" : "bg-blue-400"}`}></div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-extrabold uppercase font-mono tracking-wider" style={{ color: alert.priority === "Critical" ? "#DC2626" : alert.priority === "High" ? "#EA580C" : alert.priority === "Medium" ? "#D97706" : "#2563EB" }}>
                            {alert.category} • {alert.priority}
                          </span>
                          <span className="text-[8px] text-gray-400 font-mono">
                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-gray-900 mt-1 truncate">{alert.title}</h4>
                        <p className="text-[10px] text-gray-500 mt-1 font-medium line-clamp-1">{alert.message}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[8.5px] bg-white border px-1.5 py-0.5 rounded text-gray-600 font-semibold">
                            {alert.cameraLocation}
                          </span>
                          <span className="text-[8.5px] text-[#2D5A27] font-bold">
                            Confidence: {Math.round(alert.confidenceScore * 100)}%
                          </span>
                          {alert.isAcknowledged && (
                            <span className="text-[8px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-black uppercase ml-auto">
                              ACKED
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ACTIVE EQUIPMENT & PERIMETER GATE STATUS */}
          <div className="bg-white border border-[#E0E5D8] rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-[#1A2E1A] flex items-center gap-1.5">
                <Wrench className="w-5 h-5 text-[#2D5A27]" />
                Equipment State Monitors
              </h3>
              <p className="text-[10px] text-[#8A9A8A]">Vibration metrics and power diagnostics parsed via AI.</p>
            </div>

            <div className="space-y-3">
              {stats ? events.slice(0, 1).map(() => (
                <div key="eq-wrap" className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-[#F8F9F5] rounded-xl border border-[#E0E5D8] text-xs">
                    <div>
                      <p className="font-extrabold text-slate-900">Borewell Pump motor</p>
                      <p className="text-[9px] text-slate-400 font-mono">Status: Continuous Run (EQ-101)</p>
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                      7.5 kW • ON
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-[#F8F9F5] rounded-xl border border-[#E0E5D8] text-xs">
                    <div>
                      <p className="font-extrabold text-slate-900">Drip Injector Sockets</p>
                      <p className="text-[9px] text-slate-400 font-mono">Pressure: 4.2 Bar</p>
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                      1.2 kW • ON
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-[#F8F9F5] rounded-xl border border-[#E0E5D8] text-xs">
                    <div>
                      <p className="font-extrabold text-slate-900">Solar Grid Inverters</p>
                      <p className="text-[9px] text-slate-400 font-mono">Soiling Cover index: 8%</p>
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                      Yielding OK
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-gray-400 text-xs text-center py-4">No metrics available.</div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* REGISTER NEW SMART CAMERA MODAL/DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E0E5D8]">
            <div className="flex justify-between items-center border-b border-[#F0F4E8] pb-3 mb-4">
              <h3 className="font-black text-base text-[#1A2E1A] flex items-center gap-1.5">
                <CameraIcon className="w-5 h-5 text-[#2D5A27]" />
                Register AI-Powered Camera
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-1 hover:bg-[#F8F9F5] rounded-full text-[#8A9A8A]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-[#8A9A8A]">Camera Identifier Name:</label>
                <input 
                  type="text" 
                  value={camName}
                  onChange={(e) => setCamName(e.target.value)}
                  placeholder="e.g. West Barn Gate 2"
                  className="w-full p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] font-semibold text-gray-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-[#8A9A8A]">Camera Type / Protocol:</label>
                  <select 
                    value={camType}
                    onChange={(e) => setCamType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] font-black text-gray-800"
                  >
                    <option value="IP Camera">IP Camera (RTSP/ONVIF)</option>
                    <option value="Mobile phone camera">Mobile Phone Camera</option>
                    <option value="USB webcam">USB Webcam</option>
                    <option value="CCTV camera">Analog CCTV Camera</option>
                    <option value="Wi-Fi smart camera">Wi-Fi Smart Camera</option>
                    <option value="Drone camera">Drone Camera</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-[#8A9A8A]">Farm Sector / Location:</label>
                  <select 
                    value={camLocation}
                    onChange={(e) => setCamLocation(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] font-black text-gray-800"
                  >
                    <option value="North Field">North Chilli Field</option>
                    <option value="Main Gate">Main Entrance Gate</option>
                    <option value="Pump House">Drip Pump House</option>
                    <option value="Cattle Barn">Cattle Barn East</option>
                    <option value="Solar Grid">Solar Power Grid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-[#8A9A8A]">Stream Resolution:</label>
                  <select 
                    value={camResolution}
                    onChange={(e) => setCamResolution(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] font-black text-gray-800"
                  >
                    <option value="2560x1440">1440p Quad-HD</option>
                    <option value="1920x1080">1080p Full-HD</option>
                    <option value="1280x720">720p HD Ready</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-[#8A9A8A]">Capture Framerate (FPS):</label>
                  <input 
                    type="number" 
                    value={camFps}
                    onChange={(e) => setCamFps(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] font-semibold text-gray-800"
                    min="5"
                    max="60"
                  />
                </div>
              </div>

              <div className="bg-[#EBF3E5] border border-[#D5E2CC] text-[#2D5A27] p-3.5 rounded-xl space-y-1">
                <p className="font-extrabold">Auto-Provisioning Enabled:</p>
                <p className="text-[10px] text-[#5A6D5A] leading-relaxed">
                  The AI system will auto-negotiate RTSP handshakes, align neural model pipelines for the sector, and register custom perimeter intrusion lines.
                </p>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#2D5A27] text-white text-xs font-black py-3 rounded-xl hover:bg-[#20401C] transition-all shadow-md"
              >
                Register Camera &amp; Sync AI Feed
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
