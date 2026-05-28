export type Lang = 'en' | 'hi' | 'mr';
export type ThemeMode = 'system' | 'light' | 'dark';
export type UserRole = 'admin' | 'farmer' | 'viewer';

import type { DiseaseClass } from '@/types/disease';

export type DiseaseValidationStatus = 'idle' | 'valid' | 'invalid' | 'error';

export type LogType = 'info' | 'success' | 'warning' | 'error';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  farmName: string;
  location: string;
  farmArea?: string;
  farmDistrict?: string;
  role?: UserRole;
  theme?: ThemeMode;
}

export interface SensorCurrent {
  temperature: number;
  humidity: number;
  soilMoisture1: number;
  soilMoisture2: number;
  avgSoilMoisture: number;
  tankWaterLevel: number;
  waterPumpStatus: boolean;
  pesticidePumpStatus: boolean;
  waterValve?: boolean;
  commonMotor?: boolean;
  routeMode?: string;
  autoMode: boolean;
  deviceOnline: boolean;
  lastSync: string;
  offlineMode?: boolean;
}

export interface ControlState {
  autoMode: boolean;
  waterPump: boolean;
  moistureThreshold: number;
}

export interface DiseasePrediction {
  disease: DiseaseClass;
  confidence: number;
  solution: string;
  spray: boolean;
  imageUrl: string;
  timestamp: string;
}

export interface AppLog {
  id: string;
  type: LogType;
  message: string;
  ts: string;
  lang?: Lang;
}

export interface ActionLog {
  uid: string;
  userName: string;
  actionType: string;
  timestamp: number;
  oldValue: unknown;
  newValue: unknown;
}

export type { FarmRealtime, PesticideStatus, RouteState } from '@/types/farm';
export type { AnalyticsKpi, AnalyticsSummary, HeatmapRow, HeatmapRowKey } from '@/types/analytics';
export type { DiseaseClass, DiseaseRecommendation } from '@/types/disease';
export type { AdminAlert, AlertSeverity, AdminAlertType } from '@/types/adminAlert';
export type {
  AdminAnalyticsPayload,
  AdminCommandSummary,
  AdminDashboardPayload,
  AdminFarmerRow,
  AdminGlobalAnalytics,
  HighRiskActionType,
  HighRiskApproval,
  AdminReportsPayload,
} from '@/types/admin';
export type { FarmStatus } from '@/types/farmStatus';
