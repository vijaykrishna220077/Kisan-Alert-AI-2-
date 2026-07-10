import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Smartphone, 
  Sliders, 
  Users, 
  Send, 
  Clock, 
  Database, 
  RefreshCw, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  Activity,
  Check,
  Languages,
  BookOpen,
  Volume2,
  Trash2,
  Info,
  Layers,
  Sparkles,
  PhoneCall,
  Search,
  MessageSquare
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";

interface FarmerProfile {
  id: string;
  name: string;
  phone: string;
  state: string;
  district: string;
  village: string;
  primaryCrop?: string;
  soilType: string;
  soilPh: number;
  nValue: number;
  pValue: number;
  kValue: number;
  farmSizeAcres: number;
}

interface SmartAlertHubProps {
  farmers: FarmerProfile[];
  activeFarmerId: string;
  onFarmerChange: (farmerId: string) => void;
}

export function SmartAlertHub({ farmers, activeFarmerId, onFarmerChange }: SmartAlertHubProps) {
  // Navigation inside Alert Hub
  const [activeAlertTab, setActiveAlertTab] = useState<"admin" | "ai-sandbox" | "broadcaster" | "preferences" | "queue">("admin");

  // Core backend stats state
  const [stats, setStats] = useState<any>({
    analytics: {
      totalSent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      successRate: 100,
      channelBreakdown: { SMS: 0, WhatsApp: 0, Push: 0, Voice: 0 },
      categoryBreakdown: {}
    },
    recentLogs: [],
    queue: []
  });

  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // AI sandbox generator states
  const [selectedFarmerId, setSelectedFarmerId] = useState(activeFarmerId);
  const [sandboxCategory, setSandboxCategory] = useState<"Weather" | "Irrigation" | "Fertilizer" | "Disease" | "Pest" | "Market" | "Government Scheme" | "Emergency">("Weather");
  const [sandboxChannelOverride, setSandboxChannelOverride] = useState("");
  const [sandboxLanguageOverride, setSandboxLanguageOverride] = useState("");
  const [customRainfallMm, setCustomRainfallMm] = useState(45);
  const [customDisease, setCustomDisease] = useState("Leaf Spot Fungal Outbreak");
  const [customPest, setCustomPest] = useState("Stem Borer Infestation");
  const [customPrice, setCustomPrice] = useState(19500);
  const [runningAI, setRunningAI] = useState(false);
  
  // Simulated output result displayed in visual smartphone mockup
  const [aiResult, setAiResult] = useState<any>({
    title: "⚠️ Weather Alert",
    message: "Heavy rain expected tomorrow. Delay fertilizer application. Recommended irrigation: Do not irrigate today.",
    channel: "WhatsApp",
    language: "English",
    confidence: 94,
    reasoning: "Doppler meteorological radar arrays register unseasonable cloud clusters crossing."
  });

  // Bulk Broadcaster States
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any>(null);
  
  // Broadcaster Forms
  const [bulkWeatherCond, setBulkWeatherCond] = useState("Cyclone Warning");
  const [bulkWeatherRain, setBulkWeatherRain] = useState(85);
  const [bulkWeatherDistrict, setBulkWeatherDistrict] = useState("Guntur");
  
  const [bulkDiseaseCrop, setBulkDiseaseCrop] = useState("Chilli");
  const [bulkDiseaseName, setBulkDiseaseName] = useState("Bacterial Wilt");
  const [bulkDiseaseSeverity, setBulkDiseaseSeverity] = useState("High");
  const [bulkDiseaseChemical, setBulkDiseaseChemical] = useState("Streptocycline @ 0.2g/L");
  const [bulkDiseaseOrganic, setBulkDiseaseOrganic] = useState("Turmeric-Garlic extract (10%)");

  const [bulkPestName, setBulkPestName] = useState("Fall Armyworm");
  const [bulkPestDistrict, setBulkPestDistrict] = useState("Guntur");

  const [bulkMarketCrop, setBulkMarketCrop] = useState("Chilli");
  const [bulkMarketOldPrice, setBulkMarketOldPrice] = useState(17200);
  const [bulkMarketNewPrice, setBulkMarketNewPrice] = useState(19500);

  // Farmer Preferences States
  const [prefFarmerId, setPrefFarmerId] = useState(activeFarmerId);
  const [prefLanguage, setPrefLanguage] = useState<any>("English");
  const [prefChannel, setPrefChannel] = useState<any>("SMS");
  const [prefFrequency, setPrefFrequency] = useState<any>("Immediate");
  const [prefQuietStart, setPrefQuietStart] = useState("22:00");
  const [prefQuietEnd, setPrefQuietEnd] = useState("06:00");
  const [prefCategories, setPrefCategories] = useState<string[]>([]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefMessage, setPrefMessage] = useState("");

  // Queue and scheduler states
  const [processingQueue, setProcessingQueue] = useState(false);
  const [queueMessage, setQueueMessage] = useState("");

  // Fetch stats from backend API
  const fetchStatus = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/notifications/status");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching notification status:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Sync preferences whenever the selected preferences farmer changes
  const fetchPreferences = async (farmerId: string) => {
    try {
      const res = await fetch(`/api/preferences?farmerId=${farmerId}`);
      if (res.ok) {
        const data = await res.json();
        setPrefLanguage(data.preferredLanguage);
        setPrefChannel(data.preferredChannel);
        setPrefFrequency(data.notificationFrequency);
        setPrefQuietStart(data.quietHoursStart);
        setPrefQuietEnd(data.quietHoursEnd);
        setPrefCategories(data.categories || []);
        setPrefMessage("");
      }
    } catch (err) {
      console.error("Error fetching preferences:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchPreferences(prefFarmerId);
  }, []);

  useEffect(() => {
    fetchPreferences(prefFarmerId);
  }, [prefFarmerId]);

  // Synchronize sandbox when active farmer changes
  useEffect(() => {
    setSelectedFarmerId(activeFarmerId);
  }, [activeFarmerId]);

  // Run AI Personalization engine simulator
  const runAIEngine = async () => {
    setRunningAI(true);
    try {
      // Build custom contextual parameters
      let alertDetails: any = {};
      if (sandboxCategory === "Weather") {
        alertDetails = { conditionType: "Heavy Rain", predictedRainfallMm: customRainfallMm };
      } else if (sandboxCategory === "Disease") {
        alertDetails = { diseaseName: customDisease, severity: "High" };
      } else if (sandboxCategory === "Pest") {
        alertDetails = { pestName: customPest };
      } else if (sandboxCategory === "Market") {
        alertDetails = { cropName: "Chilli", newPrice: customPrice, oldPrice: 18500 };
      }

      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: selectedFarmerId,
          category: sandboxCategory,
          alertDetails,
          channelOverride: sandboxChannelOverride || undefined,
          languageOverride: sandboxLanguageOverride || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult({
          title: data.title,
          message: data.originalText,
          channel: data.log.channel,
          language: data.log.language,
          confidence: data.confidence,
          reasoning: data.reasoning
        });
        // Refresh logs
        fetchStatus();
      }
    } catch (err) {
      console.error("Failed to run AI personalization sandbox:", err);
    } finally {
      setRunningAI(false);
    }
  };

  // Dispatch broadcast alerts
  const handleBroadcast = async (alertType: "Weather" | "Disease" | "Pest" | "Market") => {
    setBroadcasting(true);
    setBroadcastResult(null);

    let endpoint = "";
    let payload = {};

    if (alertType === "Weather") {
      endpoint = "/api/alerts/weather";
      payload = {
        conditionType: bulkWeatherCond,
        predictedRainfallMm: Number(bulkWeatherRain),
        district: bulkWeatherDistrict,
        state: "Andhra Pradesh"
      };
    } else if (alertType === "Disease") {
      endpoint = "/api/alerts/disease";
      payload = {
        cropName: bulkDiseaseCrop,
        diseaseName: bulkDiseaseName,
        severity: bulkDiseaseSeverity,
        chemicalRemedy: bulkDiseaseChemical,
        organicRemedy: bulkDiseaseOrganic
      };
    } else if (alertType === "Pest") {
      endpoint = "/api/alerts/pest";
      payload = {
        pestName: bulkPestName,
        district: bulkPestDistrict,
        state: "Andhra Pradesh"
      };
    } else if (alertType === "Market") {
      endpoint = "/api/alerts/market";
      payload = {
        cropName: bulkMarketCrop,
        oldPrice: Number(bulkMarketOldPrice),
        newPrice: Number(bulkMarketNewPrice),
        mandiName: "Guntur Yard"
      };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcastResult({
          success: true,
          count: data.farmersNotified,
          message: data.message
        });
        fetchStatus();
      }
    } catch (err) {
      console.error("Broadcast failed:", err);
    } finally {
      setBroadcasting(false);
    }
  };

  // Sync preferences
  const savePreferences = async () => {
    setSavingPrefs(true);
    setPrefMessage("");
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: prefFarmerId,
          preferredLanguage: prefLanguage,
          preferredChannel: prefChannel,
          notificationFrequency: prefFrequency,
          quietHoursStart: prefQuietStart,
          quietHoursEnd: prefQuietEnd,
          categories: prefCategories
        })
      });
      if (res.ok) {
        setPrefMessage("Preferences synchronized successfully with telecommunication profiles!");
        setTimeout(() => setPrefMessage(""), 4000);
      }
    } catch (err) {
      console.error("Preferences sync failed:", err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const togglePrefCategory = (cat: string) => {
    if (prefCategories.includes(cat)) {
      setPrefCategories(prefCategories.filter(c => c !== cat));
    } else {
      setPrefCategories([...prefCategories, cat]);
    }
  };

  // Scheduler Queue stepper
  const runSchedulerStep = async () => {
    setProcessingQueue(true);
    setQueueMessage("");
    try {
      const res = await fetch("/api/notifications/queue/process-step", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setQueueMessage(data.message);
        fetchStatus();
      }
    } catch (err) {
      console.error("Queue process failed:", err);
    } finally {
      setProcessingQueue(false);
    }
  };

  // Reset database tables
  const resetTables = async () => {
    if (window.confirm("Are you sure you want to reset all log tables, queued items, and stats back to initial seeds?")) {
      try {
        const res = await fetch("/api/notifications/reset", { method: "POST" });
        if (res.ok) {
          fetchStatus();
          alert("Database tables reset successfully.");
        }
      } catch (err) {
        console.error("Reset failed:", err);
      }
    }
  };

  const activeFarmerObj = farmers.find(f => f.id === selectedFarmerId) || farmers[0];

  // Prepare chart data from categories
  const categoryChartData = Object.entries(stats.analytics.categoryBreakdown).map(([name, value]) => ({
    name,
    value
  }));

  const channelChartData = Object.entries(stats.analytics.channelBreakdown).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ["#2D5A27", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#10B981", "#6B7280"];

  return (
    <div id="smart-alert-hub-root" className="w-full bg-white rounded-3xl border border-[#E0E5D8] overflow-hidden shadow-sm flex flex-col">
      
      {/* Title Bar Header */}
      <div className="bg-[#1A2E1A] p-6 text-white border-b border-[#2D4D2D] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5A27] to-[#1E3F1A] flex items-center justify-center border border-[#3A6B34]">
            <Bell className="w-5 h-5 text-emerald-300 animate-bounce" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Kisan Alert AI - Smart Notifications Engine</h2>
            <p className="text-xs text-gray-300">Production-ready SMS & WhatsApp personalized alert dispatch and routing analytics panel</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono text-emerald-400">Gateway: Active (IMD/AGMARKNET Sync)</span>
          
          <button 
            onClick={fetchStatus} 
            title="Refresh logs & statistics" 
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors ml-2"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Localized alert tabs navigation */}
      <div className="border-b border-[#E0E5D8] bg-[#F8F9F5] px-6 py-2.5 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveAlertTab("admin")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeAlertTab === "admin" ? "bg-[#2D5A27] text-white" : "text-[#5C6B5C] hover:bg-[#EBF0E4]"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Admin Dashboard
        </button>
        <button
          onClick={() => setActiveAlertTab("ai-sandbox")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeAlertTab === "ai-sandbox" ? "bg-[#2D5A27] text-white" : "text-[#5C6B5C] hover:bg-[#EBF0E4]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          AI Personalization Sandbox
        </button>
        <button
          onClick={() => setActiveAlertTab("broadcaster")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeAlertTab === "broadcaster" ? "bg-[#2D5A27] text-white" : "text-[#5C6B5C] hover:bg-[#EBF0E4]"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          Broadcast Outbreak Trigger
        </button>
        <button
          onClick={() => setActiveAlertTab("preferences")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeAlertTab === "preferences" ? "bg-[#2D5A27] text-white" : "text-[#5C6B5C] hover:bg-[#EBF0E4]"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Farmer Alert Preferences
        </button>
        <button
          onClick={() => setActiveAlertTab("queue")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
            activeAlertTab === "queue" ? "bg-[#2D5A27] text-white" : "text-[#5C6B5C] hover:bg-[#EBF0E4]"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Scheduler Queue
          {stats.queue.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {stats.queue.length}
            </span>
          )}
        </button>

        <div className="ml-auto">
          <button 
            onClick={resetTables}
            className="flex items-center gap-1 text-[10px] text-red-600 font-bold hover:bg-red-50 px-2 py-1 rounded"
          >
            <Trash2 className="w-3 h-3" />
            Reset Data Seeds
          </button>
        </div>
      </div>

      {/* Main tab content workspace */}
      <div className="p-6 flex-1 min-h-[500px]">

        {/* ==================== SUB-TAB 1: ADMIN ANALYTICS DASHBOARD ==================== */}
        {activeAlertTab === "admin" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            
            {/* Analytical key indicator cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-4 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[#8A9A8A] tracking-wider">Total Alerts Dispatched</span>
                <span className="text-2xl font-bold mt-1">{stats.analytics.totalSent}</span>
                <span className="text-[10px] text-[#2D5A27] font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Fully Audited
                </span>
              </div>
              <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-4 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[#8A9A8A] tracking-wider">Delivery Success Rate</span>
                <span className="text-2xl font-bold text-green-600 mt-1">{stats.analytics.successRate}%</span>
                <span className="text-[10px] text-gray-500 mt-1">Industry standard: 92%</span>
              </div>
              <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-4 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[#8A9A8A] tracking-wider">Pending Outbound Queue</span>
                <span className="text-2xl font-bold text-amber-600 mt-1">{stats.analytics.pending}</span>
                <span className="text-[10px] text-gray-500 mt-1">Pending scheduler sweeps</span>
              </div>
              <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-4 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-[#8A9A8A] tracking-wider">Failed Drops (Cellular)</span>
                <span className="text-2xl font-bold text-red-500 mt-1">{stats.analytics.failed}</span>
                <span className="text-[10px] text-red-700 font-medium mt-1">Retrying automatically</span>
              </div>
              <div className="bg-[#EBF5EA] border border-[#C5DDC3] rounded-2xl p-4 flex flex-col lg:col-span-1 col-span-2">
                <span className="text-[10px] uppercase font-bold text-[#2D5A27] tracking-wider">Active Channels</span>
                <div className="flex gap-1.5 mt-2">
                  <span className="text-[9px] bg-white text-[#2D5A27] font-bold px-1.5 py-0.5 rounded border border-[#C5DDC3]">SMS</span>
                  <span className="text-[9px] bg-white text-[#2D5A27] font-bold px-1.5 py-0.5 rounded border border-[#C5DDC3]">WhatsApp</span>
                  <span className="text-[9px] bg-white text-[#2D5A27] font-bold px-1.5 py-0.5 rounded border border-[#C5DDC3]">Push</span>
                  <span className="text-[9px] bg-white text-[#2D5A27] font-bold px-1.5 py-0.5 rounded border border-[#C5DDC3]">Voice</span>
                </div>
                <span className="text-[9px] text-gray-500 mt-2">Intelligent fallbacks active</span>
              </div>
            </div>

            {/* Recharts Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="bg-white border border-[#E0E5D8] rounded-2xl p-4 lg:col-span-8">
                <h3 className="text-xs font-bold text-[#1A2E1A] uppercase tracking-wider mb-4">Volume Distribution by Notification Category</h3>
                <div className="h-56">
                  {categoryChartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">No logs captured yet. Trigger alerts below.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData} barSize={28}>
                        <XAxis dataKey="name" stroke="#8A9A8A" fontSize={10} tickLine={false} />
                        <YAxis stroke="#8A9A8A" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #E0E5D8' }} />
                        <Bar dataKey="value" fill="#2D5A27" radius={[6, 6, 0, 0]}>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white border border-[#E0E5D8] rounded-2xl p-4 lg:col-span-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#1A2E1A] uppercase tracking-wider mb-4">Preferred Channels split</h3>
                  <div className="h-44 flex items-center justify-center relative">
                    {channelChartData.length === 0 ? (
                      <div className="text-xs text-gray-400">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={channelChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {channelChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={["#2D5A27", "#2563EB", "#F59E0B", "#8B5CF6"][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    <div className="absolute flex flex-col items-center">
                      <span className="text-xl font-bold">{stats.analytics.totalSent}</span>
                      <span className="text-[8px] text-gray-400 uppercase font-semibold">Total Delivered</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-semibold mt-2">
                  <div className="p-1.5 border border-[#F0F4E8] rounded-lg">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#2D5A27] mr-1"></span>
                    WhatsApp: {stats.analytics.channelBreakdown.WhatsApp || 0}
                  </div>
                  <div className="p-1.5 border border-[#F0F4E8] rounded-lg">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#2563EB] mr-1"></span>
                    SMS: {stats.analytics.channelBreakdown.SMS || 0}
                  </div>
                  <div className="p-1.5 border border-[#F0F4E8] rounded-lg">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#F59E0B] mr-1"></span>
                    Push: {stats.analytics.channelBreakdown.Push || 0}
                  </div>
                  <div className="p-1.5 border border-[#F0F4E8] rounded-lg">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#8B5CF6] mr-1"></span>
                    Voice: {stats.analytics.channelBreakdown.Voice || 0}
                  </div>
                </div>
              </div>

            </div>

            {/* Live Scrolling Audit logs table */}
            <div className="bg-white border border-[#E0E5D8] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[#F0F4E8] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#2D5A27]" />
                  <h3 className="text-xs font-bold text-[#1A2E1A] uppercase tracking-wider">Live Gateway Dispatch Log History</h3>
                </div>
                <span className="text-[10px] bg-[#F0F4E8] border border-[#E0E5D8] text-[#2D5A27] px-2 py-0.5 rounded-full font-bold">
                  Showing top {stats.recentLogs.length} transmissions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F9F5] text-[#5C6B5C] border-b border-[#F0F4E8] font-bold">
                      <th className="p-3">Log ID</th>
                      <th className="p-3">Farmer</th>
                      <th className="p-3">Encrypted Phone</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Lang</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Sent Time</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F4E8]">
                    {stats.recentLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-[#FDFDFD] transition-colors">
                        <td className="p-3 font-mono font-bold text-gray-500">{log.id}</td>
                        <td className="p-3 font-semibold">{log.farmerName}</td>
                        <td className="p-3 text-gray-400 font-mono text-[11px]">{log.phoneEncrypted}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.channel === "WhatsApp" ? "bg-green-50 border-green-200 text-green-700" :
                            log.channel === "SMS" ? "bg-blue-50 border-blue-200 text-blue-700" :
                            log.channel === "Push" ? "bg-amber-50 border-amber-200 text-amber-700" :
                            "bg-purple-50 border-purple-200 text-purple-700"
                          }`}>
                            {log.channel}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-600">{log.language}</td>
                        <td className="p-3">
                          <span className="font-semibold text-gray-700">{log.category}</span>
                        </td>
                        <td className="p-3 truncate max-w-[150px] font-medium" title={log.title}>{log.title}</td>
                        <td className="p-3 text-gray-500">{new Date(log.sentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === "Delivered" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="bg-gray-100 hover:bg-[#2D5A27] hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                          >
                            Inspect Payload
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {stats.recentLogs.length === 0 && (
                <div className="p-8 text-center text-xs text-gray-400 font-semibold">
                  No gateway dispatch reports registered yet. Initialize alerts in the panels above.
                </div>
              )}
            </div>

            {/* Inspect payload modal display */}
            {selectedLog && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl border border-[#E0E5D8] max-w-lg w-full overflow-hidden shadow-2xl animate-scale-up">
                  <div className="bg-[#1A2E1A] p-4 text-white flex justify-between items-center">
                    <span className="font-mono text-xs text-emerald-400 font-bold">Metadata Packet Audit: {selectedLog.id}</span>
                    <button onClick={() => setSelectedLog(null)} className="text-gray-300 hover:text-white font-bold text-sm">✕</button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400 block">Target Farmer:</span>
                        <strong className="text-gray-800">{selectedLog.farmerName} ({selectedLog.farmerId})</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Language & Channel:</span>
                        <strong className="text-gray-800">{selectedLog.language} - {selectedLog.channel}</strong>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-xs">Full Dispatched Text:</span>
                      <div className="p-3 bg-[#F8F9F5] border border-[#E0E5D8] rounded-xl text-xs font-mono text-[#2D3628] mt-1 whitespace-pre-wrap leading-relaxed">
                        <strong>{selectedLog.title}</strong>\n\n{selectedLog.message}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#F0F4E8] p-3 rounded-xl border border-[#E0E5D8]">
                      <div>
                        <span className="text-[#2D5A27] block font-bold uppercase text-[9px] tracking-wider">AI Confidence Score</span>
                        <strong className="text-[#2D5A27] text-lg font-bold">{selectedLog.confidenceScore}%</strong>
                      </div>
                      <div>
                        <span className="text-[#2D5A27] block font-bold uppercase text-[9px] tracking-wider">Priority Classification</span>
                        <strong className="text-red-600 font-bold">{selectedLog.priority}</strong>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-xs">AI Engine Resolution Reason:</span>
                      <p className="text-xs text-gray-700 italic mt-1 bg-yellow-50 p-2.5 rounded-lg border border-yellow-100">{selectedLog.reason}</p>
                    </div>
                  </div>
                  <div className="bg-[#F8F9F5] p-3 border-t border-[#E0E5D8] text-right">
                    <button 
                      onClick={() => setSelectedLog(null)} 
                      className="bg-[#2D5A27] text-white text-xs font-semibold px-4 py-2 rounded-xl"
                    >
                      Close Audit Report
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================== SUB-TAB 2: AI PERSONALIZATION SANDBOX ==================== */}
        {activeAlertTab === "ai-sandbox" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            
            {/* Simulation controls */}
            <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-5 lg:col-span-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E0E5D8]">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="font-bold text-[#1A2E1A] text-sm uppercase tracking-wider">AI Notification Advisor Simulator</h3>
              </div>

              {/* Select Farmer profile */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#5C6B5C]">1. Select Target Farmer Profile:</label>
                <select 
                  value={selectedFarmerId}
                  onChange={(e) => setSelectedFarmerId(e.target.value)}
                  className="w-full bg-white border border-[#E0E5D8] rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#2D5A27]"
                >
                  {farmers.map(f => (
                    <option key={f.id} value={f.id}>{f.name} - ({f.primaryCrop} in {f.village}, {f.district})</option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500 block">
                  Soil type: <strong>{activeFarmerObj.soilType} (pH: {activeFarmerObj.soilPh})</strong>, Size: <strong>{activeFarmerObj.farmSizeAcres} acres</strong>, NPK: <strong>{activeFarmerObj.nValue}-{activeFarmerObj.pValue}-{activeFarmerObj.kValue}</strong>
                </span>
              </div>

              {/* Select category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#5C6B5C]">2. Select Warning Alert Category:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Weather", "Irrigation", "Fertilizer", "Disease", "Pest", "Market", "Government Scheme", "Emergency"] as any[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSandboxCategory(cat)}
                      className={`text-xs px-2.5 py-2 rounded-xl border text-left font-semibold transition-all ${
                        sandboxCategory === cat 
                          ? "bg-[#2D5A27] text-white border-[#2D5A27]" 
                          : "bg-white border-[#E0E5D8] hover:bg-[#F0F4E8] text-[#2D3628]"
                      }`}
                    >
                      {cat === "Weather" && "⛅ "}{cat === "Irrigation" && "💧 "}{cat === "Fertilizer" && "🌱 "}{cat === "Disease" && "🔬 "}{cat === "Pest" && "🐛 "}{cat === "Market" && "📈 "}{cat === "Government Scheme" && "🏛️ "}{cat === "Emergency" && "🚨 "}
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context inputs based on selected tab */}
              {sandboxCategory === "Weather" && (
                <div className="bg-white p-3 rounded-xl border border-[#E0E5D8] space-y-2 animate-scale-up">
                  <label className="text-[10px] font-bold uppercase text-[#5C6B5C]">Adjust Expected Rainfall Tomorrow (mm):</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="range" 
                      min="0" 
                      max="120" 
                      value={customRainfallMm} 
                      onChange={(e) => setCustomRainfallMm(Number(e.target.value))}
                      className="flex-1 accent-[#2D5A27]" 
                    />
                    <strong className="text-xs font-mono">{customRainfallMm} mm</strong>
                  </div>
                  <p className="text-[10px] text-gray-500">Rainfall &gt; 50mm triggers heavy rain fertilizer application deferral advisory.</p>
                </div>
              )}

              {sandboxCategory === "Disease" && (
                <div className="bg-white p-3 rounded-xl border border-[#E0E5D8] space-y-2 animate-scale-up">
                  <label className="text-[10px] font-bold uppercase text-[#5C6B5C]">Mock Detected Crop Leaf Disease Name:</label>
                  <input 
                    type="text" 
                    value={customDisease} 
                    onChange={(e) => setCustomDisease(e.target.value)}
                    className="w-full bg-gray-50 border border-[#E0E5D8] rounded-lg px-2 py-1.5 text-xs font-semibold outline-none" 
                  />
                </div>
              )}

              {sandboxCategory === "Pest" && (
                <div className="bg-white p-3 rounded-xl border border-[#E0E5D8] space-y-2 animate-scale-up">
                  <label className="text-[10px] font-bold uppercase text-[#5C6B5C]">Nearby Village Pest Incursion Name:</label>
                  <input 
                    type="text" 
                    value={customPest} 
                    onChange={(e) => setCustomPest(e.target.value)}
                    className="w-full bg-gray-50 border border-[#E0E5D8] rounded-lg px-2 py-1.5 text-xs font-semibold outline-none" 
                  />
                </div>
              )}

              {sandboxCategory === "Market" && (
                <div className="bg-white p-3 rounded-xl border border-[#E0E5D8] space-y-2 animate-scale-up">
                  <label className="text-[10px] font-bold uppercase text-[#5C6B5C]">Adjust Market Trading Rate (₹/quintal):</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="number" 
                      value={customPrice} 
                      onChange={(e) => setCustomPrice(Number(e.target.value))}
                      className="w-24 bg-gray-50 border border-[#E0E5D8] rounded-lg px-2 py-1 text-xs font-bold" 
                    />
                    <span className="text-[10px] text-gray-500">Saves transport recommendations & harvest window advice.</span>
                  </div>
                </div>
              )}

              {/* Overrides */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#5C6B5C]">Channel Override:</label>
                  <select
                    value={sandboxChannelOverride}
                    onChange={(e) => setSandboxChannelOverride(e.target.value)}
                    className="w-full bg-white border border-[#E0E5D8] rounded-lg px-2 py-1 text-xs font-semibold"
                  >
                    <option value="">Preferred Channel</option>
                    <option value="SMS">SMS</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Push">Push Notification</option>
                    <option value="Voice">Voice Call (IVR)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#5C6B5C]">Language Override:</label>
                  <select
                    value={sandboxLanguageOverride}
                    onChange={(e) => setSandboxLanguageOverride(e.target.value)}
                    className="w-full bg-white border border-[#E0E5D8] rounded-lg px-2 py-1 text-xs font-semibold"
                  >
                    <option value="">Preferred Language</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    <option value="Malayalam">Malayalam (മലയാളം)</option>
                  </select>
                </div>
              </div>

              {/* Trigger button */}
              <button
                onClick={runAIEngine}
                disabled={runningAI}
                className="w-full bg-[#1A2E1A] hover:bg-[#20401C] active:translate-y-0.5 text-white py-3 rounded-xl text-xs font-bold shadow-md shadow-[#1A2E1A]/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {runningAI ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                    Analyzing soils, NDVI & weather telemetry...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    Run AI Personalization Engine
                  </>
                )}
              </button>
            </div>

            {/* Visual Phone Mockup Render on the right */}
            <div className="lg:col-span-6 flex flex-col items-center">
              
              {/* Smartphone layout container */}
              <div className="w-[280px] h-[520px] bg-slate-900 rounded-[40px] p-2.5 border-4 border-slate-700 shadow-2xl relative flex flex-col overflow-hidden">
                
                {/* Speaker mesh & selfie notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 w-28 h-5 rounded-b-xl z-20 flex justify-center items-center gap-1.5">
                  <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-slate-800 rounded-full"></div>
                </div>

                {/* Smartphone display screen */}
                <div className="flex-1 bg-[#121212] rounded-[32px] overflow-hidden flex flex-col text-white relative">
                  
                  {/* Status Bar */}
                  <div className="h-6 px-4 flex justify-between items-center text-[9px] font-bold text-gray-400 font-mono z-10 pt-1">
                    <span>9:41 AM</span>
                    <div className="flex gap-1.5">
                      <span>5G</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Channel specific design header */}
                  {aiResult.channel === "WhatsApp" ? (
                    /* WhatsApp interface */
                    <div className="bg-[#075E54] px-3 py-2 flex items-center gap-2 border-b border-emerald-950">
                      <div className="w-6 h-6 bg-emerald-800 rounded-full flex items-center justify-center text-[10px] font-bold text-white">KA</div>
                      <div>
                        <p className="text-[10px] font-bold leading-none">Kisan Alert AI</p>
                        <span className="text-[7px] text-emerald-200">Online advisor</span>
                      </div>
                      <PhoneCall className="w-3 h-3 text-white ml-auto" />
                    </div>
                  ) : aiResult.channel === "SMS" ? (
                    /* SMS header */
                    <div className="bg-[#1C1C1E] px-3 py-2 flex items-center gap-2 border-b border-gray-800">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white font-mono">56</div>
                      <div>
                        <p className="text-[10px] font-bold leading-none">56767</p>
                        <span className="text-[7px] text-gray-400">Toll-Free Agricultural Gateway</span>
                      </div>
                    </div>
                  ) : aiResult.channel === "Voice" ? (
                    /* Voice screen mockup */
                    <div className="flex-1 bg-gradient-to-b from-[#1C1C2E] to-[#0A0A12] flex flex-col justify-center items-center text-center p-4">
                      <div className="w-16 h-16 bg-[#2D5A27]/20 border border-[#2D5A27] rounded-full flex items-center justify-center animate-pulse mb-4">
                        <Volume2 className="w-8 h-8 text-emerald-400" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 animate-pulse">Incoming Call...</p>
                      <strong className="text-sm mt-1">Kisan Alert AI Advisor</strong>
                      <span className="text-[9px] text-gray-500 mt-0.5">Toll-free IVR broadcast</span>
                      
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] leading-relaxed text-gray-300 italic mt-6 max-h-40 overflow-y-auto">
                        "{aiResult.message}"
                      </div>

                      <div className="flex gap-8 mt-8">
                        <div className="flex flex-col items-center">
                          <button className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center font-bold text-lg hover:bg-red-500 cursor-pointer">✕</button>
                          <span className="text-[8px] text-gray-500 mt-1 font-semibold">Decline</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <button className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center font-bold text-lg hover:bg-emerald-500 cursor-pointer animate-bounce">📞</button>
                          <span className="text-[8px] text-gray-500 mt-1 font-semibold">Answer</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Push Notification display */
                    <div className="bg-[#1C1C1E] px-3 py-2 flex items-center gap-2 border-b border-gray-800">
                      <div className="w-5 h-5 bg-[#2D5A27] rounded flex items-center justify-center text-[10px] font-bold text-white">K</div>
                      <div>
                        <p className="text-[10px] font-bold leading-none">Notification Center</p>
                        <span className="text-[7px] text-gray-400">System Priority: High</span>
                      </div>
                    </div>
                  )}

                  {/* Message bubbles (SMS/WhatsApp/Push) */}
                  {aiResult.channel !== "Voice" && (
                    <div className="flex-1 p-3 overflow-y-auto bg-[#0F0F14] space-y-3.5">
                      {aiResult.channel === "WhatsApp" ? (
                        /* WhatsApp Bubble */
                        <div className="bg-[#202C33] p-3 rounded-2xl max-w-[85%] self-start text-[10px] text-gray-100 border border-emerald-950 relative shadow-md leading-relaxed">
                          <strong className="text-emerald-400 block text-[11px] mb-1 font-bold">{aiResult.title}</strong>
                          <span className="whitespace-pre-wrap">{aiResult.message}</span>
                          <span className="block text-right text-[7px] text-gray-400 font-mono mt-1.5">9:41 AM ✓✓</span>
                        </div>
                      ) : aiResult.channel === "SMS" ? (
                        /* SMS Bubble */
                        <div className="bg-[#3A3A3C] p-3 rounded-2xl max-w-[85%] self-start text-[10px] text-gray-100 relative shadow-md leading-relaxed">
                          <span className="whitespace-pre-wrap"><strong>{aiResult.title}</strong>\n\n{aiResult.message}</span>
                        </div>
                      ) : (
                        /* Push Banner */
                        <div className="bg-white/10 p-3 rounded-xl border border-white/15 text-[10px] leading-relaxed relative shadow-md animate-scale-up">
                          <div className="flex justify-between items-center mb-1">
                            <strong className="text-emerald-400 text-[11px] font-bold">{aiResult.title}</strong>
                            <span className="text-[7px] text-gray-500">now</span>
                          </div>
                          <span className="text-gray-100">{aiResult.message}</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* AI scoring explanation on the mockup base */}
              <div className="w-[300px] mt-4 p-3.5 bg-yellow-50 border border-yellow-200 rounded-2xl text-[11px] text-amber-900 leading-relaxed space-y-1 shadow-sm">
                <div className="flex justify-between items-center border-b border-yellow-200 pb-1.5 mb-1.5">
                  <span className="font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    AI Engine Optimization
                  </span>
                  <span className="bg-amber-600 text-white font-mono font-bold px-1.5 py-0.5 rounded text-[9px]">
                    Confidence: {aiResult.confidence}%
                  </span>
                </div>
                <p><strong>Reasoning:</strong> {aiResult.reasoning}</p>
                <p className="text-[10px] text-amber-700 italic border-t border-yellow-200/50 pt-1.5 mt-1.5">
                  Language auto-translation: <strong>{aiResult.language}</strong>. Channel routing selected: <strong>{aiResult.channel}</strong>.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* ==================== SUB-TAB 3: BROADCAST OUTBREAK TRIGGER ==================== */}
        {activeAlertTab === "broadcaster" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            
            <div className="bg-[#EBF5EA] border border-[#C5DDC3] rounded-2xl p-4 flex gap-3 items-center">
              <ShieldAlert className="w-6 h-6 text-[#2D5A27] shrink-0" />
              <div>
                <strong className="text-[#1A2E1A] text-sm block">Broadcast Emergency Outbreaks & Telemetry Hazards</strong>
                <span className="text-xs text-[#2D5A27] block">Simulate regional events like heavy storms, disease spores detected on local trap crops, pest swarms, or mandi price shocks.</span>
              </div>
            </div>

            {/* Forms grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Weather Hazard Trigger */}
              <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-[#1A2E1A] uppercase tracking-wider border-b border-[#E0E5D8] pb-2 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Trigger Regional Weather Hazard
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Condition:</label>
                    <select
                      value={bulkWeatherCond}
                      onChange={(e) => setBulkWeatherCond(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="Heavy Rain">Heavy Rain (Monson Peak)</option>
                      <option value="Cyclone Warning">Cyclone Landfall Warning</option>
                      <option value="Heat Wave">Heat Wave Hazard</option>
                      <option value="Flood Warning">Flood Sluice Warning</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Target District:</label>
                    <select
                      value={bulkWeatherDistrict}
                      onChange={(e) => setBulkWeatherDistrict(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="Guntur">Guntur Sector</option>
                      <option value="Salem">Salem Sector</option>
                      <option value="Belagavi">Belagavi Sector</option>
                      <option value="Bathinda">Bathinda Sector</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Predicted Rainfall (mm):</label>
                  <input
                    type="number"
                    value={bulkWeatherRain}
                    onChange={(e) => setBulkWeatherRain(Number(e.target.value))}
                    className="w-full bg-white border border-[#E0E5D8] rounded-xl px-3 py-1.5 text-xs font-semibold"
                  />
                </div>

                <button
                  onClick={() => handleBroadcast("Weather")}
                  disabled={broadcasting}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl shadow transition-colors"
                >
                  {broadcasting ? "Broadcasting warning packets..." : "Broadcast Weather Hazard Warning"}
                </button>
              </div>

              {/* Disease Outbreak Trigger */}
              <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-[#1A2E1A] uppercase tracking-wider border-b border-[#E0E5D8] pb-2 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  Declare Spore / Disease Spot Outbreak
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Target Crop Type:</label>
                    <select
                      value={bulkDiseaseCrop}
                      onChange={(e) => setBulkDiseaseCrop(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="Chilli">Chilli Crops</option>
                      <option value="Sugarcane">Sugarcane Crops</option>
                      <option value="Tapioca">Tapioca Crops</option>
                      <option value="Paddy (Rice)">Paddy / Rice Crops</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Severity Grade:</label>
                    <select
                      value={bulkDiseaseSeverity}
                      onChange={(e) => setBulkDiseaseSeverity(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="Medium">Medium Alert</option>
                      <option value="High">High Warning</option>
                      <option value="Critical">Critical Emergency</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Disease Botanical / Common Name:</label>
                  <input
                    type="text"
                    value={bulkDiseaseName}
                    onChange={(e) => setBulkDiseaseName(e.target.value)}
                    className="w-full bg-white border border-[#E0E5D8] rounded-xl px-3 py-1.5 text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Chemical Solution:</label>
                    <input
                      type="text"
                      value={bulkDiseaseChemical}
                      onChange={(e) => setBulkDiseaseChemical(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Organic Alternative:</label>
                    <input
                      type="text"
                      value={bulkDiseaseOrganic}
                      onChange={(e) => setBulkDiseaseOrganic(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1 text-xs font-semibold"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleBroadcast("Disease")}
                  disabled={broadcasting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl shadow transition-colors"
                >
                  {broadcasting ? "Broadcasting treatment guides..." : "Broadcast Disease Spot Warning"}
                </button>
              </div>

              {/* Pest outbreak trigger */}
              <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-[#1A2E1A] uppercase tracking-wider border-b border-[#E0E5D8] pb-2 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-red-500" />
                  Report Pest Swarm Risk
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Insect/Pest Species:</label>
                    <select
                      value={bulkPestName}
                      onChange={(e) => setBulkPestName(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="Fall Armyworm">Fall Armyworm (FAW)</option>
                      <option value="Aphids Outbreak">Aphids / Jassids Swarms</option>
                      <option value="Stem Borer">Stem Borer Spore Spread</option>
                      <option value="Whiteflies Vector">Whiteflies Vector Surge</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Outbreak Sector:</label>
                    <select
                      value={bulkPestDistrict}
                      onChange={(e) => setBulkPestDistrict(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="Guntur">Guntur District</option>
                      <option value="Salem">Salem District</option>
                      <option value="Belagavi">Belagavi District</option>
                      <option value="Bathinda">Bathinda District</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => handleBroadcast("Pest")}
                  disabled={broadcasting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2.5 rounded-xl shadow transition-colors"
                >
                  {broadcasting ? "Broadcasting warning packets..." : "Broadcast Insect Incursion Warning"}
                </button>
              </div>

              {/* Market price surges */}
              <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-[#1A2E1A] uppercase tracking-wider border-b border-[#E0E5D8] pb-2 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  Mandi Price Surge Advisory
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Crop:</label>
                    <select
                      value={bulkMarketCrop}
                      onChange={(e) => setBulkMarketCrop(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="Chilli">Chilli</option>
                      <option value="Sugarcane">Sugarcane</option>
                      <option value="Tapioca">Tapioca</option>
                      <option value="Paddy (Rice)">Paddy (Rice)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Old Price (₹):</label>
                    <input
                      type="number"
                      value={bulkMarketOldPrice}
                      onChange={(e) => setBulkMarketOldPrice(Number(e.target.value))}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">New Peak Mandi Price (₹/quintal):</label>
                  <input
                    type="number"
                    value={bulkMarketNewPrice}
                    onChange={(e) => setBulkMarketNewPrice(Number(e.target.value))}
                    className="w-full bg-white border border-[#E0E5D8] rounded-xl px-3 py-1.5 text-xs font-semibold"
                  />
                </div>

                <button
                  onClick={() => handleBroadcast("Market")}
                  disabled={broadcasting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl shadow transition-colors"
                >
                  {broadcasting ? "Broadcasting price tickers..." : "Broadcast Price Rally Advisory"}
                </button>
              </div>

            </div>

            {/* Broadcast report outputs */}
            {broadcastResult && (
              <div className="bg-[#EBF5EA] border border-[#C5DDC3] rounded-2xl p-4 space-y-2 animate-scale-up">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <strong className="text-emerald-900 text-xs">Broadcast Cycle Broadcast Completed!</strong>
                </div>
                <p className="text-xs text-emerald-800 font-medium">{broadcastResult.message}</p>
                <div className="text-[10px] text-gray-500 font-mono">
                  Sectors Synced: GSM Mobile towers, WhatsApp Cloud Service, and Kisan Alert Mobile App. Notified profiles: <strong>{broadcastResult.count} farmers</strong>.
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================== SUB-TAB 4: FARMER ALERT PREFERENCES ==================== */}
        {activeAlertTab === "preferences" && (
          <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-5 space-y-6 animate-fade-in">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E0E5D8]">
              <Sliders className="w-4 h-4 text-[#2D5A27]" />
              <h3 className="font-bold text-[#1A2E1A] text-sm uppercase tracking-wider">Farmer Notification Profiles & Settings Manager</h3>
            </div>

            {/* Select Profile to Edit */}
            <div className="max-w-md space-y-1.5">
              <label className="text-xs font-bold text-[#5C6B5C]">Select Farmer Profile to manage settings:</label>
              <select
                value={prefFarmerId}
                onChange={(e) => setPrefFarmerId(e.target.value)}
                className="w-full bg-white border border-[#E0E5D8] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
              >
                {farmers.map(f => (
                  <option key={f.id} value={f.id}>{f.name} - ({f.district}, {f.state})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Channel / Language Configurations */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-[#1A2E1A] tracking-wider">Language and Delivery Options</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Preferred Translation Language:</label>
                    <select
                      value={prefLanguage}
                      onChange={(e) => setPrefLanguage(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi (हिंदी)</option>
                      <option value="Telugu">Telugu (తెలుగు)</option>
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                      <option value="Malayalam">Malayalam (മലയാളം)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Primary Warning Channel:</label>
                    <select
                      value={prefChannel}
                      onChange={(e) => setPrefChannel(e.target.value)}
                      className="w-full bg-white border border-[#E0E5D8] rounded-xl px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="SMS">SMS Message</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Push">Push Notification</option>
                      <option value="Voice">Voice Call (IVR)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Advisory Frequency:</label>
                  <select
                    value={prefFrequency}
                    onChange={(e) => setPrefFrequency(e.target.value)}
                    className="w-full bg-white border border-[#E0E5D8] rounded-xl px-3 py-1.5 text-xs font-semibold"
                  >
                    <option value="Immediate">Immediate Outbreaks & Alerts Only</option>
                    <option value="Daily Summary">Daily Telemetry Summary</option>
                    <option value="Weekly Advisory">Weekly Scheduled Advisory</option>
                    <option value="Seasonal Guidance">Seasonal Sowing Advisories</option>
                  </select>
                </div>

                {/* Quiet Hours */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#5C6B5C] uppercase">Quiet Hours (DND - Do Not Disturb):</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500">From:</span>
                      <input 
                        type="time" 
                        value={prefQuietStart} 
                        onChange={(e) => setPrefQuietStart(e.target.value)}
                        className="bg-white border border-[#E0E5D8] rounded-xl px-2 py-1 text-xs" 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500">To:</span>
                      <input 
                        type="time" 
                        value={prefQuietEnd} 
                        onChange={(e) => setPrefQuietEnd(e.target.value)}
                        className="bg-white border border-[#E0E5D8] rounded-xl px-2 py-1 text-xs" 
                      />
                    </div>
                  </div>
                  <span className="text-[9px] text-gray-500 block italic">Emergency priority broadcasts override quiet hours.</span>
                </div>
              </div>

              {/* Opt-in categories toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-[#1A2E1A] tracking-wider">Subscribed Alert Categories</h4>
                <div className="grid grid-cols-1 gap-2 bg-white p-4 rounded-2xl border border-[#E0E5D8]">
                  {(["Weather", "Irrigation", "Fertilizer", "Disease", "Pest", "Market", "Government Scheme", "Emergency"] as string[]).map(cat => {
                    const isSubscribed = prefCategories.includes(cat);
                    return (
                      <div 
                        key={cat} 
                        onClick={() => togglePrefCategory(cat)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F8F9F5] cursor-pointer transition-colors"
                      >
                        <span className="text-xs font-semibold text-[#2D3628] flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isSubscribed ? "#2D5A27" : "#E0E5D8" }}></span>
                          {cat}
                        </span>
                        <div className={`w-8 h-4 rounded-full p-0.5 transition-all ${isSubscribed ? "bg-[#2D5A27]" : "bg-gray-300"}`}>
                          <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${isSubscribed ? "translate-x-4" : ""}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Sync actions */}
            <div className="border-t border-[#E0E5D8] pt-4 flex justify-between items-center">
              <span className="text-xs text-green-600 font-medium">{prefMessage}</span>
              <button
                onClick={savePreferences}
                disabled={savingPrefs}
                className="bg-[#2D5A27] hover:bg-[#1E3F1A] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#2D5A27]/20 transition-all cursor-pointer flex items-center gap-2"
              >
                {savingPrefs ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Syncing telecommunications...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Synchronize Preference Profile
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* ==================== SUB-TAB 5: SCHEDULER QUEUE ==================== */}
        {activeAlertTab === "queue" && (
          <div className="bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-5 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E0E5D8]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#2D5A27]" />
                <h3 className="font-bold text-[#1A2E1A] text-sm uppercase tracking-wider">Outbound Queue & Cron Schedulers</h3>
              </div>

              <div className="flex gap-2">
                {/* Delay simulation trigger */}
                <button
                  onClick={async () => {
                    const sample = farmers[0];
                    await fetch("/api/notifications/schedule", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        farmerId: sample.id,
                        category: "Irrigation",
                        alertDetails: { conditionType: "Water stress prediction" },
                        delaySeconds: 15
                      })
                    });
                    fetchStatus();
                  }}
                  className="bg-white border border-[#E0E5D8] hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Schedule Delayed Test Alert (15s)
                </button>

                <button
                  onClick={runSchedulerStep}
                  disabled={processingQueue}
                  className="bg-[#2D5A27] hover:bg-[#1E3F1A] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-[#2D5A27]/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${processingQueue ? "animate-spin" : ""}`} />
                  Run 1 Scheduler Cycle
                </button>
              </div>
            </div>

            {/* List active items in queue */}
            <div className="bg-white border border-[#E0E5D8] rounded-xl overflow-hidden">
              <div className="p-3 bg-[#F0F4E8] border-b border-[#E0E5D8] text-[10px] font-bold text-[#2D5A27] uppercase tracking-wider">
                Outbound Message Pipeline ({stats.queue.length} items queued)
              </div>
              
              <div className="divide-y divide-[#F0F4E8]">
                {stats.queue.map((item: any) => (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-[#FAFAFA] transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-gray-500">{item.id}</span>
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                          Scheduled: {new Date(item.scheduledTime).toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                          Priority: {item.priority}
                        </span>
                      </div>
                      <strong className="text-xs block text-gray-800 mt-1">{item.title}</strong>
                      <p className="text-xs text-gray-600 truncate max-w-lg italic mt-0.5">"{item.message}"</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-400 block">Channel: <strong>{item.channel}</strong></span>
                      <span className="text-[10px] text-gray-400 block">Translations: <strong>{item.language}</strong></span>
                      <span className="text-[10px] text-[#2D5A27] font-bold mt-1 block">Retry count: {item.retryCount}/{item.maxRetries}</span>
                    </div>
                  </div>
                ))}

                {stats.queue.length === 0 && (
                  <div className="p-8 text-center text-xs text-gray-400 font-medium">
                    Queue is completely empty. Schedule delayed alerts to inspect retry attempts.
                  </div>
                )}
              </div>
            </div>

            {queueMessage && (
              <div className="bg-[#E8F1F5] border border-blue-200 text-blue-800 rounded-xl p-3 text-xs font-semibold animate-scale-up">
                {queueMessage}
              </div>
            )}

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
              <strong>Network Fault Simulation:</strong> The Kisan Alert gateway scheduler dynamically evaluates network connectivity. In case of cell signal fade or localized storms, failed dispatches are kept in queue, automatically re-attempting up to 3 times with exponential backoffs. Run a scheduler cycle to simulate cellular processing!
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
