import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Image, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import LocationPicker from './components/LocationPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://kaam-backend-production.up.railway.app';

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const [lang, setLang] = useState('en');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState<any>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [userType, setUserType] = useState('SEEKER');

  const JOB_TYPE_OPTS = [
    { key: 'FULL_TIME', label: 'Full Time' },
    { key: 'PART_TIME', label: 'Part Time' },
    { key: 'CONTRACT', label: 'Contract' },
    { key: 'INTERNSHIP', label: 'Internship' },
  ];

  const profileCompletion = () => {
    const fields = [name, phone, skills, experience, (location as any)?.label, salaryMin, photoUri];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const t = (en: string, hi: string) => lang === 'hi' ? hi : en;

  useEffect(() => { loadProfile(); }, []);

  const authFetch = async (url: string, options: any = {}) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) { router.replace('/login'); throw new Error('no token'); }
    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      await AsyncStorage.multiRemove(['userToken', 'userId', 'seekerProfileId']);
      router.replace('/login');
      throw new Error('expired');
    }
    return res;
  };

  const loadProfile = async () => {
    try {
      const savedPhoto = await AsyncStorage.getItem('profilePhoto');
      if (savedPhoto) setPhotoUri(savedPhoto);

      const res = await authFetch(`${API_URL}/api/profile`);
      const data = await res.json();
      setEmail(data.user?.email || '');
      setUserType(data.user?.userType || 'SEEKER');
      const sp = data.user?.seekerProfile;
      if (sp) {
        setName([sp.firstName, sp.lastName].filter(Boolean).join(' '));
        setExperience(sp.bio || '');
        if (sp.locationName) setLocation({ label: sp.locationName });
        if (sp.skills?.length) setSkills(sp.skills.map((s: any) => s.name).join(', '));
        if (sp.salaryMin) setSalaryMin(String(sp.salaryMin));
        if (sp.salaryMax) setSalaryMax(String(sp.salaryMax));
        if (sp.jobTypes?.length) setJobTypes(sp.jobTypes);
        setEditing(false);
      } else {
        setEditing(true);
      }
      if (data.user?.phone) setPhone(data.user.phone);
    } catch (e: any) {
      if (e.message !== 'expired' && e.message !== 'no token') setEditing(true);
    } finally {
      setLoading(false);
    }
  };

  const pickPhoto = async () => {
    Alert.alert(
      'Add Photo',
      'Choose source',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Please allow camera access in Settings.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true, aspect: [1, 1], quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              setPhotoUri(uri);
              await AsyncStorage.setItem('profilePhoto', uri);
            }
          },
        },
        {
          text: 'Photo Library',
          onPress: async () => {
            if (Platform.OS !== 'web') {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow photo access in Settings.');
                return;
              }
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true, aspect: [1, 1], quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              setPhotoUri(uri);
              await AsyncStorage.setItem('profilePhoto', uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const sendOtp = async () => {
    if (phone.length !== 10) { Alert.alert('', t('Enter valid 10-digit number', 'सही 10 अंक दर्ज करें')); return; }
    setOtpLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert('Error', data.error); return; }
      setOtpSent(true);
      // Show dev OTP in alert (remove in production)
      if (data.devCode) Alert.alert('OTP (Testing)', `Your OTP is: ${data.devCode}`);
    } catch { Alert.alert('Error', 'Could not send OTP'); }
    finally { setOtpLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 4) { Alert.alert('', t('Enter 4-digit OTP', '4 अंक का OTP दर्ज करें')); return; }
    setOtpLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert('Error', data.error); return; }
      setPhoneVerified(true);
      setOtpSent(false);
      setOtp('');
      Alert.alert('', t('Phone verified!', 'फोन सत्यापित हो गया!'));
    } catch { Alert.alert('Error', 'Verification failed'); }
    finally { setOtpLoading(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('', t('Please enter your name', 'कृपया अपना नाम दर्ज करें')); return; }
    setSaving(true);
    try {
      const parts = name.trim().split(' ');
      const res = await authFetch(`${API_URL}/api/profile/seeker`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: parts[0],
          lastName: parts.slice(1).join(' ') || '',
          phone: phone.trim(),
          locationName: (location as any)?.label || (location as any)?.state || (location as any)?.city || '',
          skills: skills.trim(),
          bio: experience.trim(),
          salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
          salaryMax: salaryMax ? parseInt(salaryMax) : undefined,
          jobTypes,
        }),
      });
      const data = await res.json();
      if (data.error) {
        Alert.alert('Error', data.error);
      } else {
        if (data.profile?.id) await AsyncStorage.setItem('seekerProfileId', data.profile.id);
        setEditing(false); // go back to view mode after save
      }
    } catch (e: any) {
      if (e.message !== 'expired') Alert.alert('Error', t('Could not save. Check your connection.', 'सेव नहीं हो सका।'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['userToken', 'userId', 'seekerProfileId', 'profilePhoto']);
    router.replace('/login');
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#F4F2EF', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#FF4F5A" />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.headerBg}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('My Profile', 'मेरी प्रोफाइल')}</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutTopText}>{t('Logout', 'लॉगआउट')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.avatarArea}>
          <TouchableOpacity onPress={editing ? pickPhoto : undefined} style={styles.avatarWrap}>
            {photoUri
              ? <Image source={{ uri: photoUri }} style={styles.avatarImg} />
              : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{name ? name[0].toUpperCase() : '?'}</Text></View>
            }
            {editing && <View style={styles.camBadge}><Text style={{ fontSize: 13 }}>📷</Text></View>}
          </TouchableOpacity>
          <Text style={styles.avatarName}>{name || t('Your Name', 'आपका नाम')}</Text>
          {email ? <Text style={styles.avatarEmail}>{email}</Text> : null}
        </View>
      </View>

      {/* Profile Completion Bar */}
      {!editing && (() => {
        const pct = profileCompletion();
        return (
          <View style={styles.completionCard}>
            <View style={styles.completionRow}>
              <Text style={styles.completionLabel}>Profile Strength</Text>
              <Text style={[styles.completionPct, { color: pct >= 80 ? '#00B894' : pct >= 50 ? '#FFB800' : '#FF4F5A' }]}>{pct}%</Text>
            </View>
            <View style={styles.completionTrack}>
              <View style={[styles.completionFill, { width: `${pct}%` as any, backgroundColor: pct >= 80 ? '#00B894' : pct >= 50 ? '#FFB800' : '#FF4F5A' }]} />
            </View>
            {pct < 100 && <Text style={styles.completionHint}>
              {pct < 50 ? '⚡ Complete profile to get more matches!' : '👍 Almost there — add more details'}
            </Text>}
          </View>
        );
      })()}

      {/* Lang toggle + Dark mode toggle */}
      <View style={styles.langRow}>
        {(['en', 'hi'] as const).map(l => (
          <TouchableOpacity key={l} style={[styles.langBtn, lang === l && styles.langActive]} onPress={() => setLang(l)}>
            <Text style={[styles.langText, lang === l && styles.langTextActive]}>{l === 'en' ? 'English' : 'हिंदी'}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.langBtn, styles.darkToggleBtn]} onPress={toggleTheme}>
          <Text style={styles.langText}>{isDark ? '☀️ Light' : '🌙 Dark'}</Text>
        </TouchableOpacity>
      </View>

      {editing ? (
        /* ─── EDIT MODE ─── */
        <View style={styles.formCard}>
          <FormField label={t('Full Name', 'पूरा नाम')}>
            <TextInput style={styles.input} placeholder={t('Your full name', 'आपका पूरा नाम')} placeholderTextColor="#C0BDBA" value={name} onChangeText={setName} />
          </FormField>
          <FormField label={t('Mobile', 'मोबाइल')}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="10-digit number"
                placeholderTextColor="#C0BDBA"
                value={phone}
                onChangeText={t => { setPhone(t); setOtpSent(false); setPhoneVerified(false); }}
                keyboardType="phone-pad"
                maxLength={10}
              />
              {phoneVerified ? (
                <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ {t('Verified', 'सत्यापित')}</Text></View>
              ) : (
                <TouchableOpacity style={styles.otpBtn} onPress={sendOtp} disabled={otpLoading}>
                  {otpLoading && !otpSent ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.otpBtnText}>{t('Send OTP', 'OTP भेजें')}</Text>}
                </TouchableOpacity>
              )}
            </View>
            {otpSent && !phoneVerified && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1, letterSpacing: 6, fontSize: 20, fontWeight: '800', textAlign: 'center' }]}
                  placeholder="_ _ _ _"
                  placeholderTextColor="#C0BDBA"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TouchableOpacity style={styles.otpBtn} onPress={verifyOtp} disabled={otpLoading}>
                  {otpLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.otpBtnText}>{t('Verify', 'सत्यापित')}</Text>}
                </TouchableOpacity>
              </View>
            )}
          </FormField>
          <FormField label={t('Location', 'शहर')}>
            <LocationPicker value={location} onChange={setLocation} placeholder={t('Select city', 'शहर चुनें')} />
          </FormField>
          <FormField label={t('Skills', 'कौशल')}>
            <TextInput style={styles.input} placeholder={t('e.g. Driving, Cooking, Sales', 'जैसे ड्राइविंग, खाना, सेल्स')} placeholderTextColor="#C0BDBA" value={skills} onChangeText={setSkills} />
          </FormField>
          <FormField label={t('Experience / About Me', 'अनुभव')}>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top', paddingTop: 14 }]}
              placeholder={t('Brief work history...', 'काम का संक्षिप्त विवरण...')}
              placeholderTextColor="#C0BDBA" value={experience} onChangeText={setExperience} multiline
            />
          </FormField>

          <FormField label={t('Expected Salary (per month ₹)', 'अपेक्षित वेतन')}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min e.g. 12000" placeholderTextColor="#C0BDBA" value={salaryMin} onChangeText={setSalaryMin} keyboardType="numeric" />
              <Text style={{ color: '#bbb', fontWeight: '700' }}>–</Text>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max e.g. 25000" placeholderTextColor="#C0BDBA" value={salaryMax} onChangeText={setSalaryMax} keyboardType="numeric" />
            </View>
          </FormField>

          <FormField label={t('I want to work...', 'मैं काम करना चाहता हूं')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {JOB_TYPE_OPTS.map(opt => {
                const active = jobTypes.includes(opt.key);
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.jobTypeChip, active && styles.jobTypeChipActive]}
                    onPress={() => setJobTypes(prev => active ? prev.filter(k => k !== opt.key) : [...prev, opt.key])}
                  >
                    <Text style={[styles.jobTypeChipText, active && styles.jobTypeChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormField>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.65 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('Save Profile', 'प्रोफाइल सेव करें')} ✓</Text>}
          </TouchableOpacity>

          {name ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={styles.cancelText}>{t('Cancel', 'रद्द करें')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        /* ─── VIEW MODE ─── */
        <View style={styles.viewCard}>
          <InfoRow label={t('Mobile', 'मोबाइल')} value={phone || t('Not set', 'नहीं भरा')} />
          <InfoRow label={t('Location', 'शहर')} value={(location as any)?.label || (location as any)?.city || t('Not set', 'नहीं भरा')} />
          <InfoRow label={t('Skills', 'कौशल')} value={skills || t('Not set', 'नहीं भरा')} />
          <InfoRow label={t('Experience', 'अनुभव')} value={experience || t('Not set', 'नहीं भरा')} last />

          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editBtnText}>{t('Edit Profile', 'प्रोफाइल बदलें')} ✏️</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.version}>KaaM v1.0 · Made in India 🇮🇳</Text>
    </ScrollView>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[ir.row, !last && ir.border]}>
      <View style={ir.text}>
        <Text style={ir.label}>{label}</Text>
        <Text style={ir.value}>{value}</Text>
      </View>
    </View>
  );
}
const ir = StyleSheet.create({
  row: { paddingVertical: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: '#F4F2EF' },
  text: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginTop: 2 },
});

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F2EF' },

  headerBg: { backgroundColor: '#FF4F5A', paddingBottom: 28 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  backText: { fontSize: 20, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  logoutTopText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  avatarArea: { alignItems: 'center', paddingTop: 4 },
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatarImg: { width: 90, height: 90, borderRadius: 28, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: { width: 90, height: 90, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  avatarLetter: { fontSize: 36, fontWeight: '900', color: '#fff' },
  camBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#fff', borderRadius: 10, width: 26, height: 26, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  avatarName: { fontSize: 20, fontWeight: '900', color: '#fff' },
  avatarEmail: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  langRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0EDE8', marginBottom: 12, flexWrap: 'wrap' },
  langBtn: { paddingHorizontal: 20, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8E5E2' },
  langActive: { backgroundColor: '#FF4F5A', borderColor: '#FF4F5A' },
  langText: { fontSize: 13, fontWeight: '700', color: '#999' },
  langTextActive: { color: '#fff' },
  darkToggleBtn: { borderColor: '#1A1A1A' },

  // View mode
  viewCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 12 },
  editBtn: { marginTop: 16, backgroundColor: '#F4F2EF', borderRadius: 14, padding: 16, alignItems: 'center' },
  editBtnText: { fontSize: 15, fontWeight: '800', color: '#FF4F5A' },

  // Completion bar
  completionCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  completionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  completionLabel: { fontSize: 13, fontWeight: '700', color: '#888' },
  completionPct: { fontSize: 18, fontWeight: '900' },
  completionTrack: { height: 8, backgroundColor: '#F4F2EF', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  completionFill: { height: 8, borderRadius: 4 },
  completionHint: { fontSize: 12, color: '#FF4F5A', fontWeight: '600' },

  // Job type chips
  jobTypeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8E5E2', backgroundColor: '#fff' },
  jobTypeChipActive: { backgroundColor: '#FF4F5A', borderColor: '#FF4F5A' },
  jobTypeChipText: { fontSize: 12, fontWeight: '700', color: '#888' },
  jobTypeChipTextActive: { color: '#fff' },

  // Edit mode
  formCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 12 },
  input: { backgroundColor: '#F8F6F3', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A' },
  saveBtn: { backgroundColor: '#FF4F5A', borderRadius: 14, padding: 17, alignItems: 'center', marginTop: 8, shadowColor: '#FF4F5A', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancelBtn: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#bbb', fontWeight: '700', fontSize: 14 },

  version: { textAlign: 'center', fontSize: 11, color: '#C0BDBA', paddingVertical: 24 },
  otpBtn: { backgroundColor: '#FF4F5A', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', minWidth: 90 },
  otpBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  verifiedBadge: { backgroundColor: '#E8FFF4', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  verifiedText: { color: '#00B894', fontWeight: '800', fontSize: 13 },
});
