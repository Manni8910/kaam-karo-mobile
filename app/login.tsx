import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://kaam-backend-production.up.railway.app';

type Step = 'phone' | 'otp' | 'register';

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('en');
  const [isNewUser, setIsNewUser] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const otpRef = useRef<TextInput>(null);

  const t = (en: string, hi: string) => lang === 'hi' ? hi : en;

  const sendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert('', t('Enter valid 10-digit mobile number', 'सही 10 अंक का मोबाइल नंबर दर्ज करें'));
      return;
    }
    setLoading(true);
    try {
      // Check if user exists with this phone
      const res = await fetch(`${API_URL}/api/auth/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (data.exists) {
        // Existing user — send OTP and verify
        const otpRes = await fetch(`${API_URL}/api/otp/send-unauth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        const otpData = await otpRes.json();
        if (otpData.devCode) Alert.alert('OTP (Testing)', `Your OTP: ${otpData.devCode}`);
        setIsNewUser(false);
        setStep('otp');
      } else {
        // New user — go to registration
        setIsNewUser(true);
        setStep('register');
      }
    } catch (e: any) {
      // OTP endpoints not yet on server — fall through to email login
      Alert.alert(
        t('OTP Unavailable', 'OTP अभी उपलब्ध नहीं'),
        t('Please use Email login instead.', 'कृपया ईमेल से लॉगिन करें।'),
        [{ text: t('Use Email', 'ईमेल से लॉगिन'), onPress: () => { setIsNewUser(false); setStep('register'); } }]
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 4) {
      Alert.alert('', t('Enter 4-digit OTP', '4 अंक का OTP दर्ज करें'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert('', data.error); return; }
      await saveAndNavigate(data);
    } catch {
      Alert.alert('', t('Verification failed. Try again.', 'सत्यापन विफल। फिर कोशिश करें।'));
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert('', t('Enter email and password (min 6 chars)', 'ईमेल और पासवर्ड दर्ज करें'));
      return;
    }
    setLoading(true);
    try {
      const userType = await AsyncStorage.getItem('pendingUserType') || 'SEEKER';
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, phone, userType }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert('', data.error); return; }
      await saveAndNavigate(data);
    } catch {
      Alert.alert('', t('Registration failed', 'पंजीकरण विफल'));
    } finally {
      setLoading(false);
    }
  };

  const loginEmail = async () => {
    if (!email.trim() || !password) {
      Alert.alert('', t('Enter email and password', 'ईमेल और पासवर्ड दर्ज करें'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert('', data.error); return; }
      await saveAndNavigate(data);
    } catch {
      Alert.alert('', t('Login failed', 'लॉगिन विफल'));
    } finally {
      setLoading(false);
    }
  };

  const saveAndNavigate = async (data: any) => {
    await AsyncStorage.setItem('userToken', data.token);
    await AsyncStorage.setItem('userId', data.user?.id || '');
    await AsyncStorage.setItem('userType', data.user?.userType || 'SEEKER');
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#FF4F5A" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Brand header */}
        <View style={styles.brand}>
          <Text style={styles.brandLogo}>KaamKaro</Text>
          <Text style={styles.brandTag}>{t('India ka Apna Job App', 'भारत का अपना जॉब ऐप')}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Lang toggle */}
          <View style={styles.langRow}>
            {(['en', 'hi'] as const).map(l => (
              <TouchableOpacity key={l} style={[styles.langChip, lang === l && styles.langActive]} onPress={() => setLang(l)}>
                <Text style={[styles.langText, lang === l && styles.langActiveText]}>{l === 'en' ? 'English' : 'हिंदी'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* STEP: Phone */}
          {step === 'phone' && (
            <>
              <Text style={styles.stepTitle}>{t('Enter Mobile Number', 'मोबाइल नंबर दर्ज करें')}</Text>
              <Text style={styles.stepSub}>{t("We'll send a verification code", 'हम एक OTP भेजेंगे')}</Text>

              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="10-digit number"
                  placeholderTextColor="#C0BDBA"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>

              <TouchableOpacity style={[styles.btn, loading && styles.btnLoading]} onPress={sendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('Send OTP →', 'OTP भेजें →')}</Text>}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.emailLoginBtn} onPress={() => setStep('register')}>
                <Text style={styles.emailLoginText}>{t('Login with Email', 'ईमेल से लॉगिन करें')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP: OTP */}
          {step === 'otp' && (
            <>
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.backBtn}>
                <Text style={styles.backText}>← {t('Change Number', 'नंबर बदलें')}</Text>
              </TouchableOpacity>
              <Text style={styles.stepTitle}>{t('Enter OTP', 'OTP दर्ज करें')}</Text>
              <Text style={styles.stepSub}>{t(`Sent to +91 ${phone}`, `+91 ${phone} पर भेजा गया`)}</Text>

              <TextInput
                ref={otpRef}
                style={[styles.input, styles.otpInput]}
                placeholder="_ _ _ _"
                placeholderTextColor="#C0BDBA"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={4}
                autoFocus
              />

              <TouchableOpacity style={[styles.btn, loading && styles.btnLoading]} onPress={verifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('Verify & Login →', 'सत्यापित करें →')}</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendBtn} onPress={sendOtp}>
                <Text style={styles.resendText}>{t('Resend OTP', 'OTP फिर भेजें')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP: Register / Email login */}
          {step === 'register' && (
            <>
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.backBtn}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.stepTitle}>
                {isNewUser ? t('Create Account', 'खाता बनाएं') : t('Login', 'लॉगिन करें')}
              </Text>

              <Text style={styles.inputLabel}>{t('Email', 'ईमेल')}</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#C0BDBA"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>{t('Password', 'पासवर्ड')}</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={t('Min 6 characters', 'कम से कम 6 अक्षर')}
                  placeholderTextColor="#C0BDBA"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                  <Text>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnLoading]}
                onPress={isNewUser ? register : loginEmail}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> :
                  <Text style={styles.btnText}>{isNewUser ? t('Create Account →', 'खाता बनाएं →') : t('Login →', 'लॉगिन करें →')}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchBtn} onPress={() => setIsNewUser(!isNewUser)}>
                <Text style={styles.switchText}>
                  {isNewUser ? t('Already have account? Login', 'खाता है? लॉगिन करें') : t('New user? Register', 'नया उपयोगकर्ता? रजिस्टर करें')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.bottomNote}>
          {t('Free for job seekers · Trusted across India', 'नौकरी खोजने वालों के लिए मुफ्त · पूरे भारत में भरोसेमंद')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FF4F5A' },
  scroll: { flexGrow: 1 },

  brand: { alignItems: 'center', paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24 },
  brandLogo: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  brandTag: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  card: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    flex: 1, padding: 28, paddingBottom: 40,
  },

  langRow: { flexDirection: 'row', gap: 8, marginBottom: 24, alignSelf: 'flex-end' },
  langChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8E5E2' },
  langActive: { backgroundColor: '#FF4F5A', borderColor: '#FF4F5A' },
  langText: { fontSize: 12, fontWeight: '700', color: '#999' },
  langActiveText: { color: '#fff' },

  stepTitle: { fontSize: 24, fontWeight: '900', color: '#1A1A1A', marginBottom: 6 },
  stepSub: { fontSize: 14, color: '#999', marginBottom: 24 },

  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  countryCode: {
    backgroundColor: '#F8F6F3', borderRadius: 14, paddingHorizontal: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  countryCodeText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  phoneInput: { flex: 1, fontSize: 18, letterSpacing: 1 },

  input: { backgroundColor: '#F8F6F3', borderRadius: 14, padding: 16, fontSize: 15, color: '#1A1A1A', marginBottom: 16 },
  otpInput: { fontSize: 28, fontWeight: '900', letterSpacing: 12, textAlign: 'center', marginBottom: 20 },

  inputLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  passRow: { flexDirection: 'row', backgroundColor: '#F8F6F3', borderRadius: 14, marginBottom: 16, overflow: 'hidden' },
  eyeBtn: { paddingHorizontal: 14, justifyContent: 'center' },

  btn: {
    backgroundColor: '#FF4F5A', borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: '#FF4F5A', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
    marginBottom: 16,
  },
  btnLoading: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 17 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0EDE8' },
  dividerText: { fontSize: 13, color: '#bbb', fontWeight: '600' },

  emailLoginBtn: { borderWidth: 1.5, borderColor: '#E8E5E2', borderRadius: 16, padding: 16, alignItems: 'center' },
  emailLoginText: { fontWeight: '700', color: '#555', fontSize: 15 },

  backBtn: { marginBottom: 16 },
  backText: { color: '#FF4F5A', fontWeight: '700', fontSize: 14 },

  resendBtn: { alignItems: 'center', marginTop: 4 },
  resendText: { color: '#FF4F5A', fontWeight: '700', fontSize: 14 },

  switchBtn: { alignItems: 'center', marginTop: 12 },
  switchText: { color: '#FF4F5A', fontWeight: '700', fontSize: 14 },

  bottomNote: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: 20, backgroundColor: '#fff' },
});
