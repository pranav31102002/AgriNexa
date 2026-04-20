import Constants from 'expo-constants';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

let handlerConfigured = false;

async function getNotificationsModule() {
  if (isExpoGo) return null;

  // Local notifications are best effort in Expo Go.
  try {
    const Notifications = await import('expo-notifications');

    if (!handlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }

    return Notifications;
  } catch {
    return null;
  }
}

export async function ensureNotificationPermission() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

  try {
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted) {
      const asked = await Notifications.requestPermissionsAsync();
      return asked.granted;
    }
    return true;
  } catch {
    return !isExpoGo;
  }
}

export async function pushLocalNotification(title: string, body: string) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // Ignore unsupported behavior in Expo Go.
  }
}
