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

// Dev password derived from phone — keeps each user's account unique
const devPassword = (phone: string) => `kaam_${phone}_dev`;

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep]       = useState<Step>('phone');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const otpRef                = useRef<TextInput>(null);

  const sendOtp = () => {
    const p = phone.trim();
    if (p.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    setError('');
    setOtp('');
    setStep('otp');
    setTimeout(() => otpRef.current?.focus(), 300);
  };

  const verifyOtp = async (code?: string) => {
    const token = (code ?? otp).trim();
    if (token.length !== 6) { setError('Enter the 6-digit code'); return; }
    if (token !== '123456') { setError('Incorrect code. Use 123456'); return; }
    setError(''); setLoading(true);
    try {
      const email    = `91${phone.trim()}@phone.kaamkaro.co.in`;
      const password = devPassword(phone.trim());

      // Try sign in first (account already exists)
      let { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

      // If sign in failed (account not confirmed yet), sign up + sign in
      if (signInErr || !data.session) {
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw signUpErr;
        const res = await supabase.auth.signInWithPassword({ email, password });
        if (res.error) throw res.error;
        data = res.data;
      }

      if (!data.session) throw new Error('Login failed — check Supabase email confirmation settings');

      // Ensure user row in public.users
      const uid = data.session.user.id;
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
      setError(e?.message || 'Login failed');
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

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn}
            onPress={() => step === 'otp' ? (setStep('phone'), setOtp(''), setError('')) : router.back()}
            activeOpacity={0.7}>
            <Text style={s.backTxt}>←</Text>
          </TouchableOpacity>
          <Image source={require('../assets/images/kaam-karo-logo.jpg')} style={s.logo} resizeMode="contain" />
        </View>

        {/* ── PHONE STEP ── */}
        {step === 'phone' && (
          <View style={s.content}>
            <Text style={s.title}>Enter your number</Text>
            <Text style={s.sub}>We'll send a one-time code to verify your account.</Text>

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

            {error ? <ErrBox text={error} /> : null}

            <TouchableOpacity
              onPress={sendOtp}
              disabled={phone.length < 10 || loading}
              style={[s.btnWrap, (phone.length < 10 || loading) && s.btnDim]}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#08a63f', '#10bd52', '#1457c8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Get Code</Text>}
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

        {/* ── OTP STEP ── */}
        {step === 'otp' && (
          <View style={s.content}>
            <Text style={s.title}>Enter code</Text>
            <Text style={s.sub}>Verifying <Text style={{ fontWeight: '800', color: INK }}>+91 {phone}</Text></Text>

            {/* Dev code banner */}
            <View style={s.devBanner}>
              <Text style={s.devLabel}>DEV CODE</Text>
              <Text style={s.devCode}>1 2 3 4 5 6</Text>
            </View>

            <TextInput
              ref={otpRef}
              style={s.otpInput}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter 6-digit code"
              placeholderTextColor={MUTED}
              autoFocus
              inputMode="numeric"
            />

            {error ? <ErrBox text={error} /> : null}

            <TouchableOpacity
              onPress={() => verifyOtp()}
              disabled={otp.length < 6 || loading}
              style={[s.btnWrap, (otp.length < 6 || loading) && s.btnDim]}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#08a63f', '#10bd52', '#1457c8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Verify & continue</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={s.changeBtn} onPress={() => { setStep('phone'); setOtp(''); setError(''); }}>
              <Text style={s.changeBtnTxt}>← Change number</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ErrBox({ text }: { text: string }) {
  return (
    <View style={eb.box}>
      <Text style={eb.txt}>{text}</Text>
    </View>
  );
}

const eb = StyleSheet.create({
  box: { backgroundColor: 'rgba(229,72,77,0.08)', borderRadius: 10, padding: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: RED },
  txt: { fontSize: 13, color: RED, fontWeight: '600' },
});

const s = StyleSheet.create({
  scroll:    { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 40 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  backBtn:   { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  backTxt:   { fontSize: 20, color: INK, fontWeight: '700' },
  logo:      { width: 116, height: 34 },
  content:   { gap: 0 },
  title:     { fontSize: 32, fontWeight: '900', color: INK, marginBottom: 8, letterSpacing: -0.5 },
  sub:       { fontSize: 15, color: MUTED, marginBottom: 24, lineHeight: 22 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: 20, backgroundColor: '#fff', minHeight: 58, marginBottom: 14, overflow: 'hidden' },
  prefix:    { paddingHorizontal: 16, fontSize: 16, fontWeight: '700', color: INK, borderRightWidth: 1, borderRightColor: BORDER, alignSelf: 'stretch', textAlignVertical: 'center', lineHeight: 58 },
  input:     { flex: 1, fontSize: 16, color: INK, fontWeight: '600', paddingHorizontal: 16, height: 58 },

  devBanner: { backgroundColor: '#FFF3CD', borderRadius: 14, padding: 14, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FFD86E' },
  devLabel:  { fontSize: 10, fontWeight: '800', color: '#92600A', letterSpacing: 1.5, marginBottom: 4 },
  devCode:   { fontSize: 28, fontWeight: '900', color: '#92600A', letterSpacing: 8 },

  otpInput:  { borderWidth: 1.5, borderColor: BORDER, borderRadius: 20, backgroundColor: '#fff', minHeight: 58, fontSize: 22, color: INK, fontWeight: '700', paddingHorizontal: 20, marginBottom: 16, letterSpacing: 10, textAlign: 'center' },

  btnWrap:   { borderRadius: 18, overflow: 'hidden', marginBottom: 14, shadowColor: GREEN, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  btnDim:    { opacity: 0.45, shadowOpacity: 0 },
  btn:       { minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  btnTxt:    { fontSize: 17, fontWeight: '900', color: '#fff' },

  changeBtn:    { alignItems: 'center', paddingVertical: 12 },
  changeBtnTxt: { fontSize: 14, fontWeight: '600', color: MUTED },

  legal:     { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18, marginTop: 8 },
  legalLink: { color: BLUE, fontWeight: '700' },
});
