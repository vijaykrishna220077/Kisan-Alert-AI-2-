import express from "express";
import { Type } from "@google/genai";
import { getGeminiClient } from "./aiGateway.js";

// Create router
export const alertRouter = express.Router();

// =========================================================================
// 1. DATA MODELS & SCHEMAS (In-Memory Database Collections)
// =========================================================================

export interface FarmerPreference {
  farmerId: string;
  preferredLanguage: "English" | "Hindi" | "Telugu" | "Tamil" | "Kannada" | "Malayalam";
  preferredChannel: "SMS" | "WhatsApp" | "Push" | "Voice";
  notificationFrequency: "Immediate" | "Daily Summary" | "Weekly Advisory" | "Seasonal Guidance";
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string;   // e.g. "06:00"
  categories: string[];    // e.g. ["Weather", "Irrigation", "Fertilizer", "Disease", "Pest", "Market", "Government Scheme", "Emergency"]
}

export interface NotificationTemplate {
  id: string;
  category: string;
  channel: "SMS" | "WhatsApp" | "Push" | "Voice";
  language: string;
  titleTemplate: string;
  bodyTemplate: string;
}

export interface NotificationQueueItem {
  id: string;
  farmerId: string;
  farmerName: string;
  phone: string;
  channel: "SMS" | "WhatsApp" | "Push" | "Voice";
  language: string;
  category: string;
  priority: "Urgent" | "High" | "Normal";
  title: string;
  message: string;
  scheduledTime: string; // ISO String
  status: "Pending" | "Sending" | "Sent" | "Failed";
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
}

export interface NotificationLog {
  id: string;
  farmerId: string;
  farmerName: string;
  phoneEncrypted: string; // Sensitive data encryption mock
  channel: "SMS" | "WhatsApp" | "Push" | "Voice";
  language: string;
  category: string;
  priority: "Urgent" | "High" | "Normal";
  title: string;
  message: string;
  sentTime: string;
  status: "Delivered" | "Failed";
  confidenceScore: number;
  reason: string;
  metadata?: any;
  errorMessage?: string;
}

export interface WeatherAlertRecord {
  id: string;
  village: string;
  district: string;
  state: string;
  severity: "info" | "warning" | "alert";
  conditionType: string; // "Heavy Rain", "Heat Wave", "Cyclone", etc.
  temperatureCelsius: number;
  humidityPercent: number;
  predictedRainfallMm: number;
  windSpeedKmph: number;
  timestamp: string;
}

export interface DiseaseAlertRecord {
  id: string;
  cropName: string;
  diseaseName: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  organicRemedy: string;
  chemicalRemedy: string;
  timestamp: string;
}

export interface MarketAlertRecord {
  id: string;
  cropName: string;
  mandiName: string;
  state: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  volumeArrivalTons: number;
  timestamp: string;
}

export interface GovSchemeAlertRecord {
  id: string;
  schemeId: string;
  schemeName: string;
  subsidyPercentage: number;
  deadlineDate: string;
  eligibility: string;
  timestamp: string;
}

export interface DeliveryReport {
  logId: string;
  gatewayStatus: "Delivered" | "Failed";
  deliveredTime: string;
  retryAttempts: number;
  latencyMs: number;
}

// =========================================================================
// 2. SEED DATA (Simulating Database Tables)
// =========================================================================

export const farmersDb: any[] = [
  {
    id: "FMR-701",
    name: "Ramesh Reddy",
    phone: "9876543210",
    state: "Andhra Pradesh",
    district: "Guntur",
    village: "Tenali",
    farmSizeAcres: 4.5,
    primaryCrop: "Chilli",
    soilType: "Black Cotton",
    soilPh: 6.8,
    nValue: 42,
    pValue: 18,
    kValue: 125,
    groundwaterLevelFt: 220,
    groundwaterSource: "Borewell",
    organicCertified: false
  },
  {
    id: "FMR-802",
    name: "Basavaraj Gowda",
    phone: "8765432109",
    state: "Karnataka",
    district: "Belagavi",
    village: "Gokak",
    farmSizeAcres: 8.0,
    primaryCrop: "Sugarcane",
    soilType: "Clayey",
    soilPh: 7.2,
    nValue: 55,
    pValue: 12,
    kValue: 160,
    groundwaterLevelFt: 85,
    groundwaterSource: "Canal",
    organicCertified: true
  },
  {
    id: "FMR-903",
    name: "Kavitha Murugan",
    phone: "7654321098",
    state: "Tamil Nadu",
    district: "Salem",
    village: "Omalur",
    farmSizeAcres: 2.2,
    primaryCrop: "Tapioca",
    soilType: "Red",
    soilPh: 6.1,
    nValue: 35,
    pValue: 28,
    kValue: 110,
    groundwaterLevelFt: 310,
    groundwaterSource: "Rainfed",
    organicCertified: false
  },
  {
    id: "FMR-904",
    name: "Satnam Singh",
    phone: "9411223344",
    state: "Punjab",
    district: "Bathinda",
    village: "Rampura",
    farmSizeAcres: 12.5,
    primaryCrop: "Paddy (Rice)",
    soilType: "Alluvial",
    soilPh: 7.5,
    nValue: 65,
    pValue: 15,
    kValue: 140,
    groundwaterLevelFt: 150,
    groundwaterSource: "Canal",
    organicCertified: false
  }
];

export const preferencesDb: FarmerPreference[] = [
  {
    farmerId: "FMR-701",
    preferredLanguage: "Telugu",
    preferredChannel: "WhatsApp",
    notificationFrequency: "Immediate",
    quietHoursStart: "22:00",
    quietHoursEnd: "06:00",
    categories: ["Weather", "Irrigation", "Fertilizer", "Disease", "Pest", "Market", "Government Scheme", "Emergency"]
  },
  {
    farmerId: "FMR-802",
    preferredLanguage: "Kannada",
    preferredChannel: "SMS",
    notificationFrequency: "Daily Summary",
    quietHoursStart: "21:30",
    quietHoursEnd: "06:30",
    categories: ["Weather", "Irrigation", "Fertilizer", "Disease", "Market", "Emergency"]
  },
  {
    farmerId: "FMR-903",
    preferredLanguage: "Tamil",
    preferredChannel: "Voice",
    notificationFrequency: "Immediate",
    quietHoursStart: "22:00",
    quietHoursEnd: "05:30",
    categories: ["Weather", "Irrigation", "Disease", "Pest", "Government Scheme", "Emergency"]
  },
  {
    farmerId: "FMR-904",
    preferredLanguage: "Hindi",
    preferredChannel: "Push",
    notificationFrequency: "Weekly Advisory",
    quietHoursStart: "23:00",
    quietHoursEnd: "06:00",
    categories: ["Weather", "Fertilizer", "Market", "Government Scheme", "Emergency"]
  }
];

export const templatesDb: NotificationTemplate[] = [
  // Weather SMS Templates
  {
    id: "T-WEATH-SMS",
    category: "Weather",
    channel: "SMS",
    language: "English",
    titleTemplate: "⚠️ Weather Alert",
    bodyTemplate: "Heavy rain expected tomorrow in {{village}}. Delay fertilizer application. Recommended irrigation: Do not irrigate today."
  },
  // Irrigation WhatsApp Templates
  {
    id: "T-IRRIG-WA",
    category: "Irrigation",
    channel: "WhatsApp",
    language: "English",
    titleTemplate: "💧 Irrigation Advisory",
    bodyTemplate: "Namaste {{farmerName}}! Your {{cropName}} crop requires {{waterMm}} mm of irrigation within the next 18 hours. Reason: No rainfall predicted for the next 5 days in {{village}}."
  },
  // Fertilizer SMS Templates
  {
    id: "T-FERT-SMS",
    category: "Fertilizer",
    channel: "SMS",
    language: "English",
    titleTemplate: "🌱 Fertilizer Alert",
    bodyTemplate: "Nitrogen level is low on your farm in {{village}}. Recommended: Urea (45 kg/acre). Apply after 2 days as rain is predicted tomorrow."
  },
  // Disease WhatsApp Templates
  {
    id: "T-DISEASE-WA",
    category: "Disease",
    channel: "WhatsApp",
    language: "English",
    titleTemplate: "🔬 Disease Detection Alert",
    bodyTemplate: "AI Detected {{diseaseName}} in {{cropName}} in {{district}} (Confidence: {{confidence}}%). Treatment: {{medicine}}. Organic Alt: {{organicAlt}}. Nearest Expert: {{expert}}."
  },
  // Pest SMS Templates
  {
    id: "T-PEST-SMS",
    category: "Pest",
    channel: "SMS",
    language: "English",
    titleTemplate: "🐛 Pest Alert",
    bodyTemplate: "High risk of {{pestName}} in your village {{village}}. Inspect crops today. Spray recommended treatment within 48 hours."
  },
  // Market SMS Templates
  {
    id: "T-MARKET-SMS",
    category: "Market",
    channel: "SMS",
    language: "English",
    titleTemplate: "📈 Market Rate Surge",
    bodyTemplate: "Chilli prices rose by 5.4% at Guntur Cotton Yard, now at ₹19,500/quintal. Recommended: Good day to harvest & sell."
  },
  // Scheme SMS Templates
  {
    id: "T-SCHEME-SMS",
    category: "Government Scheme",
    channel: "SMS",
    language: "English",
    titleTemplate: "🏛️ Government Scheme Announcement",
    bodyTemplate: "Subsidies under PM-KISAN are open. Last date to register is July 15. Check eligibility at Rythu Seva Kendram."
  },
  // Emergency WhatsApp Templates
  {
    id: "T-EMERG-WA",
    category: "Emergency",
    channel: "WhatsApp",
    language: "English",
    titleTemplate: "🚨 EMERGENCY ALERT",
    bodyTemplate: "CRITICAL: Severe Cyclone / High Winds expected in {{district}} district. Move harvested stock to covered shelters immediately."
  }
];

