import { DailyReport, MonthlyReport, WeeklyReport } from '@/services/report/report-calculator';

export type FirebaseDeviceStatus = {
  online?: boolean;
  connection?: string;
  firmware?: string;
  lastSeen?: number;
};

export type FirebaseSensorsCurrent = {
  temperature?: number;
  humidity?: number;
  soil1?: number;
  soil2?: number;
  avgSoil?: number;
  tankLevel?: number;
  pumpWater?: boolean;
  pumpSpray?: boolean;
  waterValve?: boolean;
  commonMotor?: boolean;
  routeMode?: string;
  timestamp?: number;
};

export type FirebaseControls = {
  autoMode?: boolean;
  moistureThreshold?: number;
  pumpWater?: boolean;
  notifications?: boolean;
  theme?: string;
  language?: string;
};

export type FirebaseReports = {
  daily?: DailyReport;
  weekly?: WeeklyReport;
  monthly?: MonthlyReport;
};

export type FirebaseRoot = {
  aiDisease?: unknown;
  analytics?: { today?: unknown };
  automation?: { water?: unknown };
  controls?: FirebaseControls;
  deviceStatus?: {
    mainEsp32?: FirebaseDeviceStatus;
    esp32cam?: FirebaseDeviceStatus;
  };
  logs?: unknown;
  pesticide?: unknown;
  reports?: FirebaseReports;
  sensors?: {
    current?: FirebaseSensorsCurrent;
    history?: Record<string, unknown>;
  };
  admin?: {
    globalAnalytics?: Record<string, unknown>;
    alerts?: Record<string, unknown>;
    farmsIndex?: Record<string, unknown>;
  };
  userProfiles?: Record<string, unknown>;
};
