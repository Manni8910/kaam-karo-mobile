import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router   = useRouter();
  const navState = useRootNavigationState();
  const [target, setTarget]     = useState<string | null>(null);
  const navigated = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveTarget(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (navigated.current) return;
      resolveTarget(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function resolveTarget(session: any) {
    if (!session) {
      setTarget('/welcome');
      return;
    }
    const { data: user } = await supabase
      .from('users')
      .select('active_role, has_worker_profile, has_employer_profile')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!user || (!user.has_worker_profile && !user.has_employer_profile)) {
      setTarget('/onboarding');
    } else {
      setTarget('/(tabs)');
    }
  }

  useEffect(() => {
    if (!navState?.key) return;
    if (!target) return;
    if (navigated.current) return;
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
