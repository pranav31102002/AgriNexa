import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { firebasePaths } from '@/constants/firebase-paths';
import { getRealtimeOnce, setRealtime } from '@/services/firebase';

const queryKey = ['selected-crop'];
const selectedCropPath = `${firebasePaths.userPreferences}/selectedCropId`;

async function fetchSelectedCropId() {
  return getRealtimeOnce<string>(selectedCropPath);
}

async function saveSelectedCropId(cropId: string | null) {
  await setRealtime(selectedCropPath, cropId || null);
  return cropId;
}

export function useSelectedCrop() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: fetchSelectedCropId,
    staleTime: 30_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: saveSelectedCropId,
    onMutate: async (cropId) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, cropId);
    },
    onSuccess: (cropId) => {
      queryClient.setQueryData(queryKey, cropId);
    },
  });

  return {
    ...query,
    selectedCropId: query.data ?? null,
    setSelectedCropId: mutation.mutateAsync,
    selectingCrop: mutation.isPending,
  };
}
