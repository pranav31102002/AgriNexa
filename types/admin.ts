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
  loggedInFarmers: number;
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
  insightSummary: string;
  weeklyDeltas: {
    alertsPct: number;
    irrigationPct: number;
    scansPct: number;
  };
  actionQueue: string[];
  recentActivity: Array<{
    id: string;
    label: string;
    timestamp: number;
    severity: 'info' | 'warning' | 'critical';
  }>;
  incidentOps: {
    mttaMinutes: number;
    mttrMinutes: number;
    slaCompliancePct: number;
    escalationFunnel: {
      open: number;
      acknowledged: number;
      escalated: number;
      resolved: number;
    };
    escalationLevels: {
      l0: number;
      l1: number;
      l2: number;
      l3: number;
    };
    slaComplianceTrend: AdminTrendPoint[];
  };
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

export type HighRiskActionType = 'EMERGENCY_STOP_ALL' | 'DISABLE_FARMER_ACCOUNT';

export type HighRiskApproval = {
  id: string;
  actionType: HighRiskActionType;
  targetId: string;
  summary: string;
  status: 'pending' | 'executed' | 'rejected';
  requestedByUid: string;
  requestedByName: string;
  approvedByUid: string;
  approvedByName: string;
  rejectedByUid: string;
  rejectedByName: string;
  rejectReason: string;
  delegatedToUid: string;
  delegatedToName: string;
  createdAt: number;
  approvedAt: number;
  rejectedAt: number;
  delegatedAt: number;
  executedAt: number;
  parentApprovalId: string;
};