export const queueDb: NotificationQueueItem[] = [];
export const logsDb: NotificationLog[] = [];
export const deliveryReportsDb: DeliveryReport[] = [];

// Raw alerts records
export const weatherAlertsDb: WeatherAlertRecord[] = [];
export const diseaseAlertsDb: DiseaseAlertRecord[] = [];
export const marketAlertsDb: MarketAlertRecord[] = [];
export const govSchemesAlertsDb: GovSchemeAlertRecord[] = [];

// Preseed some logs so the admin dashboard charts look amazing right away
const seedLogs = [
  {
    id: "LOG-001",
    farmerId: "FMR-701",
    farmerName: "Ramesh Reddy",
    phoneEncrypted: "enc_9876543210",
    channel: "WhatsApp" as const,
    language: "Telugu",
    category: "Weather",
    priority: "Normal" as const,
    title: "⚠️ వాతావరణ హెచ్చరిక",
    message: "రమేష్ గారు, తెనాలి లో రేపు భారీ వర్షం పడే అవకాశం ఉంది. ఎరువుల వాడకాన్ని వాయిదా వేయండి. నేడు నీటి పారుదల నిలిపివేయండి.",
    sentTime: new Date(Date.now() - 36 * 3600000).toISOString(),
    status: "Delivered" as const,
    confidenceScore: 92,
    reason: "Severe rainfall event forecast triggered by regional IMD radar telemetry analysis."
  },
  {
    id: "LOG-002",
    farmerId: "FMR-802",
    farmerName: "Basavaraj Gowda",
    phoneEncrypted: "enc_8765432109",
    channel: "SMS" as const,
    language: "Kannada",
    category: "Irrigation",
    priority: "High" as const,
    title: "💧 ನೀರಾವರಿ ಸಲಹೆ",
    message: "ಬಸವರಾಜ್ ಅವರೇ, ನಿಮ್ಮ ಕಬ್ಬು ಬೆಳೆಗೆ ಮುಂದಿನ 18 ಗಂಟೆಗಳಲ್ಲಿ ನೀರಾವರಿ ಅಗತ್ಯವಿದೆ. 22 ಎಂಎಂ ನೀರು ಹಾಯಿಸಿ. ಕಾರಣ: ಮುಂದಿನ 5 ದಿನ ಮಳೆ ಇಲ್ಲ.",
    sentTime: new Date(Date.now() - 24 * 3600000).toISOString(),
    status: "Delivered" as const,
    confidenceScore: 89,
    reason: "Soil moisture dropped to critical threshold of 35% on telemetry block A4."
  },
  {
    id: "LOG-003",
    farmerId: "FMR-903",
    farmerName: "Kavitha Murugan",
    phoneEncrypted: "enc_7654321098",
    channel: "Voice" as const,
    language: "Tamil",
    category: "Pest",
    priority: "High" as const,
    title: "🐛 பூச்சி தாக்குதல் எச்சரிக்கை",
    message: "கவிதா அவர்களே, உங்கள் கிராமத்தில் பூச்சி தாக்குதல் ஆபத்து அதிகம். பயிர்களை உடனே ஆய்வு செய்து மருந்து தெளிக்கவும்.",
    sentTime: new Date(Date.now() - 12 * 3600000).toISOString(),
    status: "Delivered" as const,
    confidenceScore: 94,
    reason: "Pest outbreak reports verified within 3.5 km radius of Omalur coordinate points."
  },
  {
    id: "LOG-004",
    farmerId: "FMR-904",
    farmerName: "Satnam Singh",
    phoneEncrypted: "enc_9411223344",
    channel: "Push" as const,
    language: "Hindi",
    category: "Fertilizer",
    priority: "Normal" as const,
    title: "🌱 उर्वरक सलाह",
    message: "सतनाम जी, आपके रामपुर खेत में नाइट्रोजन की कमी है। यूरिया (45 किलोग्राम/एकड़) का प्रयोग करें।",
    sentTime: new Date(Date.now() - 6 * 3600000).toISOString(),
    status: "Delivered" as const,
    confidenceScore: 91,
    reason: "Satellite NDVI nitrogen band index dropped from 0.72 to 0.58."
  },
  {
    id: "LOG-005",
    farmerId: "FMR-701",
    farmerName: "Ramesh Reddy",
    phoneEncrypted: "enc_9876543210",
    channel: "WhatsApp" as const,
    language: "Telugu",
    category: "Emergency",
    priority: "Urgent" as const,
    title: "🚨 అత్యవసర హెచ్చరిక",
    message: "ముందస్తు హెచ్చరిక: గుంటూరు జిల్లాలో తీవ్రమైన తుఫాను వచ్చే ముప్పు ఉంది! కోసిన పంటను సురక్షిత ప్రాంతానికి తరలించండి.",
    sentTime: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: "Delivered" as const,
    confidenceScore: 99,
    reason: "Cyclone Warning Center issued high-priority alert overriding normal schedules."
  },
  {
    id: "LOG-006",
    farmerId: "FMR-802",
    farmerName: "Basavaraj Gowda",
    phoneEncrypted: "enc_8765432109",
    channel: "SMS" as const,
    language: "Kannada",
    category: "Market",
    priority: "Normal" as const,
    title: "📈 ಮಾರುಕಟ್ಟೆ ದರ",
    message: "ಕಬ್ಬಿನ ಬೆಲೆ ಕ್ವಿಂಟಾಲ್‌ಗೆ ₹3,400 ಕ್ಕೆ ಏರಿಕೆಯಾಗಿದೆ. ಕಟಾವು ಮಾಡಲು ಮತ್ತು ಮಾರಾಟ ಮಾಡಲು ಉತ್ತಮ ಸಮಯ.",
    sentTime: new Date(Date.now() - 1 * 3600000).toISOString(),
    status: "Failed" as const,
    errorMessage: "Carrier Gateway Timeout (Cell tower unreachable in heavy rainfall zone)",
    confidenceScore: 85,
    reason: "Price escalation exceeding 5% triggers direct automated market advisories."
  }
];

logsDb.push(...seedLogs);

// Seed delivery reports
deliveryReportsDb.push(
  { logId: "LOG-001", gatewayStatus: "Delivered", deliveredTime: new Date(Date.now() - 36 * 3600000 + 4000).toISOString(), retryAttempts: 0, latencyMs: 1420 },
  { logId: "LOG-002", gatewayStatus: "Delivered", deliveredTime: new Date(Date.now() - 24 * 3600000 + 12000).toISOString(), retryAttempts: 1, latencyMs: 3450 },
  { logId: "LOG-003", gatewayStatus: "Delivered", deliveredTime: new Date(Date.now() - 12 * 3600000 + 8000).toISOString(), retryAttempts: 0, latencyMs: 2110 },
  { logId: "LOG-004", gatewayStatus: "Delivered", deliveredTime: new Date(Date.now() - 6 * 3600000 + 1500).toISOString(), retryAttempts: 0, latencyMs: 1100 },
  { logId: "LOG-005", gatewayStatus: "Delivered", deliveredTime: new Date(Date.now() - 2 * 3600000 + 900).toISOString(), retryAttempts: 0, latencyMs: 650 },
  { logId: "LOG-006", gatewayStatus: "Failed", deliveredTime: new Date(Date.now() - 1 * 3600000).toISOString(), retryAttempts: 3, latencyMs: 18400 }
);

// =========================================================================
// 3. DICTIONARY TRANSLATIONS (For robust multilingual fallback fallback)
// =========================================================================

