import { logAlertHistory } from '@/services/history.service';
import { pushLocalNotification } from '@/utils/notifications';

type AlertPayload = {
  key: string;
  title: string;
  message: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
};

const lastFired = new Map<string, number>();
const COOLDOWN_MS = 15 * 60 * 1000;

export async function triggerAlertIfNeeded(params: AlertPayload) {
  const now = Date.now();
  const last = lastFired.get(params.key) ?? 0;
  if (now - last < COOLDOWN_MS) return;

  lastFired.set(params.key, now);
  await pushLocalNotification(params.title, params.message);
  await logAlertHistory({
    type: params.type,
    title: params.title,
    message: params.message,
    severity: params.severity,
  });
}
