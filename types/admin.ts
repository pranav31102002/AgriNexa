import { AdminAlert } from '@/types/adminAlert';
import { FarmStatus } from '@/types/farmStatus';
import { UserRole } from '@/types/userRole';
import { DailyReport, MonthlyReport, WeeklyReport } from '@/services/report/report-calculator';

export type AdminGlobalAnalytics = {
  activeFarms: number;
  farmsOnline: number;
  totalAlerts: number;
  totalDiseaseScans: number;
  avgRouteEfficiency: number;
  totalRouteCycles: number;
  totalDiseaseAlerts: number;
  topDisease: string;
};

export type AdminFarmerRow = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  farmName: string;
  location: string;
  role: UserRole;
  theme: string;
  active: boolean;
  lastLogin: number;
  loginOnline: boolean;
  loginLastSeen: number;
  routeEfficiency: number;
  deviceOnline: boolean;
  farmCount: number;
  linkedDeviceCount: number;
  status: 'active' | 'inactive';
};

export type AdminCommandSummary = {
  totalFarmers: number;
  totalFarms: number;
  totalViewers: number;
  totalAdmins: number;
  activeAlerts: number;
  onlineDevices: number;
  offlineDevices: number;
  todayDiseaseScans: number;
  irrigationActivity: number;
  pendingSprayApprovals: number | null;
};

export type AdminTrendPoint = {
  label: string;
  value: number;
};

export type AdminAnalyticsPayload = {
  activeFarms: AdminTrendPoint[];
  diseaseScans: AdminTrendPoint[];
  alerts: AdminTrendPoint[];
  irrigation: AdminTrendPoint[];
  deviceSummary: {
    online: number;
    offline: number;
    cameraAvailable: number;
  };
  problematicFarms: Array<{
    farmId: string;
    farmName: string;
    farmerName: string;
    score: number;
    issue: string;
  }>;
};

export type AdminReportsPayload = {
  daily: DailyReport | null;
  weekly: WeeklyReport | null;
  monthly: MonthlyReport | null;
  farmSummary: Array<{
    farmId: string;
    farmName: string;
    farmerName: string;
    alerts: number;
    online: boolean;
    avgSoil: number;
  }>;
  userSummary: Array<{
    uid: string;
    name: string;
    role: UserRole;
    farmName: string;
    lastLogin: number;
  }>;
};

export type AdminDashboardPayload = {
  global: AdminGlobalAnalytics;
  alerts: AdminAlert[];
  farms: FarmStatus[];
  farmers: AdminFarmerRow[];
  summary: AdminCommandSummary;
};

