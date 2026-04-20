import { firebasePaths } from '@/constants/firebase-paths';
import { setRealtime } from '@/services/firebase';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';

export async function logUserAction(params: {
  actionType: string;
  oldValue: unknown;
  newValue: unknown;
}) {
  const user = useAuthStore.getState().user;
  const profile = useAppStore.getState().profile;
  const now = Date.now();
  const uid = user?.uid ?? 'unknown_user';
  const userName = profile.name || user?.displayName || 'Unknown Farmer';

  await setRealtime(`${firebasePaths.logsActions}/${now}_${uid}`, {
    uid,
    userName,
    actionType: params.actionType,
    timestamp: Math.floor(now / 1000),
    oldValue: params.oldValue,
    newValue: params.newValue,
  });
}
