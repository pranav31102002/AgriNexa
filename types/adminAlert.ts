export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AdminAlertType =
  | 'LOW_TANK'
  | 'DEVICE_OFFLINE'
  | 'ROUTE_FAILURE'
  | 'SPRAY_INTERRUPTION'
  | 'DISEASE_HIGH'
  | 'LOW_MOISTURE';

export type AdminAlert = {
  id: string;
  severity: AlertSeverity;
  farmName: string;
  farmerName: string;
  type: AdminAlertType;
  timestamp: number;
  resolved: boolean;
  status: 'open' | 'resolved';
  reason: string;
  details: string;
  userUid: string;
  farmId: string;
  acknowledgedAt: number;
  incidentStatus: 'open' | 'acknowledged' | 'escalated' | 'resolved';
  escalationLevel: 0 | 1 | 2 | 3;
  slaDeadline: number;
  slaBreached: boolean;
  resolvedAt: number;
};

