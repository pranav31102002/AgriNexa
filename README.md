# AgriNexa AI with IoT: Smart Kisan Sathi

Expo Router + TypeScript production-style app for smart agriculture, optimized for Expo Go on a physical Android device.

## Stack

- Expo SDK 54 + Expo Router
- TypeScript
- Firebase Realtime Database + Storage
- Axios
- Zustand + AsyncStorage
- TanStack Query
- Expo Image Picker + Expo Camera
- React Native Gifted Charts
- NativeWind
- React Hook Form + Zod
- i18next (EN/HI/MR)

## Run on Weak Laptop (No Emulator)

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill credentials.

3. Start Metro:

```bash
npx expo start
```

4. Open Expo Go on Android and scan the QR code.

No Android Studio emulator is required.

## Firebase Paths Used

- `SmartKisanSathi/sensors/current`
- `SmartKisanSathi/controls`
- `SmartKisanSathi/automation/water`
- `SmartKisanSathi/pesticide`
- `SmartKisanSathi/deviceStatus`
- `SmartKisanSathi/aiDisease`
- `device/main/logs`

## Features

- Dashboard with 3s live refresh + pull-to-refresh
- Irrigation auto/manual controls and threshold logic
- Disease AI tab with ESP32 trigger, upload/camera, Roboflow prediction
- Spray approval workflow to Firebase pesticide control
- Analytics charts (moisture, pump usage, disease distribution)
- Search/filter/export logs
- Settings for language/theme/notifications/health tests
- Local notifications (tank low, device offline, soil dry, disease alerts)