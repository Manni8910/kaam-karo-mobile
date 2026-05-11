import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Platform, StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GREEN  = '#1E8A3C';
const BLUE   = '#1B3FD8';
const RED    = '#EF4444';

const API_URL = 'https://kaam-backend-production.up.railway.app';

const WORK_TYPES = [
  { id: 'cleaner',      label: '🧹 Cleaner' },
  { id: 'cook',         label: '🍳 Cook' },
  { id: 'driver',       label: '🚗 Driver' },
  { id: 'helper',       label: '🙋 Helper' },
  { id: 'security',     label: '💂 Security' },
  { id: 'electrician',  label: '⚡ Electrician' },
  { id: 'delivery',     label: '📦 Delivery' },
  { id: 'plumber',      label: '🔧 Plumber' },
  { id: 'carpenter',    label: '🪚 Carpenter' },
  { id: 'data_entry',   label: '⌨️ Data Entry' },
  { id: 'other',        label: '💼 Other' },
];

const AVAIL_OPTS = [
  { id: 'FULL_TIME', label: 'Full-time',     icon: '🕐', sub: '9am – 6pm' },
  { id: 'PART_TIME', label: 'Part-time',     icon: '🕗', sub: 'Flexible hours' },
  { id: 'CONTRACT',  label: 'Daily wage',    icon: '💵', sub: 'Day-by-day' },
  { id: 'WEEKEND',   label: 'Weekends only', icon: '📅', sub: 'Sat & Sun' },
];

/** Safely parse skills from the API — handles string or array */
function parseSkills(raw: any): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(raw)) {
    return raw.map((s: any) => (typeof s === 'string' ? s : s?.name || '').toLowerCase()).filter(Boolean);
  }
  return [];
}

