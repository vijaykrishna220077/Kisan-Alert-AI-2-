export interface FarmerProfile {
  id: string;
  name: string;
  phone: string;
  state: string;
  district: string;
  taluka: string;
  soilType: 'Clayey' | 'Sandy' | 'Loamy' | 'Black Cotton' | 'Alluvial' | 'Red';
  soilPh: number;
  nValue: number; // Nitrogen (mg/kg)
  pValue: number; // Phosphorus (mg/kg)
  kValue: number; // Potassium (mg/kg)
  farmSizeAcres: number;
  primaryCrop?: string;
  groundwaterLevelFt: number;
  groundwaterSource: 'Borewell' | 'Canal' | 'Rainfed' | 'Drip/Micro';
  organicCertified: boolean;
  registeredDate: string;
  latitude?: number;
  longitude?: number;
}

export interface CropRecommendation {
  cropName: string;
  suitabilityScore: number; // percentage (0-100)
  expectedYieldTons: number; // tons per acre
  growthDurationDays: number;
  waterRequiredMm: number;
  averageMarketPrice: number; // per quintal (100kg)
  soilPhRange: string;
  nPKRequired: { n: number; p: number; k: number };
  reasons: string[];
  risks: string[];
}

export interface WeatherDay {
  date: string;
  tempCelsius: number;
  humidityPercent: number;
  rainfallMm: number;
  windSpeedKmph: number;
  condition: 'Sunny' | 'Partly Cloudy' | 'Rainy' | 'Thunderstorm' | 'Heavy Monsoon' | 'Dry/Windy';
  soilMoisturePercent: number;
  drySpellWarning: boolean;
  advisory: string;
}

export interface DiseaseDiagnosis {
  cropName: string;
  detectedDisease: string;
  confidence: number; // 0.0 - 1.0
  pathogenType: 'Fungal' | 'Bacterial' | 'Viral' | 'Pest Infestation' | 'Nutrient Deficiency';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  symptoms: string[];
  organicRemedies: string[];
  chemicalSolutions: string[];
  preventiveMeasures: string[];
  explainableAIReasoning: string;
}

export interface Scheme {
  id: string;
  name: string;
  regionalName?: string;
  sponsoredBy: 'Central Government' | 'State Government';
  state?: string;
  description: string;
  benefits: string;
  eligibilityDescription: string;
  minFarmSizeAcres?: number;
  maxFarmSizeAcres?: number;
  maxAnnualIncomeInr?: number;
  requiredDocuments: string[];
  applicationUrl: string;
}

export interface MarketCommodity {
  id: string;
  name: string;
  category: 'Cereals' | 'Pulses' | 'Oilseeds' | 'Vegetables' | 'Fruits' | 'Cash Crops';
  currentPrice: number; // per quintal (100kg)
  yesterdayPrice: number;
  changePercent: number;
  volumeArrivalTons: number;
  marketName: string;
  state: string;
  priceTrend: 'up' | 'down' | 'stable';
  forecastPriceNextMonth: number;
  historicalPrices: { month: string; price: number }[];
}

export interface EscalationTicket {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  subject: string;
  category: 'Disease Outbreak' | 'Soil Quality' | 'Irrigation Issue' | 'Scheme Eligibility' | 'Market Sales';
  description: string;
  imageUrl?: string;
  status: 'Open' | 'Assigned' | 'Resolved' | 'Escalated';
  assignedRSKId: string;
  assignedRSKName: string;
  assignedExpert?: string;
  dateCreated: string;
  expertNotes?: string;
  resolutionDate?: string;
}

export interface RSKCenter {
  id: string;
  name: string;
  district: string;
  state: string;
  headOfficer: string;
  phone: string;
  activeAgronomists: number;
  coordinates: { lat: number; lng: number };
  farmersAssignedCount: number;
  soilTestingLab: boolean;
  customHiringCenter: boolean; // tractor/harvester hiring
}

export interface OfflineSMSLog {
  id: string;
  queryType: 'RECOMMEND' | 'DISEASE' | 'WEATHER' | 'PRICE';
  payload: string;
  smsContent: string;
  dateSent: string;
  responseReceived?: string;
  status: 'Pending Sync' | 'Delivered' | 'Failed';
}

export interface NotificationAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'alert';
  category: 'Weather' | 'Pest Outbreak' | 'Market Rate' | 'Government Announcement';
  dateCreated: string;
  isRead: boolean;
}
