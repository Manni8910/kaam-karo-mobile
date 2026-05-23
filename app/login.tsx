import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
  Image, ScrollView, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

const INK    = '#06142f';
const GREEN  = '#08a63f';
const BLUE   = '#1457c8';
const MUTED  = '#667085';
const BG     = '#f8fbff';
const BORDER = '#e2e8f0';
const RED    = '#e5484d';

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const router = useRouter();

  const [step, setStep]       = useState<Step>('phone');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer]     = useState(0);
  const [error, setError]     = useState('');
  const timerRef              = useRef<any>(null);
  const otpRef                = useRef<TextInput>(null);

  const startTimer = (secs = 30) => {
    setTimer(secs);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() =>
      setTimer(v => { if (v <= 1) { clearInterval(timerRef.current); return 0; } return v - 1; }), 1000);
  };

  const sendOtp = async () => {
    const p = phone.trim();
    if (p.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    setError(''); setLoading(true);
    try {
      const { error: e } = await supabase.auth.signInWithOtp({
        phone: `+91${p}`,
        options: { shouldCreateUser: true },
      });
      if (e) {
        // Phone provider not configured — use email+OTP fallback
        if (/phone_provider_disabled|sms_send_failed|unsupported/i.test(e.message)) {
          const { error: e2 } = await supabase.auth.signInWithOtp({
            email: `91${p}@phone.kaamkaro.co.in`,
            options: { shouldCreateUser: true },
          });
          if (e2) throw e2;
          setError('DEV: Check email for OTP or use 123456');
        } else {
          throw e;
        }
      }
      setOtp(''); setStep('otp'); startTimer(30);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e: any) {
      setError(e?.message || 'Could not send OTP');
    } finally { setLoading(false); }
  };

  const verifyOtp = async (code?: string) => {
    const token = code ?? otp;
    if (token.length !== 6) { setError('Enter the 6-digit code'); return; }
    setError(''); setLoading(true);
    try {
      // Try phone OTP first
      let result = await supabase.auth.verifyOtp({
        phone: `+91${phone.trim()}`,
        token,
        type: 'sms',
      });
      if (result.error) {
        // Fall back to email OTP
        result = await supabase.auth.verifyOtp({
          email: `91${phone.trim()}@phone.kaamkaro.co.in`,
          token,
          type: 'email',
        });
      }
      if (result.error) throw result.error;

      const session = result.data.session;
      if (!session) throw new Error('Login failed. Please try again.');

      // Ensure user row exists
      const uid = session.user.id;
      const { data: existing } = await supabase.from('users').select('id, has_worker_profile, has_employer_profile').eq('id', uid).maybeSingle();
      if (!existing) {
        await supabase.from('users').insert({
          id: uid,
          phone_number: phone.trim(),
          active_role: 'worker',
          has_worker_profile: false,
          has_employer_profile: false,
          language: 'en',
        });
        router.replace('/onboarding');
      } else if (!existing.has_worker_profile && !existing.has_employer_profile) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e?.message || 'Incorrect OTP');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    if (digits.length === 6) verifyOtp(digits);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <View style={s.header}>
          <TouchableOpacity style={s.backBtn}
            onPress={() => step === 'otp' ? (setStep('phone'), setOtp(''), setError('')) : router.back()}
            activeOpacity={0.7}>
            <Text style={s.backTxt}>←</Text>
          </TouchableOpacity>
          <Image source={require('../assets/images/kaam-karo-logo.jpg')} style={s.logo} resizeMode="contain" />
        </View>

        {step === 'phone' && (
          <View style={s.content}>
            <Text style={s.title}>Enter your number</Text>
            <Text style={s.sub}>We'll send a one-time password by SMS to verify your account.</Text>
            <View style={s.inputWrap}>
              <Text style={s.prefix}>+91</Text>
              <TextInput
                style={s.input} placeholder="0000000000" placeholderTextColor={MUTED}
                keyboardType="phone-pad" maxLength={10} value={phone}
                onChangeText={v => { setPhone(v); setError(''); }}
                autoFocus returnKeyType="done" onSubmitEditing={() => phone.length === 10 && sendOtp()}
              />
            </View>
            {error ? <ErrBox text={error} /> : null}
            <TouchableOpacity onPress={sendOtp} disabled={phone.length < 10 || loading}
              style={[s.btnWrap, (phone.length < 10 || loading) && s.btnDim]} activeOpacity={0.85}>
              <LinearGradient colors={['#08a63f', '#10bd52', '#1457c8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Send OTP</Text>}
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

        {step === 'otp' && (
          <View style={s.content}>
            <Text style={s.title}>Enter OTP</Text>
            <Text style={s.sub}>6-digit code sent to <Text style={{ fontWeight: '800', color: INK }}>+91 {phone}</Text></Text>
            <TextInput ref={otpRef} style={s.otpInput} value={otp} onChangeText={handleOtpChange}
              keyboardType="number-pad" maxLength={6} placeholder="Enter 6 digit OTP"
              placeholderTextColor={MUTED} autoFocus inputMode="numeric" />
            {error ? <ErrBox text={error} /> : null}
            <TouchableOpacity onPress={() => verifyOtp()} disabled={otp.length < 6 || loading}
              style={[s.btnWrap, (otp.length < 6 || loading) && s.btnDim]} activeOpacity={0.85}>
              <LinearGradient colors={['#08a63f', '#10bd52', '#1457c8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Verify & continue</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <View style={s.row}>
              <TouchableOpacity style={s.outline} onPress={() => { setStep('phone'); setOtp(''); setError(''); }} activeOpacity={0.8}>
                <Text style={s.outlineTxt}>Change number</Text>
              </TouchableOpacity>
              {timer > 0
                ? <View style={s.soft}><Text style={s.softTxt}>Resend in 00:{String(timer).padStart(2, '0')}</Text></View>
                : <TouchableOpacity style={[s.soft, { backgroundColor: '#eef2ff' }]} onPress={sendOtp} activeOpacity={0.8}>
                    <Text style={[s.softTxt, { color: BLUE }]}>Resend code</Text>
                  </TouchableOpacity>
              }
            </View>
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
  scroll:   { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 40 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  backBtn:  { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  backTxt:  { fontSize: 20, color: INK, fontWeight: '700' },
  logo:     { width: 116, height: 34 },
  content:  { gap: 0 },
  title:    { fontSize: 32, fontWeight: '900', color: INK, marginBottom: 8, letterSpacing: -0.5 },
  sub:      { fontSize: 15, color: MUTED, marginBottom: 24, lineHeight: 22 },
  inputWrap:{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: 20, backgroundColor: '#fff', minHeight: 58, marginBottom: 14, overflow: 'hidden' },
  prefix:   { paddingHorizontal: 16, fontSize: 16, fontWeight: '700', color: INK, borderRightWidth: 1, borderRightColor: BORDER, alignSelf: 'stretch', textAlignVertical: 'center', lineHeight: 58 },
  input:    { flex: 1, fontSize: 16, color: INK, fontWeight: '600', paddingHorizontal: 16, height: 58 },
  otpInput: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 20, backgroundColor: '#fff', minHeight: 58, fontSize: 22, color: INK, fontWeight: '700', paddingHorizontal: 20, marginBottom: 20, letterSpacing: 8 },
  btnWrap:  { borderRadius: 18, overflow: 'hidden', marginBottom: 14, shadowColor: GREEN, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  btnDim:   { opacity: 0.45, shadowOpacity: 0 },
  btn:      { minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  btnTxt:   { fontSize: 17, fontWeight: '900', color: '#fff' },
  row:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  outline:  { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(8,166,63,0.32)', alignItems: 'center', justifyContent: 'center' },
  outlineTxt:{ fontSize: 14, fontWeight: '700', color: '#057a31' },
  soft:     { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  softTxt:  { fontSize: 14, fontWeight: '700', color: MUTED },
  legal:    { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18, marginTop: 8 },
  legalLink:{ color: BLUE, fontWeight: '700' },
});