export default function ProfileScreen() {
  const router = useRouter();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(false);
  const [userType, setUserType] = useState('SEEKER');

  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Worker fields
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [locationName, setLoc]    = useState('');
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [availability, setAvail]  = useState('FULL_TIME');
  const [bio, setBio]             = useState('');

  // Employer fields
  const [bizName, setBizName]    = useState('');
  const [category, setCategory]  = useState('');
  const [empLocation, setEmpLoc] = useState('');
  const [activeJobs, setActive]  = useState(0);

  // Load profile pic immediately on mount — never cleared by the API loading cycle
  useEffect(() => {
    AsyncStorage.getItem('profilePic').then(pic => { if (pic) setProfilePic(pic); });
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const type  = await AsyncStorage.getItem('userType') || 'SEEKER';
      setUserType(type);
      if (!token) { router.replace('/login'); return; }

      const res  = await fetch(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      if (type === 'EMPLOYER') {
        const ep = data.user?.employerProfile;
        setBizName(ep?.companyName || data.user?.name || '');
        setCategory(ep?.category || '');
        setEmpLoc(ep?.locationName || '');
        setActive(ep?._count?.jobs ?? 0);
        setPhone(data.user?.phone || '');
        const epPhoto = ep?.logoUrl || ep?.photoUrl || data.user?.photoUrl;
        if (epPhoto) { setProfilePic(epPhoto); AsyncStorage.setItem('profilePic', epPhoto); }
      } else {
        const sp = data.user?.seekerProfile;
        setName([sp?.firstName, sp?.lastName].filter(Boolean).join(' ') || data.user?.name || '');
        setPhone(data.user?.phone || '');
        setLoc(sp?.locationName || '');
        setBio(sp?.bio || '');
        // ✅ FIX: parseSkills handles both string ("cook,driver") and array formats
        const ids = parseSkills(sp?.skills);
        if (ids.length) setWorkTypes(ids);
        setAvail(sp?.availability || 'FULL_TIME');
        const spPhoto = sp?.photoUrl || sp?.profilePic || sp?.avatarUrl || data.user?.photoUrl;
        if (spPhoto) { setProfilePic(spPhoto); AsyncStorage.setItem('profilePic', spPhoto); }
      }
    } catch {}
    finally { setLoading(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const token    = await AsyncStorage.getItem('userToken');
      const endpoint = userType === 'EMPLOYER' ? '/api/profile/employer' : '/api/profile/seeker';
      const body = userType === 'EMPLOYER'
        ? { companyName: bizName.trim(), category, locationName: empLocation.trim() }
        : {
            firstName: name.trim().split(' ')[0],
            lastName:  name.trim().split(' ').slice(1).join(' ') || '',
            locationName: locationName.trim(),
            bio: bio.trim(),
            // ✅ FIX: send as comma-separated string — backend does skills.split(',')
            skills: workTypes.join(','),
            availability,
          };

      const res  = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.error) { Alert.alert('Error', d.error); return; }
      setEditing(false);
    } catch { Alert.alert('Error', 'Could not save. Try again.'); }
    finally { setSaving(false); }
  };

  const logout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove([
            'userToken', 'userId', 'userType', 'seekerProfileId',
            'onboardingComplete', 'hasSeenWelcome', 'userCity', 'profileCity',
            'profilePic', 'hasSeenSwipeGuide',
            'referral_source', 'referral_medium', 'referral_campaign',
          ]);
          router.replace('/welcome');
        },
      },
    ]);
  };

  const strength = () => {
    if (userType === 'EMPLOYER') return 100;
    const checks = [
      !!name.trim(),
      !!phone,
      !!locationName.trim(),
      workTypes.length > 0,
      !!bio.trim(),
      !!profilePic,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  if (loading) return (
    <LinearGradient colors={['#1B3FD8', '#1a6b3c', '#1E8A3C']} locations={[0, 0.55, 1]} style={s.center}>
      {/* Show photo immediately while API loads */}
      {profilePic ? (
        <View style={[s.avatarWrap, { marginBottom: 16 }]}>
          <Image source={{ uri: profilePic }} style={s.avatarImg} />
        </View>
      ) : null}
      <ActivityIndicator color="#fff" size="large" />
      <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 14 }}>Loading profile…</Text>
    </LinearGradient>
  );

  const displayName = userType === 'EMPLOYER' ? bizName : name;
  const initials    = (displayName || 'U').charAt(0).toUpperCase();
  const pct         = strength();
  const availLabel  = AVAIL_OPTS.find(a => a.id === availability)?.label || '';

  return (
    <LinearGradient colors={['#1B3FD8', '#1a6b3c', '#1E8A3C']} locations={[0, 0.55, 1]} style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: 'transparent' }}
      >

        {/* ── HEADER CARD ── */}
        <View style={s.headerCard}>
          {/* Avatar */}
          <View style={s.avatarWrap}>
            {profilePic
              ? <Image source={{ uri: profilePic }} style={s.avatarImg} />
              : <Text style={s.avatarTxt}>{initials}</Text>
            }
          </View>

          <Text style={s.userName}>{displayName || 'Your Name'}</Text>
          {phone ? <Text style={s.userPhone}>+91 {phone}</Text> : null}

          <View style={s.rolePill}>
            <Text style={s.rolePillTxt}>{userType === 'EMPLOYER' ? '🏢 Employer' : '👷 Worker'}</Text>
          </View>

          {/* Edit button */}
          {!editing && (
            <TouchableOpacity style={s.editBtn} onPress={() => setEditing(true)} activeOpacity={0.8}>
              <Text style={s.editBtnTxt}>✏️  Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── PROFILE STRENGTH (workers) ── */}
        {userType !== 'EMPLOYER' && (
          <View style={s.frostedCard}>
            <View style={s.strengthRow}>
              <Text style={s.frostedLabel}>Profile Strength</Text>
              <Text style={s.strengthPct}>{pct}%</Text>
            </View>
            <View style={s.strengthTrack}>
              <View style={[s.strengthFill, { width: `${pct}%` as any }]} />
            </View>
            <Text style={s.strengthHint}>
              {pct >= 100 ? '🌟 Your profile is complete!' :
               pct >= 66  ? '👍 Almost there — add a few more details' :
                            '⚡ Complete your profile to get more matches!'}
            </Text>
          </View>
        )}

        {editing ? (
          /* ── EDIT MODE ── */
          <View style={s.frostedCard}>
            <Text style={s.sectionTitle}>✏️  Edit Profile</Text>

            {userType === 'EMPLOYER' ? (
              <>
                <Text style={s.fieldLabel}>Business Name</Text>
                <TextInput style={s.input} value={bizName} onChangeText={setBizName}
                  placeholder="Your business name" placeholderTextColor="rgba(255,255,255,0.4)" />

                <Text style={s.fieldLabel}>Location</Text>
                <TextInput style={s.input} value={empLocation} onChangeText={setEmpLoc}
                  placeholder="e.g. Indore, MP" placeholderTextColor="rgba(255,255,255,0.4)" />
              </>
            ) : (
              <>
                <Text style={s.fieldLabel}>Full Name</Text>
                <TextInput style={s.input} value={name} onChangeText={setName}
                  placeholder="Your full name" placeholderTextColor="rgba(255,255,255,0.4)" />

                <Text style={s.fieldLabel}>Location</Text>
                <TextInput style={s.input} value={locationName} onChangeText={setLoc}
                  placeholder="e.g. Indore, MP" placeholderTextColor="rgba(255,255,255,0.4)" />

                <Text style={s.fieldLabel}>Work Type</Text>
                <View style={s.chipGrid}>
                  {WORK_TYPES.map(wt => {
                    const on = workTypes.includes(wt.id);
                    return (
                      <TouchableOpacity key={wt.id}
                        style={[s.chip, on && s.chipOn]}
                        onPress={() => setWorkTypes(p => on ? p.filter(x => x !== wt.id) : [...p, wt.id])}
                      >
                        <Text style={[s.chipTxt, on && s.chipTxtOn]}>{wt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[s.fieldLabel, { marginTop: 16 }]}>Availability</Text>
                <View style={s.availGrid}>
                  {AVAIL_OPTS.map(opt => {
                    const on = availability === opt.id;
                    return (
                      <TouchableOpacity key={opt.id}
                        style={[s.availBox, on && s.availBoxOn]}
                        onPress={() => setAvail(opt.id)}
                      >
                        <Text style={s.availIcon}>{opt.icon}</Text>
                        <Text style={[s.availLabel, on && s.availLabelOn]}>{opt.label}</Text>
                        <Text style={s.availSub}>{opt.sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[s.fieldLabel, { marginTop: 16 }]}>About Me</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell employers about yourself…"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  numberOfLines={4}
                />
              </>
            )}

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={saveProfile} disabled={saving}>
              <LinearGradient colors={['#166830', '#2ECC71']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveBtnTxt}>Save Changes ✓</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── VIEW MODE ── */
          <>
            {userType === 'EMPLOYER' ? (
              <View style={s.frostedCard}>
                <Text style={s.sectionTitle}>🏢  Business Info</Text>
                <InfoRow label="Business Name" value={bizName || '—'} />
                <InfoRow label="Location"      value={empLocation || '—'} />
                <InfoRow label="Active Jobs"   value={String(activeJobs)} last />
              </View>
            ) : (
              <View style={s.frostedCard}>
                <Text style={s.sectionTitle}>👷  Your Profile</Text>
                <InfoRow label="Location"     value={locationName || '—'} />
                <InfoRow label="Work Type"
                  value={workTypes.length > 0
                    ? workTypes.map(id => WORK_TYPES.find(w => w.id === id)?.label || id).join('  ·  ')
                    : '—'}
                />
                <InfoRow label="Availability" value={availLabel || '—'} />
                <InfoRow label="About Me"     value={bio || '—'} last />
              </View>
            )}
          </>
        )}

        {/* ── SETTINGS ── */}
        {!editing && (
          <>
            <View style={s.frostedCard}>
              <Text style={s.sectionTitle}>⚙️  Account</Text>

              <TouchableOpacity style={s.settingRow} onPress={() => router.push('/onboarding')} activeOpacity={0.7}>
                <Text style={s.settingIcon}>🔄</Text>
                <Text style={s.settingLabel}>Switch Account Type</Text>
                <Text style={s.settingArrow}>›</Text>
              </TouchableOpacity>
              <View style={s.settingDivider} />
              <TouchableOpacity style={s.settingRow} activeOpacity={0.7}
                onPress={() => Alert.alert('Notifications', 'Notification settings coming soon!')}>
                <Text style={s.settingIcon}>🔔</Text>
                <Text style={s.settingLabel}>Notifications</Text>
                <Text style={s.settingArrow}>›</Text>
              </TouchableOpacity>
              <View style={s.settingDivider} />
              <TouchableOpacity style={s.settingRow} activeOpacity={0.7}
                onPress={() => Alert.alert('Privacy', 'Privacy controls coming soon!')}>
                <Text style={s.settingIcon}>🔒</Text>
                <Text style={s.settingLabel}>Privacy & Visibility</Text>
                <Text style={s.settingArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={s.frostedCard}>
              <Text style={s.sectionTitle}>🤝  Support</Text>

              <TouchableOpacity style={s.settingRow} activeOpacity={0.7}
                onPress={() => Alert.alert('Refer & Earn', 'Share KaamKaro with friends and earn rewards!\n\nFeature coming soon.')}>
                <Text style={s.settingIcon}>🎁</Text>
                <Text style={s.settingLabel}>Refer & Earn</Text>
                <Text style={s.settingArrow}>›</Text>
              </TouchableOpacity>
              <View style={s.settingDivider} />
              <TouchableOpacity style={s.settingRow} activeOpacity={0.7}
                onPress={() => Alert.alert('Help & FAQ', 'Help centre coming soon!\n\nFor urgent help: support@kaamkaro.co.in')}>
                <Text style={s.settingIcon}>❓</Text>
                <Text style={s.settingLabel}>Help & FAQ</Text>
                <Text style={s.settingArrow}>›</Text>
              </TouchableOpacity>
              <View style={s.settingDivider} />
              <TouchableOpacity style={s.settingRow} activeOpacity={0.7}
                onPress={() => Alert.alert('Report a Problem', 'Categories:\n• Fake jobs\n• Payment requests\n• Harassment\n• Other\n\nEmail: safety@kaamkaro.co.in')}>
                <Text style={s.settingIcon}>🚨</Text>
                <Text style={s.settingLabel}>Report a Problem</Text>
                <Text style={s.settingArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={s.frostedCard}>
              <TouchableOpacity style={s.settingRow} onPress={logout} activeOpacity={0.7}>
                <Text style={s.settingIcon}>🚪</Text>
                <Text style={[s.settingLabel, { color: '#FF6B6B' }]}>Logout</Text>
                <Text style={[s.settingArrow, { color: '#FF6B6B' }]}>›</Text>
              </TouchableOpacity>
              <View style={s.settingDivider} />
              <TouchableOpacity style={s.settingRow} activeOpacity={0.7}
                onPress={() => Alert.alert('Delete Account', 'Are you sure you want to delete your account? This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: async () => {
                    await AsyncStorage.clear();
                    router.replace('/welcome');
                  }},
                ])}>
                <Text style={s.settingIcon}>🗑️</Text>
                <Text style={[s.settingLabel, { color: '#FF6B6B' }]}>Delete Account</Text>
                <Text style={[s.settingArrow, { color: '#FF6B6B' }]}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={s.safetyBanner}>
              <Text style={s.safetyTxt}>🔒  Never pay money to get a job. Report suspicious messages immediately.</Text>
            </View>
          </>
        )}

        <Text style={s.version}>KaamKaro v1.0 · Made in India 🇮🇳</Text>

      </ScrollView>
    </LinearGradient>
  );
}

/* ── Info row ── */
function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[ir.row, last && { borderBottomWidth: 0 }]}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row:   { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' },
  label: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  value: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#1B3FD8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 48,
  },

  /* Header card */
  headerCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  avatarWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarTxt: { fontSize: 36, fontWeight: '900', color: '#fff' },

  userName:  { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4, textAlign: 'center' },
  userPhone: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  rolePill:  {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 16,
  },
  rolePillTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },

  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20, paddingHorizontal: 22, paddingVertical: 9,
  },
  editBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* Frosted glass card */
  frostedCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20, padding: 18, marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 14, letterSpacing: 0.3 },

  /* Profile strength */
  strengthRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  frostedLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  strengthPct:  { fontSize: 15, fontWeight: '900', color: '#fff' },
  strengthTrack:{ height: 7, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  strengthFill: { height: 7, backgroundColor: '#fff', borderRadius: 4 },
  strengthHint: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  /* Edit form */
  fieldLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)', marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    padding: 14, fontSize: 15, color: '#fff', marginBottom: 16,
  },
  textarea: { height: 100, textAlignVertical: 'top' },

  /* Work type chips */
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:    {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipOn:    { borderColor: '#2ECC71', backgroundColor: 'rgba(46,204,113,0.2)' },
  chipTxt:   { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  chipTxtOn: { color: '#fff', fontWeight: '700' },

  /* Availability grid */
  availGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  availBox: {
    width: '47%', borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 12, alignItems: 'center',
  },
  availBoxOn:   { borderColor: '#2ECC71', backgroundColor: 'rgba(46,204,113,0.2)' },
  availIcon:    { fontSize: 20, marginBottom: 4 },
  availLabel:   { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  availLabelOn: { color: '#fff' },
  availSub:     { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, textAlign: 'center' },

  /* Save / cancel */
  saveBtn: {
    borderRadius: 14, marginTop: 20, overflow: 'hidden',
    shadowColor: GREEN, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  saveBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  saveBtnTxt:  { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn:   { paddingVertical: 14, alignItems: 'center' },
  cancelTxt:   { color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 14 },

  /* Settings */
  settingRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  settingIcon:    { fontSize: 18, marginRight: 14 },
  settingLabel:   { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff' },
  settingArrow:   { fontSize: 22, color: 'rgba(255,255,255,0.5)', fontWeight: '300' },
  settingDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },

  version: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
});
