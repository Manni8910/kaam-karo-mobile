import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Platform, Linking, Image, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INK    = '#06142f';
const GREEN  = '#08a63f';
const GREEN_DARK = '#057a31';
const BLUE   = '#1457c8';
const MUTED  = '#667085';
const BG     = '#f8fbff';
const BORDER = '#e2e8f0';

export default function WelcomeScreen() {
  const router = useRouter();

  const go = async () => {
    await AsyncStorage.setItem('hasSeenWelcome', 'true');
    router.push('/login');
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── TOPBAR ── */}
        <View style={s.topbar}>
          <Image
            source={require('../assets/images/kaam-karo-logo.jpg')}
            style={s.logo}
            resizeMode="contain"
          />
          <View style={s.langPill}>
            <Text style={s.langActive}>English</Text>
            <Text style={s.langSep}> / </Text>
            <Text style={s.langInactive}>हिंदी</Text>
          </View>
        </View>

        {/* ── HERO COPY ── */}
        <View style={s.heroCopy}>
          <Text style={s.h1}>Jobs near you.</Text>
          <Text style={s.sub}>Apply in one swipe. Chat after employer accepts.</Text>
        </View>

        {/* ── HERO VISUAL ── */}
        <View style={s.heroVisual}>
          <LinearGradient
            colors={['#0d1b3e', '#1a2e50']}
            style={StyleSheet.absoluteFill}
          />
          {/* Light overlay shimmer */}
          <View style={s.heroOverlay} />

          {/* Work scene grid */}
          <View style={s.workScene}>
            {/* Scene panel */}
            <View style={s.scenePanel}>
              <Text style={s.scenePanelTitle}>Clerk job matched</Text>
              <Text style={s.scenePanelMeta}>Delhi · 2 km away</Text>
              <View style={s.sceneLines}>
                <View style={s.sceneLine} />
                <View style={[s.sceneLine, { width: '55%' }]} />
              </View>
            </View>

            {/* Scene map */}
            <View style={s.sceneMap}>
              <View style={[s.mapDot, { backgroundColor: GREEN, top: 20, left: 18 }]} />
              <View style={[s.mapDot, { backgroundColor: BLUE, bottom: 16, right: 14 }]} />
            </View>

            {/* Scene match — spans full width */}
            <View style={s.sceneMatch}>
              <Text style={s.sceneMatchTxt}>✓ Verified employer</Text>
              <View style={s.sceneMatchDot} />
              <Text style={[s.sceneMatchTxt, { color: '#4ade80' }]}>Interested</Text>
            </View>
          </View>

          {/* Hero card — absolute bottom */}
          <View style={s.heroCard}>
            <Text style={s.heroCardH}>Swipe. Match. Start work.</Text>
            <Text style={s.heroCardP}>Simple hiring for workers and employers.</Text>
          </View>
        </View>

        {/* ── CONTINUE BUTTON ── */}
        <TouchableOpacity onPress={go} activeOpacity={0.88} style={s.btnWrap}>
          <LinearGradient
            colors={['#08a63f', '#10bd52', '#1457c8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.btn}
          >
            <Text style={s.btnTxt}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── LEGAL LINE ── */}
        <Text style={s.legal}>
          By continuing, you agree to{' '}
          <Text style={s.legalLink} onPress={() => Linking.openURL('https://kaamkaro.co.in/terms')}>Terms</Text>
          {' '}and{' '}
          <Text style={s.legalLink} onPress={() => Linking.openURL('https://kaamkaro.co.in/privacy')}>Privacy Policy</Text>.
        </Text>

        {/* ── METRIC GRID ── */}
        <View style={s.metricGrid}>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>JOBS LIVE</Text>
            <Text style={s.metricNum}>1.2k</Text>
            <Text style={s.metricSub}>updated today</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>AVG REPLY</Text>
            <Text style={s.metricNum}>8m</Text>
            <Text style={s.metricSub}>after shortlist</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 40,
  },

  /* Topbar */
  topbar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  logo: { width: 174, height: 46 },
  langPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: BORDER,
  },
  langActive:   { fontSize: 12, fontWeight: '700', color: INK },
  langSep:      { fontSize: 12, color: MUTED },
  langInactive: { fontSize: 12, fontWeight: '500', color: MUTED },

  /* Hero copy */
  heroCopy:  { marginBottom: 16 },
  h1:        { fontSize: 32, fontWeight: '950', color: INK, letterSpacing: -0.7, lineHeight: 38 },
  sub:       { fontSize: 15, color: MUTED, marginTop: 6, lineHeight: 22 },

  /* Hero visual */
  heroVisual: {
    height: 220,
    borderRadius: 22,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 14,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  workScene: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scenePanel: {
    width: '57%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  scenePanelTitle: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 2 },
  scenePanelMeta:  { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  sceneLines:      { gap: 6 },
  sceneLine:       { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, width: '80%' },

  sceneMap: {
    flex: 1,
    backgroundColor: 'rgba(8,166,63,0.12)',
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(8,166,63,0.2)',
    position: 'relative',
  },
  mapDot: {
    position: 'absolute',
    width: 10, height: 10, borderRadius: 5,
  },

  sceneMatch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%',
    backgroundColor: 'rgba(8,166,63,0.18)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(8,166,63,0.3)',
    marginTop: 4,
  },
  sceneMatchTxt: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  sceneMatchDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },

  heroCard: {
    position: 'absolute', bottom: 14, left: 14, right: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  heroCardH: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 3 },
  heroCardP: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  /* Button */
  btnWrap: {
    borderRadius: 18, overflow: 'hidden',
    marginBottom: 12,
    shadowColor: GREEN, shadowOpacity: 0.35, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  btn:    { minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },

  /* Legal */
  legal:     { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  legalLink: { color: BLUE, fontWeight: '700' },

  /* Metrics */
  metricGrid: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 22,
    padding: 16,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: INK, shadowOpacity: 0.08, shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 }, elevation: 4,
  },
  metricLabel: {
    fontSize: 12, fontWeight: '950', color: MUTED,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  metricNum:   { fontSize: 28, fontWeight: '950', color: INK, letterSpacing: -0.5 },
  metricSub:   { fontSize: 11, color: GREEN_DARK, fontWeight: '700', marginTop: 4 },
});
