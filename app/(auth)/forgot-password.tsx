import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassCard } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useAppTheme } from '@/hooks/use-app-theme';
import { sendResetPasswordLink } from '@/services/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isDark = theme.scheme === 'dark';
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const resetMutation = useMutation({
    mutationFn: async (values: FormValues) => sendResetPasswordLink(values.email),
    onSuccess: () => {
      Alert.alert(
        t('passwordResetSent'),
        t('passwordResetSent'),
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login' as never) }]
      );
    },
  });

  return (
    <ScreenContainer backgroundColor={theme.background} centerContent>
      <View className="overflow-hidden rounded-3xl">
        <LinearGradient colors={['#1d4ed8', '#0f766e']} className="p-6">
          <Text className="text-2xl font-black text-white">{t('forgotPassword')}</Text>
          <Text className="mt-1 text-sm text-cyan-100">{t('sendResetLink')}</Text>
        </LinearGradient>
      </View>

      <GlassCard>
        <View className="gap-3">
          <Controller
            control={form.control}
            name="email"
            render={({ field: { value, onChange } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={t('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                className="rounded-2xl border px-4 py-3"
                style={{
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  color: isDark ? '#e2e8f0' : '#0f172a',
                }}
              />
            )}
          />

          {form.formState.errors.email ? <Text className="text-xs text-red-600">{form.formState.errors.email.message}</Text> : null}
          {resetMutation.isError ? <Text className="text-xs text-red-600">{String(resetMutation.error)}</Text> : null}
          <Pressable
            className={`items-center rounded-2xl px-4 py-3 ${resetMutation.isPending ? 'bg-indigo-500' : 'bg-indigo-700'}`}
            disabled={resetMutation.isPending}
            onPress={form.handleSubmit((values) => resetMutation.mutate(values))}>
            {resetMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">{t('sendResetLink')}</Text>}
          </Pressable>

          <Pressable className="items-center" onPress={() => router.replace('/(auth)/login' as never)}>
            <Text className="text-sm font-semibold text-sky-700">{t('login')}</Text>
          </Pressable>
        </View>
      </GlassCard>
    </ScreenContainer>
  );
}
