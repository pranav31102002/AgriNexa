import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useFarmRealtime } from '@/hooks/use-farm-realtime';
import { useWeather } from '@/hooks/useWeather';
import { useSelectedCrop } from '@/hooks/useSelectedCrop';
import {
  buildCropPlannerSummary,
  deleteCropPlannerItem,
  fetchCropPlanner,
  saveCropPlannerItem,
  syncCropAlerts,
} from '@/services/crop/crop-planner.service';
import { useAppStore } from '@/store/use-app-store';
import { CropPlannerItem, CropTemplateKey } from '@/types/crop';

export type CropPlannerFormInput = {
  id?: string;
  cropName: string;
  variety: string;
  farmId: string;
  farmName?: string;
  plantDate: string;
  expectedHarvestDate?: string;
  templateKey?: CropTemplateKey;
};

const queryKey = ['crop-planner'];

export function useCropPlanner() {
  const queryClient = useQueryClient();
  const { data: weather } = useWeather();
  const { data: sensor } = useFarmRealtime();
  const lastDisease = useAppStore((state) => state.cachedDiseasePrediction);
  const { selectedCropId, setSelectedCropId } = useSelectedCrop();

  const cropsQuery = useQuery({
    queryKey,
    queryFn: fetchCropPlanner,
    refetchInterval: 60_000,
    staleTime: 15_000,
    retry: 1,
  });

  const crops = cropsQuery.data ?? [];
  const summary = useMemo(
    () => buildCropPlannerSummary(crops, { weather, sensor, lastDisease, selectedCropId }),
    [crops, lastDisease, selectedCropId, sensor, weather]
  );

  useEffect(() => {
    if (!crops.length) return;
    const selectedExists = selectedCropId ? crops.some((crop) => crop.id === selectedCropId && crop.status === 'active') : false;
    if (!selectedExists) void setSelectedCropId(crops.find((crop) => crop.status === 'active')?.id ?? null);
  }, [crops, selectedCropId, setSelectedCropId]);

  useEffect(() => {
    if (!summary.upcomingAlerts.length) return;
    void syncCropAlerts(summary.upcomingAlerts);
  }, [summary.upcomingAlerts]);

  const saveMutation = useMutation({
    mutationFn: (input: CropPlannerFormInput) => saveCropPlannerItem(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (crop: CropPlannerItem) => deleteCropPlannerItem(crop.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...cropsQuery,
    crops,
    summary,
    selectedCropId: summary.selectedCropId,
    selectedCrop: summary.selectedCrop,
    setSelectedCropId,
    saveCrop: saveMutation.mutateAsync,
    deleteCrop: deleteMutation.mutateAsync,
    saving: saveMutation.isPending,
    deleting: deleteMutation.isPending,
  };
}



