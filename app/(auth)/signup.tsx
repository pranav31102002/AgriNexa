import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, Path, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { GlassCard } from '@/components/ui/cards';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useAppTheme } from '@/hooks/use-app-theme';
import { logout, signupWithProfile } from '@/services/auth';
import { useAppStore } from '@/store/use-app-store';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
    farmName: z.string().min(1, 'Farm name is required'),
    location: z.string().min(1, 'Location is required'),
    farmArea: z.string().min(2, 'Farm area is required'),
    farmDistrict: z.string().min(2, 'Farm district is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password is required'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const isDark = theme.scheme === 'dark';
  const language = useAppStore((s) => s.language);
  const themeMode = useAppStore((s) => s.themeMode);
  const setProfile = useAppStore((s) => s.setProfile);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      farmName: '',
      location: '',
      farmArea: '',
      farmDistrict: '',
      password: '',
      confirmPassword: '',
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const signupMutation = useMutation({
    mutationFn: async (v: FormValues) =>
      signupWithProfile({
        name: v.name,
        email: v.email,
        phone: v.phone,
        farmName: v.farmName,
        location: v.location,
        farmArea: v.farmArea,
        farmDistrict: v.farmDistrict,
        password: v.password,
        preferredLanguage: language.toUpperCase(),
        theme: themeMode,
        role: 'farmer',
      }),
    onSuccess: async (_cred, values) => {
      setProfile({
        name: values.name,
        email: values.email,
        phone: values.phone,
        farmName: values.farmName,
        location: values.location,
        farmArea: values.farmArea,
        farmDistrict: values.farmDistrict,
      });
      await logout();
      router.replace('/(auth)/login' as never);
    },
  });

  const getSignupErrorText = (error: unknown) => {
    const raw = String(error ?? '');
    if (raw.includes('auth/email-already-in-use')) return 'This email is already registered. Please login.';
    if (raw.includes('auth/invalid-email')) return 'Invalid email address.';
    if (raw.includes('auth/weak-password')) return 'Password is too weak. Use at least 6 characters.';
    if (raw.includes('profile save failed')) return 'Account created, but profile save failed. Check Firebase Database Rules.';
    return raw;
  };

  const Field = ({
    name,
    placeholder,
    secureTextEntry,
    showPasswordToggle,
    isPasswordVisible,
    onTogglePassword,
    keyboardType,
  }: {
    name: Path<FormValues>;
    placeholder: string;
    secureTextEntry?: boolean;
    showPasswordToggle?: boolean;
    isPasswordVisible?: boolean;
    onTogglePassword?: () => void;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
  }) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <View
          className={`rounded-2xl border ${showPasswordToggle ? 'flex-row items-center px-4 py-1' : 'px-4 py-3'}`}
          style={{
            borderColor: isDark ? '#334155' : '#e2e8f0',
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
          }}>
          <TextInput
            value={String(value ?? '')}
            onChangeText={onChange}
            placeholder={placeholder}
            autoCapitalize="none"
            secureTextEntry={showPasswordToggle ? !isPasswordVisible : secureTextEntry}
            keyboardType={keyboardType}
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            className={showPasswordToggle ? 'flex-1 py-2' : ''}
            style={{
              color: isDark ? '#e2e8f0' : '#0f172a',
            }}
          />
          {showPasswordToggle ? (
            <Pressable hitSlop={10} onPress={onTogglePassword}>
              <MaterialCommunityIcons
                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={isDark ? '#94a3b8' : '#64748b'}
              />
            </Pressable>
          ) : null}
        </View>
      )}
    />
  );

  return (
    <ScreenContainer backgroundColor={theme.background} centerContent>
      <View className="overflow-hidden rounded-3xl">
        <LinearGradient colors={['#065f46', '#0ea5e9']} className="p-6">
          <Text className="text-2xl font-black text-white">{t('createAccount')}</Text>
          <Text className="mt-1 text-sm text-cyan-100">{t('signinContinue')}</Text>
        </LinearGradient>
      </View>

      <GlassCard>
        <View className="gap-3">
          <Field name="name" placeholder={t('name')} />
          <Field name="email" placeholder={t('email')} keyboardType="email-address" />
          <Field name="phone" placeholder={t('phone')} keyboardType="phone-pad" />
          <Field name="farmName" placeholder={t('farmName')} />
          <Field name="location" placeholder={t('location')} />
          <Field name="farmArea" placeholder={t('farmArea')} />
          <Field name="farmDistrict" placeholder={t('farmDistrict')} />
          <Field
            name="password"
            placeholder={`${t('password')} *`}
            showPasswordToggle
            isPasswordVisible={showPassword}
            onTogglePassword={() => setShowPassword((prev) => !prev)}
          />
          <Field
            name="confirmPassword"
            placeholder={`Confirm ${t('password')} *`}
            showPasswordToggle
            isPasswordVisible={showConfirmPassword}
            onTogglePassword={() => setShowConfirmPassword((prev) => !prev)}
          />

          {Object.values(form.formState.errors).map((err, idx) =>
            err?.message ? (
              <Text key={`${err.message}-${idx}`} className="text-xs text-red-600">
                {String(err.message)}
              </Text>
            ) : null
          )}
          {signupMutation.isError ? <Text className="text-xs text-red-600">{getSignupErrorText(signupMutation.error)}</Text> : null}

          <Pressable
            className={`items-center rounded-2xl px-4 py-3 ${signupMutation.isPending ? 'bg-emerald-500' : 'bg-emerald-700'}`}
            disabled={signupMutation.isPending}
            onPress={form.handleSubmit((values) => signupMutation.mutate(values))}>
            {signupMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">{t('createAccount')}</Text>}
          </Pressable>

          <Pressable className="items-center" onPress={() => router.replace('/(auth)/login' as never)}>
            <Text className="text-sm font-semibold text-sky-700">{t('login')}</Text>
          </Pressable>
        </View>
      </GlassCard>
    </ScreenContainer>
  );
}
