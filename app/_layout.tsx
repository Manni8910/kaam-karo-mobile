import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageProvider } from '../i18n/LanguageContext';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://kaam-backend-production.up.railway.app';

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    // Save to backend if we have a user token
    const userToken = await AsyncStorage.getItem('userToken');
    if (userToken && pushToken) {
      fetch(`${API_URL}/api/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          token: pushToken,
          platform: Platform.OS,
        }),
      }).catch(() => {});
    }

    // Android needs a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'KaamKaro',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF4F5A',
        sound: 'default',
      });
    }
  } catch (e) {
    // Push registration failed silently — app still works
  }
}

function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications();

    // Listen for notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Notification received in foreground — already shown by handler above
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle notification tap — navigate to relevant screen
      const data = response.notification.request.content.data as any;
      // Navigation handled by deep link data if needed
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const bottomPad = Platform.OS === 'android'
    ? Math.max(insets.bottom, 20)
    : Math.max(insets.bottom, 4);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          paddingBottom: bottomPad,
          paddingTop: 8,
          height: 60 + bottomPad,
        },
        tabBarActiveTintColor: '#FF4F5A',
        tabBarInactiveTintColor: '#C0BDB8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Find Job',
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 28, height: 28, borderRadius: 8,
              backgroundColor: focused ? '#FF4F5A' : '#F0EDE8',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 15, color: focused ? '#fff' : '#C0BDB8' }}>F</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarLabel: 'Matches',
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 28, height: 28, borderRadius: 8,
              backgroundColor: focused ? '#FF4F5A' : '#F0EDE8',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 15, color: focused ? '#fff' : '#C0BDB8' }}>M</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="post-job"
        options={{
          tabBarLabel: 'Post Job',
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 44, height: 44, borderRadius: 10,
              backgroundColor: focused ? '#FF4F5A' : '#1A1A1A',
              alignItems: 'center', justifyContent: 'center',
              marginTop: -10,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 6,
            }}>
              <Text style={{ fontSize: 24, color: '#fff', lineHeight: 28 }}>+</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="login" options={{ href: null }} />
      <Tabs.Screen name="welcome" options={{ href: null }} />
      <Tabs.Screen name="components/LocationPicker" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <LanguageProvider>
          <TabsLayout />
        </LanguageProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
