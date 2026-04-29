import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  Animated, StatusBar, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW, height: SH } = Dimensions.get('window');
const API_URL = 'https://kaam-backend-production.up.railway.app';

export default function WelcomeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<'SEEKER' | 'EMPLOYER' | null>(null);
  const scaleSeeker = useRef(new Animated.Value(1)).current;
  const scaleEmployer = useRef(new Animated.Value(1)).current;

  const press = (scale: Animated.Value, type: 'SEEKER' | 'EMPLOYER') => {
    setSelected(type);
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const proceed = async () => {
    if (!selected) return;
    await AsyncStorage.multiSet([
      ['pendingUserType', selected],
      ['hasSeenWelcome', 'true'],
    ]);
    router.push('/login');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1B3FAB" />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>K</Text>
        </View>
        <Text style={styles.brand}>KaamKaro</Text>
        <Text style={styles.tagline}>India ka Apna Job App</Text>

        {/* Stats bar */}
        <View style={styles.statsRow}>
          <StatItem value="50K+" label="Jobs" />
          <View style={styles.statDiv} />
          <StatItem value="10L+" label="Workers" />
          <View style={styles.statDiv} />
          <StatItem value="Free" label="Always" />
        </View>
      </View>

      {/* Role selection */}
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Main kaun hoon?</Text>
        <Text style={styles.sheetSub}>Who are you? / आप कौन हैं?</Text>

        <View style={styles.cards}>
          <Animated.View style={{ transform: [{ scale: scaleSeeker }], flex: 1 }}>
            <TouchableOpacity
              style={[styles.roleCard, selected === 'SEEKER' && styles.roleCardActive]}
              onPress={() => press(scaleSeeker, 'SEEKER')}
              activeOpacity={0.85}
            >
              <Text style={styles.roleEmoji}>👷</Text>
              <Text style={[styles.roleTitle, selected === 'SEEKER' && styles.roleTitleActive]}>
                Mujhe Kaam{'\n'}chahiye
              </Text>
              <Text style={[styles.roleDesc, selected === 'SEEKER' && styles.roleDescActive]}>
                I'm looking{'\n'}for work
              </Text>
              {selected === 'SEEKER' && (
                <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: scaleEmployer }], flex: 1 }}>
            <TouchableOpacity
              style={[styles.roleCard, selected === 'EMPLOYER' && styles.roleCardActive]}
              onPress={() => press(scaleEmployer, 'EMPLOYER')}
              activeOpacity={0.85}
            >
              <Text style={styles.roleEmoji}>🏢</Text>
              <Text style={[styles.roleTitle, selected === 'EMPLOYER' && styles.roleTitleActive]}>
                Mujhe Log{'\n'}chahiye
              </Text>
              <Text style={[styles.roleDesc, selected === 'EMPLOYER' && styles.roleDescActive]}>
                I want to{'\n'}hire workers
              </Text>
              {selected === 'EMPLOYER' && (
                <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          onPress={proceed}
          disabled={!selected}
        >
          <Text style={styles.continueBtnText}>
            {selected ? 'Aage Badho →' : 'Apna role chuniye'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.loginLink}>
          Already have an account?{' '}
          <Text style={styles.loginLinkBold} onPress={async () => {
            await AsyncStorage.setItem('hasSeenWelcome', 'true');
            router.push('/login');
          }}>
            Login
          </Text>
        </Text>

        <Text style={styles.terms}>
          By continuing, you agree to KaamKaro's Terms & Privacy Policy
        </Text>
      </View>
    </View>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1B3FAB' },

  hero: {
    backgroundColor: '#1B3FAB',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  logoWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  logoText: { fontSize: 38, fontWeight: '900', color: '#fff' },
  brand: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4, marginBottom: 24, fontWeight: '500' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  statDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },

  sheet: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32,
  },
  sheetTitle: { fontSize: 24, fontWeight: '900', color: '#1A1A1A', textAlign: 'center' },
  sheetSub: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 4, marginBottom: 24 },

  cards: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard: {
    borderRadius: 20, padding: 20, borderWidth: 2, borderColor: '#F0EDE8',
    backgroundColor: '#FAFAFA', alignItems: 'center', position: 'relative',
  },
  roleCardActive: { borderColor: '#1B3FAB', backgroundColor: '#FFF5F5' },
  roleEmoji: { fontSize: 40, marginBottom: 12 },
  roleTitle: { fontSize: 15, fontWeight: '900', color: '#1A1A1A', textAlign: 'center', lineHeight: 20, marginBottom: 6 },
  roleTitleActive: { color: '#1B3FAB' },
  roleDesc: { fontSize: 11, color: '#bbb', textAlign: 'center', lineHeight: 16 },
  roleDescActive: { color: '#FF8A8A' },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#1B3FAB', alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  continueBtn: {
    backgroundColor: '#1B3FAB', borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#1B3FAB', shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  continueBtnDisabled: { backgroundColor: '#7BA3E8', shadowOpacity: 0 },
  continueBtnText: { color: '#fff', fontWeight: '900', fontSize: 17 },

  loginLink: { textAlign: 'center', fontSize: 14, color: '#999', marginBottom: 16 },
  loginLinkBold: { color: '#1B3FAB', fontWeight: '800' },
  terms: { textAlign: 'center', fontSize: 11, color: '#bbb', lineHeight: 16 },
});