const TRANSLATION_CATALOG: Record<string, Record<string, string>> = {
  Hindi: {
    "Weather Alert": "⚠️ मौसम की चेतावनी",
    "Heavy rain expected tomorrow. Delay fertilizer application. Recommended irrigation: Do not irrigate today.": "कल भारी बारिश की आशंका है। उर्वरक डालने से बचें। अनुशंसित सिंचाई: आज सिंचाई न करें।",
    "Irrigation Advisory": "💧 सिंचाई की सलाह",
    "Your cotton crop requires irrigation within the next 18 hours. Recommended water: 22 mm. Reason: No rainfall predicted for the next 5 days.": "आपकी कपास की फसल को अगले 18 घंटों में सिंचाई की आवश्यकता है। अनुशंसित पानी: 22 मिमी। कारण: अगले 5 दिनों तक बारिश की कोई भविष्यवाणी नहीं है।",
    "Fertilizer Alert": "🌱 उर्वरक की चेतावनी",
    "Nitrogen level is low. Recommended: Urea. Quantity: 45 kg/acre. Apply after 2 days because rainfall is expected tomorrow.": "नाइट्रोजन का स्तर कम है। अनुशंसित: यूरिया। मात्रा: 45 किलोग्राम/एकड़। 2 दिनों के बाद लागू करें क्योंकि कल बारिश होने की संभावना है।",
    "Disease Detection Alert": "🔬 रोग निवारण अलर्ट",
    "Pest Alert": "🐛 कीट प्रकोप चेतावनी",
    "High risk of Fall Armyworm in your village. Recommended action: Inspect crops today. Spray within 48 hours if infestation is confirmed.": "आपके गाँव में फॉल आर्मीवर्म कीट का अत्यधिक खतरा है। अनुशंसित कार्रवाई: आज ही फसलों का निरीक्षण करें। प्रकोप की पुष्टि होने पर 48 घंटे के भीतर अनुशंसित दवा का छिड़काव करें।",
    "Market Rate Surge": "📈 बाजार मूल्य में वृद्धि",
    "Government Scheme Announcement": "🏛️ सरकारी योजना घोषणा",
    "EMERGENCY ALERT": "🚨 आपातकालीन अलर्ट",
    "CRITICAL: Severe cyclone or flooding expected in your district. Move harvested stock to covered shelters immediately.": "गंभीर चेतावनी: आपके जिले में भारी चक्रवात या बाढ़ की आशंका है। कटे हुए अनाज को तुरंत सुरक्षित शेड में ले जाएं।"
  },
  Telugu: {
    "Weather Alert": "⚠️ వాతావరణ హెచ్చరిక",
    "Heavy rain expected tomorrow. Delay fertilizer application. Recommended irrigation: Do not irrigate today.": "రేపు భారీ వర్షం కురిసే అవకాశం ఉంది. ఎరువులు చల్లడం వాయిదా వేయండి. నేడు పంటకు నీరు పెట్టకండి.",
    "Irrigation Advisory": "💧 నీటి పారుదల సలహా",
    "Your cotton crop requires irrigation within the next 18 hours. Recommended water: 22 mm. Reason: No rainfall predicted for the next 5 days.": "మీ పత్తి పంటకు రాబోయే 18 గಂಟల్లో నీరు అవసరం. అవసరమైన మోతాదు: 22 మి.మీ. కారణం: వచ్చే 5 రోజులు వర్ష సూచన లేదు.",
    "Fertilizer Alert": "🌱 ఎరువుల హెచ్చరిక",
    "Nitrogen level is low. Recommended: Urea. Quantity: 45 kg/acre. Apply after 2 days because rainfall is expected tomorrow.": "నేలలో నత్రజని లోపం ఉంది. సిఫార్సు: యూరియా. మోతాదు: 45 కేజీలు/ఎకరా. రేపు వర్షం వచ్చే అవకాశం ఉన్నందున ఎరువును 2 రోజుల తరువాత వేయండి.",
    "Disease Detection Alert": "🔬 తెగుళ్ళ నిర్ధారణ హెచ్చరిక",
    "Pest Alert": "🐛 పురుగుల ముప్పు హెచ్చరిక",
    "High risk of Fall Armyworm in your village. Recommended action: Inspect crops today. Spray within 48 hours if infestation is confirmed.": "మీ గ్రామంలో కత్తెర పురుగు దాడి చేసే ప్రమాదం ఉంది. నేడే పంటను పరిశీలించండి. తెగులు నిర్ధారణ అయితే 48 గంటల్లో మందు పిచికారీ చేయండి.",
    "Market Rate Surge": "📈 మార్కెట్ ధరల పెరుగుదల",
    "Government Scheme Announcement": "🏛️ ప్రభుత్వ పథకాల సమాచారం",
    "EMERGENCY ALERT": "🚨 అత్యవసర హెచ్చరిక",
    "CRITICAL: Severe cyclone or flooding expected in your district. Move harvested stock to covered shelters immediately.": "అత్యంత ప్రమాదం: మీ జిల్లాలో తీవ్ర తుఫాను లేదా వరద ముప్పు ఉంది! కోసిన పంటను వెంటనే సురక్షిత గోదాములకు తరలించండి."
  },
  Tamil: {
    "Weather Alert": "⚠️ வானிலை எச்சரிக்கை",
    "Heavy rain expected tomorrow. Delay fertilizer application. Recommended irrigation: Do not irrigate today.": "நாளை கனமழை பெய்யக்கூடும். உரம் போடுவதை தள்ளிப்போடுங்கள். இன்று நீர் பாய்ச்ச வேண்டாம்.",
    "Irrigation Advisory": "💧 பாசன ஆலோசனை",
    "Your cotton crop requires irrigation within the next 18 hours. Recommended water: 22 mm. Reason: No rainfall predicted for the next 5 days.": "உங்கள் பருத்தி பயிருக்கு அடுத்த 18 மணி நேரத்திற்குள் பாசனம் தேவை. பரிந்துரைக்கப்படும் அளவு: 22 மிமீ. காரணம்: அடுத்த 5 நாட்களுக்கு மழை இல்லை.",
    "Fertilizer Alert": "🌱 உர எச்சரிக்கை",
    "Nitrogen level is low. Recommended: Urea. Quantity: 45 kg/acre. Apply after 2 days because rainfall is expected tomorrow.": "நைட்ரஜனின் அளவு குறைவாக உள்ளது. பரிந்துரை: யூரியா. அளவு: 45 கிலோ/ஏக்கர். நாளை மழை என்பதால் இன்னும் 2 நாட்கள் கழித்து உரமிடுங்கள்.",
    "Disease Detection Alert": "🔬 நோய் கண்டறிதல் எச்சரிக்கை",
    "Pest Alert": "🐛 பூச்சி தாக்குதல் எச்சரிக்கை",
    "High risk of Fall Armyworm in your village. Recommended action: Inspect crops today. Spray within 48 hours if infestation is confirmed.": "உங்கள் கிராமத்தில் படைப்புழு தாக்குதல் அபாயம் அதிகம் உள்ளது. இன்றே பயிர்களை ஆய்வு செய்யவும். உறுதியானால் 48 மணி நேரத்திற்குள் மருந்து தெளிக்கவும்.",
    "Market Rate Surge": "📈 சந்தை விலை நிலவரம்",
    "Government Scheme Announcement": "🏛️ அரசு நலத்திட்ட அறிவிப்பு",
    "EMERGENCY ALERT": "🚨 அவசர எச்சரிக்கை",
    "CRITICAL: Severe cyclone or flooding expected in your district. Move harvested stock to covered shelters immediately.": "மிகவும் ஆபத்தானது: உங்கள் மாவட்டத்தில் தீவிர புயல் அல்லது வெள்ள அபாயம் உள்ளது! அறுவடை செய்த பயிர்களை உடனே பாதுகாப்பான இடங்களுக்கு மாற்றவும்."
  },
  Kannada: {
    "Weather Alert": "⚠️ ಹವಾಮಾನ ಸೂಚನೆ",
    "Heavy rain expected tomorrow. Delay fertilizer application. Recommended irrigation: Do not irrigate today.": "ನಾಳೆ ಭಾರಿ ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆ ಇದೆ. ರಸಗೊಬ್ಬರ ಹಾಕುವುದನ್ನು ಮುಂದೂಡಿ. ಇಂದಿನ ನೀರಾವರಿ ಬೇಡ.",
    "Irrigation Advisory": "💧 ನೀರಾವರಿ ಸಲಹೆ",
    "Your cotton crop requires irrigation within the next 18 hours. Recommended water: 22 mm. Reason: No rainfall predicted for the next 5 days.": "ನಿಮ್ಮ ಹತ್ತಿ ಬೆಳೆಗೆ ಮುಂದಿನ 18 ಗಂಟೆಗಳಲ್ಲಿ ನೀರಾವರಿ ಅಗತ್ಯವಿದೆ. ಶಿಫಾರಸು ಮಾಡಿದ ನೀರು: 22 ಎಂಎಂ. ಕಾರಣ: ಮುಂದಿನ 5 ದಿನ ಯಾವುದೇ ಮಳೆ ಇಲ್ಲ.",
    "Fertilizer Alert": "🌱 ರಸಗೊಬ್ಬರ ಮಾಹಿತಿ",
    "Nitrogen level is low. Recommended: Urea. Quantity: 45 kg/acre. Apply after 2 days because rainfall is expected tomorrow.": "ನೈಟ್ರೋಜನ್ ಪ್ರಮಾಣ ಕಡಿಮೆ ಇದೆ. ಶಿಫಾರಸು: ಯೂರಿಯಾ. ಪ್ರಮಾಣ: 45 ಕೆಜಿ/ಎಕರೆ. ನಾಳೆ ಮಳೆಯಾಗುವುದರಿಂದ 2 ದಿನಗಳ ನಂತರ ಉರ ಹಾಕಿ.",
    "Disease Detection Alert": "🔬 ರೋಗ ಪತ್ತೆ ಹಚ್ಚುವಿಕೆ ಎಚ್ಚರಿಕೆ",
    "Pest Alert": "🐛 ಕೀಟಬಾಧೆ ಎಚ್ಚರಿಕೆ",
    "High risk of Fall Armyworm in your village. Recommended action: Inspect crops today. Spray within 48 hours if infestation is confirmed.": "ನಿಮ್ಮ ಗ್ರಾಮದಲ್ಲಿ ಕತ್ತರಿ ಹುಳು ಕೀಟಬಾಧೆಯ ಹೆಚ್ಚಿನ ಅಪಾಯವಿದೆ. ಇಂದೇ ಬೆಳೆ ಪರಿಶೀಲಿಸಿ. ಖಚಿತವಾದರೆ 48 ಗಂಟೆಗಳೊಳಗೆ ಔಷಧ ಸಿಂಪಡಿಸಿ.",
    "Market Rate Surge": "📈 ಮಾರುಕಟ್ಟೆ ದರ ಏರಿಕೆ",
    "Government Scheme Announcement": "🏛️ ಸರ್ಕಾರಿ ಯೋಜನೆ ಮಾಹಿತಿ",
    "EMERGENCY ALERT": "🚨 ತುರ್ತು ಎಚ್ಚರಿಕೆ",
    "CRITICAL: Severe cyclone or flooding expected in your district. Move harvested stock to covered shelters immediately.": "ತುರ್ತು ಎಚ್ಚರಿಕೆ: ನಿಮ್ಮ ಜಿಲ್ಲೆಯಲ್ಲಿ ಭಾರಿ ಚಂಡಮಾರುತ ಅಥವಾ ಪ್ರವಾಹದ ಭೀತಿ ಇದೆ! ಕಟಾವು ಮಾಡಿದ ಧಾನ್ಯಗಳನ್ನು ಕೂಡಲೇ ಸುರಕ್ಷಿತ ಸ್ಥಳಕ್ಕೆ ಸಾಗಿಸಿ."
  },
  Malayalam: {
    "Weather Alert": "⚠️ കാലാവസ്ഥാ മുന്നറിയിപ്പ്",
    "Heavy rain expected tomorrow. Delay fertilizer application. Recommended irrigation: Do not irrigate today.": "നാളെ ശക്തമായ മഴയ്ക്ക് സാധ്യത. വളപ്രയോഗം മാറ്റിവെക്കുക. ഇന്ന് നനയ്ക്കരുത്.",
    "Irrigation Advisory": "💧 ജലസേചന ഉപദേശം",
    "Your cotton crop requires irrigation within the next 18 hours. Recommended water: 22 mm. Reason: No rainfall predicted for the next 5 days.": "നിങ്ങളുടെ പരുത്തി വിളയ്ക്ക് അടുത്ത 18 മണിക്കൂറിനുള്ളിൽ ജലസേചനം ആവശ്യമാണ്. ശുപാർശ ചെയ്ത വെള്ളം: 22 എംഎം. കാരണം: അടുത്ത 5 ദിവസത്തേക്ക് മഴയില്ല.",
    "Fertilizer Alert": "🌱 വളപ്രയോഗ മുന്നറിയിപ്പ്",
    "Nitrogen level is low. Recommended: Urea. Quantity: 45 kg/acre. Apply after 2 days because rainfall is expected tomorrow.": "നൈട്രജന്റെ അളവ് കുറവാണ്. ശുപാർശ: യൂറിയ. അളവ്: 45 കിലോഗ്രാം/ഏക്കർ. നാളെ മഴയ്ക്ക് സാധ്യതയുള്ളതിനാൽ 2 ദിവസത്തിനു ശേഷം പ്രയോഗിക്കുക.",
    "Disease Detection Alert": "🔬 രോഗനിർണ്ണയ മുന്നറിയിപ്പ്",
    "Pest Alert": "🐛 കീടബാധ മുന്നറിയിപ്പ്",
    "High risk of Fall Armyworm in your village. Recommended action: Inspect crops today. Spray within 48 hours if infestation is confirmed.": "നിങ്ങളുടെ ഗ്രാമത്തിൽ പട്ടാളപ്പുഴു കീടബാധയ്ക്ക് സാധ്യതയേറി. ഇന്ന് തന്നെ വിളകൾ പരിശോധിക്കുക. ബാധ സ്ഥിരീകരിച്ചാൽ 48 മണിക്കൂറിനുള്ളിൽ മരുന്ന് തളിക്കുക.",
    "Market Rate Surge": "📈 വിപണി വില വർദ്ധനവ്",
    "Government Scheme Announcement": "🏛️ സർക്കാർ പദ്ധതി അറിയിപ്പ്",
    "EMERGENCY ALERT": "🚨 അടിയന്തിര മുന്നറിയിപ്പ്",
    "CRITICAL: Severe cyclone or flooding expected in your district. Move harvested stock to covered shelters immediately.": "അടിയന്തിര മുന്നറിയിപ്പ്: നിങ്ങളുടെ ജില്ലയിൽ കടുത്ത ചുഴലിക്കാറ്റോ പ്രളയമോ ഉണ്ടായേക്കാം! വിളവെടുത്ത ധാന്യങ്ങൾ ഉടൻ സുരക്ഷിത സ്ഥാനത്തേക്ക് മാറ്റുക."
  }
};

