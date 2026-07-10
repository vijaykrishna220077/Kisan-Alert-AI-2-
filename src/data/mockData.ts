import { Scheme, MarketCommodity, RSKCenter, DiseaseDiagnosis, WeatherDay, NotificationAlert, FarmerProfile } from '../types';

export const INDIAN_STATES_DISTRICTS = {
  'Andhra Pradesh': ['Guntur', 'Kurnool', 'Anantapur', 'Chittoor', 'Krishna', 'East Godavari'],
  'Telangana': ['Warangal', 'Nalgonda', 'Khammam', 'Karimnagar', 'Mahabubnagar', 'Adilabad'],
  'Karnataka': ['Belagavi', 'Tumakuru', 'Vijayapura', 'Mysuru', 'Bagalkote', 'Kolar'],
  'Tamil Nadu': ['Salem', 'Coimbatore', 'Erode', 'Thanjavur', 'Trichy', 'Madurai'],
  'Punjab': ['Bathinda', 'Amritsar', 'Patiala', 'Ludhiana', 'Ferozepur', 'Sangrur'],
  'Uttar Pradesh': ['Gorakhpur', 'Varanasi', 'Bareilly', 'Meerut', 'Prayagraj', 'Lakhimpur Kheri']
};

export const SAMPLE_FARMERS: FarmerProfile[] = [
  {
    id: "FMR-701",
    name: "Ramesh Reddy",
    phone: "9876543210",
    state: "Andhra Pradesh",
    district: "Guntur",
    taluka: "Tenali",
    soilType: "Black Cotton",
    soilPh: 6.8,
    nValue: 42,
    pValue: 18,
    kValue: 125,
    farmSizeAcres: 4.5,
    primaryCrop: "Chilli",
    groundwaterLevelFt: 220,
    groundwaterSource: "Borewell",
    organicCertified: false,
    registeredDate: "2025-10-12",
    latitude: 16.3067,
    longitude: 80.4365
  },
  {
    id: "FMR-802",
    name: "Basavaraj Gowda",
    phone: "8765432109",
    state: "Karnataka",
    district: "Belagavi",
    taluka: "Gokak",
    soilType: "Clayey",
    soilPh: 7.2,
    nValue: 55,
    pValue: 12,
    kValue: 160,
    farmSizeAcres: 8.0,
    primaryCrop: "Sugarcane",
    groundwaterLevelFt: 85,
    groundwaterSource: "Canal",
    organicCertified: true,
    registeredDate: "2026-01-15",
    latitude: 15.8497,
    longitude: 74.4977
  }
];

