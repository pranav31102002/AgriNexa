import axios from 'axios';

type AnyObj = Record<string, unknown>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickImageUrl(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string' && /^https?:\/\//i.test(data)) return data;
  if (typeof data !== 'object') return null;
  const obj = data as AnyObj;
  const candidates = [obj.imageUrl, obj.url, obj.image, obj.lastImage, obj.path];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      if (/^https?:\/\//i.test(c)) return c;
    }
  }
  return null;
}

export function getEsp32Config() {
  const triggerUrl = process.env.EXPO_PUBLIC_ESP32_TRIGGER_URL?.trim();
  const imageUrlEndpoint = process.env.EXPO_PUBLIC_ESP32_LAST_IMAGE_URL?.trim();
  return { triggerUrl, imageUrlEndpoint };
}

export function hasEsp32Config() {
  const { triggerUrl, imageUrlEndpoint } = getEsp32Config();
  return Boolean(triggerUrl && imageUrlEndpoint);
}

async function triggerCapture(triggerUrl: string) {
  // Different ESP32 firmwares expose GET or POST trigger endpoints.
  try {
    await axios.post(triggerUrl, { capture: true, mode: 'single' }, { timeout: 10000 });
    return;
  } catch {
    await axios.get(triggerUrl, { timeout: 10000 });
  }
}

async function readLastImage(imageUrlEndpoint: string) {
  const response = await axios.get(imageUrlEndpoint, { timeout: 10000 });
  return pickImageUrl(response.data);
}

export async function triggerEsp32Scan(): Promise<string> {
  const { triggerUrl, imageUrlEndpoint } = getEsp32Config();

  if (!triggerUrl || !imageUrlEndpoint) {
    throw new Error(
      'ESP32 config missing. Set EXPO_PUBLIC_ESP32_TRIGGER_URL and EXPO_PUBLIC_ESP32_LAST_IMAGE_URL in .env'
    );
  }

  await triggerCapture(triggerUrl);

  // Poll last-image endpoint; camera may need a moment to save/upload.
  for (let i = 0; i < 8; i += 1) {
    const imageUrl = await readLastImage(imageUrlEndpoint);
    if (imageUrl) return imageUrl;
    await sleep(900);
  }

  throw new Error('ESP32 responded, but no image URL was returned from last-image endpoint');
}