function safeTranslate(text: string, lang: string): string {
  if (lang === "English") return text;
  const langSet = TRANSLATION_CATALOG[lang];
  if (langSet && langSet[text]) {
    return langSet[text];
  }
  // Fallback to text itself if catalog translation is missing
  return text;
}

// =========================================================================
// 4. SECURITY UTILITIES (Mock encryption, Rate limiting)
// =========================================================================

// Mock AES-like encryption for sensitive farmer data
function mockEncrypt(phone: string): string {
  const enc = Buffer.from(phone).toString("base64");
  return `enc_${enc.substring(0, 15)}`;
}

// Simple IP-based Rate Limiter simulation
const ipRateLimits = new Map<string, { count: number, resetTime: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitWindowMs = 60 * 1000; // 1 minute
  const maxRequests = 20;

  const userLimit = ipRateLimits.get(ip);
  if (!userLimit) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + limitWindowMs });
    return true;
  }

  if (now > userLimit.resetTime) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + limitWindowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

// =========================================================================
// 5. AI ENGINE & PERSONALIZATION ADVISORY (Gemini API Integration)
// =========================================================================

// Safe wrapper for Gemini content generation with exponential backoff and retry mechanism
// Rules-based advisory simulation (deterministic fallback used whenever no AI provider
// is configured, or when the AI Gateway reports every provider as unavailable/failed).
// Kept as a standalone function (not a recursive call) so a permanent AI failure can
// NEVER cause unbounded recursion or a stack overflow.
function buildRuleBasedAlert(
  farmer: any,
  alertCategory: string,
  rawAlertDetails: any,
  language: string
): { title: string, message: string, confidence: number, reasoning: string } {
    let title = "⚠️ Alert Advisory";
    let body = "";
    let confidence = 90;
    let reasoning = "Calculated via localized agronomical threshold rules mapping soil levels, satellite imagery, and weather data.";

    const fName = farmer.name;
    const crop = farmer.primaryCrop || "crop";
    const size = farmer.farmSizeAcres;
    const village = farmer.village || "village";
    const district = farmer.district;

    if (alertCategory === "Weather") {
      const type = rawAlertDetails.conditionType || "Heavy Rain";
      title = safeTranslate("Weather Alert", language);
      const textBase = `Heavy rain expected tomorrow in ${village}. Delay fertilizer application. Recommended irrigation: Do not irrigate today.`;
      body = `${title}\n\nNamaste ${fName} Ji!\n${safeTranslate(textBase, language)}`;
      confidence = 94;
      reasoning = `IMD Weather satellite Doppler radar shows unseasonable rain clouds gathering near ${district} district tilling sectors.`;
    } 
    else if (alertCategory === "Irrigation") {
      title = safeTranslate("Irrigation Advisory", language);
      const textBase = `Your cotton crop requires irrigation within the next 18 hours. Recommended water: 22 mm. Reason: No rainfall predicted for the next 5 days.`;
      const translatedText = safeTranslate(textBase, language)
        .replace("cotton", crop)
        .replace("22 mm", `${farmer.soilType === "Black Cotton" ? "18" : "25"} mm`)
        .replace("next 5 days", "next 6 days");
      
      body = `${title}\n\nNamaste ${fName}!\n${translatedText}`;
      confidence = 88;
      reasoning = `Ground telemetry lists groundwater level at ${farmer.groundwaterLevelFt} ft and soil moisture block at critical 38% under active transpiration cycle.`;
    } 
    else if (alertCategory === "Fertilizer") {
      title = safeTranslate("Fertilizer Alert", language);
      const textBase = `Nitrogen level is low. Recommended: Urea. Quantity: 45 kg/acre. Apply after 2 days because rainfall is expected tomorrow.`;
      const translatedText = safeTranslate(textBase, language)
        .replace("45 kg/acre", `${Math.floor(farmer.farmSizeAcres * 12)} kg Urea total`);
      
      body = `${title}\n\nDear ${fName},\n${translatedText}`;
      confidence = 91;
      reasoning = `NDVI chlorophyll spectrum scanning indicates nitrogen absorption values have fallen below recommended 50 mg/kg baseline in your ${crop} farm.`;
    } 
    else if (alertCategory === "Disease") {
      const disease = rawAlertDetails.diseaseName || "Leaf Blight";
      const treatment = rawAlertDetails.chemicalRemedy || "Copper Oxychloride @ 3g/L";
      const organic = rawAlertDetails.organicRemedy || "Sour buttermilk spray (5%)";
      title = safeTranslate("Disease Detection Alert", language);
      
      if (language === "Hindi") {
        body = `🔬 रोग निवारण चेतावनी\n\nनमस्ते ${fName} जी! आपके खेत में ${crop} पर ${disease} होने की आशंका (92% विश्वास) है।\nरासायनिक समाधान: ${treatment}\nजैविक विकल्प: ${organic}\nडॉ. के. एस. राव (नजदीकी केंद्र) से संपर्क करें।`;
      } else if (language === "Telugu") {
        body = `🔬 తెగుళ్ల నిర్ధారణ హెచ్చరిక\n\nనమస్కారం ${fName} గారు! మీ పంట ${crop} పై ${disease} తెగులు గుర్తించబడింది (విశ్వాసం: 92%).\nమందు: ${treatment}\nసేంద్రీయ ప్రత్యామ్నాయం: ${organic}\nసమీప వ్యవసాయ నిపుణుడు: డాక్టర్ శ్రీనివాసరావు.`;
      } else if (language === "Tamil") {
        body = `🔬 நோய் கண்டறிதல் எச்சரிக்கை\n\nவணக்கம் ${fName}! உங்கள் ${crop} பயிரில் ${disease} கண்டறியப்பட்டுள்ளது (உறுதி: 92%).\nதீர்வு: ${treatment}\nஇயற்கை வழி: ${organic}\nநிபுணர்: டாக்டர் சீனிவாசராவ்.`;
      } else if (language === "Kannada") {
        body = `🔬 ರೋಗ ಪತ್ತೆ ಹಚ್ಚುವಿಕೆ\n\nನಮಸ್ಕಾರ ${fName} ಅವರೇ! ನಿಮ್ಮ ${crop} ಬೆಳೆಯಲ್ಲಿ ${disease} ರೋಗ ಪತ್ತೆಯಾಗಿದೆ (92% ನಿಖರತೆ).\nಪರಿಹಾರ: ${treatment}\nಸಾವಯವ ಪರ್ಯಾಯ: ${organic}\nತಜ್ಞರು: ಡಾ. ಶ್ರೀನಿವಾಸರಾವ್.`;
      } else if (language === "Malayalam") {
        body = `🔬 രോഗനിർണ്ണയ മുന്നറിയിപ്പ്\n\nനമസ്കാരം ${fName}! നിങ്ങളുടെ ${crop} വിളയിൽ ${disease} രോഗം കണ്ടെത്തിയിരിക്കുന്നു (സ്ഥിരീകരണം: 92%).\nപരിഹാരം: ${treatment}\nജൈവ രീതി: ${organic}\nവിദഗ്ദ്ധൻ: ഡോ. ശ്രീനിവാസറാവു.`;
      } else {
        body = `🔬 Disease Alert\n\nDear ${fName},\nAI detected a risk of ${disease} on your ${crop} crop (92% confidence).\nRecommended: ${treatment}.\nOrganic Alt: ${organic}.\nNearest Expert: Dr. K. S. Rao, Guntur RSK.`;
      }
      confidence = 92;
      reasoning = `Computer vision analysis matching leaf pigmentation discoloration markers against local agronomy phytopathology templates.`;
    } 
    else if (alertCategory === "Pest") {
      const pest = rawAlertDetails.pestName || "Fall Armyworm";
      title = safeTranslate("Pest Alert", language);
      const textBase = `High risk of Fall Armyworm in your village. Recommended action: Inspect crops today. Spray within 48 hours if infestation is confirmed.`;
      const translatedText = safeTranslate(textBase, language).replace("Fall Armyworm", pest).replace("your village", village);
      
      body = `${title}\n\nNamaste ${fName}!\n${translatedText}`;
      confidence = 95;
      reasoning = `Pest movement pheromone traps registered a heavy outbreak of ${pest} within a 2.8 km border radius of ${village} village.`;
    } 
    else if (alertCategory === "Market") {
      title = safeTranslate("Market Rate Surge", language);
      if (language === "Telugu") {
        body = `📈 మార్కెట్ ధర హెచ్చరిక\n\nప్రియమైన ${fName} గారు, మీ పంట ${crop} కి గరిష్ట డిమాండ్ ఉంది. సమీప గుంటూరు యార్డు లో ధర క్వింటాల్ కు ₹19,500 చేరింది. రవాణా కోసం RSK సహకార ట్రాక్టర్లను ఉపయోగించండి.`;
      } else if (language === "Hindi") {
        body = `📈 मंडी भाव सलाह\n\nप्रिय ${fName} जी, आपके ${crop} की कीमत मंडी में बढ़ गई है। आज ही बिक्री करने का सही अवसर है।`;
      } else {
        body = `📈 Market Alert\n\nDear ${fName},\nMarket demand for your ${crop} crop has surged. Guntur Mandi is trading at peak rates today. Logistics recommendation: Book Rythu Seva Co-op transport.`;
      }
      confidence = 89;
      reasoning = `Real-time integration with AGMARKNET API logs daily trading volumes showing short supply and price rallies for ${crop}.`;
    } 
    else if (alertCategory === "Government Scheme") {
      title = safeTranslate("Government Scheme Announcement", language);
      if (language === "Telugu") {
        body = `🏛️ ప్రభుత్వ పథక సమాచారం\n\nరమేష్ గారు, వైఎస్ఆర్ రైతు భరోసా నమోదు గడువు జూలై 15. అర్హత వివరాలు, అప్లికేషన్ కోసం మీ పట్టా పుస్తకం తో గ్రామ సచివాలయాన్ని సంప్రదించండి.`;
      } else if (language === "Hindi") {
        body = `🏛️ सरकारी योजना सलाह\n\nसतनाम जी, पीएम-किसान सम्मान निधि के तहत पंजीकरण की अंतिम तिथि 15 जुलाई है। कृपया तुरंत आवदेन करें।`;
      } else {
        body = `������️ Government Scheme\n\nDear ${fName},\nSubsidies and registrations for local agrarian benefit programs are closing soon. Bring land deeds to nearest Rythu Seva Center to apply.`;
      }
      confidence = 98;
      reasoning = `Direct department notifications on scheme deadlines parsed to target smallholder farmers with landholding sizes < 5 acres.`;
    } 
    else if (alertCategory === "Emergency") {
      title = safeTranslate("EMERGENCY ALERT", language);
      const textBase = `CRITICAL: Severe cyclone or flooding expected in your district. Move harvested stock to covered shelters immediately.`;
      const translatedText = safeTranslate(textBase, language).replace("your district", district);
      
      body = `🚨 ${title}\n\nURGENT - IMPORTANT:\n${translatedText}`;
      confidence = 99;
      reasoning = `Disaster Management Authority satellite cloud mass vectors indicate high convective cyclone landfall vectors.`;
    } 
    else {
      body = `🌾 Kisan Alert AI\n\nHello ${fName} from ${village}! Your ${crop} farm holding of ${size} acres is healthy. Moisture is currently 62% under sunny skies. Keep up the organic practices.`;
      confidence = 90;
      reasoning = `Routine daily weather and farm health update matching preferred morning schedules.`;
    }

    return { title, message: body, confidence, reasoning };
}

