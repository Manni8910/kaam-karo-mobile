import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GREEN      = '#1E8A3C';
const GREEN_DARK = '#166830';
const RED        = '#EF4444';
const API_URL    = 'https://kaam-backend-production.up.railway.app';

type Step = 'phone' | 'otp';

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
      setOtp(''); setStep('otp'); startTimer(25);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e: any) {
      setError(`Network error: ${e?.message || 'Check connection'}`);
    } finally { setLoading(false); }
  };

  const verifyOtp = async (code?: string) => {
    const c = code ?? otp;
    if (c.length !== 6) { setError('Enter the 6-digit code'); return; }
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/auth/login-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: c }),
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
    if (digits.length === 6) setTimeout(() => verifyOtp(digits), 150);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#1B3FD8', '#1a6b3c', '#1E8A3C']}
        locations={[0, 0.55, 1]}
        style={s.root}
      >
        {/* ── LOGO ── */}
        <TouchableOpacity style={s.logoRow} onPress={tapLogo} activeOpacity={0.9}>
          <View style={s.iconMark}>
            <View style={s.handle} />
            <View style={s.body}>
              <View style={s.kL} />
              <View style={s.kTR} />
              <View style={s.kBR} />
            </View>
          </View>
          <View>
            <Text style={s.brand}>KAAMKARO</Text>
            <Text style={s.brandSub}>SWIPE · DISCOVER · GET HIRED</Text>
          </View>
        </TouchableOpacity>

        {logoTaps > 0 && logoTaps < 5 && (
          <Text style={s.devHint}>{5 - logoTaps} more taps for dev bypass</Text>
        )}

        {/* ── PHONE STEP ── */}
        {step === 'phone' && (
          <View style={s.content}>
            <Text style={s.title}>Enter Mobile Number</Text>
            <Text style={s.sub}>We'll send you a verification code</Text>

            <View style={s.phoneBox}>
              <View style={s.dialPart}>
                <Text style={s.flag}>🇮🇳</Text>
                <Text style={s.dialCode}>+91</Text>
                <Text style={s.caret}>▾</Text>
              </View>
              <View style={s.sep} />
              <TextInput
                style={s.phoneInput}
                placeholder="Enter mobile number"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={v => { setPhone(v); setError(''); }}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => phone.length === 10 && sendOtp()}
              />
            </View>

            {error ? <ErrBox text={error} /> : null}

            <TouchableOpacity
              style={[s.btnWrap, (phone.length < 10 || loading) && s.btnDim]}
              onPress={sendOtp}
              disabled={phone.length < 10 || loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#1B3FD8', '#1E8A3C']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.btnGrad}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>Send OTP →</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.trust}>
              <Text style={s.trustTxt}>🔒  Secure login via OTP · No password. No spam.</Text>
            </View>
          </View>
        )}

        {/* ── OTP STEP ── */}
        {step === 'otp' && (
          <View style={s.content}>
            <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); setError(''); }} style={s.back}>
              <Text style={s.backTxt}>← Change number</Text>
            </TouchableOpacity>

            <Text style={s.otpEmoji}>🔐</Text>
            <Text style={s.title}>Enter OTP</Text>
            <Text style={s.sub}>Sent to  <Text style={{ color: '#fff', fontWeight: '800' }}>+91 {phone}</Text></Text>

            {/* Hidden input sits behind boxes — always focusable */}
            <View style={s.boxWrapper}>
              {/* Invisible TextInput stretched over the whole box row */}
              <TextInput
                ref={otpRef}
                style={s.hiddenOtp}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={6}
                caretHidden
                autoFocus
                showSoftInputOnFocus
              />

              {/* Visible boxes on top */}
              <View style={s.boxRow} pointerEvents="none">
                {[0,1,2,3,4,5].map(i => (
                  <View
                    key={i}
                    style={[s.box, i < otp.length && s.boxFilled, i === otp.length && otp.length < 6 && s.boxActive]}
                  >
                    <Text style={s.boxTxt}>{otp[i] || ''}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={s.resendRow}>
              {timer > 0
                ? <Text style={s.timerTxt}>Resend in <Text style={{ color: '#fff', fontWeight: '800' }}>00:{String(timer).padStart(2,'0')}</Text></Text>
                : <TouchableOpacity onPress={sendOtp}><Text style={s.resendTxt}>Resend OTP</Text></TouchableOpacity>
              }
            </View>

            {error ? <ErrBox text={error} /> : null}

            <TouchableOpacity
              style={[s.btnWrap, (otp.length < 6 || loading) && s.btnDim]}
              onPress={() => verifyOtp()}
              disabled={otp.length < 6 || loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#1B3FD8', '#1E8A3C']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.btnGrad}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>Verify & Continue →</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

      </LinearGradient>
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
  box:    { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: RED },
  txt:    { fontSize: 13, color: '#fca5a5', fontWeight: '600' },
  dev:    { backgroundColor: 'rgba(255,255,255,0.15)', borderLeftColor: '#fff' },
  devTxt: { color: '#fff' },
});

const s = StyleSheet.create({
  root: { flex: 1 },

  /* Logo */
  logoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingTop: Platform.OS === 'ios' ? 70 : 56,
    paddingHorizontal: 28, paddingBottom: 20,
  },
  iconMark: { width: 62, height: 62, alignItems: 'center' },
  handle: {
    width: 22, height: 9, borderWidth: 3.5, borderColor: '#fff',
    borderBottomWidth: 0, borderRadius: 6, marginBottom: -2, zIndex: 1,
  },
  body: {
    width: 58, height: 46,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, borderWidth: 2.5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  kL:  { position: 'absolute', left: 14, top: 8,  width: 4,  height: 28, backgroundColor: '#fff', borderRadius: 2 },
  kTR: { position: 'absolute', left: 17, top: 8,  width: 15, height: 13, backgroundColor: '#fff', borderRadius: 2, transform: [{ rotate: '-35deg' }, { translateX: 3 }] },
  kBR: { position: 'absolute', left: 17, top: 23, width: 15, height: 13, backgroundColor: '#fff', borderRadius: 2, transform: [{ rotate: '35deg'  }, { translateX: 3 }] },
  brand:    { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  brandSub: { fontSize: 9,  fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, marginTop: 2 },
  devHint:  { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontStyle: 'italic', marginBottom: 4 },

  /* Content */
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 8 },

  title: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 6 },
  sub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 28 },

  /* Phone input */
  phoneBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)',
    height: 56, marginBottom: 16, overflow: 'hidden',
  },
  dialPart: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 6 },
  flag:     { fontSize: 22 },
  dialCode: { fontSize: 16, fontWeight: '700', color: '#fff' },
  caret:    { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  sep:      { width: 1.5, height: 30, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  phoneInput: { flex: 1, fontSize: 16, color: '#fff', fontWeight: '600', paddingRight: 16 },

  /* Button */
  btnWrap: {
    borderRadius: 14, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#1B3FD8', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  btnGrad: { paddingVertical: 16, alignItems: 'center' },
  btnDim:  { opacity: 0.45, shadowOpacity: 0 },
  btnTxt:  { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  trust:    { alignItems: 'center' },
  trustTxt: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  /* OTP */
  back:    { marginBottom: 20 },
  backTxt: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  otpEmoji:{ fontSize: 40, textAlign: 'center', marginBottom: 12 },

  boxWrapper: {
    marginTop: 28, marginBottom: 24,
    alignItems: 'center',
  },
  hiddenOtp: {
    position: 'absolute',
    width: '100%', height: 76,
    opacity: 0,
    color: 'transparent',
    fontSize: 1,
  },
  boxRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box: {
    width: 46, height: 58, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  boxActive: { borderColor: '#fff', borderWidth: 2.5, backgroundColor: 'rgba(255,255,255,0.2)' },
  boxFilled: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.25)' },
  boxTxt:    { fontSize: 22, fontWeight: '900', color: '#fff' },

  resendRow: { alignItems: 'center', marginBottom: 20 },
  timerTxt:  { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  resendTxt: { fontSize: 14, color: '#fff', fontWeight: '800' },
});
