import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { firebasePaths } from '@/constants/firebase-paths';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';
import { useAuthStore } from '@/store/use-auth-store';

const queryKey = ['selected-crop'];

function selectedCropPath(uid: string) {
  return `${firebasePaths.userPreferences}/${uid}/selectedCropId`;
}

async function fetchSelectedCropId(uid: string) {
  return getRealtimeOnce<string>(selectedCropPath(uid));
}

async function saveSelectedCropId(uid: string, cropId: string | null) {
  await setRealtime(selectedCropPath(uid), cropId || null);
  return cropId;
}

export function useSelectedCrop() {
  const queryClient = useQueryClient();
  const uid = useAuthStore((state) => state.user?.uid ?? null);
  const query = useQuery({
    queryKey: [...queryKey, uid],
    queryFn: () => (uid ? fetchSelectedCropId(uid) : null),
    enabled: Boolean(uid),
    staleTime: 30_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: (cropId: string | null) => {
      if (!uid) return Promise.resolve(cropId);
      return saveSelectedCropId(uid, cropId);
    },
    onMutate: async (cropId) => {
      await queryClient.cancelQueries({ queryKey: [...queryKey, uid] });
      queryClient.setQueryData([...queryKey, uid], cropId);
    },
    onSuccess: (cropId) => {
      queryClient.setQueryData([...queryKey, uid], cropId);
    },
  });

  return {
    ...query,
    selectedCropId: query.data ?? null,
    setSelectedCropId: mutation.mutateAsync,
    selectingCrop: mutation.isPending,
  };
}
