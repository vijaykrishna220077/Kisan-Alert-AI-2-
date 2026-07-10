import fs from "fs";
import path from "path";

const isVercel = !!process.env.VERCEL;
const ORIGINAL_DB_FILE = path.join(process.cwd(), "server", "db.json");
const DB_FILE = isVercel ? "/tmp/db.json" : ORIGINAL_DB_FILE;

// Define TypeScript interfaces for our DB entities
export interface DbUser {
  id: string;
  username: string;
  name: string;
  phone: string;
  role: "Farmer" | "Officer" | "Expert" | "Government" | "Admin";
  state: string;
  district: string;
  village: string;
}

export interface DbFarmPolygon {
  id: string;
  farmerId: string;
  name: string;
  coords: { lat: number; lng: number }[];
  areaSqM: number;
  acres: number;
  hectares: number;
  cropType: string;
  sowingDate: string;
  status: "Sowing" | "Growth" | "Diseased" | "Irrigation Active" | "Harvested";
}

export interface DbExpense {
  id: string;
  farmerId: string;
  category: "Seeds" | "Fertilizer" | "Pesticides" | "Labour" | "Machinery Rental" | "Fuel" | "Water/Electricity" | "Loans & EMIs" | "Insurance Premium";
  description: string;
  amount: number;
  date: string;
  receiptUrl?: string;
  cropCycle: string;
}

export interface DbInventoryItem {
  id: string;
  farmerId: string;
  category: "Seeds" | "Fertilizer" | "Pesticides" | "Machinery" | "Fuel" | "Irrigation & Pipes" | "Water Tank";
  item: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalValue: number;
  lastUpdated: string;
}

export interface DbCropHistory {
  id: string;
  farmerId: string;
  year: string;
  cropName: string;
  sowingDate: string;
  harvestDate?: string;
  yieldTonsPerAcre: number;
  profitInr: number;
  fertilizerUsedKg: number;
  waterUsedLiters: number;
  diseaseIncident?: string;
  notes?: string;
}

export interface DbIotSensorData {
  soilMoisturePercent: number;
  groundwaterDepthFt: number;
  tankLevelPercent: number;
  motorStatus: "ON" | "OFF" | "OVERLOAD" | "DRYRUNNING";
  fenceVoltageKv: number;
  borewellLevelFt: number;
  pipeLeakageStatus: "Normal" | "Leakage Detected" | "Pipe Burst";
  solarPowerYieldKwh: number;
}

export interface DbChatMessage {
  id: string;
  userId: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
  language: string;
}

export interface DbSchema {
  users: DbUser[];
  farms: DbFarmPolygon[];
  expenses: DbExpense[];
  inventory: DbInventoryItem[];
  cropHistory: DbCropHistory[];
  iotSensors: Record<string, DbIotSensorData>; // key by farmerId
  chatMessages: DbChatMessage[];
}

