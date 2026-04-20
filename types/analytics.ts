export type AnalyticsKpi = {
  avgSoilMoisture: number;
  waterRouteCycles: number;
  sprayRouteCycles: number;
  routeEfficiency: number;
  deltaSoil: number;
  deltaWater: number;
  deltaSpray: number;
  deltaEfficiency: number;
};

export type HeatmapRowKey = 'irrigation' | 'spray' | 'alerts' | 'common';

export type HeatmapRow = {
  key: HeatmapRowKey;
  values: number[];
};

export type AnalyticsSummary = {
  kpi: AnalyticsKpi;
  heatmap: HeatmapRow[];
  donut: {
    water: number;
    spray: number;
  };
  insight: string;
  sparklines: {
    soil: number[];
    water: number[];
    spray: number[];
    efficiency: number[];
  };
};
