import { DailyReport, MonthlyReport, WeeklyReport } from '@/services/report/report-calculator';

export type FirebaseDeviceStatus = {
  online?: boolean;
  connected?: boolean;
  status?: string;
  connection?: string;
  firmware?: string;
  lastSeen?: number | string;
  heartbeat?: number | string;
  lastHeartbeat?: number | string;
  timestamp?: number | string;
  updatedAt?: number | string;
  lastSync?: number | string;
  lastImageTimestamp?: number | string;
  latestImageTimestamp?: number | string;
};

export type FirebaseSensorsCurrent = {
  temperature?: number | string;
  temp?: number | string;
  temperatureC?: number | string;
  dhtTemp?: number | string;
  airTemperature?: number | string;
  humidity?: number | string;
  hum?: number | string;
  humidityPct?: number | string;
  dhtHumidity?: number | string;
  soil1?: number | string;
  soil2?: number | string;
  soilMoisture1?: number | string;
  soilMoisture2?: number | string;
  avgSoil?: number | string;
  avgSoilMoisture?: number | string;
  soilAvg?: number | string;
  ph?: number | string;
  pH?: number | string;
  waterPh?: number | string;
  waterPH?: number | string;
  soilPh?: number | string;
  soilPH?: number | string;
  tankLevel?: number | string;
  tankWaterLevel?: number | string;
  waterLevel?: number | string;
  pumpWater?: boolean | number | string;
  waterPump?: boolean | number | string;
  waterPumpStatus?: boolean | number | string;
  pumpSpray?: boolean | number | string;
  pesticidePump?: boolean | number | string;
  pesticidePumpStatus?: boolean | number | string;
  waterValve?: boolean | number | string;
  commonMotor?: boolean | number | string;
  routeMode?: string;
  routeState?: string;
  timestamp?: number | string;
  ts?: number | string;
  updatedAt?: number | string;
  lastSync?: number | string;
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
