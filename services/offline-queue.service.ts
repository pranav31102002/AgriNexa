import { cacheKeys, getCache, setCache } from '@/services/cache.service';

type PendingWrite = {
  id: string;
  path: string;
  value: unknown;
  createdAt: number;
};

const MAX_QUEUE = 200;

async function readQueue(): Promise<PendingWrite[]> {
  return (await getCache<PendingWrite[]>(cacheKeys.queue)) ?? [];
}

async function writeQueue(list: PendingWrite[]) {
  await setCache(cacheKeys.queue, list.slice(-MAX_QUEUE));
}

export async function enqueuePendingWrite(path: string, value: unknown) {
  const current = await readQueue();
  const item: PendingWrite = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    path,
    value,
    createdAt: Date.now(),
  };
  await writeQueue([...current, item]);
}

export async function pendingWriteCount() {
  const list = await readQueue();
  return list.length;
}

export async function flushPendingWrites(
  writer: (path: string, value: unknown) => Promise<boolean>
): Promise<{ flushed: number; remaining: number }> {
  const list = await readQueue();
  if (!list.length) return { flushed: 0, remaining: 0 };

  const remaining: PendingWrite[] = [];
  let flushed = 0;

  for (const item of list) {
    const ok = await writer(item.path, item.value);
    if (ok) flushed += 1;
    else remaining.push(item);
  }

  await writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}
