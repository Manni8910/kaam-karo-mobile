import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GREEN_DARK = '#057a31';
const MUTED      = '#9CA3AF';
const BORDER     = '#e2e8f0';

/* Icon components — plain View-based, no external icon lib needed */
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const color = focused ? GREEN_DARK : MUTED;
  const size  = 22;

  if (label === 'jobs') {
    // Home/swipe icon
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 18, height: 14,
          borderWidth: 2, borderColor: color,
          borderRadius: 4,
          alignItems: 'center', justifyContent: 'flex-start',
          overflow: 'hidden',
        }}>
          <View style={{ width: 10, height: 4, borderWidth: 2, borderColor: color, borderBottomWidth: 0, borderRadius: 2, marginTop: -1 }} />
        </View>
      </View>
    );
  }

  if (label === 'applications') {
    // Briefcase / list
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 16, height: 12,
          borderWidth: 2, borderColor: color,
          borderRadius: 3,
        }}>
          <View style={{ width: 8, height: 3, borderWidth: 2, borderColor: color, borderBottomWidth: 0, borderRadius: 1, position: 'absolute', top: -3, left: 2 }} />
        </View>
      </View>
    );
  }

  if (label === 'chat') {
    // Message bubble
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 18, height: 14,
          borderWidth: 2, borderColor: color,
          borderRadius: 6,
        }}>
          <View style={{ position: 'absolute', bottom: -4, left: 3, width: 6, height: 4, backgroundColor: 'transparent', borderLeftWidth: 2, borderLeftColor: color, borderTopWidth: 2, borderTopColor: 'transparent', transform: [{ rotate: '20deg' }] }} />
        </View>
      </View>
    );
  }

  if (label === 'profile') {
    // User circle
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginBottom: 1 }} />
          <View style={{ width: 10, height: 5, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: color, marginTop: 1 }} />
        </View>
      </View>
    );
  }

  return null;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  const bottomPad = Platform.OS === 'android'
    ? Math.max(insets.bottom, 12)
    : Math.max(insets.bottom, 4);

  const TAB_HEIGHT = 74 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.98)',
          borderTopWidth: 1,
          borderTopColor: BORDER,
          borderBottomWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: bottomPad,
          paddingTop: 10,
          height: TAB_HEIGHT,
          // Shadow
          shadowColor: '#06142f',
          shadowOpacity: 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
          position: 'absolute',
        },
        tabBarActiveTintColor: GREEN_DARK,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ focused }) => (
            <View style={[
              { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
              focused && { backgroundColor: '#e6f7ec' },
            ]}>
              <TabIcon label="jobs" focused={focused} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarLabel: 'Applications',
          tabBarIcon: ({ focused }) => (
            <View style={[
              { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
              focused && { backgroundColor: '#e6f7ec' },
            ]}>
              <TabIcon label="applications" focused={focused} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ focused }) => (
            <View style={[
              { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
              focused && { backgroundColor: '#e6f7ec' },
            ]}>
              <TabIcon label="chat" focused={focused} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={[
              { width: 40, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
              focused && { backgroundColor: '#e6f7ec' },
            ]}>
              <TabIcon label="profile" focused={focused} />
            </View>
          ),
        }}
      />

      {/* post-job: hidden from tab bar (employers access from elsewhere) */}
      <Tabs.Screen name="post-job" options={{ href: null }} />

      {/* Hidden utility screens */}
      <Tabs.Screen name="applicants" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="rating"     options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
