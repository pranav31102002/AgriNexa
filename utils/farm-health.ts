import { SensorCurrent } from '@/types';

export function getFarmHealthScore(snapshot: SensorCurrent): {
  score: number;
  label: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical';
} {
  const soil = clamp(snapshot.avgSoilMoisture, 0, 100);
  const tank = clamp(snapshot.tankWaterLevel, 0, 100);
  const diseaseRisk = 0;
  const diseaseScore = 100 - diseaseRisk;
  const deviceScore = snapshot.deviceOnline ? 100 : 0;
  const phScore = getPhScore(snapshot.ph);

  const score = Math.round(
    soil * 0.35 +
      tank * 0.18 +
      diseaseScore * 0.25 +
      deviceScore * 0.12 +
      phScore * 0.1
  );

  if (score >= 85) return { score, label: 'Excellent' };
  if (score >= 70) return { score, label: 'Good' };
  if (score >= 50) return { score, label: 'Needs Attention' };
  return { score, label: 'Critical' };
}

export function getFarmHealthScoreWithRisk(snapshot: SensorCurrent, diseaseRiskPercent: number): {
  score: number;
  label: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical';
} {
  const soil = clamp(snapshot.avgSoilMoisture, 0, 100);
  const tank = clamp(snapshot.tankWaterLevel, 0, 100);
  const diseaseScore = 100 - clamp(diseaseRiskPercent, 0, 100);
  const deviceScore = snapshot.deviceOnline ? 100 : 0;
  const phScore = getPhScore(snapshot.ph);

  const score = Math.round(soil * 0.35 + tank * 0.18 + diseaseScore * 0.25 + deviceScore * 0.12 + phScore * 0.1);

  if (score >= 85) return { score, label: 'Excellent' };
  if (score >= 70) return { score, label: 'Good' };
  if (score >= 50) return { score, label: 'Needs Attention' };
  return { score, label: 'Critical' };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function getPhScore(value?: number | null) {
  const ph = Number(value);
  if (!Number.isFinite(ph) || ph <= 0) return 100;
  if (ph >= 6.5 && ph <= 8.5) return 100;
  if (ph >= 6 && ph < 6.5) return 80;
  if (ph > 8.5 && ph <= 9) return 80;
  if (ph >= 5.5 && ph < 6) return 55;
  if (ph > 9 && ph <= 9.5) return 55;
  return 30;
}
