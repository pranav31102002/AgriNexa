import { ActionFeedback, FeedbackVariant } from '@/components/ui/action-feedback';
import { GlassCard, StatusBadge } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ValidationAlertCard } from '@/components/ui/validation-alert-card';
import { firebasePaths } from '@/constants/firebase-paths';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useDeviceStatus } from '@/hooks/use-device-status';
import { useFarmRealtime } from '@/hooks/use-farm-realtime';
import { useWeather } from '@/hooks/useWeather';
import { triggerAlertIfNeeded } from '@/services/alerts.service';
import { logUserAction } from '@/services/audit-log.service';
import { cacheKeys, getCache, setCache } from '@/services/cache.service';
import { scanFromESP32 } from '@/services/disease/esp32Scan';
import { predictDiseaseFromBase64 } from '@/services/disease/predictFromESP32';
import { setRealtime, storageReady, uploadImageAsync } from '@/services/firebase';
import { logDiseaseHistory } from '@/services/history.service';
import { getRecommendationByClass } from '@/services/ai/recommendation-engine';
import { predictDiseaseFromUri, toLeafValidationError } from '@/services/roboflow';
import { useAppStore } from '@/store/use-app-store';
import { DiseasePrediction } from '@/types';
import { compressImage } from '@/utils/image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { buildSprayApprovalWeatherText, formatLocalizedDateTime, translateDiseaseName, translateRainRisk } from '@/utils/farmer-localization';
import { rainRiskTone, sprayAdviceTone } from '@/utils/weatherMapper';

type ScanSource = 'upload' | 'camera' | 'esp32';

type ValidationState = {
  title: string;
  subtitle: string;
  code: string;
} | null;

