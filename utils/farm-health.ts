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

  const score = Math.round(
    soil * 0.4 +
      tank * 0.2 +
      diseaseScore * 0.25 +
      deviceScore * 0.15
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

  const score = Math.round(soil * 0.4 + tank * 0.2 + diseaseScore * 0.25 + deviceScore * 0.15);

  if (score >= 85) return { score, label: 'Excellent' };
  if (score >= 70) return { score, label: 'Good' };
  if (score >= 50) return { score, label: 'Needs Attention' };
  return { score, label: 'Critical' };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}