export const MOCK_SCHEMES: Scheme[] = [
  {
    id: "SCH-PM-KISAN",
    name: "PM-KISAN Samman Nidhi",
    sponsoredBy: "Central Government",
    description: "Income support initiative providing ₹6,000 per year in three equal installments directly into bank accounts of eligible cultivating landholding families.",
    benefits: "Direct income support of ₹6,000/year (₹2,000 every 4 months) paid via DBT transfer.",
    eligibilityDescription: "Small and marginal farmers holding cultivable agricultural land in their own name. Institutional landowners, income tax payers, or public servants are excluded.",
    requiredDocuments: ["Aadhaar Card", "Land Registration Records (RoR/Patta)", "Bank Account Passbook"],
    applicationUrl: "https://pmkisan.gov.in/"
  },
  {
    id: "SCH-PMFBY",
    name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    sponsoredBy: "Central Government",
    description: "Crop Insurance Scheme protecting cultivators from crop failures caused by natural calamities, pest outbreaks, or localized storms.",
    benefits: "Up to 100% sum insured payout on verified crop loss. Low premium: 1.5% for Rabi, 2% for Kharif, 5% for commercial/horticultural crops.",
    eligibilityDescription: "All farmers (including sharecroppers and tenant farmers) growing notified crops in notified areas. Non-loanee farmers may also enroll.",
    requiredDocuments: ["Land Possession Certificate", "Sowing Certificate / Self-Declaration", "Aadhaar Card", "Bank Details"],
    applicationUrl: "https://pmfby.gov.in/"
  },
  {
    id: "SCH-YSR-RYTHU",
    name: "YSR Rythu Bharosa - PM KISAN",
    sponsoredBy: "State Government",
    state: "Andhra Pradesh",
    description: "Financial assistance program for farmers in Andhra Pradesh which supplements PM-KISAN by providing ₹13,500 annually.",
    benefits: "₹13,500/year financial assistance (inclusive of central PM-KISAN benefit) with support for tenant farmers as well.",
    eligibilityDescription: "All landowning farmers as well as eligible tenant farmers belonging to SC, ST, BC, and minority sections.",
    requiredDocuments: ["Land Passbook", "Tenant agreement / CCRC", "Aadhaar", "Bank Account Details"],
    applicationUrl: "https://rythubharosa.ap.gov.in/"
  },
  {
    id: "SCH-RYTHU-BANDHU",
    name: "Rythu Bandhu Scheme",
    sponsoredBy: "State Government",
    state: "Telangana",
    description: "Agricultural Investment Support Scheme supporting Telangana farmers by providing input cost grants for seeds, fertilizers, and pesticide application.",
    benefits: "Direct subsidy of ₹10,000 per acre per year (₹5,000 each for Kharif and Rabi seasons).",
    eligibilityDescription: "Pattadar farmers having land records registered in the state Dharani Portal.",
    requiredDocuments: ["Pattadar Passbook", "Aadhaar", "Bank Account Number"],
    applicationUrl: "https://rythubandhu.telangana.gov.in/"
  },
  {
    id: "SCH-SHC",
    name: "Soil Health Card Scheme",
    sponsoredBy: "Central Government",
    description: "Provides customized nutrient recommendations to individual landholdings, specifying macro, secondary, and micronutrient deficits.",
    benefits: "Soil health test report for 12 key parameters, free of cost. Detailed fertilizer dosing recommendations to reduce costs and increase crop yield.",
    eligibilityDescription: "Every farm holding in the country is eligible to get checked every 2 years.",
    requiredDocuments: ["Soil Sample (collected by local agricultural officer or farmer)", "Land Survey Details"],
    applicationUrl: "https://soilhealth.dac.gov.in/"
  }
];

export const MOCK_MARKETS: MarketCommodity[] = [
  {
    id: "MC-001",
    name: "Paddy (Basmati)",
    category: "Cereals",
    currentPrice: 3850,
    yesterdayPrice: 3820,
    changePercent: 0.78,
    volumeArrivalTons: 120,
    marketName: "Amritsar Grain Mandi",
    state: "Punjab",
    priceTrend: "up",
    forecastPriceNextMonth: 4100,
    historicalPrices: [
      { month: "Jan", price: 3450 },
      { month: "Feb", price: 3500 },
      { month: "Mar", price: 3650 },
      { month: "Apr", price: 3720 },
      { month: "May", price: 3800 },
      { month: "Jun", price: 3850 }
    ]
  },
  {
    id: "MC-002",
    name: "Cotton (Medium Staple)",
    category: "Cash Crops",
    currentPrice: 6900,
    yesterdayPrice: 7050,
    changePercent: -2.13,
    volumeArrivalTons: 85,
    marketName: "Guntur Cotton Yard",
    state: "Andhra Pradesh",
    priceTrend: "down",
    forecastPriceNextMonth: 6750,
    historicalPrices: [
      { month: "Jan", price: 7200 },
      { month: "Feb", price: 7150 },
      { month: "Mar", price: 7050 },
      { month: "Apr", price: 7100 },
      { month: "May", price: 6980 },
      { month: "Jun", price: 6900 }
    ]
  },
  {
    id: "MC-003",
    name: "Red Chilli (Guntur Teja)",
    category: "Cash Crops",
    currentPrice: 19500,
    yesterdayPrice: 19300,
    changePercent: 1.04,
    volumeArrivalTons: 400,
    marketName: "Guntur Chilli Yard",
    state: "Andhra Pradesh",
    priceTrend: "up",
    forecastPriceNextMonth: 21000,
    historicalPrices: [
      { month: "Jan", price: 17500 },
      { month: "Feb", price: 18200 },
      { month: "Mar", price: 19000 },
      { month: "Apr", price: 18800 },
      { month: "May", price: 19100 },
      { month: "Jun", price: 19500 }
    ]
  },
  {
    id: "MC-004",
    name: "Sugarcane",
    category: "Cash Crops",
    currentPrice: 340, // per quintal FRP
    yesterdayPrice: 340,
    changePercent: 0.0,
    volumeArrivalTons: 2500,
    marketName: "Belagavi Sugarcane Co-op",
    state: "Karnataka",
    priceTrend: "stable",
    forecastPriceNextMonth: 345,
    historicalPrices: [
      { month: "Jan", price: 315 },
      { month: "Feb", price: 315 },
      { month: "Mar", price: 340 },
      { month: "Apr", price: 340 },
      { month: "May", price: 340 },
      { month: "Jun", price: 340 }
    ]
  },
  {
    id: "MC-005",
    name: "Onion (Nashik Red)",
    category: "Vegetables",
    currentPrice: 2400,
    yesterdayPrice: 2150,
    changePercent: 11.63,
    volumeArrivalTons: 680,
    marketName: "Lasalgaon Mandi",
    state: "Maharashtra",
    priceTrend: "up",
    forecastPriceNextMonth: 2800,
    historicalPrices: [
      { month: "Jan", price: 1500 },
      { month: "Feb", price: 1350 },
      { month: "Mar", price: 1400 },
      { month: "Apr", price: 1800 },
      { month: "May", price: 2150 },
      { month: "Jun", price: 2400 }
    ]
  },
  {
    id: "MC-006",
    name: "Chickpea (Chana)",
    category: "Pulses",
    currentPrice: 5350,
    yesterdayPrice: 5380,
    changePercent: -0.56,
    volumeArrivalTons: 90,
    marketName: "Varanasi APMC",
    state: "Uttar Pradesh",
    priceTrend: "down",
    forecastPriceNextMonth: 5400,
    historicalPrices: [
      { month: "Jan", price: 4900 },
      { month: "Feb", price: 5100 },
      { month: "Mar", price: 5400 },
      { month: "Apr", price: 5450 },
      { month: "May", price: 5380 },
      { month: "Jun", price: 5350 }
    ]
  }
];

