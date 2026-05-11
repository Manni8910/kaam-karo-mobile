import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text, View, Image, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [userType, setUserType]   = useState<string>('');
  const [profilePic, setProfilePic] = useState<string | null>(null);

  const refresh = () => {
    AsyncStorage.multiGet(['userType', 'profilePic']).then(([[, t], [, pic]]) => {
      if (t)   setUserType(t);
      if (pic) setProfilePic(pic);
    });
  };

  useEffect(() => {
    refresh();
    // Re-read whenever app comes back to foreground (covers post-onboarding)
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, []);

  const isWorker = userType === 'SEEKER' || userType === '';

  const bottomPad = Platform.OS === 'android'
    ? Math.max(insets.bottom, 20)
    : Math.max(insets.bottom, 4);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: bottomPad,
          paddingTop: 8,
          height: 60 + bottomPad,
        },
        tabBarActiveTintColor: '#1E8A3C',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20 }}>{focused ? '🔥' : '🔍'}</Text>,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarLabel: 'Applications',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20 }}>{focused ? '📋' : '📄'}</Text>,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20 }}>{focused ? '💬' : '🗨️'}</Text>,
        }}
      />
      <Tabs.Screen
        name="post-job"
        options={{
          tabBarLabel: 'Post Job',
          href: isWorker ? null : undefined,
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 44, height: 44, borderRadius: 10,
              backgroundColor: focused ? '#1E8A3C' : '#222',
              alignItems: 'center', justifyContent: 'center',
              marginTop: -10,
              shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 6,
            }}>
              <Text style={{ fontSize: 24, color: '#fff', lineHeight: 28 }}>+</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => {
            if (profilePic) {
              return (
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  borderWidth: focused ? 2.5 : 1.5,
                  borderColor: focused ? '#1E8A3C' : '#9CA3AF',
                  overflow: 'hidden',
                }}>
                  <Image
                    source={{ uri: profilePic }}
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
              );
            }
            return <Text style={{ fontSize: 20 }}>{focused ? '👤' : '🧑'}</Text>;
          },
        }}
      />

      {/* Hidden screens inside tabs — no tab bar */}
      <Tabs.Screen name="applicants" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rating"     options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
