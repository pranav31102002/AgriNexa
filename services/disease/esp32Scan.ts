import { firebasePaths } from '@/constants/firebase-paths';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';
import { cleanBase64Image } from '@/services/disease/predictFromESP32';

export type FirebaseTimestamp = number;

export interface CameraFrameData {
  latestImageBase64: string;
  latestImageTimestamp: FirebaseTimestamp;
}

export interface ESP32ScanResult {
  base64: string;
  timestamp: FirebaseTimestamp;
}

export type ESP32ScanStage = 'capturing' | 'receiving';

const POLL_INTERVAL_MS = 800;
const TIMEOUT_MS = 20_000;
const RETRY_TRIGGER_MS = 6000;

function debugLog(message: string, data?: Record<string, unknown>) {
  if (!__DEV__) return;
  const payload = data ? ` ${JSON.stringify(data)}` : '';
  // eslint-disable-next-line no-console
  console.log(`[ESP32Scan] ${message}${payload}`);
}

export async function clearOldCameraFrame(): Promise<void> {
  await Promise.all([
    setRealtime(`${firebasePaths.pesticide}/latestImageBase64`, ''),
    setRealtime(`${firebasePaths.pesticide}/latestImageTimestamp`, 0),
  ]);
}

export async function requestESP32Scan(): Promise<void> {
  await setRealtime(`${firebasePaths.pesticide}/scanRequest`, true);
}

async function readCameraFrame(): Promise<CameraFrameData> {
  const pesticide = await getRealtimeOnce<Record<string, unknown>>(firebasePaths.pesticide);
  return {
    latestImageBase64: String(pesticide?.latestImageBase64 ?? ''),
    latestImageTimestamp: Number(pesticide?.latestImageTimestamp ?? 0),
  };
}

export async function waitForLatestCameraImage(
  initialTimestamp: FirebaseTimestamp,
  initialBase64: string,
  retryTrigger?: () => Promise<void>,
  signal?: AbortSignal
): Promise<ESP32ScanResult> {
  const start = Date.now();
  let detectedTimestamp = initialTimestamp;
  let lastTriggerAt = Date.now();

  while (Date.now() - start < TIMEOUT_MS) {
    if (signal?.aborted) {
      throw new Error('ESP32 scan cancelled.');
    }

    const frame = await readCameraFrame();
    const cleaned = cleanBase64Image(frame.latestImageBase64);

    const hasFreshTimestamp = frame.latestImageTimestamp > initialTimestamp;
    const hasFreshBase64 = cleaned.length > 100 && cleaned !== initialBase64;
    const allowMissingTimestamp = initialTimestamp === 0 && frame.latestImageTimestamp === 0 && cleaned.length > 100;

    if (hasFreshTimestamp && cleaned.length > 100) {
      detectedTimestamp = frame.latestImageTimestamp;
      debugLog('Detected frame', { detectedTimestamp, length: cleaned.length });
      return { base64: cleaned, timestamp: detectedTimestamp };
    }

    if (hasFreshBase64 || allowMissingTimestamp) {
      detectedTimestamp = frame.latestImageTimestamp;
      debugLog('Detected frame without timestamp', { detectedTimestamp, length: cleaned.length });
      return { base64: cleaned, timestamp: detectedTimestamp };
    }

    if (retryTrigger && Date.now() - lastTriggerAt > RETRY_TRIGGER_MS) {
      debugLog('Re-triggering scan request');
      await retryTrigger();
      lastTriggerAt = Date.now();
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  debugLog('Timeout waiting for frame', { initialTimestamp, detectedTimestamp });
  throw new Error('Camera response delayed. Please ensure ESP32-CAM is online and try scanning again.');
}

type ScanOptions = {
  signal?: AbortSignal;
  onStage?: (stage: ESP32ScanStage) => void;
};

export async function scanFromESP32(options?: ScanOptions): Promise<ESP32ScanResult> {
  const { signal, onStage } = options ?? {};
  const snapshot = await readCameraFrame();
  const initialTimestamp = snapshot.latestImageTimestamp || 0;
  const initialBase64 = cleanBase64Image(snapshot.latestImageBase64);
  debugLog('Initial timestamp', { initialTimestamp });

  onStage?.('capturing');
  await clearOldCameraFrame();
  await requestESP32Scan();

  onStage?.('receiving');
  return waitForLatestCameraImage(initialTimestamp, initialBase64, requestESP32Scan, signal);
}