export const MOCK_RSKS: RSKCenter[] = [
  {
    id: "RSK-GNT-10",
    name: "Rythu Seva Kendram - Guntur East",
    district: "Guntur",
    state: "Andhra Pradesh",
    headOfficer: "Dr. K. Srinivasa Rao (M.Sc Agronomy)",
    phone: "9440123456",
    activeAgronomists: 3,
    coordinates: { lat: 16.3067, lng: 80.4365 },
    farmersAssignedCount: 1420,
    soilTestingLab: true,
    customHiringCenter: true
  },
  {
    id: "RSK-GNT-12",
    name: "Rythu Seva Kendram - Tenali Rural",
    district: "Guntur",
    state: "Andhra Pradesh",
    headOfficer: "Smt. P. Lakshmi Devi (B.Sc Plant Pathology)",
    phone: "9440123457",
    activeAgronomists: 2,
    coordinates: { lat: 16.2435, lng: 80.6412 },
    farmersAssignedCount: 980,
    soilTestingLab: false,
    customHiringCenter: true
  },
  {
    id: "RSK-BGM-04",
    name: "Rythu Seva Kendram - Gokak Hobli",
    district: "Belagavi",
    state: "Karnataka",
    headOfficer: "Shri. Mahantesh Patil (Agri-Engineer)",
    phone: "9845012345",
    activeAgronomists: 4,
    coordinates: { lat: 16.1681, lng: 74.8251 },
    farmersAssignedCount: 1850,
    soilTestingLab: true,
    customHiringCenter: true
  },
  {
    id: "RSK-SLM-08",
    name: "Uzhavar Maiyam - Attur Block",
    district: "Salem",
    state: "Tamil Nadu",
    headOfficer: "Thiru. S. Swaminathan (Agri-Entomologist)",
    phone: "9442012345",
    activeAgronomists: 2,
    coordinates: { lat: 11.5975, lng: 78.5991 },
    farmersAssignedCount: 820,
    soilTestingLab: false,
    customHiringCenter: false
  },
  {
    id: "RSK-PTA-01",
    name: "Kisan Vikas Kendra - Patiala Rural",
    district: "Patiala",
    state: "Punjab",
    headOfficer: "Dr. Gurjeet Singh Sandhu (Ph.D Soil Science)",
    phone: "9872012345",
    activeAgronomists: 5,
    coordinates: { lat: 30.3398, lng: 76.3869 },
    farmersAssignedCount: 2240,
    soilTestingLab: true,
    customHiringCenter: true
  }
];