async function generateAiAlertMessage(
  farmer: any,
  alertCategory: string,
  rawAlertDetails: any,
  language: string,
  channel: string
): Promise<{ title: string, message: string, confidence: number, reasoning: string }> {
  const hasProvider = !!process.env.GEMINI_API_KEY || !!process.env.OPENROUTER_API_KEY;

  if (!hasProvider) {
    // RUNNING IN RULES-BASED ADVISORY SIMULATION (no AI provider configured)
    return buildRuleBasedAlert(farmer, alertCategory, rawAlertDetails, language);
  }

  // GEMINI-POWERED COGNITIVE ALERT GENERATION & TRANSLATION
  // Routed through the shared AI Gateway (server/aiGateway.ts) so this benefits from the
  // same multi-model router, circuit breaker, and provider health monitoring as everything
  // else in the app - instead of opening its own raw client and its own retry loop.
  try {
    const ai = getGeminiClient();

    const farmerSummary = `
      Farmer Details:
      - Name: ${farmer.name}
      - Phone: ${farmer.phone}
      - Location: Village: ${farmer.village}, District: ${farmer.district}, State: ${farmer.state}
      - Primary Crop: ${farmer.primaryCrop || "Sowing Stage"}
      - Farm Size: ${farmer.farmSizeAcres} Acres
      - Soil: ${farmer.soilType}, pH: ${farmer.soilPh}
      - Soil Nutrients: N=${farmer.nValue}, P=${farmer.pValue}, K=${farmer.kValue}
      - Groundwater: ${farmer.groundwaterLevelFt} ft deep, Source: ${farmer.groundwaterSource}
    `;

    const alertDetailsJson = JSON.stringify(rawAlertDetails);

    const prompt = `
      You are the core AI Decision Engine for 'Kisan Alert AI', an advanced agriculture warning platform.
      Generate a highly personalized, empathetic, and professional notification alert for this farmer:
      
      ${farmerSummary}

      Alert Category Requested: "${alertCategory}"
      Raw Alert Telemetry / Outbreak Source: ${alertDetailsJson}
      Required Communication Channel: "${channel}"
      Farmer Preferred Language: "${language}" (You must output the entire alert title and body in this exact language script)

      The message should cover:
      - Farmer's Name, Village, and specific Crop context.
      - Actionable agronomical warning before problems arise (how to save the crop).
      - Accurate values, e.g., if it is weather/irrigation, specify exact mm or rainfall expected; if disease, specifyConfidence, Treatment, Medicine, Organic alternatives, and Nearest Agronomy experts.
      - Keep text under 140 words, very easy to read on mobile screens (especially if SMS or WhatsApp).
      
      Return strictly in valid JSON format matching this schema:
      {
        "title": "Short title with relevant emojis",
        "message": "Complete localized message text body, fully translated into ${language} regional script",
        "confidence": 95, // integer percentage 0-100 indicating confidence in trigger recommendation
        "reasoning": "A concise explanation of why this alert is triggered based on weather, soil, or satellite data"
      }
      Do not return any other text, just parsable JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text || "{}";
    // Parse response
    let cleaned = resultText.trim();
    if (cleaned.includes("```")) {
      const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) cleaned = match[1].trim();
    }
    const parsed = JSON.parse(cleaned);
    
    return {
      title: parsed.title || "Kisan Alert",
      message: parsed.message || "Localized warning advisory sent.",
      confidence: parsed.confidence || 90,
      reasoning: parsed.reasoning || "Generated by Gemini flash modeling."
    };

  } catch (error: any) {
    const msg = error?.message || String(error);
    const cleanReason = (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("429") || error?.name === "AllProvidersBusyError")
      ? "All AI providers are temporarily busy. Gracefully activating simulated intelligence backup."
      : (msg.length > 120 ? msg.substring(0, 120) + "..." : msg);
    console.log(`[Gemini Alert Engine] Note: Serving automated alert fallback (Reason: ${cleanReason}).`);
    // Bounded, single-shot fallback to the deterministic rule-based generator.
    // IMPORTANT: this must never call generateAiAlertMessage() again - doing so on a
    // persistent failure (e.g. invalid key, permanently exhausted quota) previously
    // recursed without limit until the process crashed with a stack overflow.
    return buildRuleBasedAlert(farmer, alertCategory, rawAlertDetails, language);
  }
}

