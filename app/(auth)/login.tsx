import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassCard } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useAppTheme } from '@/hooks/use-app-theme';
import { login } from '@/services/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isDark = theme.scheme === 'dark';
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (values: FormValues) => login(values.email, values.password),
    onSuccess: () => router.replace('/' as never),
  });

  return (
    <ScreenContainer backgroundColor={theme.background} centerContent>
      <View className="overflow-hidden rounded-3xl">
        <LinearGradient colors={['#0f766e', '#0369a1']} className="p-6">
          <Text className="text-2xl font-black text-white">{t('welcomeBack')}</Text>
          <Text className="mt-1 text-sm text-cyan-100">{t('signinContinue')}</Text>
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
          <Controller
            control={form.control}
            name="password"
            render={({ field: { value, onChange } }) => (
              <View
                className="flex-row items-center rounded-2xl border px-4 py-1"
                style={{
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                }}>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder={t('password')}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                  className="flex-1 py-2"
                  style={{
                    color: isDark ? '#e2e8f0' : '#0f172a',
                  }}
                />
                <Pressable hitSlop={10} onPress={() => setShowPassword((prev) => !prev)}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={isDark ? '#94a3b8' : '#64748b'}
                  />
                </Pressable>
              </View>
            )}
          />
          <Pressable className="self-end" onPress={() => router.push('/(auth)/forgot-password' as never)}>
            <Text className="text-sm font-semibold text-sky-700">{t('forgotPassword')}</Text>
          </Pressable>

          {form.formState.errors.email ? <Text className="text-xs text-red-600">{form.formState.errors.email.message}</Text> : null}
          {form.formState.errors.password ? <Text className="text-xs text-red-600">{form.formState.errors.password.message}</Text> : null}
          {loginMutation.isError ? <Text className="text-xs text-red-600">{String(loginMutation.error)}</Text> : null}

          <Pressable
            className={`items-center rounded-2xl px-4 py-3 ${loginMutation.isPending ? 'bg-emerald-500' : 'bg-emerald-700'}`}
            disabled={loginMutation.isPending}
            onPress={form.handleSubmit((values) => loginMutation.mutate(values))}>
            {loginMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">{t('login')}</Text>}
          </Pressable>

          <Pressable className="items-center rounded-2xl bg-sky-700 px-4 py-3" onPress={() => router.push('/(auth)/signup' as never)}>
            <Text className="text-base font-bold text-white">{t('signup')}</Text>
          </Pressable>
        </View>
      </GlassCard>
    </ScreenContainer>
  );
}
