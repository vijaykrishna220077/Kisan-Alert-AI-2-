import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { 
  Sprout, 
  CloudRain, 
  TrendingUp, 
  Award, 
  User, 
  Map, 
  PhoneCall, 
  AlertTriangle, 
  CheckCircle, 
  Upload, 
  Languages, 
  HelpCircle, 
  Send, 
  Database, 
  Layers, 
  Check, 
  Plus, 
  ChevronRight, 
  Info, 
  FileText, 
  Volume2, 
  Calendar,
  X,
  Droplet,
  Settings,
  Sparkles,
  ArrowRight,
  Sun,
  Cloud,
  LayoutDashboard,
  Shield,
  Activity,
  Wallet,
  Search
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Legend, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

import { 
  FarmerProfile, 
  CropRecommendation, 
  WeatherDay, 
  DiseaseDiagnosis, 
  Scheme, 
  MarketCommodity, 
  EscalationTicket, 
  RSKCenter, 
  OfflineSMSLog, 
  NotificationAlert 
} from './types';

import { 
  INDIAN_STATES_DISTRICTS, 
  SAMPLE_FARMERS, 
  MOCK_SCHEMES, 
  MOCK_MARKETS, 
  MOCK_RSKS, 
  STATIC_DISEASES, 
  MOCK_WEATHER, 
  MOCK_ALERTS 
} from './data/mockData';

const LeafletMapView = lazy(() => import('./components/gis/LeafletMapView').then(m => ({ default: m.LeafletMapView })));
const SmartAlertHub = lazy(() => import('./components/alerts/SmartAlertHub').then(m => ({ default: m.SmartAlertHub })));
const SatelliteTelemetryMap = lazy(() => import('./components/alerts/SatelliteTelemetryMap').then(m => ({ default: m.SatelliteTelemetryMap })));
const SurveillanceDashboard = lazy(() => import('./components/surveillance/SurveillanceDashboard').then(m => ({ default: m.SurveillanceDashboard })));
const RoleLogin = lazy(() => import('./components/RoleLogin').then(m => ({ default: m.RoleLogin })));
const FloatingAssistant = lazy(() => import('./components/FloatingAssistant').then(m => ({ default: m.FloatingAssistant })));
const FinanceDashboard = lazy(() => import('./components/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
import { motion } from 'motion/react';
import { aiGateway } from './services/aiGateway';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'crop-intel' | 'market-insights' | 'schemes' | 'disease-scanner' | 'expert-rsk' | 'farm-gis' | 'smart-alerts' | 'surveillance' | 'finance'>('dashboard');

  // Core Data States
  const [farmers, setFarmers] = useState<FarmerProfile[]>(SAMPLE_FARMERS);
  const [activeFarmerId, setActiveFarmerId] = useState<string>(SAMPLE_FARMERS[0].id);
  const [activeFarmer, setActiveFarmer] = useState<FarmerProfile>(SAMPLE_FARMERS[0]);
  
  // Custom Farmer Form Modal
  const [showNewFarmerModal, setShowNewFarmerModal] = useState(false);
  const [newFarmerName, setNewFarmerName] = useState('');
  const [newFarmerPhone, setNewFarmerPhone] = useState('');
  const [newFarmerState, setNewFarmerState] = useState('Andhra Pradesh');
  const [newFarmerDistrict, setNewFarmerDistrict] = useState('Guntur');
  const [newFarmerTaluka, setNewFarmerTaluka] = useState('');
  const [newFarmerSoilType, setNewFarmerSoilType] = useState<FarmerProfile['soilType']>('Black Cotton');
  const [newFarmerPh, setNewFarmerPh] = useState(6.5);
  const [newFarmerN, setNewFarmerN] = useState(45);
  const [newFarmerP, setNewFarmerP] = useState(20);
  const [newFarmerK, setNewFarmerK] = useState(130);
  const [newFarmerSize, setNewFarmerSize] = useState(3.5);
  const [newFarmerCrop, setNewFarmerCrop] = useState('Chilli');
  const [newFarmerGroundwater, setNewFarmerGroundwater] = useState(180);
  const [newFarmerWaterSource, setNewFarmerWaterSource] = useState<FarmerProfile['groundwaterSource']>('Borewell');
  const [newFarmerOrganic, setNewFarmerOrganic] = useState(false);

  // Weather state
  const [weatherData, setWeatherData] = useState<WeatherDay[]>(MOCK_WEATHER);
  const [alerts, setAlerts] = useState<NotificationAlert[]>(MOCK_ALERTS);

  // Markets and prices
  const [markets, setMarkets] = useState<MarketCommodity[]>(MOCK_MARKETS);
  const [selectedMarket, setSelectedMarket] = useState<MarketCommodity | null>(MOCK_MARKETS[2]); // Default Chilli
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [marketCategory, setMarketCategory] = useState<string>('All');
  const [marketSort, setMarketSort] = useState<string>('name');
  const [marketLastUpdated, setMarketLastUpdated] = useState<string>('');
  const [loadingMarkets, setLoadingMarkets] = useState<boolean>(false);
  const [marketError, setMarketError] = useState<string>('');
  
  // Crop Recommendation State (API backed)
  const [cropRecommendations, setCropRecommendations] = useState<CropRecommendation[]>([]);
  const [fertilizerAdvisory, setFertilizerAdvisory] = useState<string>('');
  const [loadingCropAdvisor, setLoadingCropAdvisor] = useState(false);
  const [cropAdvisorError, setCropAdvisorError] = useState('');

  // Disease Scanner State
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [selectedPresetDisease, setSelectedPresetDisease] = useState<string>('');
  const [scannerCropName, setScannerCropName] = useState('Paddy (Rice)');
  const [diagnosisResult, setDiagnosisResult] = useState<DiseaseDiagnosis | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosingError, setDiagnosingError] = useState('');

  // Scheme Eligibility State
  const [schemes, setSchemes] = useState<Scheme[]>(MOCK_SCHEMES);
  const [selectedScheme, setSelectedScheme] = useState<Scheme>(MOCK_SCHEMES[0]);
  const [schemeReport, setSchemeReport] = useState<any>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState('');

  // RSK Escalation Ticket State
  const [rskCenters, setRskCenters] = useState<RSKCenter[]>(MOCK_RSKS);
  const [activeRSK, setActiveRSK] = useState<RSKCenter>(MOCK_RSKS[0]);
  const [tickets, setTickets] = useState<EscalationTicket[]>([
    {
      id: "TCK-109",
      farmerId: "FMR-701",
      farmerName: "Ramesh Reddy",
      farmerPhone: "9876543210",
      subject: "Severe Leaf Yellowing on Young Chilli",
      category: "Disease Outbreak",
      description: "Young chilli crops planted 3 weeks ago are showing curled edges and yellow veins. Water levels are regular.",
      status: "Resolved",
      assignedRSKId: "RSK-GNT-10",
      assignedRSKName: "Rythu Seva Kendram - Guntur East",
      assignedExpert: "Dr. K. Srinivasa Rao",
      dateCreated: "2026-06-25",
      expertNotes: "Diagnosis indicates whitefly vector movement triggering Leaf Curl Begomovirus. Apply Sour Buttermilk spray (5%) immediately or spray Imidacloprid (0.5ml/L). Clean local bund weeds.",
      resolutionDate: "2026-06-26"
    }
  ]);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<'Disease Outbreak' | 'Soil Quality' | 'Irrigation Issue' | 'Scheme Eligibility' | 'Market Sales'>('Disease Outbreak');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Copilot Chat States
  const [chatLanguage, setChatLanguage] = useState('English');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant', text: string, timestamp: string, audioUrl?: string }>>([
    {
      sender: 'assistant',
      text: "Namaste! I am your Kisan Copilot. I can recommend crops, analyze soil deficits, forecast weather hazards, explain crop schemes, or diagnose pests. How can I help your farm today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [sendingChat, setSendingChat] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);

  // Satellite parameters
  const [satelliteLayer, setSatelliteLayer] = useState<'ndvi' | 'moisture' | 'true-color'>('ndvi');
  const [satelliteZoom, setSatelliteZoom] = useState(15);
  
  // Offline SMS Synchronization state
  const [smsLogs, setSmsLogs] = useState<OfflineSMSLog[]>([]);
  const [smsInput, setSmsInput] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);

  // Live Weather and Emergency states
  const [liveWeather, setLiveWeather] = useState<any>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const fetchLiveWeather = async (lat?: number, lng?: number) => {
    try {
      const latitude = lat || activeFarmer?.latitude || 16.3067;
      const longitude = lng || activeFarmer?.longitude || 80.4365;
      const res = await fetch(`/api/weather/live?lat=${latitude}&lng=${longitude}`);
      const data = await res.json();
      if (data.success && data.live) {
        setLiveWeather(data.live);
      } else {
        throw new Error("Invalid weather data response");
      }
    } catch (err) {
      console.warn("Live weather fetch failed. Using high-quality client-side simulated weather:", err);
      // Fail-safe mock weather so the UI never displays broken state
      setLiveWeather({
        temp_c: 32,
        humidity: 59,
        wind_speed: 15,
        soil_temp_c: 28,
        condition: "Partly Cloudy",
        hourly: [
          { time: "2 AM", temp_c: 28, rain_probability: 45, condition: "Partly Cloudy" },
          { time: "3 AM", temp_c: 29, rain_probability: 47, condition: "Partly Cloudy" },
          { time: "4 AM", temp_c: 27, rain_probability: 45, condition: "Rainy" },
          { time: "5 AM", temp_c: 27, rain_probability: 41, condition: "Rainy" },
          { time: "6 AM", temp_c: 28, rain_probability: 36, condition: "Partly Cloudy" },
          { time: "7 AM", temp_c: 30, rain_probability: 30, condition: "Partly Cloudy" },
          { time: "8 AM", temp_c: 32, rain_probability: 24, condition: "Partly Cloudy" },
          { time: "9 AM", temp_c: 33, rain_probability: 17, condition: "Partly Cloudy" },
          { time: "10 AM", temp_c: 34, rain_probability: 9, condition: "Partly Cloudy" },
          { time: "11 AM", temp_c: 35, rain_probability: 4, condition: "Partly Cloudy" },
          { time: "12 PM", temp_c: 36, rain_probability: 2, condition: "Partly Cloudy" },
          { time: "1 PM", temp_c: 36, rain_probability: 3, condition: "Partly Cloudy" },
          { time: "2 PM", temp_c: 37, rain_probability: 4, condition: "Partly Cloudy" }
        ]
      });
    }
  };

  const fetchLiveMarkets = async () => {
    setLoadingMarkets(true);
    setMarketError('');
    try {
      const res = await fetch('/api/market/live');
      
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !contentType.includes("application/json")) {
        throw new Error("Market price service is temporarily unavailable.");
      }

      const data = await res.json();
      if (data.success && data.commodities) {
        setMarkets(data.commodities);
        setMarketLastUpdated(data.lastUpdated || new Date().toLocaleTimeString());
        
        setSelectedMarket(prev => {
          if (prev) {
            const match = data.commodities.find((c: any) => c.id === prev.id || c.name === prev.name);
            return match || data.commodities[0];
          }
          const defaultChilli = data.commodities.find((c: any) => c.name.includes("Chilli"));
          return defaultChilli || data.commodities[0];
        });
      } else {
        throw new Error("Market price service returned success=false.");
      }
    } catch (err) {
      console.warn("Failed to fetch live market prices. Falling back gracefully to cached mock market data:", err);
      // Graceful fallback to client-side MOCK_MARKETS so the dashboard stays beautifully filled
      setMarkets(MOCK_MARKETS);
      setMarketLastUpdated("Offline / Cached");
      setSelectedMarket(prev => {
        if (prev) {
          const match = MOCK_MARKETS.find((c: any) => c.id === prev.id || c.name === prev.name);
          return match || MOCK_MARKETS[2];
        }
        return MOCK_MARKETS[2]; // Guntur Red Chilli Teja
      });
    } finally {
      setLoadingMarkets(false);
    }
  };

  // Load and poll live market prices
  useEffect(() => {
    fetchLiveMarkets();
    const interval = setInterval(() => {
      fetchLiveMarkets();
    }, 25000); // refresh every 25 seconds
    return () => clearInterval(interval);
  }, []);

  const triggerEmergency = async (type: string) => {
    const alertTitle = `CRITICAL SENSOR EVENT: ${type.toUpperCase()}`;
    const alertMessage = `Emergency alert triggered for ${activeFarmer.name}'s plot. Localized sensor nodes reporting abnormal telemetry profiles. First responders and regional RSK notified via SMS fallback.`;
    
    const newAlert: NotificationAlert = {
      id: `AL-EMERG-${Date.now()}`,
      title: alertTitle,
      message: alertMessage,
      severity: 'alert',
      category: 'Weather',
      dateCreated: new Date().toISOString(),
      isRead: false
    };

    setAlerts(prev => [newAlert, ...prev]);

    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId: activeFarmerId,
          type,
          title: alertTitle,
          message: alertMessage,
          severity: 'critical'
        })
      });
    } catch (err) {
      console.error("Failed to post critical emergency log to backend DB:", err);
    }
    
    setShowEmergencyModal(false);
  };

  // Synchronize dynamic values whenever the active farmer shifts
  useEffect(() => {
    const found = farmers.find(f => f.id === activeFarmerId);
    if (found) {
      setActiveFarmer(found);
      // Auto recommend crops for the new active farmer
      fetchCropRecommendations(found);
      // Fetch dynamic live Open-Meteo weather
      fetchLiveWeather(found.latitude, found.longitude);
      // Fetch live APMC mandi rates
      fetchLiveMarkets();
      // Find nearest RSK for this state/district
      const matchedRSK = rskCenters.find(rsk => rsk.district === found.district) || rskCenters[0];
      setActiveRSK(matchedRSK);
      // Clear previous evaluations to keep UI fresh
      setSchemeReport(null);
      setDiagnosisResult(null);
      setUploadedImageBase64(null);
      setSelectedPresetDisease('');
    }
  }, [activeFarmerId, farmers]);

  // Load recommendations on mount
  useEffect(() => {
    fetchCropRecommendations(SAMPLE_FARMERS[0]);
  }, []);

  // Fetch Crop and Fertilizer advice from our server.ts API
  const fetchCropRecommendations = async (profile: FarmerProfile) => {
    setLoadingCropAdvisor(true);
    setCropAdvisorError('');
    try {
      const data = await aiGateway.getCropAdvisor({
        soilType: profile.soilType,
        ph: profile.soilPh,
        n: profile.nValue,
        p: profile.pValue,
        k: profile.kValue,
        waterSource: profile.groundwaterSource,
        size: profile.farmSizeAcres,
        state: profile.state,
        district: profile.district
      });
      if (data && data.error) {
        throw new Error(data.error);
      }
      setCropRecommendations(data.recommendations || []);
      setFertilizerAdvisory(data.generalFertilizerAdvisory || '');
    } catch (err: any) {
      console.warn("Error fetching crop recommendations:", err);
      setCropAdvisorError("All free AI providers are currently busy. Please try again in a few moments.");
      setCropRecommendations([]);
      setFertilizerAdvisory('');
    } finally {
      setLoadingCropAdvisor(false);
    }
  };

  // Submit Chat message to the server
  const sendChatMessage = async (msgText: string) => {
    if (!msgText.trim()) return;
    
    const userMsg = {
      sender: 'user' as const,
      text: msgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setSendingChat(true);

    if (offlineMode) {
      // Simulate SMS creation in offline mode
      const rawPayload = `RECOMMEND_${activeFarmer.soilType.replace(' ', '')}_${activeFarmer.soilPh}_${activeFarmer.nValue}_${activeFarmer.pValue}_${activeFarmer.kValue}`;
      const smsLogEntry: OfflineSMSLog = {
        id: `SMS-${Math.floor(1000 + Math.random() * 9000)}`,
        queryType: 'RECOMMEND',
        payload: rawPayload,
        smsContent: `KISANALERT ${rawPayload}`,
        dateSent: new Date().toISOString(),
        status: 'Pending Sync'
      };
      setSmsLogs(prev => [smsLogEntry, ...prev]);
      
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          sender: 'assistant',
          text: `[Offline SMS Mode] Drafted outbound SMS. Please send this exact text to the Toll-Free Gateway: "56767". When connectivity resumes, this query will auto-synchronize.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setSendingChat(false);
      }, 1000);
      return;
    }

    try {
      const chatHistory = chatMessages.slice(-6).map(m => ({ sender: m.sender === 'user' ? 'user' : 'copilot' as any, text: m.text }));
      const data = await aiGateway.copilotChat({
        message: msgText,
        language: chatLanguage,
        farmerProfile: activeFarmer,
        chatHistory
      });
      setChatMessages(prev => [...prev, {
        sender: 'assistant',
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        sender: 'assistant',
        text: `My connection is currently running in local offline safety mode. I recommend checking your crop soil moisture levels which are at 62%. Ensure you cover the roots with compost manure to lock nutrients in.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setSendingChat(false);
    }
  };

  // Run Disease Diagnostic from preset image or uploaded image
  const runDiseaseDiagnostic = async (base64Img: string, cropName: string) => {
    setDiagnosing(true);
    setDiagnosingError('');
    setDiagnosisResult(null);

    try {
      const data = await aiGateway.diagnoseDisease({
        base64Image: base64Img,
        cropName: cropName
      });
      if (data && data.error) {
        throw new Error(data.error);
      }
      setDiagnosisResult(data);
    } catch (err: any) {
      console.error(err);
      setDiagnosingError('All free AI providers are currently busy. Please try again in a few moments.');
      setDiagnosisResult(null);
    } finally {
      setDiagnosing(false);
    }
  };

  // Check Scheme eligibility
  const checkSchemeEligibility = async (scheme: Scheme) => {
    setCheckingEligibility(true);
    setEligibilityError('');
    setSchemeReport(null);

    try {
      const data = await aiGateway.checkSchemeEligibility({
        farmerProfile: activeFarmer,
        schemeName: scheme.name
      });
      if (data && data.error) {
        throw new Error(data.error);
      }
      setSchemeReport(data);
    } catch (err: any) {
      console.error(err);
      setEligibilityError('All free AI providers are currently busy. Please try again in a few moments.');
      setSchemeReport(null);
    } finally {
      setCheckingEligibility(false);
    }
  };

  // File escalation ticket & simulate expert reply from the designated RSK Officer
  const submitEscalationTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketDescription.trim()) return;

    setSubmittingTicket(true);
    const newId = `TCK-${Math.floor(110 + Math.random() * 900)}`;
    const ticket: EscalationTicket = {
      id: newId,
      farmerId: activeFarmer.id,
      farmerName: activeFarmer.name,
      farmerPhone: activeFarmer.phone,
      subject: newTicketSubject,
      category: newTicketCategory,
      description: newTicketDescription,
      status: 'Assigned',
      assignedRSKId: activeRSK.id,
      assignedRSKName: activeRSK.name,
      assignedExpert: activeRSK.headOfficer.split(' (')[0],
      dateCreated: new Date().toISOString().split('T')[0]
    };

    setTickets(prev => [ticket, ...prev]);
    setNewTicketSubject('');
    setNewTicketDescription('');

    // Query server simulation for an instantaneous personalized agronomy answer
    try {
      const response = await fetch('/api/simulate-expert-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketSubject: ticket.subject,
          ticketCategory: ticket.category,
          ticketDescription: ticket.description,
          rskName: activeRSK.name,
          officerName: activeRSK.headOfficer
        })
      });
      const data = await response.json();
      
      // Auto reply in 3 seconds to represent professional processing
      setTimeout(() => {
        setTickets(currentTickets => 
          currentTickets.map(t => 
            t.id === newId 
              ? { 
                  ...t, 
                  status: 'Resolved', 
                  expertNotes: data.replyText,
                  resolutionDate: new Date().toISOString().split('T')[0]
                }
              : t
          )
        );
        
        // Push notification alert
        const newAlert: NotificationAlert = {
          id: `AL-${Math.floor(200 + Math.random() * 100)}`,
          title: "Expert Escalation Resolved",
          message: `Officer ${activeRSK.headOfficer.split(' (')[0]} left official advisories on ticket ${newId}.`,
          severity: 'info',
          category: 'Government Announcement',
          dateCreated: new Date().toISOString(),
          isRead: false
        };
        setAlerts(prev => [newAlert, ...prev]);
      }, 3000);

    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Preset disease selector images to quickly trigger API
  const PRESET_DISEASES = [
    {
      id: 'blast',
      name: 'Rice Blast Spot',
      crop: 'Paddy (Rice)',
      img: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' // simple pixel base64 for test
    },
    {
      id: 'curl',
      name: 'Chilli Leaf Curl',
      crop: 'Chilli / Pepper',
      img: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88B9QAQH3Av9N80hTAAAAAElFTkSuQmCC'
    },
    {
      id: 'bollworm',
      name: 'Bollworm Bored Boll',
      crop: 'Cotton',
      img: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88B9QAQH3Av9N80hTAAAAAElFTkSuQmCC'
    }
  ];

  // Voice recording simulation
  const handleVoiceToggle = () => {
    if (!isVoiceRecording) {
      setIsVoiceRecording(true);
      setVoiceTimer(0);
      const interval = setInterval(() => {
        setVoiceTimer(t => {
          if (t >= 5) {
            clearInterval(interval);
            setIsVoiceRecording(false);
            // Auto send text simulated from voice
            sendChatMessage(`Provide localized weather forecast and pest danger levels for my ${activeFarmer.primaryCrop || 'Chilli'} field.`);
            return 0;
          }
          return t + 1;
        });
      }, 1000);
    } else {
      setIsVoiceRecording(false);
    }
  };

  // Add new farmer profile locally
  const handleCreateFarmer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmerName.trim() || !newFarmerPhone.trim()) return;

    const newProfile: FarmerProfile = {
      id: `FMR-${Math.floor(700 + Math.random() * 200)}`,
      name: newFarmerName,
      phone: newFarmerPhone,
      state: newFarmerState,
      district: newFarmerDistrict,
      taluka: newFarmerTaluka || "Taluka Center",
      soilType: newFarmerSoilType,
      soilPh: newFarmerPh,
      nValue: newFarmerN,
      pValue: newFarmerP,
      kValue: newFarmerK,
      farmSizeAcres: newFarmerSize,
      primaryCrop: newFarmerCrop,
      groundwaterLevelFt: newFarmerGroundwater,
      groundwaterSource: newFarmerWaterSource,
      organicCertified: newFarmerOrganic,
      registeredDate: new Date().toISOString().split('T')[0]
    };

    setFarmers(prev => [...prev, newProfile]);
    setActiveFarmerId(newProfile.id);
    setShowNewFarmerModal(false);

    // Reset fields
    setNewFarmerName('');
    setNewFarmerPhone('');
    setNewFarmerTaluka('');
  };

  // Convert uploaded image to base64 for processing
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUploadedImageBase64(base64String);
        setSelectedPresetDisease('');
        runDiseaseDiagnostic(base64String, scannerCropName);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sync offline SMS entries
  const handleSyncSMS = () => {
    if (smsLogs.length === 0) return;
    setSmsLogs(current => current.map(sms => ({ ...sms, status: 'Delivered' })));
    
    // Add positive synchronized alert
    const newAlert: NotificationAlert = {
      id: `AL-${Math.floor(500 + Math.random() * 900)}`,
      title: "Offline Sync Complete",
      message: "Successfully synchronized offline SMS queues with rural telemetry networks.",
      severity: 'info',
      category: 'Government Announcement',
      dateCreated: new Date().toISOString(),
      isRead: false
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  if (!currentUser) {
    return (
      <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-[#F8F9F5] text-sm text-gray-500 font-sans">Loading Kisan Alert AI Portal...</div>}>
        <RoleLogin onLoginSuccess={(user: any) => { setCurrentUser(user); setActiveFarmerId(user.id); }} />
      </Suspense>
    );
  }

  const hasUnreadCritical = alerts.some(a => !a.isRead && (a.severity === 'alert' || a.severity === 'warning'));

  return (
    <div className="min-h-screen bg-[#F8F9F5] text-[#2D3628] flex flex-col md:flex-row font-sans antialiased">
      
      {/* Dynamic Navigation Header / Sidebar */}
      <header className="w-full h-16 md:h-screen md:w-64 lg:w-72 px-6 py-4 md:py-8 flex md:flex-col items-center md:items-stretch justify-between md:justify-start gap-4 md:gap-8 border-b md:border-b-0 md:border-r border-[#E0E5D8] bg-white sticky top-0 z-40 transition-all shrink-0 md:overflow-y-auto">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-[#2D5A27] rounded-xl flex items-center justify-center shadow-md">
            <Sprout className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <span className="text-base lg:text-lg font-black tracking-tight text-[#1A2E1A] block">Kisan Alert <span className="text-[#2D5A27]">AI</span></span>
            <span className="text-[9px] bg-[#F0F4E8] text-[#2D5A27] font-bold px-2 py-0.5 rounded-full border border-[#E0E5D8] mt-0.5 inline-block">Copilot v2.4</span>
          </div>
        </div>
        
        {/* Navigation tabs (Vertical Sidebar on Desktop) */}
        <nav className="hidden md:flex md:flex-col gap-1 text-xs lg:text-sm font-semibold text-[#5C6B5C] w-full flex-1 mt-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
            { id: 'crop-intel', label: 'Crop Advisor', icon: <Sprout className="w-4 h-4 shrink-0" /> },
            { id: 'market-insights', label: 'Market Prices', icon: <TrendingUp className="w-4 h-4 shrink-0" /> },
            { id: 'schemes', label: 'Schemes Tracker', icon: <Award className="w-4 h-4 shrink-0" /> },
            { id: 'disease-scanner', label: 'Disease Lab', icon: <Activity className="w-4 h-4 shrink-0" /> },
            { id: 'expert-rsk', label: 'Expert RSKs', icon: <PhoneCall className="w-4 h-4 shrink-0" /> },
            { id: 'farm-gis', label: 'Farm GIS', icon: <Map className="w-4 h-4 shrink-0" /> },
            { id: 'smart-alerts', label: 'Smart Alerts', icon: <AlertTriangle className="w-4 h-4 shrink-0" /> },
            { id: 'surveillance', label: 'AI Surveillance', icon: <Shield className="w-4 h-4 shrink-0" /> },
            { id: 'finance', label: 'Finance & Stock', icon: <Wallet className="w-4 h-4 shrink-0" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center gap-3 ${
                activeTab === tab.id 
                  ? 'bg-[#F0F4E8] text-[#2D5A27] font-bold shadow-sm' 
                  : 'hover:bg-[#F8F9F5] hover:text-[#2D5A27]'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-[#2D5A27]' : 'text-[#8A9A8A]'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
 
        {/* Global actions and active farmer switcher */}
        <div className="flex md:flex-col items-center md:items-stretch gap-3 md:gap-4 md:mt-auto md:pt-6 md:border-t md:border-[#E0E5D8] w-auto md:w-full shrink-0">
          <div className="flex items-center gap-2 bg-[#F0F4E8] border border-[#E0E5D8] rounded-xl px-3 py-1.5 text-xs w-full justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
              <select 
                value={activeFarmerId}
                onChange={(e) => setActiveFarmerId(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-[#2D5A27] cursor-pointer text-xs truncate min-w-0"
              >
                {farmers.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => setShowNewFarmerModal(true)} 
              title="Add New Farm Profile" 
              className="p-1 hover:bg-white rounded-md text-[#2D5A27] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
 
          <button 
            onClick={() => {
              setActiveTab('dashboard');
              setTimeout(() => {
                const element = document.getElementById('ai-reasoning-hub');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="bg-[#2D5A27] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#2D5A27]/20 hover:bg-[#20401C] transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>Ask Copilot</span>
          </button>
        </div>
      </header>

      {/* Main Content Area Container */}
      <div className="flex-1 flex flex-col min-w-0">

      {/* Alert Banner for pending critical weather or pest reports */}
      {alerts.some(a => !a.isRead) && (
        <motion.div 
          id="alert-banner"
          animate={hasUnreadCritical ? {
            backgroundColor: ["#FFF9E6", "#FFF0CC", "#FFF9E6"],
            borderColor: ["#F5E6B5", "#EAD085", "#F5E6B5"],
            boxShadow: ["0 0 0 rgba(245, 230, 181, 0)", "0 0 12px rgba(245, 230, 181, 0.6)", "0 0 0 rgba(245, 230, 181, 0)"]
          } : {}}
          transition={{
            duration: 2.0,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="bg-[#FFF9E6] border-b border-[#F5E6B5] py-2.5 px-6 lg:px-12 flex items-center justify-between text-xs text-[#A67C00]"
        >
          <div className="flex items-center gap-2 font-medium">
            <motion.div
              animate={hasUnreadCritical ? {
                scale: [1, 1.2, 1],
              } : {}}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <AlertTriangle className="w-4 h-4 text-[#A67C00] shrink-0" />
            </motion.div>
            <span>
              <strong>Alert:</strong> {alerts.find(a => !a.isRead)?.title} - {alerts.find(a => !a.isRead)?.message}
            </span>
          </div>
          <button 
            onClick={() => setAlerts(current => current.map(a => ({ ...a, isRead: true })))} 
            className="text-[10px] underline hover:no-underline font-bold cursor-pointer transition-colors hover:text-[#7C5D00]"
          >
            Acknowledge
          </button>
        </motion.div>
      )}

      {/* Mobile navigation menu */}
      <div className="md:hidden flex overflow-x-auto bg-white border-b border-[#E0E5D8] px-4 py-2 gap-4 text-xs font-semibold scrollbar-none sticky top-16 z-30">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`px-3 py-1.5 rounded-full whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('crop-intel')} 
          className={`px-3 py-1.5 rounded-full whitespace-nowrap ${activeTab === 'crop-intel' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
          Crop Advisor
        </button>
        <button 
          onClick={() => setActiveTab('market-insights')} 
          className={`px-3 py-1.5 rounded-full whitespace-nowrap ${activeTab === 'market-insights' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
          Markets
        </button>
        <button 
          onClick={() => setActiveTab('schemes')} 
          className={`px-3 py-1.5 rounded-full whitespace-nowrap ${activeTab === 'schemes' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
          Schemes
        </button>
        <button 
          onClick={() => setActiveTab('disease-scanner')} 
          className={`px-3 py-1.5 rounded-full whitespace-nowrap ${activeTab === 'disease-scanner' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
          Disease Scanner
        </button>
        <button 
          onClick={() => setActiveTab('expert-rsk')} 
          className={`px-3 py-1.5 rounded-full whitespace-nowrap ${activeTab === 'expert-rsk' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
          Expert RSKs
        </button>
        <button 
          onClick={() => setActiveTab('farm-gis')} 
          className={`px-3 py-1.5 rounded-full whitespace-nowrap ${activeTab === 'farm-gis' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
          Farm GIS
        </button>
        <button 
          onClick={() => setActiveTab('smart-alerts')} 
          className={`px-3 py-1.5 rounded-full whitespace-nowrap ${activeTab === 'smart-alerts' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
          Alert Engine
        </button>
        <button 
          onClick={() => setActiveTab('surveillance')} 
          className={`px-3 py-1.5 rounded-full whitespace-nowrap ${activeTab === 'surveillance' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
          Surveillance
        </button>
        <button 
          onClick={() => setActiveTab('finance')} 
          className={`px-3 py-1.5 rounded-full whitespace-nowrap ${activeTab === 'finance' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
          Finance
        </button>
      </div>

      {/* Main Body Grid */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full transition-all">

        {/* ==================== VIEW 1: MAIN UNIFIED DASHBOARD ==================== */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Farm Profile, Localized Weather, Market Ticker */}
            <section className="lg:col-span-3 flex flex-col gap-6">
              
              {/* Active Profile Card */}
              <div id="active-profile-card" className="bg-white rounded-3xl p-5 border border-[#E0E5D8] shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 ease-out">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9A8A]">Active Profile</h3>
                  <span className="text-[10px] bg-[#F0F4E8] text-[#2D5A27] border border-[#E0E5D8] px-2 py-0.5 rounded-full font-bold">
                    ID: {activeFarmer.id}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#F0F4E8] flex items-center justify-center shrink-0">
                    <Sprout className="w-6 h-6 text-[#2D5A27]" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#1A2E1A]">{activeFarmer.name}'s Farm</p>
                    <p className="text-xs text-[#8A9A8A]">{activeFarmer.district}, {activeFarmer.state}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8A9A8A]">Farm Holding:</span>
                    <span className="font-semibold">{activeFarmer.farmSizeAcres} Acres ({activeFarmer.groundwaterSource})</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8A9A8A]">Primary Crop:</span>
                    <span className="font-semibold text-[#2D5A27]">{activeFarmer.primaryCrop || 'Sowing Stage'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8A9A8A]">Organic Certified:</span>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${activeFarmer.organicCertified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {activeFarmer.organicCertified ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 bg-[#F8F9F5] rounded-xl border border-[#E0E5D8]">
                    <p className="text-[10px] text-[#8A9A8A] uppercase font-bold">Soil pH</p>
                    <p className="font-bold text-sm text-[#2D5A27]">{activeFarmer.soilPh}</p>
                  </div>
                  <div className="p-2.5 bg-[#F8F9F5] rounded-xl border border-[#E0E5D8]">
                    <p className="text-[10px] text-[#8A9A8A] uppercase font-bold">Moisture</p>
                    <p className="font-bold text-sm text-[#2D5A27]">62%</p>
                  </div>
                </div>
              </div>

              {/* Premium Apple-Style Weather Alert Box */}
              <div className="bg-[#2D5A27] rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-80 flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5" />
                      Live Weather (Open-Meteo)
                    </h3>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px] backdrop-blur-sm font-bold">Dynamic API</span>
                  </div>
                  
                  {liveWeather ? (
                    <div>
                      <p className="text-base font-bold leading-snug mb-2">
                        {liveWeather.condition || "Sky Clear"} in Guntur district. Humidity: {liveWeather.humidity}%.
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-4xl font-black">{liveWeather.temp_c}°C</p>
                          <p className="text-[10px] opacity-80 mt-0.5">Wind: {liveWeather.wind_speed} km/h • Soil Temp: {liveWeather.soil_temp_c || "28"}°C</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('crop-intel')}
                          className="bg-white/20 hover:bg-white/30 text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md transition-all"
                        >
                          Regional Advisory
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-base font-medium leading-snug mb-4">
                        Retrieving localized radar telemetry...
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-3xl font-bold">32.5°C</p>
                          <p className="text-[10px] opacity-75">Guntur telemetry fallback</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('crop-intel')}
                          className="bg-white/20 hover:bg-white/30 text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md transition-all flex items-center gap-1"
                        >
                          5-Day Advisory <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Background ambient bubble */}
                <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-2xl"></div>
              </div>

              {/* 24-Hour Forecast Scrollbar */}
              <div className="bg-white rounded-3xl p-5 border border-[#E0E5D8] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#5C6B5C] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#2D5A27]" />
                    24-Hour Hourly Forecast
                  </h4>
                  <span className="text-[9px] bg-[#F0F4E8] text-[#2D5A27] px-2 py-0.5 rounded-full font-bold">Guntur Region</span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  {(liveWeather?.hourly || (() => {
                    // Fallback generator for 24 hours
                    const list = [];
                    const currentHour = new Date().getHours();
                    const baseTemp = liveWeather?.temp_c || 32;
                    const conditionStr = liveWeather?.condition || "Sunny";
                    for (let i = 0; i < 24; i++) {
                      const hr = (currentHour + i) % 24;
                      const ampm = hr >= 12 ? "PM" : "AM";
                      const displayHr = hr % 12 === 0 ? 12 : hr % 12;
                      const displayTime = `${displayHr} ${ampm}`;
                      
                      // Simulate colder nights / warmer days
                      const tempOffset = (6 - Math.abs(hr - 15)) * 0.7;
                      const temp = Math.round(baseTemp + tempOffset);
                      
                      const isRainy = conditionStr.toLowerCase().includes('rain') || conditionStr.toLowerCase().includes('storm');
                      const rain_probability = isRainy ? Math.round(55 + Math.sin(i / 2) * 20) : Math.max(0, Math.round(15 + Math.sin(i / 3) * 10));
                      let cond = "Sunny";
                      if (rain_probability > 50) cond = "Rainy";
                      else if (rain_probability > 25) cond = "Partly Cloudy";

                      list.push({
                        time: displayTime,
                        temp_c: temp,
                        rain_probability,
                        condition: cond
                      });
                    }
                    return list;
                  })()).map((item: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="min-w-[76px] flex flex-col items-center p-3 bg-[#F8F9F5] hover:bg-[#F0F4E8] rounded-2xl border border-[#E0E5D8] transition-all duration-200 shrink-0"
                    >
                      <span className="text-[10px] text-gray-500 font-medium mb-1.5">{item.time}</span>
                      <div className="mb-2">
                        {item.condition?.toLowerCase().includes('rain') || item.condition?.toLowerCase().includes('storm') ? (
                          <CloudRain className="w-5 h-5 text-blue-500" />
                        ) : item.condition?.toLowerCase().includes('cloud') ? (
                          <Cloud className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Sun className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <span className="text-sm font-bold text-[#2D3628]">{item.temp_c}°C</span>
                      <div className="flex items-center gap-0.5 mt-1 text-[9px] text-[#2D5A27] font-semibold bg-[#EBF3E7] px-1.5 py-0.5 rounded-full">
                        <Droplet className="w-2.5 h-2.5 text-blue-500 fill-blue-500" />
                        <span>{item.rain_probability}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* EMERGENCY TRIGGER MODULE */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-5 text-red-900 shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] uppercase font-black tracking-widest text-red-600 flex items-center gap-1.5">
                    🚨 Emergency Center
                  </span>
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                </div>
                <p className="text-[11px] font-semibold leading-relaxed text-red-800 mb-3.5">
                  Direct satellite broadcast bypass. Trigger localized alert alarms for wildfire, flood vectors, or livestock intrusions.
                </p>
                <button 
                  onClick={() => setShowEmergencyModal(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-red-600/15 active:scale-[0.99] transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Trigger Emergency Protocol
                </button>
              </div>

              {/* Compact Market Watch */}
              <div className="bg-white rounded-3xl p-5 border border-[#E0E5D8] shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9A8A]">Market Rates</h3>
                  <button onClick={() => setActiveTab('market-insights')} className="text-xs text-[#2D5A27] font-bold hover:underline">
                    View Mandis
                  </button>
                </div>
                <div className="space-y-3.5">
                  {markets.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b border-[#F0F4E8] pb-2.5 last:border-0 last:pb-0">
                      <div>
                        <p className="text-xs font-bold text-[#2D3628]">{item.name}</p>
                        <p className="text-[10px] text-[#8A9A8A]">{item.marketName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[#2D3628]">₹{item.currentPrice.toLocaleString('en-IN')}</p>
                        <span className={`text-[10px] font-bold ${item.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {item.changePercent >= 0 ? '↑' : '↓'} {Math.abs(item.changePercent)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </section>

            {/* Middle Column: Satellite Mapping + Live Copilot Chat Interface */}
            <section className="lg:col-span-6 flex flex-col gap-6">
              
              {/* Interactive SVG Farm Satellite Viewer (NDVI Index) */}
              <div className="bg-white rounded-3xl p-4 border border-[#E0E5D8] shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4 text-[#2D5A27]" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9A8A]">Satellite Telemetry (Sentinel-2)</h3>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => setSatelliteLayer('ndvi')}
                      className={`text-[9px] px-2 py-1 rounded-full font-bold transition-all ${satelliteLayer === 'ndvi' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
                      NDVI Index
                    </button>
                    <button 
                      onClick={() => setSatelliteLayer('moisture')}
                      className={`text-[9px] px-2 py-1 rounded-full font-bold transition-all ${satelliteLayer === 'moisture' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
                      Soil Moisture
                    </button>
                    <button 
                      onClick={() => setSatelliteLayer('true-color')}
                      className={`text-[9px] px-2 py-1 rounded-full font-bold transition-all ${satelliteLayer === 'true-color' ? 'bg-[#2D5A27] text-white' : 'bg-[#F0F4E8] text-[#2D3628]'}`}>
                      True Color
                    </button>
                  </div>
                </div>

                <div className="relative h-60 w-full rounded-2xl overflow-hidden bg-[#DDE4D1] border border-[#E0E5D8] flex items-center justify-center">
                  
                  {/* Real Interactive Leaflet Satellite Telemetry Map */}
                  <div className="absolute inset-0 w-full h-full z-0">
                    <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-[#DDE4D1] text-xs text-[#2D3628]/60 font-sans">Loading Telemetry Map...</div>}>
                      <SatelliteTelemetryMap activeFarmer={activeFarmer} satelliteLayer={satelliteLayer} />
                    </Suspense>
                  </div>

                  {/* Satellite overlay badge overlay (Floats on top of map, z-10) */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                    <span className="px-2 py-1 bg-white/95 backdrop-blur shadow-sm rounded-lg text-[9px] font-bold text-[#2D5A27] flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5" />
                      {satelliteLayer === 'ndvi' && 'NDVI: 0.74 (Healthy Crop Canopy)'}
                      {satelliteLayer === 'moisture' && 'Soil Moisture: 51.6% (Optimal)'}
                      {satelliteLayer === 'true-color' && 'True Color (Sentinel-2 L2A Band)'}
                    </span>
                    <span className="px-2 py-1 bg-white/95 backdrop-blur shadow-sm rounded-lg text-[9px] font-medium text-[#8A9A8A]">
                      Sentinel-2 Overpass: 14 Hours ago
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur p-2.5 rounded-xl shadow-lg border border-[#E0E5D8] flex items-center gap-2 z-10">
                    <div className="text-left">
                      <p className="text-[8px] font-bold text-[#8A9A8A] uppercase">
                        {satelliteLayer === 'ndvi' && 'Vegetation Status'}
                        {satelliteLayer === 'moisture' && 'Hydration Status'}
                        {satelliteLayer === 'true-color' && 'Spectral Profile'}
                      </p>
                      <p className="text-[10px] font-extrabold text-[#2D5A27]">
                        {satelliteLayer === 'ndvi' && 'Optimal Growth'}
                        {satelliteLayer === 'moisture' && 'Adequate Buffer'}
                        {satelliteLayer === 'true-color' && 'Visible RGB'}
                      </p>
                    </div>
                    <div className="flex items-end gap-0.5 h-6">
                      <div className="w-1 h-3 bg-[#A3B18A] rounded-full"></div>
                      <div className="w-1 h-5 bg-[#A3B18A] rounded-full"></div>
                      <div className="w-1 h-6 bg-[#2D5A27] rounded-full"></div>
                      <div className="w-1 h-4 bg-[#A3B18A] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copilot Conversational Chat / AI Reasoning Hub */}
              <div id="ai-reasoning-hub" className="bg-white rounded-3xl p-5 border border-[#E0E5D8] flex flex-col shadow-sm min-h-[400px]">
                <div className="flex justify-between items-center border-b border-[#F0F4E8] pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2D5A27] to-[#A3B18A] flex items-center justify-center text-white shadow-inner">
                      <Sparkles className="w-5 h-5 text-emerald-100" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[#1A2E1A]">Kisan AI Copilot</h2>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        <p className="text-[10px] text-[#8A9A8A] font-semibold uppercase">Multilingual Expert Online</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Language Selector */}
                  <div className="flex items-center gap-1.5 bg-[#F8F9F5] px-2 py-1 rounded-xl border border-[#E0E5D8]">
                    <Languages className="w-3.5 h-3.5 text-[#2D5A27]" />
                    <select 
                      value={chatLanguage} 
                      onChange={(e) => setChatLanguage(e.target.value)}
                      className="text-[11px] bg-transparent font-bold text-[#2D5A27] outline-none cursor-pointer"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">हिन्दी (Hindi)</option>
                      <option value="Telugu">తెలుగు (Telugu)</option>
                      <option value="Tamil">தமிழ் (Tamil)</option>
                      <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
                    </select>
                  </div>
                </div>

                {/* Conversation Message List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-72 scrollbar-thin">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                        msg.sender === 'user' 
                          ? 'bg-[#2D5A27] text-white rounded-tr-none' 
                          : 'bg-[#F0F4E8] text-[#2D3628] rounded-tl-none border border-[#E0E5D8]'
                      }`}>
                        <p>{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-[#8A9A8A] mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  ))}
                  {sendingChat && (
                    <div className="flex items-center gap-1.5 text-xs text-[#8A9A8A] pl-2">
                      <span className="w-1.5 h-1.5 bg-[#2D5A27] rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-[#2D5A27] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-[#2D5A27] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      <span>Kisan Copilot is reasoning...</span>
                    </div>
                  )}
                </div>

                {/* Quick Query suggestor chips */}
                <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  <button 
                    onClick={() => sendChatMessage("How much water does my crop require based on this week's weather?")}
                    className="px-3 py-1.5 bg-[#F8F9F5] border border-[#E0E5D8] rounded-full text-[10px] font-bold text-[#2D3628] hover:bg-[#F0F4E8] whitespace-nowrap shrink-0 transition-colors">
                    💧 Irrigation Schedule?
                  </button>
                  <button 
                    onClick={() => sendChatMessage("Suggest custom NPK fertilizer dose to correct soil deficits.")}
                    className="px-3 py-1.5 bg-[#F8F9F5] border border-[#E0E5D8] rounded-full text-[10px] font-bold text-[#2D3628] hover:bg-[#F0F4E8] whitespace-nowrap shrink-0 transition-colors">
                    🧪 Fertilizers Dose?
                  </button>
                  <button 
                    onClick={() => sendChatMessage("What are the pest risks and stem borer threat alerts for this region?")}
                    className="px-3 py-1.5 bg-[#F8F9F5] border border-[#E0E5D8] rounded-full text-[10px] font-bold text-[#2D3628] hover:bg-[#F0F4E8] whitespace-nowrap shrink-0 transition-colors">
                    🐛 Pest Warnings?
                  </button>
                </div>

                {/* Chat input form */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput); }}
                  className="mt-2 flex items-center gap-2 bg-[#F8F9F5] border border-[#E0E5D8] rounded-2xl p-1.5"
                >
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Ask Copilot in ${chatLanguage}...`}
                    className="flex-1 bg-transparent text-xs px-3 py-2 outline-none border-none text-[#2D3628]"
                  />
                  
                  {/* Mock voice recorder button */}
                  <button 
                    type="button"
                    onClick={handleVoiceToggle}
                    className={`p-2 rounded-xl transition-all flex items-center justify-center ${isVoiceRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-[#F0F4E8] text-[#2D5A27]'}`}
                    title="Simulate Voice Input (Whisper API)"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button 
                    type="submit"
                    disabled={!chatInput.trim() || sendingChat}
                    className="bg-[#2D5A27] text-white p-2.5 rounded-xl hover:bg-[#20401C] disabled:opacity-50 transition-colors flex items-center justify-center"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
                {isVoiceRecording && (
                  <p className="text-[10px] text-red-500 font-bold mt-1.5 animate-pulse text-center">
                    🎙️ Listening to {chatLanguage} speech... ({voiceTimer}s)
                  </p>
                )}
              </div>

            </section>

            {/* Right Column: Dynamic Services & Quick Actions */}
            <section className="lg:col-span-3 flex flex-col gap-6">
              
              {/* Welfare Schemes Status Indicator */}
              <div className="bg-white rounded-3xl p-5 border border-[#E0E5D8] shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9A8A] mb-4">Welfare Eligibility</h3>
                <div className="space-y-3">
                  
                  {/* PM KISAN */}
                  <div className="p-3 border border-[#E0E5D8] rounded-2xl flex items-center gap-3 hover:bg-[#F8F9F5] transition-colors cursor-pointer" onClick={() => { setActiveTab('schemes'); setSelectedScheme(schemes[0]); }}>
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">PM-KISAN Scheme</p>
                      <p className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Eligible: Next Instalment
                      </p>
                    </div>
                  </div>

                  {/* Regional bonus schemes based on state */}
                  <div className="p-3 border border-[#E0E5D8] rounded-2xl flex items-center gap-3 bg-[#F0F4E8]/50 hover:bg-[#F0F4E8] transition-colors cursor-pointer" onClick={() => { setActiveTab('schemes'); setSelectedScheme(activeFarmer.state === 'Andhra Pradesh' ? schemes[2] : schemes[3]); }}>
                    <div className="w-10 h-10 bg-[#E0E5D8] rounded-xl flex items-center justify-center text-[#2D5A27] shrink-0">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">
                        {activeFarmer.state === 'Andhra Pradesh' ? 'YSR Rythu Bharosa' : 'Rythu Bandhu'}
                      </p>
                      <p className="text-[10px] text-[#2D5A27] font-semibold">
                        State subsidy Active
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Fast Leaf Disease Scanner Upload Trigger */}
              <div className="bg-white rounded-3xl p-5 border border-[#E0E5D8] flex-1 flex flex-col shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9A8A] mb-4">Leaf Clinic Diagnostic</h3>
                <div 
                  onClick={() => setActiveTab('disease-scanner')}
                  className="bg-[#F8F9F5] hover:bg-[#F0F4E8] rounded-2xl border-2 border-dashed border-[#E0E5D8] flex-1 flex flex-col items-center justify-center text-center p-4 cursor-pointer group transition-colors min-h-[160px]"
                >
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5 text-[#2D5A27]" />
                  </div>
                  <p className="text-xs font-bold mb-1">Select Crop Leaf Photo</p>
                  <p className="text-[10px] text-[#8A9A8A] max-w-[160px] mx-auto">Instant pathogen scan via vision models</p>
                </div>
                
                {/* Pest Outbreak Warning Level Progress Gauge */}
                <div className="mt-4 p-4 rounded-2xl bg-[#FFF9E6] border border-[#F5E6B5]">
                  <p className="text-[10px] font-bold text-[#A67C00] uppercase mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Pest Outbreak Threat
                  </p>
                  <div className="w-full bg-[#E0E5D8] h-2 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-orange-400 h-full rounded-full w-[65%]"></div>
                  </div>
                  <p className="text-[10px] mt-2 font-semibold text-[#8A6000]">65% Moderate Risk: Stem Borer &amp; Thrips</p>
                </div>
              </div>

              {/* Offline sync diagnostics status bar */}
              <div className="flex justify-between items-center px-1">
                <div className="flex gap-2 items-center">
                  <span className={`w-2 h-2 rounded-full ${offlineMode ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`}></span>
                  <span className="text-[10px] text-[#8A9A8A] font-medium">
                    {offlineMode ? 'Local SMS Buffer' : 'Cloud Connected'}
                  </span>
                </div>
                <button 
                  onClick={() => setOfflineMode(!offlineMode)} 
                  className="text-[10px] text-[#2D5A27] font-bold hover:underline"
                >
                  Toggle {offlineMode ? 'Online' : 'Offline'}
                </button>
              </div>

            </section>

          </div>
        )}

        {/* ==================== VIEW 2: CROP RECOMMENDATION & SOIL INTEL ==================== */}
        {activeTab === 'crop-intel' && (
          <div className="space-y-6">
            
            {/* Intro header */}
            <div className="bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1A2E1A] flex items-center gap-2">
                    <Sprout className="w-6 h-6 text-[#2D5A27]" /> Crop &amp; Soil Intelligence Advisor
                  </h2>
                  <p className="text-xs text-[#8A9A8A] mt-1">
                    Customized suggestions mapped via localized nitrogen levels, groundwater level, soil pH, and IMD historical dry-spell calculations.
                  </p>
                </div>
                <button 
                  onClick={() => fetchCropRecommendations(activeFarmer)}
                  disabled={loadingCropAdvisor}
                  className="bg-[#2D5A27] text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-[#20401C] transition-all disabled:opacity-50"
                >
                  {loadingCropAdvisor ? 'Re-calculating Soil...' : 'Force AI Recheck'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Soil analysis card */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9A8A] mb-4">Active Field Soil Metric</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-[#F0F4E8] pb-2">
                      <span className="text-xs font-semibold">Soil Type:</span>
                      <span className="text-xs font-bold text-[#2D5A27]">{activeFarmer.soilType}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#F0F4E8] pb-2">
                      <span className="text-xs font-semibold">Active pH Value:</span>
                      <span className="text-xs font-bold text-[#2D5A27]">{activeFarmer.soilPh} (Optimal Neutral)</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#F0F4E8] pb-2">
                      <span className="text-xs font-semibold">Groundwater Depth:</span>
                      <span className="text-xs font-bold">{activeFarmer.groundwaterLevelFt} Feet</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#F0F4E8] pb-2">
                      <span className="text-xs font-semibold">Source:</span>
                      <span className="text-xs font-bold">{activeFarmer.groundwaterSource}</span>
                    </div>
                  </div>

                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9A8A] mt-6 mb-3">Nutrient Composition (mg/kg)</h4>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold mb-1">
                        <span>Nitrogen (N) - Deficient</span>
                        <span className="text-[#2D5A27]">{activeFarmer.nValue} / 120</span>
                      </div>
                      <div className="w-full bg-[#E0E5D8] h-2 rounded-full overflow-hidden">
                        <div className="bg-red-400 h-full rounded-full" style={{ width: `${(activeFarmer.nValue / 120) * 100}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-bold mb-1">
                        <span>Phosphorus (P) - Moderate</span>
                        <span className="text-[#2D5A27]">{activeFarmer.pValue} / 50</span>
                      </div>
                      <div className="w-full bg-[#E0E5D8] h-2 rounded-full overflow-hidden">
                        <div className="bg-orange-400 h-full rounded-full" style={{ width: `${(activeFarmer.pValue / 50) * 100}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-bold mb-1">
                        <span>Potassium (K) - Optimal</span>
                        <span className="text-[#2D5A27]">{activeFarmer.kValue} / 250</span>
                      </div>
                      <div className="w-full bg-[#E0E5D8] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#2D5A27] h-full rounded-full" style={{ width: `${(activeFarmer.kValue / 250) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-[#F0F4E8]/60 border border-[#E0E5D8] text-xs">
                  <span className="font-bold text-[#2D5A27] block mb-1">Advisor Tip:</span>
                  To remedy current Low Nitrogen levels, apply neem-coated urea in three split applications instead of single pre-sowing dumps.
                </div>
              </div>

              {/* Crop Recommendations list */}
              <div className="lg:col-span-8 space-y-4">
                {loadingCropAdvisor ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-[#E0E5D8]">
                    <div className="animate-spin w-8 h-8 border-4 border-[#2D5A27] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-sm font-semibold text-[#2D3628]">Querying Agronomist AI Models...</p>
                  </div>
                ) : cropRecommendations.length > 0 ? (
                  <>
                    <h3 className="text-sm font-bold text-[#2D3628]">Top Recommended Crops</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cropRecommendations.map((crop, idx) => (
                        <div key={idx} className="bg-white rounded-2xl p-5 border border-[#E0E5D8] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-sm font-bold text-[#1A2E1A]">{crop.cropName}</span>
                              <span className="bg-[#F0F4E8] text-[#2D5A27] font-extrabold text-xs px-2 py-1 rounded-lg">
                                {crop.suitabilityScore}% Match
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                              <div className="p-2 bg-[#F8F9F5] rounded-lg">
                                <span className="text-[#8A9A8A]">Yield (Acre):</span>
                                <p className="font-bold text-xs">{crop.expectedYieldTons} Tons</p>
                              </div>
                              <div className="p-2 bg-[#F8F9F5] rounded-lg">
                                <span className="text-[#8A9A8A]">Duration:</span>
                                <p className="font-bold text-xs">{crop.growthDurationDays} Days</p>
                              </div>
                              <div className="p-2 bg-[#F8F9F5] rounded-lg">
                                <span className="text-[#8A9A8A]">Water:</span>
                                <p className="font-bold text-xs">{crop.waterRequiredMm} mm</p>
                              </div>
                              <div className="p-2 bg-[#F8F9F5] rounded-lg">
                                <span className="text-[#8A9A8A]">Avg Price:</span>
                                <p className="font-bold text-xs text-green-700">₹{crop.averageMarketPrice}/Q</p>
                              </div>
                            </div>

                            <div className="mb-4">
                              <p className="text-[10px] font-bold text-[#8A9A8A] uppercase mb-1">Reasoning Analysis:</p>
                              <ul className="text-[11px] text-[#2D3628] space-y-1 pl-3 list-disc">
                                {crop.reasons.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-[#F0F4E8] flex justify-between items-center text-[10px]">
                            <span className="font-bold uppercase text-[#A67C00]">Required NPK: {crop.nPKRequired.n}:{crop.nPKRequired.p}:{crop.nPKRequired.k} kg/acre</span>
                            <button 
                              onClick={() => {
                                setActiveTab('disease-scanner');
                                setScannerCropName(crop.cropName);
                              }}
                              className="text-[#2D5A27] font-bold hover:underline flex items-center gap-0.5"
                            >
                              Scan Leaf <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* General fertilizer advisory text section */}
                    <div className="bg-[#FFF9E6] border border-[#F5E6B5] rounded-2xl p-5 text-xs text-[#8A6000]">
                      <h4 className="font-bold mb-2 uppercase tracking-wide">AI Nutrient Correction Advisory</h4>
                      <p className="leading-relaxed">{fertilizerAdvisory}</p>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-3xl p-12 text-center border border-[#E0E5D8]">
                    <p className="text-sm">No recommended crops catalogued. Select or add a different farmer profile.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ==================== VIEW 3: MARKET PRICE INSIGHTS ==================== */}
        {activeTab === 'market-insights' && (() => {
          const filteredAndSortedMarkets = markets.filter(item => {
            const matchesSearch = 
              item.name.toLowerCase().includes(marketSearch.toLowerCase()) ||
              item.marketName.toLowerCase().includes(marketSearch.toLowerCase()) ||
              item.state.toLowerCase().includes(marketSearch.toLowerCase());
            const matchesCategory = marketCategory === 'All' || item.category === marketCategory;
            return matchesSearch && matchesCategory;
          }).sort((a, b) => {
            if (marketSort === 'name') {
              return a.name.localeCompare(b.name);
            } else if (marketSort === 'price_high') {
              return b.currentPrice - a.currentPrice;
            } else if (marketSort === 'price_low') {
              return a.currentPrice - b.currentPrice;
            } else if (marketSort === 'change') {
              return Math.abs(b.changePercent) - Math.abs(a.changePercent);
            } else if (marketSort === 'volume') {
              return b.volumeArrivalTons - a.volumeArrivalTons;
            }
            return 0;
          });

          return (
            <div className="space-y-6">
              
              {/* Header card with Live status */}
              <div className="bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1A2E1A] flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-[#2D5A27]" /> Live Mandi Markets &amp; Price Forecasting
                  </h2>
                  <p className="text-xs text-[#8A9A8A] mt-1">
                    Real-time crop pricing feeds direct from Indian APMCs. Highlight a commodity card to generate historical price charts and next-month predicted futures.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-[#F0F4E8] border border-[#D0D9C5] px-3.5 py-1.5 rounded-full text-xs self-start md:self-auto">
                  <span className={`w-2 h-2 rounded-full ${loadingMarkets ? 'bg-orange-400 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
                  <span className="font-bold text-[#2D5A27] text-[10px] uppercase tracking-wide">
                    {loadingMarkets ? 'Refreshing...' : `Live APMC Ticker Active (${marketLastUpdated || 'Now'})`}
                  </span>
                </div>
              </div>

              {/* Market Error Warning Bar */}
              {marketError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center gap-3">
                  <span className="text-red-500 font-bold">⚠️</span>
                  <div className="text-xs text-red-700 font-medium">{marketError}</div>
                </div>
              )}

              {/* Dynamic Search, Categories, and Sorting Filters Bar */}
              <div className="bg-white rounded-2xl p-4 border border-[#E0E5D8] shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8A9A8A]" />
                    <input 
                      type="text" 
                      placeholder="Search commodities, regional APMC Mandis, or Indian states..." 
                      value={marketSearch}
                      onChange={(e) => setMarketSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs bg-[#F7F9F6] border border-[#E0E5D8] rounded-xl focus:outline-none focus:border-[#2D5A27] transition-all"
                    />
                    {marketSearch && (
                      <button 
                        onClick={() => setMarketSearch('')}
                        className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Sorting Select */}
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <span className="text-[10px] text-[#8A9A8A] font-bold whitespace-nowrap">Sort By:</span>
                    <select
                      value={marketSort}
                      onChange={(e) => setMarketSort(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-[#F7F9F6] border border-[#E0E5D8] rounded-xl focus:outline-none focus:border-[#2D5A27] font-semibold"
                    >
                      <option value="name">Alphabetical (A-Z)</option>
                      <option value="price_high">Price (High to Low)</option>
                      <option value="price_low">Price (Low to High)</option>
                      <option value="change">Trading Volatility (Change %)</option>
                      <option value="volume">Arrival Volume (Tons)</option>
                    </select>
                  </div>
                </div>

                {/* Category Tags Horizontal Filter */}
                <div className="border-t border-[#F0F4E8] pt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  <span className="text-[10px] text-[#8A9A8A] font-bold uppercase tracking-wider mr-1 whitespace-nowrap">Categories:</span>
                  {['All', 'Cereals', 'Pulses', 'Oilseeds', 'Vegetables', 'Fruits', 'Cash Crops'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMarketCategory(cat)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all whitespace-nowrap ${
                        marketCategory === cat 
                          ? 'bg-[#2D5A27] text-white shadow-sm' 
                          : 'bg-[#F0F4E8] text-[#2D5A27] hover:bg-[#E2EAD8]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Commodity Cards list */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-[#8A9A8A] uppercase tracking-wide">
                      Mandi Products ({filteredAndSortedMarkets.length} Crops)
                    </span>
                    {marketSearch || marketCategory !== 'All' ? (
                      <button 
                        onClick={() => { setMarketSearch(''); setMarketCategory('All'); }}
                        className="text-[10px] text-[#2D5A27] hover:underline font-bold"
                      >
                        Reset filters
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredAndSortedMarkets.length > 0 ? (
                      filteredAndSortedMarkets.map((com) => (
                        <div 
                          key={com.id} 
                          id="active-profile-card"
                          onClick={() => setSelectedMarket(com)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                            selectedMarket?.id === com.id 
                              ? 'bg-white border-[#2D5A27] shadow-md ring-1 ring-[#2D5A27]' 
                              : 'bg-white border-[#E0E5D8] hover:border-[#A3B18A] hover:shadow-sm'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#2D3628]">{com.name}</span>
                              <span className="text-[9px] bg-[#F0F4E8] text-[#2D5A27] px-1.5 py-0.2 rounded">
                                {com.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#8A9A8A] mt-0.5">{com.marketName}, {com.state}</p>
                            <p className="text-[9px] text-[#A3B18A] mt-1">Arrivals: {com.volumeArrivalTons} Tons</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold">₹{com.currentPrice.toLocaleString('en-IN')}/Q</p>
                            <span className={`text-[10px] font-bold flex items-center gap-0.5 justify-end ${com.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {com.changePercent >= 0 ? '↑' : '↓'} {Math.abs(com.changePercent).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-2xl p-8 text-center border border-[#E0E5D8] text-[#8A9A8A]">
                        <p className="text-xs font-semibold mb-1 text-[#2D3628]">No commodities found</p>
                        <p className="text-[10px] leading-relaxed">No market data matches your criteria. Try adjusting your query or category selection.</p>
                      </div>
                    )}
                  </div>
                </div>

              {/* Price analytics details charts */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm flex flex-col justify-between">
                {selectedMarket ? (
                  <>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0F4E8] pb-4 mb-6">
                        <div>
                          <span className="text-xs text-[#8A9A8A] font-bold uppercase tracking-wider">Historical Trend Analysis</span>
                          <h3 className="text-lg font-bold text-[#1A2E1A]">{selectedMarket.name} ({selectedMarket.marketName})</h3>
                        </div>
                        <div className="bg-[#F0F4E8] text-[#2D5A27] px-4 py-2 rounded-2xl text-right">
                          <p className="text-xs font-bold">Predicted Next Month:</p>
                          <p className="text-base font-extrabold">₹{selectedMarket.forecastPriceNextMonth.toLocaleString('en-IN')} / Q</p>
                        </div>
                      </div>

                      {/* Area Chart rendered dynamically via Recharts */}
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={selectedMarket.historicalPrices}>
                            <defs>
                              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2D5A27" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#2D5A27" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="month" stroke="#8A9A8A" fontSize={11} tickLine={false} />
                            <YAxis stroke="#8A9A8A" fontSize={11} domain={['dataMin - 100', 'dataMax + 100']} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E0E5D8' }} />
                            <Area type="monotone" dataKey="price" name="Market Rate (INR)" stroke="#2D5A27" strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="p-3 bg-[#F8F9F5] rounded-xl border border-[#E0E5D8]">
                          <span className="text-[10px] text-[#8A9A8A] uppercase font-bold">Total Arrivals Today</span>
                          <p className="text-sm font-bold mt-1 text-[#2D3628]">{selectedMarket.volumeArrivalTons} Metric Tons</p>
                        </div>
                        <div className="p-3 bg-[#F8F9F5] rounded-xl border border-[#E0E5D8]">
                          <span className="text-[10px] text-[#8A9A8A] uppercase font-bold">Yesterday's Close</span>
                          <p className="text-sm font-bold mt-1 text-[#2D3628]">₹{selectedMarket.yesterdayPrice.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-3 bg-[#F8F9F5] rounded-xl border border-[#E0E5D8]">
                          <span className="text-[10px] text-[#8A9A8A] uppercase font-bold">Estimated Yield Profit</span>
                          <p className="text-sm font-bold mt-1 text-green-700">₹{Math.round(selectedMarket.currentPrice * 4.5).toLocaleString('en-IN')} / Acre</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-[#FFF9E6] border border-[#F5E6B5] text-[11px] text-[#8A6000]">
                      <strong>Market Intelligence Warning:</strong> High rainfall predictions over the weekends may delay fresh arrivals from {selectedMarket.state} fields, triggering short term upward volatility. Plan harvesting cycles accordingly.
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-sm text-[#8A9A8A]">
                    Select a crop card to see price curves.
                  </div>
                )}
              </div>

            </div>
          </div>
          );
        })()}

        {/* ==================== VIEW 4: GOVERNMENT SCHEMES & ELIGIBILITY ==================== */}
        {activeTab === 'schemes' && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm">
              <h2 className="text-xl font-bold text-[#1A2E1A] flex items-center gap-2">
                <Award className="w-6 h-6 text-[#2D5A27]" /> Central &amp; State Welfare Schemes Assistant
              </h2>
              <p className="text-xs text-[#8A9A8A] mt-1">
                Kisan Alert AI cross-analyzes land ownership parameters, geographical limits, crops grown, and income thresholds to confirm if you qualify for direct state disbursements.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Schemes Selector */}
              <div className="lg:col-span-5 space-y-3">
                {schemes.map((sch) => {
                  const isStateMatch = !sch.state || sch.state === activeFarmer.state;
                  return (
                    <div 
                      key={sch.id}
                      onClick={() => { setSelectedScheme(sch); setSchemeReport(null); }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedScheme.id === sch.id 
                          ? 'bg-white border-[#2D5A27] shadow-md ring-1 ring-[#2D5A27]' 
                          : 'bg-white border-[#E0E5D8] hover:border-[#A3B18A]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded uppercase">
                            {sch.sponsoredBy}
                          </span>
                          <h4 className="text-xs font-bold text-[#2D3628] mt-1.5">{sch.name}</h4>
                        </div>
                        {sch.state && (
                          <span className="text-[10px] font-extrabold text-[#2D5A27] bg-[#F0F4E8] border border-[#E0E5D8] px-2 py-0.5 rounded-full">
                            {sch.state}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#8A9A8A] mt-2 line-clamp-2">{sch.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Evaluation pane */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm">
                <div>
                  <h3 className="text-base font-bold text-[#1A2E1A] border-b border-[#F0F4E8] pb-3 mb-4">
                    {selectedScheme.name}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-[#8A9A8A] font-bold uppercase block mb-1">Details</span>
                      <p className="text-xs text-[#2D3628] leading-relaxed">{selectedScheme.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-[#8A9A8A] font-bold uppercase block mb-1">Benefits Provided</span>
                        <p className="text-xs font-bold text-[#2D5A27] leading-relaxed">{selectedScheme.benefits}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#8A9A8A] font-bold uppercase block mb-1">Requirements</span>
                        <p className="text-xs text-[#2D3628] leading-relaxed">{selectedScheme.eligibilityDescription}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-[#8A9A8A] font-bold uppercase block mb-1.5">Required Documents</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedScheme.requiredDocuments.map((doc, i) => (
                          <span key={i} className="bg-[#F8F9F5] border border-[#E0E5D8] text-[#2D3628] text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                            📁 {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* API Check button */}
                  <div className="mt-8 border-t border-[#F0F4E8] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold">Verify Eligibility for profile: <strong className="text-[#2D5A27]">{activeFarmer.name}</strong></p>
                      <p className="text-[10px] text-[#8A9A8A]">Farm size: {activeFarmer.farmSizeAcres} acres • State: {activeFarmer.state}</p>
                    </div>
                    <button 
                      onClick={() => checkSchemeEligibility(selectedScheme)}
                      disabled={checkingEligibility}
                      className="bg-[#2D5A27] text-white text-xs font-bold px-5 py-3 rounded-full hover:bg-[#20401C] disabled:opacity-50 transition-all cursor-pointer shrink-0"
                    >
                      {checkingEligibility ? 'Analysing with Agronomist AI...' : 'Run Eligibility Check'}
                    </button>
                  </div>
                </div>

                {/* Eligibility Report result */}
                {schemeReport && (
                  <div className="mt-6 p-5 rounded-2xl bg-[#F0F4E8] border border-[#E0E5D8]">
                    <div className="flex items-center gap-2 mb-3">
                      {schemeReport.eligible ? (
                        <CheckCircle className="w-5 h-5 text-[#2D5A27]" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="text-sm font-bold text-[#1A2E1A]">
                        AI Assessment: {schemeReport.eligible ? 'Approved & Match Confirmed' : 'Ineligible State mismatch'}
                      </span>
                      <span className="ml-auto bg-[#2D5A27] text-white text-[10px] font-extrabold px-2 py-0.5 rounded">
                        {schemeReport.suitabilityPercentage}% Suitability
                      </span>
                    </div>

                    <div className="space-y-3 text-xs text-[#2D3628]">
                      <div>
                        <strong>Matching Criteria:</strong>
                        <ul className="list-disc pl-4 space-y-0.5 mt-1 text-[11px]">
                          {schemeReport.matchingCriteria.map((m: string, i: number) => <li key={i}>{m}</li>)}
                        </ul>
                      </div>
                      {schemeReport.mismatchingCriteria?.length > 0 && (
                        <div>
                          <strong>Mismatch Risks:</strong>
                          <ul className="list-disc pl-4 space-y-0.5 mt-1 text-[11px] text-red-600">
                            {schemeReport.mismatchingCriteria.map((m: string, i: number) => <li key={i}>{m}</li>)}
                          </ul>
                        </div>
                      )}
                      <div>
                        <strong>Welfare Aid Benefits:</strong>
                        <p className="text-[11px] mt-0.5">{schemeReport.financialBenefits}</p>
                      </div>
                      <div>
                        <strong>Steps to Apply:</strong>
                        <p className="text-[11px] mt-0.5 font-medium">{schemeReport.actionRequired}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ==================== VIEW 5: DISEASE SCANNERS LAB ==================== */}
        {activeTab === 'disease-scanner' && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm">
              <h2 className="text-xl font-bold text-[#1A2E1A] flex items-center gap-2">
                <Upload className="w-6 h-6 text-[#2D5A27]" /> AI Crop Leaf Clinic Diagnostic
              </h2>
              <p className="text-xs text-[#8A9A8A] mt-1">
                Upload crop leaf spots to detect active fungal pathogens, vector infestation (aphids/whiteflies), and get organic remedies or chemical spraying limits.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Image Input Selection pane */}
              <div className="lg:col-span-4 space-y-6">
                
                <div className="bg-white rounded-3xl p-5 border border-[#E0E5D8] shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9A8A] mb-3">Crop Selection</h3>
                  <div className="space-y-2.5 mb-4">
                    <label className="block text-xs font-bold">Select Active Crop Type:</label>
                    <select 
                      value={scannerCropName}
                      onChange={(e) => setScannerCropName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] text-[#2D3628] font-semibold outline-none"
                    >
                      <option value="Paddy (Rice)">Paddy (Rice)</option>
                      <option value="Chilli / Pepper">Chilli / Pepper</option>
                      <option value="Cotton">Cotton</option>
                    </select>
                  </div>

                  <span className="text-xs font-bold block mb-2">Test with Preset Scanned Leaf:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_DISEASES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPresetDisease(p.id);
                          setScannerCropName(p.crop);
                          setUploadedImageBase64(null);
                          runDiseaseDiagnostic(p.img, p.crop);
                        }}
                        className={`p-2 rounded-xl text-[10px] font-bold border transition-all text-center ${
                          selectedPresetDisease === p.id 
                            ? 'bg-[#2D5A27] text-white border-[#2D5A27]' 
                            : 'bg-[#F8F9F5] border-[#E0E5D8] hover:bg-[#F0F4E8]'
                        }`}
                      >
                        🍂 {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-[#E0E5D8] shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9A8A] mb-3">Upload Custom Leaf Image</h3>
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#E0E5D8] rounded-2xl bg-[#F8F9F5]">
                    <Upload className="w-8 h-8 text-[#2D5A27] mb-2" />
                    <label className="bg-[#2D5A27] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#20401C] transition-colors">
                      Choose File
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                    </label>
                    <span className="text-[9px] text-[#8A9A8A] mt-2">Supports PNG, JPG, JPEG</span>
                  </div>
                </div>

              </div>

              {/* Diagnostic Report Results pane */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm">
                {diagnosing ? (
                  <div className="py-20 text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-[#2D5A27] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-sm font-semibold text-[#2D3628]">Running leaf pathology segmentation algorithms...</p>
                    <p className="text-xs text-[#8A9A8A] mt-1">Comparing with YOLOv11 leaf-spot model layers</p>
                  </div>
                ) : diagnosisResult ? (
                  <div className="space-y-6">
                    
                    {/* Header and Severity indicators */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0F4E8] pb-4">
                      <div>
                        <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded uppercase">
                          Pathogen: {diagnosisResult.pathogenType}
                        </span>
                        <h3 className="text-lg font-bold text-[#1A2E1A] mt-1">{diagnosisResult.detectedDisease}</h3>
                        <p className="text-xs text-[#8A9A8A]">Active crop matched: {diagnosisResult.cropName}</p>
                      </div>

                      <div className="flex gap-2">
                        <div className="bg-[#FFF9E6] border border-[#F5E6B5] text-[#A67C00] px-3.5 py-1.5 rounded-xl text-center">
                          <span className="text-[8px] block uppercase font-bold">Severity</span>
                          <span className="text-xs font-bold">{diagnosisResult.severity}</span>
                        </div>
                        <div className="bg-[#F0F4E8] border border-[#E0E5D8] text-[#2D5A27] px-3.5 py-1.5 rounded-xl text-center">
                          <span className="text-[8px] block uppercase font-bold">AI Confidence</span>
                          <span className="text-xs font-bold">{Math.round(diagnosisResult.confidence * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-[#2D3628] uppercase tracking-wider mb-2">Visible Diagnostic Symptoms</h4>
                        <ul className="text-xs space-y-1 pl-4 list-disc text-[#2D3628]">
                          {diagnosisResult.symptoms.map((sym, i) => <li key={i}>{sym}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#2D3628] uppercase tracking-wider mb-2">AI Diagnostic Explanation</h4>
                        <p className="text-xs text-[#2D3628] leading-relaxed italic">
                          "{diagnosisResult.explainableAIReasoning}"
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#F0F4E8]">
                      <div className="p-4 bg-[#F0F4E8] rounded-xl border border-[#E0E5D8]">
                        <h4 className="text-xs font-bold text-[#2D5A27] uppercase tracking-wider mb-2">🌿 Organic &amp; Biological Remedies</h4>
                        <ul className="text-xs space-y-1 pl-4 list-disc text-[#2D3628]">
                          {diagnosisResult.organicRemedies.map((rem, i) => <li key={i}>{rem}</li>)}
                        </ul>
                      </div>
                      <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100">
                        <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">🧪 Safe Chemical Controls</h4>
                        <ul className="text-xs space-y-1 pl-4 list-disc text-[#2D3628]">
                          {diagnosisResult.chemicalSolutions.map((chem, i) => <li key={i}>{chem}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F8F9F5] border border-[#E0E5D8] text-xs">
                      <strong>Long-term Prevention Strategy:</strong>
                      <ul className="list-disc pl-4 space-y-0.5 mt-1">
                        {diagnosisResult.preventiveMeasures.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span>Are crop diagnostics critical? Escalate to your nearest Rythu Seva Kendram.</span>
                      <button 
                        onClick={() => setActiveTab('expert-rsk')}
                        className="text-[#2D5A27] font-bold hover:underline flex items-center gap-1"
                      >
                        File Escalation <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="py-24 text-center text-[#8A9A8A]">
                    <Upload className="w-12 h-12 text-[#E0E5D8] mx-auto mb-3" />
                    <p className="text-sm font-semibold">No active analysis loaded.</p>
                    <p className="text-xs mt-1">Select a preset leaf image or upload a custom leaf photo to generate pathfinder diagnostics.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ==================== VIEW 6: EXPERT RSK ESCALATION & TICKETING ==================== */}
        {activeTab === 'expert-rsk' && (
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm">
              <h2 className="text-xl font-bold text-[#1A2E1A] flex items-center gap-2">
                <PhoneCall className="w-6 h-6 text-[#2D5A27]" /> Expert Escalation to Rythu Seva Kendras (RSK)
              </h2>
              <p className="text-xs text-[#8A9A8A] mt-1">
                Direct integration with localized crop clinics. File a detailed field alert ticket; local agricultural directors will respond instantly with custom field diagnostics.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* RSK Directory details */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-[#E0E5D8] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9A8A] mb-4">Closest Government RSK Center</h3>
                  
                  <div className="p-4 bg-[#F8F9F5] rounded-2xl border border-[#E0E5D8] mb-4">
                    <p className="text-xs font-bold text-[#2D5A27]">{activeRSK.name}</p>
                    <p className="text-[10px] text-[#8A9A8A] mt-0.5">{activeRSK.district}, {activeRSK.state}</p>
                    
                    <div className="mt-4 space-y-2 text-xs">
                      <p>🗣️ <strong>Officer:</strong> {activeRSK.headOfficer}</p>
                      <p>📞 <strong>Phone:</strong> {activeRSK.phone}</p>
                      <p>🧑‍🌾 <strong>Agronomists on duty:</strong> {activeRSK.activeAgronomists}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1">
                      {activeRSK.soilTestingLab && (
                        <span className="bg-green-100 text-green-800 text-[9px] px-2 py-0.5 rounded font-bold">🧪 Soil Testing Lab</span>
                      )}
                      {activeRSK.customHiringCenter && (
                        <span className="bg-blue-100 text-blue-800 text-[9px] px-2 py-0.5 rounded font-bold">🚜 Machinery Hire</span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-bold block mb-2">Switch Nearest Center:</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {rskCenters.map((r) => (
                      <button 
                        key={r.id}
                        onClick={() => setActiveRSK(r)}
                        className={`w-full text-left p-2.5 rounded-xl border text-[11px] font-semibold transition-all ${
                          activeRSK.id === r.id 
                            ? 'bg-[#2D5A27] text-white border-[#2D5A27]' 
                            : 'bg-[#F8F9F5] border-[#E0E5D8] hover:bg-[#F0F4E8]'
                        }`}
                      >
                        🏢 {r.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-[#F0F4E8]/50 border border-[#E0E5D8] text-[11px] text-[#5C6B5C]">
                  Rythu Seva Kendras are state government community hubs assisting small farmers with high-yield seed allocation, pesticide subsidies, and drone tilling services.
                </div>
              </div>

              {/* Ticket creation and status history */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Form to submit ticket */}
                <div className="bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9A8A] mb-4">File New Crop Clinic Alert</h3>
                  <form onSubmit={submitEscalationTicket} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-[#8A9A8A]">Topic Subject:</label>
                        <input 
                          type="text" 
                          value={newTicketSubject}
                          onChange={(e) => setNewTicketSubject(e.target.value)}
                          placeholder="e.g. Stem rotting in my cotton squares"
                          className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] outline-none"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-[#8A9A8A]">Alert Category:</label>
                        <select 
                          value={newTicketCategory}
                          onChange={(e) => setNewTicketCategory(e.target.value as any)}
                          className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] font-semibold outline-none"
                        >
                          <option value="Disease Outbreak">Disease Outbreak</option>
                          <option value="Soil Quality">Soil Quality</option>
                          <option value="Irrigation Issue">Irrigation Issue</option>
                          <option value="Scheme Eligibility">Scheme Eligibility</option>
                          <option value="Market Sales">Market Sales</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-[#8A9A8A]">Detailed Problem Description:</label>
                      <textarea 
                        value={newTicketDescription}
                        onChange={(e) => setNewTicketDescription(e.target.value)}
                        placeholder="Detail recent rainfall patterns, visible leaf discoloration, or fertilizer application steps..."
                        className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] outline-none h-24 resize-none"
                        required
                      ></textarea>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#8A9A8A]">Submitting on behalf of: <strong>{activeFarmer.name}</strong></span>
                      <button 
                        type="submit"
                        disabled={submittingTicket}
                        className="bg-[#2D5A27] text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-[#20401C] disabled:opacity-50 transition-colors"
                      >
                        {submittingTicket ? 'Transmitting Alert...' : 'Transmit Escalation Ticket'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* History list of tickets */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#2D3628]">Recent Incident logs</h3>
                  
                  {tickets.map((t) => (
                    <div key={t.id} className="bg-white rounded-2xl p-5 border border-[#E0E5D8] shadow-sm">
                      <div className="flex justify-between items-start border-b border-[#F0F4E8] pb-3 mb-3">
                        <div>
                          <span className="text-[9px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-extrabold uppercase">
                            {t.category}
                          </span>
                          <h4 className="text-sm font-bold text-[#1A2E1A] mt-1.5">{t.subject}</h4>
                          <p className="text-[10px] text-[#8A9A8A] mt-0.5">Filed: {t.dateCreated} • Assigned to: {t.assignedRSKName}</p>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg ${
                          t.status === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800 animate-pulse'
                        }`}>
                          ● {t.status}
                        </span>
                      </div>

                      <p className="text-xs text-[#2D3628] leading-relaxed mb-4">"{t.description}"</p>

                      {t.expertNotes && (
                        <div className="p-4 bg-[#F0F4E8] rounded-xl border border-[#E0E5D8] text-xs">
                          <div className="flex justify-between font-bold text-[#2D5A27] mb-1.5">
                            <span>Advisory Reply from Officer {t.assignedExpert}:</span>
                            <span className="text-[10px] text-[#8A9A8A]">Resolved on: {t.resolutionDate}</span>
                          </div>
                          <p className="italic text-[#2D3628]">"{t.expertNotes}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>
        )}

        {activeTab === 'farm-gis' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#E0E5D8] shadow-sm">
              <h2 className="text-xl font-bold text-[#1A2E1A] flex items-center gap-2">
                <Map className="w-6 h-6 text-[#2D5A27]" /> Interactive Farm GIS & Plot Boundary Tracker
              </h2>
              <p className="text-xs text-[#8A9A8A] mt-1">
                Pin dynamic farm locations, drag indicators, load high-definition satellite terrain mapping, and draw precise crop-plot vector boundary polygons to calculate real-time acreages.
              </p>
            </div>
            
            <Suspense fallback={<div className="p-12 text-center text-sm text-[#2D3628]/60 font-sans bg-white border border-[#E0E5D8] rounded-3xl">Loading Farm GIS Map...</div>}>
              <LeafletMapView activeFarmerId={activeFarmerId} />
            </Suspense>
          </div>
        )}

        {activeTab === 'smart-alerts' && (
          <div className="space-y-6">
            <Suspense fallback={<div className="p-12 text-center text-sm text-[#2D3628]/60 font-sans bg-white border border-[#E0E5D8] rounded-3xl">Loading Alert Control Hub...</div>}>
              <SmartAlertHub 
                farmers={farmers} 
                activeFarmerId={activeFarmerId} 
                onFarmerChange={(id) => {
                  setActiveFarmerId(id);
                  const matched = farmers.find(f => f.id === id);
                  if (matched) setActiveFarmer(matched);
                }}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'surveillance' && (
          <div className="space-y-6 animate-fade-in">
            <Suspense fallback={<div className="p-12 text-center text-sm text-[#2D3628]/60 font-sans bg-white border border-[#E0E5D8] rounded-3xl">Loading AI Surveillance Module...</div>}>
              <SurveillanceDashboard />
            </Suspense>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-6 animate-fade-in">
            <Suspense fallback={<div className="p-12 text-center text-sm text-[#2D3628]/60 font-sans bg-white border border-[#E0E5D8] rounded-3xl">Loading Agricultural Finance Module...</div>}>
              <FinanceDashboard activeFarmerId={activeFarmerId} />
            </Suspense>
          </div>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="bg-white border-t border-[#E0E5D8] mt-12 py-8 px-6 lg:px-12 text-center text-[#8A9A8A] text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#2D5A27] rounded-lg flex items-center justify-center text-white font-extrabold">K</div>
            <span className="font-bold text-[#2D3628]">Kisan Alert AI</span>
          </div>
          <p>© 2026 Ministry of Agriculture &amp; Welfare. Coordinated via Rythu Seva Kendrams (RSK).</p>
          <div className="flex gap-4">
            <button className="hover:underline hover:text-[#2D5A27]">Privacy Policy</button>
            <button className="hover:underline hover:text-[#2D5A27]">User Manual</button>
            <button className="hover:underline hover:text-[#2D5A27]">SMS Gateway Portal</button>
          </div>
        </div>
      </footer>

      {/* ==================== MODAL: ADD NEW FARMER PROFILE ==================== */}
      {showNewFarmerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#E0E5D8]">
            <div className="flex justify-between items-center border-b border-[#F0F4E8] pb-3 mb-4">
              <h3 className="font-bold text-base text-[#1A2E1A]">Add Farm &amp; Soil Profile</h3>
              <button onClick={() => setShowNewFarmerModal(false)} className="p-1 hover:bg-[#F8F9F5] rounded-full text-[#8A9A8A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFarmer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Farmer Name:</label>
                  <input 
                    type="text" 
                    value={newFarmerName}
                    onChange={(e) => setNewFarmerName(e.target.value)}
                    placeholder="e.g. S. Venkat"
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Phone Number:</label>
                  <input 
                    type="text" 
                    value={newFarmerPhone}
                    onChange={(e) => setNewFarmerPhone(e.target.value)}
                    placeholder="9944..."
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">State:</label>
                  <select 
                    value={newFarmerState}
                    onChange={(e) => setNewFarmerState(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] font-semibold"
                  >
                    {Object.keys(INDIAN_STATES_DISTRICTS).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">District:</label>
                  <select 
                    value={newFarmerDistrict}
                    onChange={(e) => setNewFarmerDistrict(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] font-semibold"
                  >
                    {(INDIAN_STATES_DISTRICTS[newFarmerState as keyof typeof INDIAN_STATES_DISTRICTS] || []).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Taluka / Hobli:</label>
                  <input 
                    type="text" 
                    value={newFarmerTaluka}
                    onChange={(e) => setNewFarmerTaluka(e.target.value)}
                    placeholder="Tenali"
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-[#F0F4E8] pt-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Soil Type:</label>
                  <select 
                    value={newFarmerSoilType}
                    onChange={(e) => setNewFarmerSoilType(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5] font-semibold"
                  >
                    <option value="Black Cotton">Black Cotton</option>
                    <option value="Clayey">Clayey</option>
                    <option value="Sandy">Sandy</option>
                    <option value="Loamy">Loamy</option>
                    <option value="Red">Red</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">pH Level:</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="3.0" 
                    max="10.0"
                    value={newFarmerPh}
                    onChange={(e) => setNewFarmerPh(parseFloat(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Farm Acres:</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={newFarmerSize}
                    onChange={(e) => setNewFarmerSize(parseFloat(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-b border-[#F0F4E8] pb-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-red-700">Nitrogen (N):</label>
                  <input 
                    type="number" 
                    value={newFarmerN}
                    onChange={(e) => setNewFarmerN(parseInt(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-orange-600">Phosphorus (P):</label>
                  <input 
                    type="number" 
                    value={newFarmerP}
                    onChange={(e) => setNewFarmerP(parseInt(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#2D5A27]">Potassium (K):</label>
                  <input 
                    type="number" 
                    value={newFarmerK}
                    onChange={(e) => setNewFarmerK(parseInt(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Primary Crop:</label>
                  <input 
                    type="text" 
                    value={newFarmerCrop}
                    onChange={(e) => setNewFarmerCrop(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-[#8A9A8A]">Water Depth (Ft):</label>
                  <input 
                    type="number" 
                    value={newFarmerGroundwater}
                    onChange={(e) => setNewFarmerGroundwater(parseInt(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E0E5D8] bg-[#F8F9F5]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={newFarmerOrganic}
                  onChange={(e) => setNewFarmerOrganic(e.target.checked)}
                  id="modal-organic-certified"
                  className="w-4 h-4 text-[#2D5A27] rounded"
                />
                <label htmlFor="modal-organic-certified" className="text-xs font-bold select-none cursor-pointer">
                  🌱 Certified Organic Sowing Lands
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#2D5A27] text-white text-xs font-bold py-3 rounded-xl hover:bg-[#20401C] transition-all"
              >
                Register Farm Profile &amp; Load Dashboard
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EMERGENCY TRIGGER Protocols ==================== */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-red-200">
            <div className="flex justify-between items-center border-b border-red-100 pb-3 mb-4">
              <h3 className="font-extrabold text-base text-red-600 flex items-center gap-1.5 uppercase tracking-wide">
                🚨 Trigger Regional Emergency Protocol
              </h3>
              <button 
                onClick={() => setShowEmergencyModal(false)} 
                className="p-1 hover:bg-red-50 rounded-full text-red-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5C6B5C] mb-4">
              Select the active crisis category to broadcast instant warning notifications to all connected farmers, localized smart siren nodes, and the nearest Rythu Seva Kendram.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { type: "Wildfire / Heat Burn", icon: "🔥", desc: "Spreading brush fire" },
                { type: "Flood Inundation", icon: "🌊", desc: "Siphon bund overflow" },
                { type: "Smoke / Short-circuit", icon: "💨", desc: "Pump panel malfunction" },
                { type: "Storm / High Winds", icon: "🌪️", desc: "Severe wind hazard" },
                { type: "Intrusion / Theft", icon: "👤", desc: "Intruder detected" },
                { type: "Wild Animal Attack", icon: "🐗", desc: "Boar swarm damage" },
                { type: "Solar Fence Failure", icon: "⚡", desc: "Voltage drop detected" },
                { type: "Borewell Pump Failure", icon: "🔌", desc: "No discharge pressure" }
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => triggerEmergency(item.type)}
                  className="p-3 bg-[#FAFBF9] hover:bg-red-50 border border-[#E0E5D8] hover:border-red-300 rounded-2xl text-left transition-all active:scale-[0.98] cursor-pointer group"
                >
                  <span className="text-xl block mb-1 group-hover:scale-110 transition-transform">{item.icon}</span>
                  <p className="text-xs font-bold text-[#1A2E1A] group-hover:text-red-600">{item.type}</p>
                  <p className="text-[10px] text-[#8A9A8A]">{item.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3 text-xs">
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="px-4 py-2 bg-[#F8F9F5] border border-[#E0E5D8] rounded-xl font-bold text-[#5C6B5C]"
              >
                Cancel Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MULTILINGUAL REGIONAL CHAT BOT FLOATING WIDGET */}
      <Suspense fallback={null}>
        <FloatingAssistant 
          activeFarmerId={activeFarmerId} 
          activeFarmer={activeFarmer} 
          liveWeather={liveWeather}
          alertsCount={alerts.filter(a => !a.isRead).length}
        />
      </Suspense>

      </div>
    </div>
  );
}
