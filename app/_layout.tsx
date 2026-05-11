import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL    = 'https://kaam-backend-production.up.railway.app';
const PROJECT_ID = 'd5401a85-a7f5-4959-85a5-6def24a6478e';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    const pushToken = tokenData.data;
    const userToken = await AsyncStorage.getItem('userToken');
    if (userToken && pushToken) {
      fetch(`${API_URL}/api/notifications/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
      }).catch(() => {});
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'KaamKaro',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E8A3C',
        sound: 'default',
      });
    }
  } catch {}
}

export default function RootLayout() {
  const router   = useRouter();
  const navState = useRootNavigationState();
  const [target, setTarget] = useState<string | null>(null);
  const notifListener    = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const navigated = useRef(false);

  // Step 1 — read storage once on mount
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const { utm_source, utm_medium, utm_campaign } = parsed.queryParams ?? {};
      if (utm_source)   AsyncStorage.setItem('referral_source',   utm_source   as string);
      if (utm_medium)   AsyncStorage.setItem('referral_medium',   utm_medium   as string);
      if (utm_campaign) AsyncStorage.setItem('referral_campaign', utm_campaign as string);
    }).catch(() => {});

    registerForPushNotifications();

    notifListener.current    = Notifications.addNotificationReceivedListener(() => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});

    AsyncStorage.multiGet(['userToken', 'hasSeenWelcome', 'onboardingComplete'])
      .then(([[, token], [, seen], [, onboarded]]) => {
        if (!token)          setTarget(seen ? '/login' : '/welcome');
        else if (!onboarded) setTarget('/onboarding');
        else                 setTarget('/(tabs)');
      });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // Step 2 — navigate once navigator is ready AND we have a target
  useEffect(() => {
    if (!navState?.key) return;       // navigator not mounted yet
    if (!target) return;              // storage not read yet
    if (navigated.current) return;    // already navigated
    navigated.current = true;
    router.replace(target as any);
  }, [navState?.key, target]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="welcome"    />
        <Stack.Screen name="login"      />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)"     />
      </Stack>
    </SafeAreaProvider>
  );
}
