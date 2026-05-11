import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
  Image, ScrollView, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INK    = '#06142f';
const GREEN  = '#08a63f';
const GREEN_DARK = '#057a31';
const BLUE   = '#1457c8';
const MUTED  = '#667085';
const BG     = '#f8fbff';
const BORDER = '#e2e8f0';
const RED    = '#e5484d';

const API_URL = 'https://kaam-backend-production.up.railway.app';
type Step = 'phone' | 'otpCode';

export default function LoginScreen() {
  const router = useRouter();
  const { prefillPhone } = useLocalSearchParams<{ prefillPhone?: string }>();

  const [step, setStep]         = useState<Step>('phone');
  const [phone, setPhone]       = useState(prefillPhone || '');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [timer, setTimer]       = useState(0);
  const [error, setError]       = useState('');
  const [logoTaps, setLogoTaps] = useState(0);

  const timerRef = useRef<any>(null);
  const otpRef   = useRef<TextInput>(null);

  useEffect(() => {
    if (prefillPhone && prefillPhone.length === 10)
      setTimeout(() => sendOtp(), 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = (secs = 25) => {
    setTimer(secs);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() =>
      setTimer(v => { if (v <= 1) { clearInterval(timerRef.current); return 0; } return v - 1; }), 1000);
  };

  const tapLogo = async () => {
    const n = logoTaps + 1;
    setLogoTaps(n);
    if (n >= 5) {
      setLogoTaps(0);
      await AsyncStorage.multiSet([['userToken','dev-token'],['userId','dev-001'],['userType',''],['onboardingComplete','']]);
      router.replace('/onboarding');
    }
  };

  const sendOtp = async () => {
    const p = phone.trim();
    if (p.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/otp/send-unauth`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: p }),
      });
      let data: any = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) { setError(data.error || 'Could not send OTP'); return; }
      if (data.devCode) setError(`DEV OTP: ${data.devCode}`);
      setOtp(''); setStep('otpCode'); startTimer(25);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e: any) {
      setError(`Network error: ${e?.message || 'Check connection'}`);
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/auth/login-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: otp }),
      });
      let data: any = {};
      try { data = await res.json(); } catch {}
      if (!res.ok || data.error) { setError(data.error || 'Incorrect OTP'); return; }
      await finishLogin(data);
    } catch (e: any) {
      setError(`Network error: ${e?.message}`);
    } finally { setLoading(false); }
  };

  const finishLogin = async (data: any) => {
    await AsyncStorage.setItem('userToken', data.token || '');
    await AsyncStorage.setItem('userId',    data.user?.id || '');
    await AsyncStorage.setItem('userType',  data.user?.userType || '');
    const onboarded = await AsyncStorage.getItem('onboardingComplete');
    router.replace((!onboarded || !data.user?.userType) ? '/onboarding' : '/(tabs)');
  };

  const handleOtpChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6) {
      // Auto-submit after brief delay
      setTimeout(async () => {
        if (digits.length !== 6) return;
        setError(''); setLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/auth/login-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone.trim(), code: digits }),
          });
          let d: any = {};
          try { d = await res.json(); } catch {}
          if (!res.ok || d.error) { setError(d.error || 'Incorrect OTP'); return; }
          await finishLogin(d);
        } catch (e: any) {
          setError(`Network error: ${e?.message}`);
        } finally { setLoading(false); }
      }, 150);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />

      <ScrollView
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => step === 'otpCode' ? (setStep('phone'), setOtp(''), setError('')) : router.back()}
            activeOpacity={0.7}
          >
            <Text style={s.backTxt}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={tapLogo} activeOpacity={0.85}>
            <Image
              source={require('../assets/images/kaam-karo-logo.jpg')}
              style={s.logoCompact}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {logoTaps > 0 && logoTaps < 5 && (
          <Text style={s.devHint}>{5 - logoTaps} more taps for dev bypass</Text>
        )}

        {/* ── PHONE STEP ── */}
        {step === 'phone' && (
          <View style={s.content}>
            <Text style={s.title}>Enter your phone number</Text>
            <Text style={s.sub}>We will send a one-time password by SMS. This keeps your account safe.</Text>

            {/* Phone input with +91 prefix */}
            <View style={s.inputWrap}>
              <Text style={s.prefix}>+91</Text>
              <TextInput
                style={s.input}
                placeholder="0000000000"
                placeholderTextColor={MUTED}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={v => { setPhone(v); setError(''); }}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => phone.length === 10 && sendOtp()}
              />
            </View>

            <Text style={s.smallCenter}>We'll never share your number.</Text>

            {error ? <ErrBox text={error} /> : null}

            {/* Safe note */}
            <View style={s.safeNote}>
              <View style={s.safeIcon}>
                <Text style={s.safeIconTxt}>Safe</Text>
              </View>
              <Text style={s.safeTxt}>No spam. No public sharing. Your number is only used for login and trusted job updates.</Text>
            </View>

            {/* Send OTP button */}
            <TouchableOpacity
              onPress={sendOtp}
              disabled={phone.length < 10 || loading}
              activeOpacity={0.85}
              style={[s.btnWrap, (phone.length < 10 || loading) && s.btnDim]}
            >
              <LinearGradient
                colors={['#08a63f', '#10bd52', '#1457c8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.btn}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>Send OTP</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={s.legal}>
              By continuing, you agree to{' '}
              <Text style={s.legalLink} onPress={() => Linking.openURL('https://kaamkaro.co.in/terms')}>Terms</Text>
              {' '}and{' '}
              <Text style={s.legalLink} onPress={() => Linking.openURL('https://kaamkaro.co.in/privacy')}>Privacy Policy</Text>.
            </Text>
          </View>
        )}

        {/* ── OTP CODE STEP ── */}
        {step === 'otpCode' && (
          <View style={s.content}>
            <Text style={s.title}>Enter OTP</Text>
            <Text style={s.sub}>
              We sent a 6 digit code to{' '}
              <Text style={{ fontWeight: '800', color: INK }}>+91 {phone}</Text>
            </Text>

            {/* Single OTP input (NOT 6 boxes) */}
            <TextInput
              ref={otpRef}
              style={s.otpInput}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter 6 digit OTP"
              placeholderTextColor={MUTED}
              autoFocus
              inputMode="numeric"
            />

            {error ? <ErrBox text={error} /> : null}

            {/* Verify button */}
            <TouchableOpacity
              onPress={verifyOtp}
              disabled={otp.length < 6 || loading}
              activeOpacity={0.85}
              style={[s.btnWrap, (otp.length < 6 || loading) && s.btnDim]}
            >
              <LinearGradient
                colors={['#08a63f', '#10bd52', '#1457c8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.btn}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>Verify & continue</Text>}
              </LinearGradient>
            </TouchableOpacity>

            {/* btn-row: Change number + Resend code */}
            <View style={s.btnRow}>
              <TouchableOpacity
                style={s.btnOutline}
                onPress={() => { setStep('phone'); setOtp(''); setError(''); }}
                activeOpacity={0.8}
              >
                <Text style={s.btnOutlineTxt}>Change number</Text>
              </TouchableOpacity>
              {timer > 0
                ? (
                  <View style={s.btnSoft}>
                    <Text style={s.btnSoftTxt}>Resend in 00:{String(timer).padStart(2, '0')}</Text>
                  </View>
                )
                : (
                  <TouchableOpacity style={[s.btnSoft, s.btnSoftActive]} onPress={sendOtp} activeOpacity={0.8}>
                    <Text style={[s.btnSoftTxt, { color: BLUE }]}>Resend code</Text>
                  </TouchableOpacity>
                )}
            </View>

            <Text style={s.smallCenter}>If the number is wrong, change it and send OTP again.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ErrBox({ text }: { text: string }) {
  const isDev = text.startsWith('DEV');
  return (
    <View style={[eb.box, isDev && eb.dev]}>
      <Text style={[eb.txt, isDev && eb.devTxt]}>{text}</Text>
    </View>
  );
}
const eb = StyleSheet.create({
  box:    { backgroundColor: 'rgba(229,72,77,0.08)', borderRadius: 10, padding: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: RED },
  txt:    { fontSize: 13, color: RED, fontWeight: '600' },
  dev:    { backgroundColor: 'rgba(8,166,63,0.08)', borderLeftColor: GREEN },
  devTxt: { color: '#057a31' },
});

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 28,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: INK, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  backTxt:     { fontSize: 20, color: INK, fontWeight: '700' },
  logoCompact: { width: 116, height: 34 },

  devHint: { fontSize: 11, color: MUTED, textAlign: 'center', fontStyle: 'italic', marginBottom: 8 },

  content: { gap: 0 },

  title: { fontSize: 32, fontWeight: '950', color: INK, marginBottom: 8, letterSpacing: -0.5, lineHeight: 38 },
  sub:   { fontSize: 15, color: MUTED, marginBottom: 24, lineHeight: 22 },

  /* Phone input */
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 20, backgroundColor: '#fff',
    minHeight: 58, marginBottom: 10, overflow: 'hidden',
    shadowColor: INK, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  prefix: {
    paddingHorizontal: 16, fontSize: 16, fontWeight: '700', color: INK,
    borderRightWidth: 1, borderRightColor: BORDER,
    alignSelf: 'stretch', textAlignVertical: 'center',
    lineHeight: 58,
  },
  input: { flex: 1, fontSize: 16, color: INK, fontWeight: '600', paddingHorizontal: 16, height: 58 },

  /* Single OTP input */
  otpInput: {
    borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 20, backgroundColor: '#fff',
    minHeight: 58, fontSize: 22, color: INK, fontWeight: '700',
    paddingHorizontal: 20, marginBottom: 20,
    letterSpacing: 8,
    shadowColor: INK, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },

  smallCenter: { fontSize: 12, color: MUTED, textAlign: 'center', marginBottom: 16 },

  /* Safe note */
  safeNote: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: BORDER,
  },
  safeIcon:    { width: 38, height: 38, borderRadius: 19, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  safeIconTxt: { fontSize: 9, fontWeight: '900', color: '#fff' },
  safeTxt:     { flex: 1, fontSize: 13, color: MUTED, lineHeight: 18 },

  /* Primary button */
  btnWrap: {
    borderRadius: 18, overflow: 'hidden', marginBottom: 14,
    shadowColor: GREEN, shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  btnDim: { opacity: 0.45, shadowOpacity: 0 },
  btn:    { minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },

  /* btn-row */
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  btnOutline: {
    flex: 1, minHeight: 50, borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: 'rgba(8,166,63,0.32)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineTxt: { fontSize: 14, fontWeight: '700', color: '#057a31' },
  btnSoft: {
    flex: 1, minHeight: 50, borderRadius: 14,
    backgroundColor: '#eef2ff',
    alignItems: 'center', justifyContent: 'center',
  },
  btnSoftActive: { backgroundColor: '#eef2ff' },
  btnSoftTxt:    { fontSize: 14, fontWeight: '700', color: MUTED },

  /* Legal */
  legal:     { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18 },
  legalLink: { color: BLUE, fontWeight: '700' },
});