// =========================================================================
// 6. SCHEDULER & QUEUE SIMULATION (Background Processing)
// =========================================================================

// Background worker running queue processing
export function processQueueItem(item: NotificationQueueItem): NotificationLog {
  const isSuccess = Math.random() > 0.12; // Simulate 12% failure rate for cellular network drops

  if (isSuccess) {
    item.status = "Sent";
    const logId = `LOG-${Math.floor(100 + Math.random() * 900)}`;
    const logEntry: NotificationLog = {
      id: logId,
      farmerId: item.farmerId,
      farmerName: item.farmerName,
      phoneEncrypted: mockEncrypt(item.phone),
      channel: item.channel,
      language: item.language,
      category: item.category,
      priority: item.priority,
      title: item.title,
      message: item.message,
      sentTime: new Date().toISOString(),
      status: "Delivered",
      confidenceScore: 92,
      reason: "Automated queue delivery trigger matching preferences."
    };

    logsDb.unshift(logEntry);

    // Create delivery report
    deliveryReportsDb.push({
      logId: logId,
      gatewayStatus: "Delivered",
      deliveredTime: new Date().toISOString(),
      retryAttempts: item.retryCount,
      latencyMs: Math.floor(400 + Math.random() * 2000)
    });

    return logEntry;
  } else {
    item.retryCount++;
    if (item.retryCount >= item.maxRetries) {
      item.status = "Failed";
      item.errorMessage = "Cellular handoff timed out. Retries exhausted.";

      const logId = `LOG-${Math.floor(100 + Math.random() * 900)}`;
      const logEntry: NotificationLog = {
        id: logId,
        farmerId: item.farmerId,
        farmerName: item.farmerName,
        phoneEncrypted: mockEncrypt(item.phone),
        channel: item.channel,
        language: item.language,
        category: item.category,
        priority: item.priority,
        title: item.title,
        message: item.message,
        sentTime: new Date().toISOString(),
        status: "Failed",
        errorMessage: item.errorMessage,
        confidenceScore: 85,
        reason: "Network gateway drop."
      };
      logsDb.unshift(logEntry);

      deliveryReportsDb.push({
        logId: logId,
        gatewayStatus: "Failed",
        deliveredTime: new Date().toISOString(),
        retryAttempts: item.retryCount,
        latencyMs: 15000
      });

      return logEntry;
    } else {
      item.status = "Pending"; // Mark to retry again later
      item.errorMessage = `Connection drop. Scheduled retry attempt ${item.retryCount}/${item.maxRetries}...`;
      
      // Return a simulated failing item representation
      const logId = `LOG-RETRY-${Math.floor(100 + Math.random() * 900)}`;
      return {
        id: logId,
        farmerId: item.farmerId,
        farmerName: item.farmerName,
        phoneEncrypted: mockEncrypt(item.phone),
        channel: item.channel,
        language: item.language,
        category: item.category,
        priority: item.priority,
        title: item.title,
        message: `[Retry Attempt ${item.retryCount}] ${item.message}`,
        sentTime: new Date().toISOString(),
        status: "Failed",
        errorMessage: item.errorMessage,
        confidenceScore: 90,
        reason: "Temporary network packet drop. Automatic retry queued."
      };
    }
  }
}

// =========================================================================
// 7. REST API ENDPOINTS
// =========================================================================

