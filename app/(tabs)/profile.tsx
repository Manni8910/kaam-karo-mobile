import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GREEN       = '#08a63f';
const GREEN_DARK  = '#057a31';
const GREEN_LIGHT = '#eaf8ef';
const BLUE        = '#1457c8';
const INK         = '#06142f';
const TEXT        = '#17243d';
const MUTED       = '#667085';
const BORDER      = '#e2e8f0';
const BG          = '#f8fbff';
const RED         = '#e5484d';

const API_URL = 'https://kaam-backend-production.up.railway.app';

function parseSkills(raw: any): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
  if (Array.isArray(raw)) return raw.map((s: any) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean);
  return [];
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]   = useState(true);
  const [userType, setUserType] = useState('SEEKER');
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [location, setLocation] = useState('');
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [availability, setAvail]  = useState('');
  const [bio, setBio]             = useState('');
  const [bizName, setBizName]     = useState('');
  const [strength, setStrength]   = useState(60);
  const [profilePic, setProfilePic] = useState('');

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const type  = await AsyncStorage.getItem('userType') || 'SEEKER';
      const pic   = await AsyncStorage.getItem('profilePic');
      setUserType(type);
      if (pic) setProfilePic(pic);
      if (!token) { router.replace('/login'); return; }

      const res  = await fetch(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      if (type === 'EMPLOYER') {
        const ep = data.user?.employerProfile;
        setBizName(ep?.companyName || data.user?.name || '');
        setPhone(data.user?.phone || '');
        setLocation(ep?.locationName || '');
        const ep_photo = ep?.logoUrl || ep?.photoUrl || data.user?.photoUrl;
        if (ep_photo) { setProfilePic(ep_photo); AsyncStorage.setItem('profilePic', ep_photo); }
      } else {
        const sp = data.user?.seekerProfile;
        setName([sp?.firstName, sp?.lastName].filter(Boolean).join(' ') || data.user?.name || '');
        setPhone(data.user?.phone || '');
        setLocation(sp?.locationName || '');
        setBio(sp?.bio || '');
        const ids = parseSkills(sp?.skills);
        if (ids.length) setWorkTypes(ids);
        setAvail(sp?.availability || '');
        const sp_photo = sp?.photoUrl || sp?.profilePic || sp?.avatarUrl || data.user?.photoUrl;
        if (sp_photo) { setProfilePic(sp_photo); AsyncStorage.setItem('profilePic', sp_photo); }

        // Compute strength
        const checks = [
          !!(sp?.firstName || data.user?.name),
          !!data.user?.phone,
          !!sp?.locationName,
          ids.length > 0,
          !!sp?.bio,
          !!(sp_photo || pic),
        ];
        setStrength(Math.round((checks.filter(Boolean).length / checks.length) * 100));
      }
    } catch {}
    finally { setLoading(false); }
  };

  const uploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePic(result.assets[0].uri);
      AsyncStorage.setItem('profilePic', result.assets[0].uri);
    }
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
          ]);
          router.replace('/welcome');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }

  const displayName = userType === 'EMPLOYER' ? bizName : name;
  const initials    = (displayName || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 44 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={s.backBtnTxt}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Worker Profile</Text>
          <View style={s.headerTag}>
            <Text style={s.headerTagTxt}>Find Work</Text>
          </View>
        </View>

        {/* ── PROFILE HERO PANEL ── */}
        <View style={s.panel}>
          <View style={s.profileHero}>
            {/* Avatar with initials + green gradient bg */}
            <TouchableOpacity onPress={uploadPhoto} activeOpacity={0.85}>
              <LinearGradient
                colors={['#08a63f', '#1457c8']}
                style={s.avatar}
              >
                {profilePic ? (
                  // Show initials overlay until image loads
                  <Text style={s.avatarTxt}>{initials}</Text>
                ) : (
                  <Text style={s.avatarTxt}>{initials}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={s.profileName}>{displayName || 'Your Name'}</Text>
            {location ? <Text style={s.profileLoc}>📍 {location}</Text> : null}
            {userType !== 'EMPLOYER' && (
              <Text style={s.profileAvail}>Available for work</Text>
            )}
          </View>
        </View>

        {/* ── PROFILE STRENGTH (workers only) ── */}
        {userType !== 'EMPLOYER' && (
          <View style={s.panel}>
            <View style={s.strengthRow}>
              <Text style={s.sectionLabel}>PROFILE STRENGTH</Text>
              <Text style={s.strengthPct}>{strength}% ⭐</Text>
            </View>
            <View style={s.strengthTrack}>
              <LinearGradient
                colors={['#08a63f', '#1457c8']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.strengthFill, { width: `${strength}%` as any }]}
              />
            </View>
          </View>
        )}

        {/* ── SWITCH TO HIRING ── */}
        <TouchableOpacity style={s.switchCta} onPress={() => router.push('/onboarding')} activeOpacity={0.85}>
          <Text style={{ fontSize: 18 }}>💼</Text>
          <Text style={s.switchCtaTxt}>Switch to Hiring</Text>
          <Text style={s.switchCtaArrow}>›</Text>
        </TouchableOpacity>

        {/* ── BADGES ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.badgeScroll}>
          <View style={s.badgeRow}>
            <View style={s.badge}>
              <Text style={s.badgeTxt}>✓ Phone Verified</Text>
            </View>
            <View style={[s.badge, { backgroundColor: '#eef2ff', borderColor: 'rgba(20,87,200,0.3)' }]}>
              <Text style={[s.badgeTxt, { color: BLUE }]}>Profile Complete</Text>
            </View>
          </View>
        </ScrollView>

        {/* ── WORK PROFILE CARDS ── */}
        <Text style={[s.sectionLabel, { marginHorizontal: 0, marginBottom: 10 }]}>WORK PROFILE</Text>
        <View style={s.panel}>
          {[
            { label: 'Location', value: location || 'Not set' },
            { label: 'Experience', value: workTypes.length > 0 ? workTypes.slice(0, 2).join(', ') : 'Not set' },
            { label: 'Work Preferences', value: availability || 'Not set' },
            { label: 'Availability', value: 'Full-time' },
            { label: 'Skills', value: workTypes.length > 0 ? `${workTypes.length} skills added` : 'No skills yet' },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.label}
              style={[s.profileCard, i < arr.length - 1 && s.profileCardBorder]}
              onPress={() => router.push('/onboarding')}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.profileCardLabel}>{row.label}</Text>
                <Text style={s.profileCardValue} numberOfLines={1}>{row.value}</Text>
              </View>
              <Text style={s.profileCardArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SETTINGS ── */}
        <Text style={[s.sectionLabel, { marginHorizontal: 0, marginBottom: 10 }]}>SETTINGS</Text>
        <View style={s.panel}>
          {[
            { label: 'Account Settings', action: () => {} },
            { label: 'Report a Problem', action: () => Alert.alert('Report', 'Email: safety@kaamkaro.co.in') },
            { label: 'Community Guidelines', action: () => {} },
            { label: 'Logout', action: logout, danger: true },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[s.settingRow, i < arr.length - 1 && s.settingRowBorder]}
              onPress={item.action}
              activeOpacity={0.75}
            >
              <Text style={[s.settingLabel, item.danger && { color: RED }]}>{item.label}</Text>
              <Text style={[s.settingArrow, item.danger && { color: RED }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.version}>KaamKaro · Made in India 🇮🇳</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 20, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnTxt:  { fontSize: 18, color: INK, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: INK },
  headerTag: {
    backgroundColor: GREEN_LIGHT, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(8,166,63,0.3)',
  },
  headerTagTxt: { fontSize: 12, fontWeight: '700', color: GREEN_DARK },

  /* Panel */
  panel: {
    backgroundColor: '#fff', borderRadius: 22,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: INK, shadowOpacity: 0.08, shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 }, elevation: 3,
    marginBottom: 14, overflow: 'hidden',
  },

  /* Profile hero */
  profileHero: { alignItems: 'center', padding: 22, gap: 8 },
  avatar: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  avatarTxt:   { fontSize: 22, fontWeight: '900', color: '#fff' },
  profileName: { fontSize: 20, fontWeight: '900', color: INK },
  profileLoc:  { fontSize: 13, color: MUTED },
  profileAvail:{ fontSize: 12, color: GREEN_DARK, fontWeight: '700' },

  /* Strength */
  strengthRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: '950', color: MUTED,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  strengthPct: { fontSize: 14, fontWeight: '900', color: INK },
  strengthTrack: {
    height: 5, backgroundColor: BORDER, borderRadius: 3,
    marginHorizontal: 16, marginBottom: 14, overflow: 'hidden',
  },
  strengthFill: { height: 5, borderRadius: 3 },

  /* Switch CTA */
  switchCta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 22,
    borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 14,
    shadowColor: INK, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  switchCtaTxt:   { flex: 1, fontSize: 15, fontWeight: '700', color: INK },
  switchCtaArrow: { fontSize: 20, color: MUTED },

  /* Badges */
  badgeScroll: { marginBottom: 14, flexGrow: 0 },
  badgeRow:    { flexDirection: 'row', gap: 8, paddingRight: 4 },
  badge: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(8,166,63,0.3)',
  },
  badgeTxt: { fontSize: 12, fontWeight: '700', color: GREEN_DARK },

  /* Profile cards */
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  profileCardBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  profileCardLabel:  { fontSize: 12, fontWeight: '700', color: MUTED, marginBottom: 3 },
  profileCardValue:  { fontSize: 14, fontWeight: '600', color: INK },
  profileCardArrow:  { fontSize: 20, color: MUTED, fontWeight: '300' },

  /* Settings */
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  settingLabel:    { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT },
  settingArrow:    { fontSize: 20, color: MUTED, fontWeight: '300' },

  version: { textAlign: 'center', fontSize: 11, color: MUTED, marginTop: 8 },
});
