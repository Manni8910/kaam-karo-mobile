import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Platform, Linking, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW, height: SH } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  const go = async () => {
    await AsyncStorage.setItem('hasSeenWelcome', 'true');
    router.push('/login');
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} />

      {/* ══ UPPER — white hero section ══ */}
      <View style={s.upper}>

        {/* Logo */}
        <View style={s.logoBlock}>
          {/* Icon mark */}
          <View style={s.iconWrap}>
            <LinearGradient colors={['#1B3FD8', '#1E8A3C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconGrad}>
              <View style={s.handle} />
              <View style={s.body}>
                <View style={s.kL} /><View style={s.kTR} /><View style={s.kBR} />
              </View>
            </LinearGradient>
          </View>
          {/* Brand text stacked */}
          <View style={s.brandBlock}>
            <View style={{ flexDirection: 'row' }}>
              <Text style={[s.brand, { color: '#1B3FD8' }]}>KAAM</Text>
              <Text style={[s.brand, { color: '#1E8A3C' }]}>KARO</Text>
            </View>
            <Text style={s.tagline}>SWIPE · DISCOVER · GET HIRED</Text>
          </View>
        </View>

        {/* Headline */}
        <View style={s.headlineBlock}>
          <Text style={s.h1}>Find work near you</Text>
          <Text style={s.h2}>Start today.</Text>
        </View>

        {/* Character illustration */}
        <View style={s.illustrationArea}>

          {/* India Gate silhouette — decorative */}
          <View style={s.silhouette}>
            {/* Base arch */}
            <View style={s.archMain} />
            <View style={s.archLeft} />
            <View style={s.archRight} />
            <View style={s.archBase} />
          </View>

          {/* Location pins */}
          <Text style={[s.pin, { left: SW * 0.12, top: 20 }]}>📍</Text>
          <Text style={[s.pin, { right: SW * 0.12, top: 50 }]}>📍</Text>

          {/* Male character */}
          <View style={[s.charCard, { left: SW * 0.04, bottom: 0 }]}>
            <View style={s.charBg}>
              <Text style={s.charEmoji}>👨‍💼</Text>
            </View>
            <View style={s.charLabel}>
              <Text style={s.charLabelTxt}>👷 Worker</Text>
            </View>
          </View>

          {/* Female character */}
          <View style={[s.charCard, { right: SW * 0.04, bottom: 0 }]}>
            <View style={[s.charBg, { backgroundColor: '#EEF2FF' }]}>
              <Text style={s.charEmoji}>👩‍🍳</Text>
            </View>
            <View style={[s.charLabel, { backgroundColor: '#1E8A3C' }]}>
              <Text style={s.charLabelTxt}>✓ Hired</Text>
            </View>
          </View>

          {/* Centre match badge */}
          <View style={s.matchBadge}>
            <Text style={s.matchBadgeTxt}>🤝</Text>
            <Text style={s.matchBadgeLabel}>Matched!</Text>
          </View>

        </View>
      </View>

      {/* ══ LOWER — gradient bottom section ══ */}
      <LinearGradient
        colors={['#1B3FD8', '#1a6b3c', '#1E8A3C']}
        locations={[0, 0.5, 1]}
        style={s.lower}
      >
        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statNum}>500+</Text>
            <Text style={s.statLbl}>Active Jobs</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>400+</Text>
            <Text style={s.statLbl}>Workers Hired</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>50+</Text>
            <Text style={s.statLbl}>Cities</Text>
          </View>
        </View>

        {/* CTA button */}
        <TouchableOpacity style={s.btn} onPress={go} activeOpacity={0.88}>
          <Text style={s.btnTxt}>Get Started</Text>
          <Text style={s.btnArrow}>→</Text>
        </TouchableOpacity>

        {/* Secure note */}
        <View style={s.secureRow}>
          <Text style={s.secureCheck}>✓</Text>
          <View>
            <Text style={s.secureLine1}>100% secure OTP login</Text>
            <Text style={s.secureLine2}>No password. No spam. No tension.</Text>
          </View>
        </View>

        {/* Terms */}
        <Text style={s.terms}>
          By continuing you agree to our{' '}
          <Text style={s.link} onPress={() => Linking.openURL('https://kaamkaro.co.in/terms')}>Terms</Text>
          {' '}and{' '}
          <Text style={s.link} onPress={() => Linking.openURL('https://kaamkaro.co.in/privacy')}>Privacy Policy</Text>
        </Text>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  /* ── UPPER ── */
  upper: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    overflow: 'hidden',
  },

  /* Logo */
  logoBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, marginBottom: 18,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#1B3FD8', shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  iconGrad: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  handle: {
    width: 22, height: 8, borderWidth: 3, borderColor: '#fff',
    borderBottomWidth: 0, borderRadius: 5, marginBottom: -2, zIndex: 1,
  },
  body: {
    width: 48, height: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8, borderWidth: 2.5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  kL:  { position: 'absolute', left: 11, top: 6,  width: 4,  height: 22, backgroundColor: '#fff', borderRadius: 2 },
  kTR: { position: 'absolute', left: 14, top: 6,  width: 12, height: 10, backgroundColor: '#fff', borderRadius: 2, transform: [{ rotate: '-35deg' }, { translateX: 2 }] },
  kBR: { position: 'absolute', left: 14, top: 18, width: 12, height: 10, backgroundColor: '#fff', borderRadius: 2, transform: [{ rotate: '35deg'  }, { translateX: 2 }] },

  brandBlock: { gap: 3 },
  brand:      { fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  tagline:    { fontSize: 9, fontWeight: '800', color: '#9CA3AF', letterSpacing: 2 },

  /* Headline */
  headlineBlock: { paddingHorizontal: 24, marginBottom: 12 },
  h1: { fontSize: 30, fontWeight: '900', color: '#111827', lineHeight: 36 },
  h2: { fontSize: 30, fontWeight: '900', color: '#1E8A3C', lineHeight: 38 },

  /* Illustration */
  illustrationArea: {
    flex: 1, position: 'relative',
    alignItems: 'center', justifyContent: 'flex-end',
  },

  /* India Gate silhouette */
  silhouette: {
    position: 'absolute', bottom: 0,
    width: SW * 0.55, alignItems: 'center',
    opacity: 0.07,
  },
  archMain:  { width: 60, height: 90, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#1B3FD8' },
  archLeft:  { position: 'absolute', bottom: 0, left: SW * 0.04, width: 30, height: 60, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: '#1B3FD8' },
  archRight: { position: 'absolute', bottom: 0, right: SW * 0.04, width: 30, height: 60, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: '#1B3FD8' },
  archBase:  { position: 'absolute', bottom: 0, width: SW * 0.55, height: 12, backgroundColor: '#1B3FD8' },

  /* Location pins */
  pin: { position: 'absolute', fontSize: 20 },

  /* Character cards */
  charCard: { position: 'absolute', alignItems: 'center', gap: 6 },
  charBg: {
    width: SW * 0.36, height: SW * 0.44,
    backgroundColor: '#E8F5EE',
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#d1e8d8',
  },
  charEmoji: { fontSize: SW * 0.28, lineHeight: SW * 0.32 },
  charLabel: {
    backgroundColor: '#1B3FD8',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  charLabelTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },

  /* Match badge centre */
  matchBadge: {
    position: 'absolute',
    bottom: SW * 0.14,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 2, borderColor: '#E8F5EE',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  matchBadgeTxt:   { fontSize: 20 },
  matchBadgeLabel: { fontSize: 10, fontWeight: '800', color: '#1E8A3C', marginTop: 1 },

  /* ── LOWER ── */
  lower: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    gap: 14,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16, paddingVertical: 12, marginBottom: 4,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 20, fontWeight: '900', color: '#fff' },
  statLbl:     { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 1, textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  /* CTA */
  btn: {
    backgroundColor: '#fff',
    borderRadius: 16, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  btnTxt:   { fontSize: 18, fontWeight: '800', color: '#1E8A3C' },
  btnArrow: { fontSize: 22, color: '#1E8A3C', fontWeight: '900' },

  /* Secure */
  secureRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  secureCheck:{ fontSize: 16, color: '#2ECC71', fontWeight: '900' },
  secureLine1:{ fontSize: 13, fontWeight: '800', color: '#fff' },
  secureLine2:{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },

  /* Terms */
  terms: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 17 },
  link:  { color: 'rgba(255,255,255,0.8)', fontWeight: '700', textDecorationLine: 'underline' },
});