// Default Seed Data
const DEFAULT_SCHEMA: DbSchema = {
  users: [
    { id: "USR-701", username: "ramesh", name: "Ramesh Reddy", phone: "9876543210", role: "Farmer", state: "Andhra Pradesh", district: "Guntur", village: "Tenali" },
    { id: "USR-802", username: "basavaraj", name: "Basavaraj Gowda", phone: "8765432109", role: "Farmer", state: "Karnataka", district: "Belagavi", village: "Gokak" },
    { id: "USR-101", username: "officer_sharma", name: "Dr. Sunil Sharma", phone: "9988776655", role: "Officer", state: "Andhra Pradesh", district: "Guntur", village: "Guntur East RSK" },
    { id: "USR-102", username: "expert_rao", name: "Dr. K. Srinivasa Rao", phone: "9123456789", role: "Expert", state: "Andhra Pradesh", district: "Guntur", village: "Guntur Central Lab" },
    { id: "USR-103", username: "govt_patel", name: "Anand Patel", phone: "9000100020", role: "Government", state: "Delhi", district: "New Delhi", village: "Ministry of Agriculture" },
    { id: "USR-104", username: "admin", name: "System Administrator", phone: "9999999999", role: "Admin", state: "Telangana", district: "Hyderabad", village: "HQ" }
  ],
  farms: [
    {
      id: "FRM-001",
      farmerId: "USR-701",
      name: "Ramesh Guntur East Block",
      coords: [
        { lat: 16.3075, lng: 80.4350 },
        { lat: 16.3090, lng: 80.4350 },
        { lat: 16.3090, lng: 80.4370 },
        { lat: 16.3075, lng: 80.4370 }
      ],
      areaSqM: 30000,
      acres: 7.41,
      hectares: 3.0,
      cropType: "Red Chilli",
      sowingDate: "2026-05-10",
      status: "Growth"
    },
    {
      id: "FRM-002",
      farmerId: "USR-802",
      name: "Basavaraj Sugarcane Ridge",
      coords: [
        { lat: 16.3050, lng: 80.4350 },
        { lat: 16.3065, lng: 80.4350 },
        { lat: 16.3065, lng: 80.4365 },
        { lat: 16.3050, lng: 80.4365 }
      ],
      areaSqM: 22500,
      acres: 5.56,
      hectares: 2.25,
      cropType: "Sugarcane",
      sowingDate: "2026-03-15",
      status: "Irrigation Active"
    }
  ],
  expenses: [
    { id: "EXP-001", farmerId: "USR-701", category: "Seeds", description: "Teja Chilli High Yield F1 Seeds", amount: 12500, date: "2026-05-02", cropCycle: "Chilli Kharif 2026" },
    { id: "EXP-002", farmerId: "USR-701", category: "Fertilizer", description: "Neem Coated Urea (10 bags)", amount: 3500, date: "2026-05-15", cropCycle: "Chilli Kharif 2026" },
    { id: "EXP-003", farmerId: "USR-701", category: "Labour", description: "Field preparation and weeding", amount: 8000, date: "2026-05-20", cropCycle: "Chilli Kharif 2026" },
    { id: "EXP-004", farmerId: "USR-701", category: "Machinery Rental", description: "Tractor deep tilling & bedding", amount: 4500, date: "2026-05-01", cropCycle: "Chilli Kharif 2026" },
    { id: "EXP-005", farmerId: "USR-701", category: "Pesticides", description: "Foliar bio-pesticide spray", amount: 2800, date: "2026-06-10", cropCycle: "Chilli Kharif 2026" },
    { id: "EXP-006", farmerId: "USR-701", category: "Loans & EMIs", description: "Cooperative bank loan EMI", amount: 5000, date: "2026-06-15", cropCycle: "Chilli Kharif 2026" }
  ],
  inventory: [
    { id: "INV-001", farmerId: "USR-701", category: "Seeds", item: "Guntur Teja Chilli Seeds F1", quantity: 5, unit: "packets", unitCost: 2500, totalValue: 12500, lastUpdated: "2026-05-01" },
    { id: "INV-002", farmerId: "USR-701", category: "Fertilizer", item: "Neem Coated Urea", quantity: 3, unit: "bags", unitCost: 350, totalValue: 1050, lastUpdated: "2026-06-12" },
    { id: "INV-003", farmerId: "USR-701", category: "Pesticides", item: "Neem Oil 1500 PPM", quantity: 4, unit: "litres", unitCost: 650, totalValue: 2600, lastUpdated: "2026-06-20" },
    { id: "INV-004", farmerId: "USR-701", category: "Irrigation & Pipes", item: "Drip Lateral Lines 16mm", quantity: 120, unit: "meters", unitCost: 45, totalValue: 5400, lastUpdated: "2026-05-15" },
    { id: "INV-005", farmerId: "USR-701", category: "Fuel", item: "Diesel for Water Pump", quantity: 35, unit: "litres", unitCost: 95, totalValue: 3325, lastUpdated: "2026-06-25" }
  ],
  cropHistory: [
    { id: "HST-001", farmerId: "USR-701", year: "2025", cropName: "Red Chilli", sowingDate: "2025-05-12", harvestDate: "2025-11-20", yieldTonsPerAcre: 1.65, profitInr: 125000, fertilizerUsedKg: 240, waterUsedLiters: 150000, diseaseIncident: "Thrips - Mild Control" },
    { id: "HST-002", farmerId: "USR-701", year: "2024", cropName: "Cotton", sowingDate: "2024-06-01", harvestDate: "2024-12-10", yieldTonsPerAcre: 1.10, profitInr: 85000, fertilizerUsedKg: 180, waterUsedLiters: 180000, diseaseIncident: "Bollworm Attack - Heavy Spraying required" },
    { id: "HST-003", farmerId: "USR-701", year: "2023", cropName: "Black Gram", sowingDate: "2023-01-10", harvestDate: "2023-04-05", yieldTonsPerAcre: 0.58, profitInr: 45000, fertilizerUsedKg: 40, waterUsedLiters: 40000, diseaseIncident: "Powdery Mildew - Low" }
  ],
  iotSensors: {
    "USR-701": {
      soilMoisturePercent: 42,
      groundwaterDepthFt: 215,
      tankLevelPercent: 78,
      motorStatus: "OFF",
      fenceVoltageKv: 7.2,
      borewellLevelFt: 220,
      pipeLeakageStatus: "Normal",
      solarPowerYieldKwh: 12.4
    },
    "USR-802": {
      soilMoisturePercent: 55,
      groundwaterDepthFt: 85,
      tankLevelPercent: 92,
      motorStatus: "ON",
      fenceVoltageKv: 0.0,
      borewellLevelFt: 90,
      pipeLeakageStatus: "Normal",
      solarPowerYieldKwh: 0.0
    }
  },
  chatMessages: []
};

// Ensure db.json exists, initialize with default if not
export function initDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    if (isVercel && fs.existsSync(ORIGINAL_DB_FILE)) {
      fs.copyFileSync(ORIGINAL_DB_FILE, DB_FILE);
      console.log("[DB] Copied bundled db.json to /tmp for Vercel.");
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_SCHEMA, null, 2), "utf-8");
      console.log("[DB] Created new database db.json and seeded initial tables.");
    }
  }
}

// Read the database schema
export function readDb(): DbSchema {
  try {
    initDb();
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("[DB Error] Reading db.json failed:", err);
    return DEFAULT_SCHEMA;
  }
}

// Write the database schema
export function writeDb(data: DbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB Error] Writing db.json failed:", err);
  }
}