// POST /api/notifications/send
// Triggers immediately, running the decision advisor to personalize and dispatch
alertRouter.post("/notifications/send", async (req, res) => {
  const ip = req.ip || "127.0.0.1";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Rate limit exceeded. Maximum 20 alert dispatches per minute allowed." });
  }

  const { farmerId, category, alertDetails, channelOverride, languageOverride } = req.body;

  try {
    const farmer = farmersDb.find(f => f.id === farmerId);
    if (!farmer) {
      return res.status(404).json({ error: "Farmer profile not found." });
    }

    const preference = preferencesDb.find(p => p.farmerId === farmerId) || {
      farmerId: farmer.id,
      preferredLanguage: "English",
      preferredChannel: "SMS",
      notificationFrequency: "Immediate",
      quietHoursStart: "22:00",
      quietHoursEnd: "06:00",
      categories: ["Weather", "Irrigation", "Emergency"]
    };

    const targetChannel = channelOverride || preference.preferredChannel;
    const targetLanguage = languageOverride || preference.preferredLanguage;

    // Use AI personalized warning message
    const alertResult = await generateAiAlertMessage(
      farmer,
      category,
      alertDetails || {},
      targetLanguage,
      targetChannel
    );

    // Encrypt phone before saving to logs
    const encryptedPhone = mockEncrypt(farmer.phone);

    // Save as log
    const logId = `LOG-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLog: NotificationLog = {
      id: logId,
      farmerId: farmer.id,
      farmerName: farmer.name,
      phoneEncrypted: encryptedPhone,
      channel: targetChannel,
      language: targetLanguage,
      category: category,
      priority: category === "Emergency" ? "Urgent" : "Normal",
      title: alertResult.title,
      message: alertResult.message,
      sentTime: new Date().toISOString(),
      status: "Delivered", // Immediately delivered in mock
      confidenceScore: alertResult.confidence,
      reason: alertResult.reasoning,
      metadata: alertDetails || {}
    };

    logsDb.unshift(newLog);

    // Create delivery report
    deliveryReportsDb.push({
      logId: logId,
      gatewayStatus: "Delivered",
      deliveredTime: new Date().toISOString(),
      retryAttempts: 0,
      latencyMs: Math.floor(400 + Math.random() * 1200)
    });

    return res.status(201).json({
      success: true,
      log: newLog,
      originalText: alertResult.message,
      title: alertResult.title,
      confidence: alertResult.confidence,
      reasoning: alertResult.reasoning
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to dispatch notification alert." });
  }
});

// POST /api/notifications/schedule
// Enqueues an alert for delayed processing
alertRouter.post("/notifications/schedule", async (req, res) => {
  const { farmerId, category, alertDetails, delaySeconds } = req.body;

  try {
    const farmer = farmersDb.find(f => f.id === farmerId);
    if (!farmer) return res.status(404).json({ error: "Farmer not found." });

    const pref = preferencesDb.find(p => p.farmerId === farmerId) || {
      farmerId: farmer.id,
      preferredLanguage: "English",
      preferredChannel: "SMS",
      notificationFrequency: "Immediate",
      quietHoursStart: "22:00",
      quietHoursEnd: "06:00",
      categories: ["Weather"]
    };

    // Calculate details
    const alertResult = await generateAiAlertMessage(farmer, category, alertDetails || {}, pref.preferredLanguage, pref.preferredChannel);

    const scheduledTime = new Date(Date.now() + (delaySeconds || 5) * 1000).toISOString();
    const queueId = `QUE-${Math.floor(1000 + Math.random() * 9000)}`;

    const queueItem: NotificationQueueItem = {
      id: queueId,
      farmerId: farmer.id,
      farmerName: farmer.name,
      phone: farmer.phone,
      channel: pref.preferredChannel,
      language: pref.preferredLanguage,
      category: category,
      priority: category === "Emergency" ? "Urgent" : "Normal",
      title: alertResult.title,
      message: alertResult.message,
      scheduledTime: scheduledTime,
      status: "Pending",
      retryCount: 0,
      maxRetries: 3
    };

    queueDb.push(queueItem);

    res.status(202).json({
      success: true,
      message: "Notification scheduled in outbound queue successfully.",
      queueItem
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Scheduling failed" });
  }
});

// GET /api/notifications/history
// Returns all logs with options to filter
alertRouter.get("/notifications/history", (req, res) => {
  const { farmerId, category, status } = req.query;
  let filtered = [...logsDb];

  if (farmerId) {
    filtered = filtered.filter(l => l.farmerId === farmerId);
  }
  if (category) {
    filtered = filtered.filter(l => l.category === category);
  }
  if (status) {
    filtered = filtered.filter(l => l.status === status);
  }

  res.json(filtered);
});

// GET /api/notifications/status
// Analytical dashboard summary and delivery statuses
alertRouter.get("/notifications/status", (req, res) => {
  const totalSent = logsDb.length;
  const delivered = logsDb.filter(l => l.status === "Delivered").length;
  const failed = logsDb.filter(l => l.status === "Failed").length;
  const pending = queueDb.filter(q => q.status === "Pending" || q.status === "Sending").length;

  const successRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 100;

  // Breakdown by channels
  const channels = { SMS: 0, WhatsApp: 0, Push: 0, Voice: 0 };
  logsDb.forEach(l => {
    if (channels[l.channel] !== undefined) {
      channels[l.channel]++;
    }
  });

  // Breakdown by categories
  const categories = {};
  logsDb.forEach(l => {
    categories[l.category] = (categories[l.category] || 0) + 1;
  });

  // Recent 10 logs
  const recentLogs = logsDb.slice(0, 10);

  // Active queue
  const currentQueue = [...queueDb];

  res.json({
    analytics: {
      totalSent,
      delivered,
      failed,
      pending,
      successRate,
      channelBreakdown: channels,
      categoryBreakdown: categories
    },
    recentLogs,
    queue: currentQueue
  });
});

// POST /api/preferences
// Updates individual preferences
alertRouter.post("/preferences", (req, res) => {
  const { farmerId, preferredLanguage, preferredChannel, notificationFrequency, quietHoursStart, quietHoursEnd, categories } = req.body;

  if (!farmerId) return res.status(400).json({ error: "Missing farmerId" });

  let pref = preferencesDb.find(p => p.farmerId === farmerId);
  if (pref) {
    if (preferredLanguage) pref.preferredLanguage = preferredLanguage;
    if (preferredChannel) pref.preferredChannel = preferredChannel;
    if (notificationFrequency) pref.notificationFrequency = notificationFrequency;
    if (quietHoursStart) pref.quietHoursStart = quietHoursStart;
    if (quietHoursEnd) pref.quietHoursEnd = quietHoursEnd;
    if (categories) pref.categories = categories;
  } else {
    pref = {
      farmerId,
      preferredLanguage: preferredLanguage || "English",
      preferredChannel: preferredChannel || "SMS",
      notificationFrequency: notificationFrequency || "Immediate",
      quietHoursStart: quietHoursStart || "22:00",
      quietHoursEnd: quietHoursEnd || "06:00",
      categories: categories || ["Weather", "Irrigation", "Emergency"]
    };
    preferencesDb.push(pref);
  }

  res.json({ success: true, message: "Farmer alert preferences synchronized successfully.", preference: pref });
});

// GET /api/preferences
// Retrieves preferences
alertRouter.get("/preferences", (req, res) => {
  const { farmerId } = req.query;
  if (!farmerId) return res.status(400).json({ error: "Missing farmerId parameter." });

  const pref = preferencesDb.find(p => p.farmerId === farmerId);
  if (!pref) {
    // Generate empty defaults
    const defaultPref: FarmerPreference = {
      farmerId: farmerId as string,
      preferredLanguage: "English",
      preferredChannel: "SMS",
      notificationFrequency: "Immediate",
      quietHoursStart: "22:00",
      quietHoursEnd: "06:00",
      categories: ["Weather", "Irrigation", "Fertilizer", "Emergency"]
    };
    preferencesDb.push(defaultPref);
    return res.json(defaultPref);
  }

  res.json(pref);
});

// Trigger simulator helper
async function broadcastAlert(category: string, alertDetails: any, matchingCriteria: (f: any) => boolean) {
  const triggeredFarmers = farmersDb.filter(matchingCriteria);
  let count = 0;

  for (const farmer of triggeredFarmers) {
    // Check if category is subscribed
    const pref = preferencesDb.find(p => p.farmerId === farmer.id);
    if (pref && !pref.categories.includes(category) && category !== "Emergency") {
      continue; // Skip if they aren't subscribed (except Emergency alerts)
    }

    const ch = pref?.preferredChannel || "SMS";
    const lang = pref?.preferredLanguage || "English";

    let textResult;
    try {
      textResult = await generateAiAlertMessage(farmer, category, alertDetails, lang, ch);
    } catch (err) {
      // Defense in depth: generateAiAlertMessage() is designed to never throw (it falls
      // back to the rule-based generator internally), but if anything unexpected does
      // slip through, skip this one farmer rather than aborting the whole broadcast.
      console.error(`[Alert Broadcast] Failed to generate alert for farmer ${farmer.id}, skipping:`, err);
      continue;
    }

    const logId = `LOG-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLog: NotificationLog = {
      id: logId,
      farmerId: farmer.id,
      farmerName: farmer.name,
      phoneEncrypted: mockEncrypt(farmer.phone),
      channel: ch,
      language: lang,
      category: category,
      priority: category === "Emergency" ? "Urgent" : "Normal",
      title: textResult.title,
      message: textResult.message,
      sentTime: new Date().toISOString(),
      status: "Delivered",
      confidenceScore: textResult.confidence,
      reason: textResult.reasoning,
      metadata: alertDetails
    };

    logsDb.unshift(newLog);

    deliveryReportsDb.push({
      logId: logId,
      gatewayStatus: "Delivered",
      deliveredTime: new Date().toISOString(),
      retryAttempts: 0,
      latencyMs: Math.floor(200 + Math.random() * 1000)
    });

    count++;
  }

  return count;
}