export const STATIC_DISEASES: DiseaseDiagnosis[] = [
  {
    cropName: "Paddy (Rice)",
    detectedDisease: "Rice Blast (Magnaporthe oryzae)",
    confidence: 0.94,
    pathogenType: "Fungal",
    severity: "High",
    symptoms: [
      "Spindle-shaped lesions with brown borders and grey centers on leaves.",
      "Neck rotting and breakage where the grain head meets the node.",
      "Whitish chalky-white grainheads with zero kernel filling."
    ],
    organicRemedies: [
      "Foliar spray of 10% garlic bulb extract (organic sulfur fungicidal action).",
      "Pseudomonas fluorescens liquid formulation @ 10ml per litre of water during booting phase."
    ],
    chemicalSolutions: [
      "Spray Tricyclazole 75 WP @ 0.6 grams per litre of water.",
      "Alternate with Isoprothiolane 40 EC @ 1.5 ml per litre in cases of high localized humidity."
    ],
    preventiveMeasures: [
      "Use resistant seed varieties like Swarna Blast-Resistant.",
      "Avoid excess split doses of chemical Nitrogen fertilizers which trigger leaf susceptibility.",
      "Main field sanitation, including destruction of stubble from previous harvests."
    ],
    explainableAIReasoning: "The image exhibits classic spindle-shaped, eye-like diamond spots on the blade surface. Surrounding necrotic ring confirms Magnaporthe fungal cell division, accelerated by current relative humidity levels (>85%)."
  },
  {
    cropName: "Cotton",
    detectedDisease: "American Bollworm Infestation (Helicoverpa armigera)",
    confidence: 0.92,
    pathogenType: "Pest Infestation",
    severity: "Critical",
    symptoms: [
      "Circular entry holes on flower buds (squares) and developing bolls.",
      "Fecal pellets visible near punctured areas.",
      "Larvae spotted feeding directly inside the fibrous boll core."
    ],
    organicRemedies: [
      "Installation of pheromone traps @ 5 per acre to catch male moths.",
      "Release Chrysoperla carnea (lacewing) predators @ 2000 per acre.",
      "Foliar spray of Neem Seed Kernel Extract (NSKE 5%) during early egg-larval stages."
    ],
    chemicalSolutions: [
      "Apply Spinosad 45 SC @ 0.4 ml per litre of water.",
      "For severe outbreaks, spray Chlorantraniliprole 18.5 SC (Coragen) @ 60 ml per acre dissolved in 200L of water."
    ],
    preventiveMeasures: [
      "Grow trap crops like Okra (Ladyfinger) or Marigold along the farm borders.",
      "Maintain deep summer ploughing to expose pupae to predatory birds and summer sun.",
      "Sow certified Bt cotton seeds which inherently possess insecticidal Cry-proteins."
    ],
    explainableAIReasoning: "The image reveals standard bored bolls with surrounding frass deposits. The caterpillar's distinctive yellow-green lateral stripes indicate a 3rd-instar Helicoverpa larvae requiring swift insecticidal intervention."
  },
  {
    cropName: "Chilli / Pepper",
    detectedDisease: "Leaf Curl Virus (Begomovirus)",
    confidence: 0.89,
    pathogenType: "Viral",
    severity: "Medium",
    symptoms: [
      "Severe upward curling and puckering of leaf margins.",
      "Drastic reduction in leaf area with bushy, dwarfed appearance of infected plants.",
      "Vein clearing and yellowing, with high flower drop."
    ],
    organicRemedies: [
      "Spray Neem Oil (1500 ppm) @ 5ml per litre with soap water to control the whitefly vectors.",
      "Foliar spray of Sour Buttermilk (5% concentration) to enhance plant immunity and deter sap-sucking pests."
    ],
    chemicalSolutions: [
      "The virus has no direct chemical cure. Must target the Whitefly vector (Bemisia tabaci).",
      "Spray Imidacloprid 17.8 SL @ 0.5 ml per litre or Acetamiprid 20 SP @ 0.3 grams per litre."
    ],
    preventiveMeasures: [
      "Install yellow sticky traps @ 10 per acre to attract and capture flying whiteflies.",
      "Erect 50-mesh nylon insect barrier nets around nurseries.",
      "Uproot and bury highly infected index plants to stop the virus reservoir from spreading."
    ],
    explainableAIReasoning: "Upward boat-shaped curling matches the characteristic symptoms of Begomovirus transmitted exclusively by Bemisia tabaci. Higher daytime temperatures (34°C) have stimulated vector population growth."
  }
];

