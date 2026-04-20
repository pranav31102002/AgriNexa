import { SensorCurrent } from '@/types';

export type RouteState = 'IDLE' | 'WATER' | 'PESTICIDE' | 'FLUSH';

export type PesticideStatus = {
  sprayON?: boolean;
  reason?: string;
  lastSprayDurationSec?: number;
  timestamp?: number;
};

export type FarmRealtime = SensorCurrent & {
  routeState: RouteState;
  commonLineActive: boolean;
  flushActive: boolean;
  pesticideStatus: PesticideStatus | null;
};