// POST /api/alerts/weather
alertRouter.post("/alerts/weather", async (req, res) => {
  try {
    const { conditionType, temperatureCelsius, predictedRainfallMm, village, district, state } = req.body;

    const record: WeatherAlertRecord = {
      id: `WTH-${Math.floor(100 + Math.random() * 900)}`,
      village: village || "",
      district: district || "",
      state: state || "",
      severity: predictedRainfallMm > 50 || conditionType === "Cyclone" ? "alert" : "warning",
      conditionType: conditionType || "Heavy Rain",
      temperatureCelsius: Number(temperatureCelsius || 30),
      humidityPercent: 88,
      predictedRainfallMm: Number(predictedRainfallMm || 0),
      windSpeedKmph: conditionType === "Cyclone" ? 110 : 15,
      timestamp: new Date().toISOString()
    };

    weatherAlertsDb.push(record);

    // Broadcast to all farmers in this district or state
    const count = await broadcastAlert(
      "Weather",
      record,
      f => (district ? f.district === district : true) && (state ? f.state === state : true)
    );

    res.status(201).json({
      success: true,
      message: `Weather alert triggered. Broadcasted personalized warnings to ${count} matching farmers.`,
      record,
      farmersNotified: count
    });
  } catch (error: any) {
    console.error("[Alert Engine] /alerts/weather failed:", error);
    res.status(503).json({
      success: false,
      provider: "ai-gateway",
      retryAfter: error?.retryAfter || 15,
      error: "Failed to broadcast weather alert. All AI providers may be temporarily busy."
    });
  }
});

// POST /api/alerts/disease
alertRouter.post("/alerts/disease", async (req, res) => {
  try {
    const { cropName, diseaseName, severity, organicRemedy, chemicalRemedy } = req.body;

    const record: DiseaseAlertRecord = {
      id: `DIS-${Math.floor(100 + Math.random() * 900)}`,
      cropName: cropName || "Chilli",
      diseaseName: diseaseName || "Leaf Curl",
      severity: severity || "High",
      confidence: 91,
      organicRemedy: organicRemedy || "Cold-pressed neem oil (1500ppm) @ 5ml/L",
      chemicalRemedy: chemicalRemedy || "Acetamiprid 20 SP @ 0.3g/L",
      timestamp: new Date().toISOString()
    };

    diseaseAlertsDb.push(record);

    // Broadcast to all farmers growing this crop
    const count = await broadcastAlert(
      "Disease",
      record,
      f => f.primaryCrop && f.primaryCrop.toLowerCase().includes(record.cropName.toLowerCase())
    );

    res.status(201).json({
      success: true,
      message: `Disease alert triggered. Broadcasted treatment advisors to ${count} matching farmers.`,
      record,
      farmersNotified: count
    });
  } catch (error: any) {
    console.error("[Alert Engine] /alerts/disease failed:", error);
    res.status(503).json({
      success: false,
      provider: "ai-gateway",
      retryAfter: error?.retryAfter || 15,
      error: "Failed to broadcast disease alert. All AI providers may be temporarily busy."
    });
  }
});

// POST /api/alerts/pest
alertRouter.post("/alerts/pest", async (req, res) => {
  try {
    const { pestName, village, district, state } = req.body;

    const record = {
      pestName: pestName || "Fall Armyworm",
      village: village || "Omalur",
      district: district || "Salem",
      state: state || "Tamil Nadu",
      timestamp: new Date().toISOString()
    };

    // Broadcast to all farmers in this village/district
    const count = await broadcastAlert(
      "Pest",
      record,
      f => (district ? f.district === district : true) && (state ? f.state === state : true)
    );

    res.status(201).json({
      success: true,
      message: `Pest outbreak alert triggered. Broadcasted warnings to ${count} farmers in ${district || 'rural sector'}.`,
      record,
      farmersNotified: count
    });
  } catch (error: any) {
    console.error("[Alert Engine] /alerts/pest failed:", error);
    res.status(503).json({
      success: false,
      provider: "ai-gateway",
      retryAfter: error?.retryAfter || 15,
      error: "Failed to broadcast pest alert. All AI providers may be temporarily busy."
    });
  }
});

// POST /api/alerts/market
alertRouter.post("/alerts/market", async (req, res) => {
  try {
    const { cropName, mandiName, state, oldPrice, newPrice } = req.body;

    const changePercent = oldPrice > 0 ? Number((((newPrice - oldPrice) / oldPrice) * 100).toFixed(1)) : 5.0;

    const record: MarketAlertRecord = {
      id: `MKT-${Math.floor(100 + Math.random() * 900)}`,
      cropName: cropName || "Chilli",
      mandiName: mandiName || "Guntur Cotton Yard",
      state: state || "Andhra Pradesh",
      oldPrice: Number(oldPrice || 18500),
      newPrice: Number(newPrice || 19500),
      changePercent,
      volumeArrivalTons: 125,
      timestamp: new Date().toISOString()
    };

    marketAlertsDb.push(record);

    // Broadcast to farmers growing this crop
    const count = await broadcastAlert(
      "Market",
      record,
      f => f.primaryCrop && f.primaryCrop.toLowerCase().includes(record.cropName.toLowerCase())
    );

    res.status(201).json({
      success: true,
      message: `Market rate surge alert triggered. Notified ${count} cultivating farmers.`,
      record,
      farmersNotified: count
    });
  } catch (error: any) {
    console.error("[Alert Engine] /alerts/market failed:", error);
    res.status(503).json({
      success: false,
      provider: "ai-gateway",
      retryAfter: error?.retryAfter || 15,
      error: "Failed to broadcast market alert. All AI providers may be temporarily busy."
    });
  }
});

// Step processing endpoint for queue simulator (called manually from UI to run scheduler cycle)
alertRouter.post("/notifications/queue/process-step", (req, res) => {
  const pending = queueDb.filter(q => q.status === "Pending");
  if (pending.length === 0) {
    return res.json({ success: true, processed: 0, message: "Queue is empty. No pending items to process." });
  }

  const processedLogs: NotificationLog[] = [];
  pending.forEach(item => {
    item.status = "Sending";
    const log = processQueueItem(item);
    processedLogs.push(log);
  });

  // Remove sent/failed items from queue or update status
  for (let i = queueDb.length - 1; i >= 0; i--) {
    if (queueDb[i].status === "Sent" || queueDb[i].status === "Failed") {
      queueDb.splice(i, 1);
    }
  }

  res.json({
    success: true,
    processed: pending.length,
    processedLogs,
    message: `Scheduler ran 1 cycle. Successfully processed ${pending.length} notifications.`
  });
});

// Reset simulation logs to original seed state (useful for UI testing)
alertRouter.post("/notifications/reset", (req, res) => {
  logsDb.length = 0;
  logsDb.push(...seedLogs);
  queueDb.length = 0;
  deliveryReportsDb.length = 0;
  deliveryReportsDb.push(
    { logId: "LOG-001", gatewayStatus: "Delivered", deliveredTime: new Date(Date.now() - 36 * 3600000 + 4000).toISOString(), retryAttempts: 0, latencyMs: 1420 },
    { logId: "LOG-002", gatewayStatus: "Delivered", deliveredTime: new Date(Date.now() - 24 * 3600000 + 12000).toISOString(), retryAttempts: 1, latencyMs: 3450 },
    { logId: "LOG-003", gatewayStatus: "Delivered", deliveredTime: new Date(Date.now() - 12 * 3600000 + 8000).toISOString(), retryAttempts: 0, latencyMs: 2110 },
    { logId: "LOG-004", gatewayStatus: "Delivered", deliveredTime: new Date(Date.now() - 6 * 3600000 + 1500).toISOString(), retryAttempts: 0, latencyMs: 1100 },
    { logId: "LOG-005", gatewayStatus: "Delivered", deliveredTime: new Date(Date.now() - 2 * 3600000 + 900).toISOString(), retryAttempts: 0, latencyMs: 650 },
    { logId: "LOG-006", gatewayStatus: "Failed", deliveredTime: new Date(Date.now() - 1 * 3600000).toISOString(), retryAttempts: 3, latencyMs: 18400 }
  );
  res.json({ success: true, message: "Database tables and delivery reports reset to factory seeds." });
});