export const MOCK_WEATHER: WeatherDay[] = [
  {
    date: "Today (Thu)",
    tempCelsius: 32.5,
    humidityPercent: 78,
    rainfallMm: 2.4,
    windSpeedKmph: 12.5,
    condition: "Partly Cloudy",
    soilMoisturePercent: 62,
    drySpellWarning: false,
    advisory: "Favorable conditions for foliar applications. Maintain standard irrigation channels for vegetable crops. Keep a close watch on humidity peaks."
  },
  {
    date: "Tomorrow (Fri)",
    tempCelsius: 34.0,
    humidityPercent: 72,
    rainfallMm: 0.0,
    windSpeedKmph: 14.2,
    condition: "Sunny",
    soilMoisturePercent: 55,
    drySpellWarning: false,
    advisory: "Rising soil temperatures. Ensure early morning light irrigation for nurseries to prevent transplant wilting."
  },
  {
    date: "Jul 4 (Sat)",
    tempCelsius: 35.5,
    humidityPercent: 64,
    rainfallMm: 0.0,
    windSpeedKmph: 18.0,
    condition: "Dry/Windy",
    soilMoisturePercent: 44,
    drySpellWarning: true,
    advisory: "Dry spell hazard! Potential hot dry winds can cause flower drop. Mulch chilli and cotton beds immediately to restrict moisture transpiration."
  },
  {
    date: "Jul 5 (Sun)",
    tempCelsius: 31.0,
    humidityPercent: 88,
    rainfallMm: 28.5,
    windSpeedKmph: 22.0,
    condition: "Thunderstorm",
    soilMoisturePercent: 85,
    drySpellWarning: false,
    advisory: "Heavy rain alert. Suspend all fertilizer spraying. Clean main bunds and open drainage channels to prevent waterlogging in low-lying Paddy fields."
  },
  {
    date: "Jul 6 (Mon)",
    tempCelsius: 29.5,
    humidityPercent: 92,
    rainfallMm: 12.0,
    windSpeedKmph: 16.5,
    condition: "Rainy",
    soilMoisturePercent: 95,
    drySpellWarning: false,
    advisory: "Rain water accumulation likely. High soil saturation reduces root respiration. High fungal risk, prepare bio-fungicide sprays for post-rain clearing."
  }
];

export const MOCK_ALERTS: NotificationAlert[] = [
  {
    id: "AL-101",
    title: "Heavy Rainfall Warning",
    message: "IMD forecasts heavy to very heavy thunderstorm rainfall (30-50mm) within the next 48 hours for Guntur and Nalgonda. Postpone direct sowing and liquid chemical applications.",
    severity: "alert",
    category: "Weather",
    dateCreated: "2026-07-02T04:30:00Z",
    isRead: false
  },
  {
    id: "AL-102",
    title: "Chilli Thrips Alert",
    message: "Regional Rythu Seva Kendras report localized outbreaks of Chilli Thrips (Scirtothrips dorsalis) due to recent high dry-winds. Examine crop hearts for blackening.",
    severity: "warning",
    category: "Pest Outbreak",
    dateCreated: "2026-07-01T10:15:00Z",
    isRead: false
  },
  {
    id: "AL-103",
    title: "Paddy MSP Increase Announced",
    message: "Cabinet approves hike in Minimum Support Price (MSP) for Kharif crops. Paddy common grade MSP increased to ₹2,300 per quintal.",
    severity: "info",
    category: "Market Rate",
    dateCreated: "2026-06-30T18:00:00Z",
    isRead: true
  }
];
