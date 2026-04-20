export type FarmStatus = {
  farmId: string;
  farmerUid: string;
  farmerName: string;
  farmName: string;
  location: string;
  avgSoil: number;
  temperature: number;
  humidity: number;
  ph: number | null;
  tankLevel: number;
  routeMode: string;
  irrigationMode: string;
  pumpStatus: boolean;
  waterRouteActive: boolean;
  sprayRouteActive: boolean;
  commonMotor: boolean;
  online: boolean;
  cameraAvailable: boolean;
  latestAlert: string;
  lastSync: number;
};

