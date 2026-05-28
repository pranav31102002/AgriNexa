import { firebasePaths } from '@/constants/firebase-paths';
import { setRealtime } from '@/services/firebase';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';

export async function logUserAction(params: {
  actionType: string;
  oldValue: unknown;
  newValue: unknown;
  context?: string;
  targetId?: string;
}) {
  const user = useAuthStore.getState().user;
  const role = useAuthStore.getState().role;
  const profile = useAppStore.getState().profile;
  const now = Date.now();
  const uid = user?.uid ?? 'unknown_user';
  const userName = profile.name || user?.displayName || 'Unknown Farmer';

  await setRealtime(`${firebasePaths.logsActions}/${now}_${uid}`, {
    uid,
    userName,
    role,
    actionType: params.actionType,
    context: params.context ?? 'general',
    targetId: params.targetId ?? null,
    timestamp: Math.floor(now / 1000),
    oldValue: params.oldValue,
    newValue: params.newValue,
  });
}