export default function DiseaseAIScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const setDiseaseValidation = useAppStore((state) => state.setDiseaseValidation);
  const cachedDiseasePrediction = useAppStore((state) => state.cachedDiseasePrediction);
  const setCachedDiseasePrediction = useAppStore((state) => state.setCachedDiseasePrediction);
  const language = useAppStore((state) => state.language);
  const { data: deviceStatus } = useDeviceStatus();
  const { data: farmRealtime } = useFarmRealtime();
  const { data: weather } = useWeather();
  const isDark = theme.scheme === 'dark';
  const txt = { color: isDark ? '#F8FAFC' : '#1E293B' };
  const muted = { color: isDark ? '#CBD5E1' : '#64748B' };

  const [prediction, setPrediction] = useState<DiseasePrediction | null>(cachedDiseasePrediction);
  const [previewUri, setPreviewUri] = useState<string | null>(cachedDiseasePrediction?.imageUrl ?? null);
  const [pendingCameraUri, setPendingCameraUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<ValidationState>(null);
  const [waitingEsp32, setWaitingEsp32] = useState(false);
  const [esp32Stage, setEsp32Stage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    title: string;
    subtitle: string;
    variant?: FeedbackVariant;
  } | null>(null);
  const esp32AbortRef = useRef<AbortController | null>(null);
  const sprayAutoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void (async () => {
      const cached = await getCache<{ prediction: DiseasePrediction; previewUri: string | null }>(cacheKeys.disease);
      if (cached?.prediction) {
        setPrediction(cached.prediction);
        setPreviewUri(cached.previewUri ?? cached.prediction.imageUrl);
        setCachedDiseasePrediction(cached.prediction);
      }
    })();
  }, [setCachedDiseasePrediction]);

  useEffect(() => {
    return () => {
      esp32AbortRef.current?.abort();
      if (sprayAutoStopRef.current) {
        clearTimeout(sprayAutoStopRef.current);
      }
    };
  }, []);


  const clearSelection = () => {
    setPendingCameraUri(null);
    setPreviewUri(null);
    setPrediction(null);
    setError(null);
    setValidationState(null);
    setDiseaseValidation('idle', '');
    setCachedDiseasePrediction(null);
    void setCache(cacheKeys.disease, null);
  };

  const toDataUri = (base64: string) => `data:image/jpeg;base64,${base64}`;

  const isBase64Large = (base64: string) => base64.length > 200000;

  const setInvalidImageState = async (message: string, code = 'INVALID_NON_LEAF_IMAGE') => {
    setPrediction(null);
    setError(null);
    setValidationState({
      code,
      title: t('invalidLeafTitle'),
      subtitle: t('invalidLeafSubtitle'),
    });
    setDiseaseValidation('invalid', message);

    await setRealtime(`${firebasePaths.pesticide}/status`, {
      sprayON: false,
      reason: 'INVALID_NON_LEAF_IMAGE',
      timestamp: Math.floor(Date.now() / 1000),
    });
  };

  const classifyMutation = useMutation({
    mutationFn: async ({
      uri,
      source,
      base64,
    }: {
      uri: string;
      source: ScanSource;
      base64?: string;
    }) => {
      setError(null);
      setPrediction(null);
      setValidationState(null);
      setDiseaseValidation('idle', '');
      setPreviewUri(uri);

      if (base64) {
        const result = await predictDiseaseFromBase64(base64);
        return { result, source, imageName: `esp32_${Date.now()}.jpg` };
      }

      const compressed = /^https?:\/\//i.test(uri) ? uri : await compressImage(uri);

      let predictionSource = compressed;
      if (storageReady && !/^https?:\/\//i.test(compressed)) {
        try {
          predictionSource = await uploadImageAsync(compressed);
        } catch {
          predictionSource = compressed;
        }
      }

      const result = await predictDiseaseFromUri(predictionSource);
      return { result, source, imageName: predictionSource.split('/').pop() ?? '' };
    },
    onSuccess: async ({ result, source, imageName }) => {
      setPendingCameraUri(null);
      setValidationState(null);
      setDiseaseValidation('valid', '');
      setPrediction(result);
      setCachedDiseasePrediction(result);
      await setCache(cacheKeys.disease, { prediction: result, previewUri: result.imageUrl || previewUri });

      const riskLevel = result.disease === 'Healthy' ? 'LOW' : result.confidence > 90 ? 'HIGH' : 'MEDIUM';

      await setRealtime(firebasePaths.aiDisease, {
        diseaseName: result.disease,
        confidence: Number(result.confidence.toFixed(2)),
        solution: result.solution,
        sprayRecommended: result.spray,
        riskLevel,
        imageUrl: result.imageUrl,
        imageName,
        scanSource: source,
        model: process.env.EXPO_PUBLIC_ROBOFLOW_MODEL_ID || 'tomato-zllzj-3edii/2',
        provider: 'roboflow',
        timestamp: Math.floor(Date.now() / 1000),
      });

      await setRealtime(`${firebasePaths.pesticide}/lastPrediction`, {
        disease: result.disease,
        confidence: Number(result.confidence.toFixed(2)),
        timestamp: Math.floor(Date.now() / 1000),
      });

      await setRealtime(`${firebasePaths.pesticide}/latestImageBase64`, '');
      await setRealtime(`${firebasePaths.pesticide}/latestImageTimestamp`, 0);

      await setRealtime(`${firebasePaths.pesticide}/scanStatus`, {
        cameraReady: true,
        uploadDone: true,
        lastCapture: result.imageUrl,
        timestamp: Math.floor(Date.now() / 1000),
      });

      await logDiseaseHistory({
        disease: result.disease,
        confidence: result.confidence,
        sprayRecommended: result.spray,
        imageUrl: result.imageUrl,
      });

      if (result.confidence > 90 && result.disease !== 'Healthy') {
        await triggerAlertIfNeeded({
          key: 'disease_high_confidence',
          type: 'DISEASE_HIGH_CONFIDENCE',
          severity: 'high',
          title: 'Disease Detected',
          message: `${result.disease} detected with ${result.confidence.toFixed(1)}% confidence.`,
        });
      }
    },
    onError: async (e) => {
      const parsed = toLeafValidationError(e);
      if (parsed.code !== 'UNKNOWN') {
        await setInvalidImageState(parsed.message, parsed.code);
        return;
      }

      setDiseaseValidation('error', t('predictionFailed'));
      setError(t('uploadPredictionFailed', { message: String(e) }));
    },
  });

  const onUploadPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t('galleryPermissionRequired'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });
      if (!result.canceled) {
        const uri = result.assets[0]?.uri;
        if (uri) classifyMutation.mutate({ uri, source: 'upload' });
      }
    } catch (e) {
      setError(t('unableToOpenGallery', { message: String(e) }));
    }
  };

  const onCapturePhoto = async () => {
    try {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        setError(t('cameraPermissionRequired'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });
      if (!result.canceled) {
        const uri = result.assets[0]?.uri;
        if (uri) {
          setError(null);
          setPrediction(null);
          setValidationState(null);
          setDiseaseValidation('idle', '');
          setCachedDiseasePrediction(null);
          setPendingCameraUri(uri);
          setPreviewUri(uri);
          void setCache(cacheKeys.disease, null);
        }
      }
    } catch (e) {
      const message = String(e);
      if (message.includes('keep awake')) {
        setError(t('cameraSessionFailed'));
      } else {
        setError(t('unableToOpenCamera', { message }));
      }
    }
  };

  const onScanPhoto = async () => {
    try {
      const lastScan = (await getCache<number>(cacheKeys.esp32LastTimestamp)) ?? 0;
      if (lastScan && Date.now() - lastScan < 6000) {
        setError(t('waitBeforeScan'));
        return;
      }
      esp32AbortRef.current?.abort();
      const abortController = new AbortController();
      esp32AbortRef.current = abortController;

      setWaitingEsp32(true);
      setEsp32Stage(t('esp32Waiting'));

      const payload = await scanFromESP32({
        signal: abortController.signal,
        onStage: (stage) => {
          if (stage === 'capturing') setEsp32Stage(t('esp32Capturing'));
          if (stage === 'receiving') setEsp32Stage(t('esp32Receiving'));
        },
      });

      await setCache(cacheKeys.esp32LastTimestamp, Date.now());
      if (isBase64Large(payload.base64)) {
        setError(t('esp32ResponseDelayed'));
        await setRealtime(`${firebasePaths.pesticide}/scanRequest`, false);
        setWaitingEsp32(false);
        setEsp32Stage(null);
        return;
      }

      const preview = toDataUri(payload.base64);
      setPreviewUri(preview);
      setValidationState(null);
      setDiseaseValidation('idle', '');
      await setRealtime(`${firebasePaths.pesticide}/scanRequest`, false);
      setWaitingEsp32(false);
      setEsp32Stage(null);
      setEsp32Stage(t('esp32Predicting'));
      classifyMutation.mutate({ uri: preview, source: 'esp32', base64: payload.base64 });
    } catch (e) {
      setError(String(e) || t('esp32ResponseDelayed'));
      await setRealtime(`${firebasePaths.pesticide}/scanRequest`, false);
      setWaitingEsp32(false);
      setEsp32Stage(null);
    }
  };

  const confidence = prediction?.confidence ?? 0;
  const recommendation = prediction ? getRecommendationByClass(prediction.disease) : null;
  const routeState = farmRealtime?.routeState ?? 'IDLE';
  const flushActive = Boolean(farmRealtime?.flushActive);
  const awaitingCameraSubmit = Boolean(pendingCameraUri && !prediction);
  const severeWeatherRisk = Boolean(weather && (!weather.guidance.spraySafe || weather.guidance.rainRisk === 'HIGH'));

  const sprayMutation = useMutation({
    mutationFn: async (approve: boolean) => {
      if (sprayAutoStopRef.current) {
        clearTimeout(sprayAutoStopRef.current);
        sprayAutoStopRef.current = null;
      }

      if (approve) {
        await setRealtime(`${firebasePaths.pesticide}/approval`, {
          approved: true,
          stop: false,
        });

        await setRealtime(`${firebasePaths.pesticide}/status`, {
          sprayON: true,
          reason: 'APPROVED_BY_FARMER',
          lastSprayDurationSec: 10,
          timestamp: Math.floor(Date.now() / 1000),
        });
      } else {
        await setRealtime(`${firebasePaths.pesticide}/status`, {
          sprayON: false,
          reason: 'ABORTED_BY_FARMER',
          lastSprayDurationSec: 0,
          timestamp: Math.floor(Date.now() / 1000),
        });
      }

      await logUserAction({
        actionType: approve ? 'SPRAY_APPROVAL' : 'STOP_SPRAY',
        oldValue: !approve,
        newValue: approve,
      });

      if (approve) {
        setFeedback({ title: t('sprayApprovedTitle'), subtitle: t('sprayApprovedSubtitle'), variant: 'success' });
        sprayAutoStopRef.current = setTimeout(async () => {
          try {
            await setRealtime(`${firebasePaths.pesticide}/approval`, {
              approved: false,
              stop: true,
            });
            await setRealtime(`${firebasePaths.pesticide}/status`, {
              sprayON: false,
              reason: 'AUTO_STOP_10S',
              lastSprayDurationSec: 10,
              timestamp: Math.floor(Date.now() / 1000),
            });
            setFeedback({ title: t('sprayCompletedTitle'), subtitle: t('sprayCompletedSubtitle'), variant: 'info' });
          } catch (e) {
            setError(t('unableToAutoStopSpray', { message: String(e) }));
          } finally {
            sprayAutoStopRef.current = null;
          }
        }, 10000);
      } else {
        setFeedback({ title: t('sprayStoppedTitle'), subtitle: t('sprayStoppedSubtitle'), variant: 'warning' });
      }
    },
  });

  const canApprove = Boolean(prediction && prediction.spray && confidence > 85 && !sprayMutation.isPending && !severeWeatherRisk);

  return (
    <ScreenContainer backgroundColor={theme.background}>
      <GlassCard>
        <Text className="text-xl font-black text-slate-800" style={txt}>
          {t('diseaseAI')}
        </Text>
        <Text className="text-xs text-slate-500" style={muted}>
          {t('diseaseSubtitle')}
        </Text>

        <View className="mt-4 gap-2">
          <Pressable className="items-center rounded-2xl bg-emerald-600 px-4 py-3" onPress={onScanPhoto}>
            <Text className="font-black text-white">{t('scanPhoto')} (ESP32-CAM)</Text>
          </Pressable>
          <Pressable className="items-center rounded-2xl bg-sky-600 px-4 py-3" onPress={onUploadPhoto}>
            <Text className="font-black text-white">{t('uploadPhoto')}</Text>
          </Pressable>
          <Pressable className="items-center rounded-2xl bg-slate-700 px-4 py-3" onPress={onCapturePhoto}>
            <Text className="font-black text-white">{t('capturePhoto')}</Text>
          </Pressable>
        </View>
        <View className="mt-3 flex-row gap-2">
          <StatusBadge text={deviceStatus?.camOnline ? t('visionNodeOnline') : t('visionNodeOffline')} tone={deviceStatus?.camOnline ? 'ok' : 'error'} />
          <StatusBadge text={deviceStatus?.mainOnline ? t('mainNodeOnline') : t('mainNodeOffline')} tone={deviceStatus?.mainOnline ? 'ok' : 'error'} />
        </View>
      </GlassCard>

      {waitingEsp32 ? (
        <GlassCard className="items-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text className="mt-2 text-sm text-slate-600" style={muted}>
            {esp32Stage ?? t('esp32Waiting')}
          </Text>
        </GlassCard>
      ) : null}

      {classifyMutation.isPending ? (
        <GlassCard className="items-center">
          <ActivityIndicator size="large" color="#1B9C5A" />
          <Text className="mt-2 text-sm text-slate-600" style={muted}>
            {t('uploadingAnalyzing')}
          </Text>
        </GlassCard>
      ) : null}

      {error ? (
        <GlassCard>
          <Text className="text-sm font-semibold text-red-600">{error}</Text>
        </GlassCard>
      ) : null}

      {validationState ? (
        <ValidationAlertCard
          message={validationState.title}
          hint={validationState.subtitle}
          onRemoveImage={clearSelection}
        />
      ) : null}

      {previewUri ? (
        <GlassCard>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-800" style={txt}>
              {t('selectedImage')}
            </Text>
            <Pressable className="rounded-full bg-slate-700/85 p-1.5" onPress={clearSelection}>
              <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          <Image source={{ uri: previewUri }} className="h-56 w-full rounded-xl" resizeMode="cover" />
          {awaitingCameraSubmit ? (
            <View className="mt-4 gap-3">
              <Text className="text-sm text-slate-600" style={muted}>
                {t('croppedImageReady')}
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  className="flex-1 items-center rounded-2xl bg-slate-700 px-4 py-3"
                  disabled={classifyMutation.isPending}
                  onPress={onCapturePhoto}>
                  <Text className="font-black text-white">{t('recapture')}</Text>
                </Pressable>
                <Pressable
                  className={`flex-1 items-center rounded-2xl px-4 py-3 ${classifyMutation.isPending ? 'bg-slate-400' : 'bg-emerald-600'}`}
                  disabled={classifyMutation.isPending}
                  onPress={() => {
                    if (!pendingCameraUri) return;
                    classifyMutation.mutate({ uri: pendingCameraUri, source: 'camera' });
                  }}>
                  <Text className="font-black text-white">{t('uploadCroppedImage')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </GlassCard>
      ) : null}

      {prediction ? (
        <GlassCard>
          <Text className="text-base font-bold text-slate-800" style={txt}>
            {t('predictionPesticide')}
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <StatusBadge text={translateDiseaseName(prediction.disease, t)} tone={prediction.disease === 'Healthy' ? 'ok' : 'warn'} />
            <StatusBadge text={t('confidenceLabel', { value: prediction.confidence.toFixed(1) })} tone={confidence < 70 ? 'error' : 'ok'} />
          </View>

          <View className="mt-3">
            <View className="h-2 w-full rounded-full bg-slate-200" />
            <View
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${Math.min(100, Math.max(0, confidence))}%`, marginTop: -8 }}
            />
          </View>

          <Text className="mt-3 text-sm font-semibold text-slate-700" style={txt}>
            {t('predictedClass')}
          </Text>
          <Text className={`text-sm ${prediction.disease === 'Healthy' ? 'text-emerald-600 font-semibold' : 'text-slate-600'}`} style={prediction.disease === 'Healthy' ? undefined : muted}>
            {translateDiseaseName(prediction.disease, t)}
          </Text>

          <Text className="mt-3 text-sm font-semibold text-slate-700" style={txt}>
            {t('recommendedPesticide')}
          </Text>
          <Text className={`text-sm ${prediction.disease === 'Healthy' ? 'text-emerald-600 font-semibold' : 'text-slate-600'}`} style={prediction.disease === 'Healthy' ? undefined : muted}>
            {recommendation?.pesticide ?? prediction.solution}
          </Text>

          <Text className="mt-3 text-sm font-semibold text-slate-700" style={txt}>
            {t('whyRecommended')}
          </Text>
          <Text className="text-sm text-slate-600" style={muted}>
            {recommendation?.why ?? t('noReason')}
          </Text>

          <Text className="mt-3 text-sm font-semibold text-slate-700" style={txt}>
            {t('organicAlternative')}
          </Text>
          <Text className="text-sm text-slate-600" style={muted}>
            {recommendation?.organicAlternative ?? t('noAlternative')}
          </Text>

          <Text className="mt-3 text-sm font-semibold text-slate-700" style={txt}>
            {t('dosage')}
          </Text>
          <Text className="text-sm text-slate-600" style={muted}>
            {recommendation?.dosage ?? '-'}
          </Text>

          <Text className="mt-3 text-sm font-semibold text-slate-700" style={txt}>
            {t('harvestInterval')}
          </Text>
          <Text className="text-sm text-slate-600" style={muted}>
            {recommendation?.harvestInterval ?? '-'}
          </Text>

          <Text className="mt-3 text-sm font-semibold text-slate-700" style={txt}>
            {t('sprayFrequency')}
          </Text>
          <Text className="text-sm text-slate-600" style={muted}>
            {recommendation?.frequency ?? '-'}
          </Text>

          <Text className="mt-3 text-sm font-semibold text-slate-700" style={txt}>
            {t('confidenceReason')}
          </Text>
          <Text className="text-sm text-slate-600" style={muted}>
            {t('confidenceReasonLine', { confidence: prediction.confidence.toFixed(1) })}
          </Text>

          <Text className="mt-2 text-xs text-slate-500" style={muted}>
            {t('scanTimestamp')}: {formatLocalizedDateTime(prediction.timestamp, language)}
          </Text>
        </GlassCard>
      ) : null}

      {(routeState === 'PESTICIDE' || flushActive) ? (
        <GlassCard>
          <Text className="text-base font-bold text-slate-800" style={txt}>
            {t('sprayRouteStatus')}
          </Text>
          <View className="mt-2 gap-2">
            <Text className="text-sm text-slate-600" style={muted}>{t('pesticideRouteSelected')}</Text>
            <Text className="text-sm text-slate-600" style={muted}>{t('sprayLineActivated')}</Text>
            <Text className="text-sm text-slate-600" style={muted}>{t('commonLineEngaged')}</Text>
            <Text className="text-sm font-semibold text-emerald-600">
              {flushActive ? t('flushActive') : t('sprayActive')}
            </Text>
          </View>
        </GlassCard>
      ) : null}

      <GlassCard>
        <Text className="mb-3 text-base font-bold text-slate-800" style={txt}>
          {t('sprayApproval')}
        </Text>
        {weather ? (
          <View className="mb-3 gap-2">
            <Text className="text-sm text-slate-600" style={muted}>
              {buildSprayApprovalWeatherText(weather, t)}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <StatusBadge text={t('weatherRainChip', { risk: translateRainRisk(weather.guidance.rainRisk, t) })} tone={rainRiskTone(weather.guidance.rainRisk)} />
              <StatusBadge text={weather.guidance.spraySafe ? t('spraySafeNow') : t('sprayBlockedNow')} tone={sprayAdviceTone(weather.guidance.spraySafe)} />
            </View>
          </View>
        ) : null}
        <View className="flex-row gap-3">
          <Pressable
            className={`flex-1 items-center rounded-2xl px-4 py-3 ${canApprove ? 'bg-emerald-600' : 'bg-slate-400'}`}
            disabled={!canApprove}
            onPress={() => sprayMutation.mutate(true)}>
            <Text className="font-black text-white">{t('approveSpray')}</Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-2xl px-4 py-3 ${canApprove ? 'bg-red-600' : 'bg-slate-400'}`}
            disabled={!canApprove}
            onPress={() => sprayMutation.mutate(false)}>
            <Text className="font-black text-white">{t('stopSpray')}</Text>
          </Pressable>
        </View>
      </GlassCard>

      {feedback ? (
        <ActionFeedback
          title={feedback.title}
          subtitle={feedback.subtitle}
          variant={feedback.variant ?? 'success'}
          onHide={() => setFeedback(null)}
        />
      ) : null}
    </ScreenContainer>
  );
}
