import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const GREEN       = '#1E8A3C';
const GREEN_LIGHT = '#E8F5EE';
const GREEN_DARK  = '#166830';
const BLUE        = '#1B3FD8';
const TEXT        = '#111827';
const TEXT_MID    = '#6B7280';
const TEXT_LIGHT  = '#9CA3AF';
const BORDER      = '#E5E7EB';
const BG_GRAY     = '#F9FAFB';



const JOB_TYPES = [
  { id: 'FULL_TIME', label: 'Full-time' },
  { id: 'PART_TIME', label: 'Part-time' },
  { id: 'CONTRACT',  label: 'Daily Wage' },
];

export default function PostJobScreen() {
  const router = useRouter();

  const [userType, setUserType]   = useState('');
  const [dashData, setDashData]   = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [posting, setPosting]     = useState(false);
  const [view, setView]           = useState<'dashboard' | 'post'>('dashboard');

  // Post job form
  const [title, setTitle]       = useState('');
  const [salary, setSalary]     = useState('');
  const [jobType, setJobType]   = useState('FULL_TIME');
  const [location, setLoc]      = useState('');
  const [desc, setDesc]         = useState('');

  useFocusEffect(useCallback(() => { init(); }, []));

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/login'); return; }
    const uid = session.user.id;
    const { data: user } = await supabase.from('users').select('active_role').eq('id', uid).maybeSingle();
    const role = user?.active_role || 'worker';
    setUserType(role === 'employer' ? 'EMPLOYER' : 'SEEKER');
    if (role === 'employer') await loadDash(uid);
    else setLoading(false);
  };

  const loadDash = async (uid: string) => {
    setLoading(true);
    try {
      const { data: ep } = await supabase.from('employer_profiles').select('id, business_name').eq('user_id', uid).maybeSingle();
      if (ep) {
        const { data: jobRows } = await supabase.from('jobs').select('id, title, salary, salary_type, city, status, created_at').eq('employer_id', ep.id).order('created_at', { ascending: false });
        setDashData({ employer: ep, jobs: jobRows || [] });
      }
    } catch { setDashData(null); }
    finally { setLoading(false); }
  };

  const postJob = async () => {
    if (!title.trim() || !salary || !location.trim()) {
      Alert.alert('', 'Please fill in job title, salary and location');
      return;
    }
    setPosting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');
      const { data: ep } = await supabase.from('employer_profiles').select('id').eq('user_id', session.user.id).maybeSingle();
      if (!ep) throw new Error('Employer profile not found');
      const salaryType = jobType === 'CONTRACT' ? 'day' : 'month';
      const { error } = await supabase.from('jobs').insert({
        employer_id: ep.id,
        title: title.trim(),
        salary: parseInt(salary),
        salary_type: salaryType,
        city: location.trim(),
        formatted_location: `${location.trim()}, India`,
        description: desc.trim(),
        is_remote: jobType === 'REMOTE',
        status: 'active',
      });
      if (error) throw new Error(error.message);
      Alert.alert('✅ Job Posted!', 'Your job is now live and visible to workers.', [
        { text: 'OK', onPress: () => { setView('dashboard'); setTitle(''); setSalary(''); setLoc(''); setDesc(''); init(); } }
      ]);
    } catch (e: any) { Alert.alert('Error', e?.message || 'Could not post job. Try again.'); }
    finally { setPosting(false); }
  };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color={GREEN} size="large" />
    </View>
  );

  // ── WORKER: show prompt to switch role ──
  if (userType !== 'EMPLOYER') {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.header}>
          <Text style={s.headerTitle}>Post a Job</Text>
        </View>
        <View style={s.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🏢</Text>
          <Text style={s.switchTitle}>For Employers Only</Text>
          <Text style={s.switchSub}>Post jobs and find the right workers for your business</Text>
          <TouchableOpacity style={s.switchBtn} onPress={() => router.replace('/onboarding')}>
            <Text style={s.switchBtnTxt}>Switch to Employer Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── POST JOB FORM ──
  if (view === 'post') {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.header}>
          <TouchableOpacity onPress={() => setView('dashboard')} style={s.backBtn}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Post a Job</Text>
        </View>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">

          <Text style={s.label}>Job Title *</Text>
          <TextInput style={s.input} placeholder="e.g. Chef, Driver, Cleaner" placeholderTextColor={TEXT_LIGHT} value={title} onChangeText={setTitle} />

          <Text style={s.label}>Monthly Salary (₹) *</Text>
          <View style={s.salaryRow}>
            <Text style={s.rupee}>₹</Text>
            <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. 15000" placeholderTextColor={TEXT_LIGHT} value={salary} onChangeText={setSalary} keyboardType="numeric" />
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>Job Type</Text>
          <View style={s.typeRow}>
            {JOB_TYPES.map(t => (
              <TouchableOpacity key={t.id} style={[s.typeChip, jobType === t.id && s.typeChipOn]} onPress={() => setJobType(t.id)}>
                <Text style={[s.typeChipTxt, jobType === t.id && s.typeChipTxtOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Location *</Text>
          <View style={s.fieldRow}>
            <Text style={s.fieldIcon}>📍</Text>
            <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder="e.g. Indore, MP" placeholderTextColor={TEXT_LIGHT} value={location} onChangeText={setLoc} />
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>Job Description</Text>
          <TextInput style={[s.input, s.textarea]} placeholder="Describe the role, requirements, benefits…" placeholderTextColor={TEXT_LIGHT} value={desc} onChangeText={setDesc} multiline numberOfLines={4} />

          <TouchableOpacity style={[s.postBtn, posting && { opacity: 0.7 }]} onPress={postJob} disabled={posting}>
            {posting ? <ActivityIndicator color="#fff" /> : <Text style={s.postBtnTxt}>Post Job Now →</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── EMPLOYER DASHBOARD ──
  const stats = [
    { label: 'Active Jobs', val: dashData?.activeJobs ?? '—', icon: '💼' },
    { label: 'Total Applicants', val: dashData?.totalApplicants ?? '—', icon: '👥' },
    { label: 'Shortlisted', val: dashData?.shortlisted ?? '—', icon: '✅' },
    { label: 'Job Views', val: dashData?.views ?? '—', icon: '👁️' },
  ];
  const jobs: any[] = dashData?.jobs || [];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top bar */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Dashboard</Text>
          <Text style={s.headerSub}>{dashData?.businessName || 'Your Business'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.dash} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <Text style={s.greeting}>Good morning! 👋</Text>
        <Text style={s.greetingSub}>Let's hire the right people today.</Text>

        {/* Post a Job banner */}
        <TouchableOpacity style={s.postBanner} onPress={() => setView('post')} activeOpacity={0.85}>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>Post a Job</Text>
            <Text style={s.bannerSub}>Get qualified applicants in minutes.</Text>
          </View>
          <View style={s.bannerBtn}>
            <Text style={s.bannerBtnTxt}>+ Post a Job</Text>
          </View>
        </TouchableOpacity>

        {/* Stats grid */}
        <View style={s.statsGrid}>
          {stats.map(st => (
            <TouchableOpacity key={st.label} style={s.statCard} onPress={() => router.push('/applicants')} activeOpacity={0.75}>
              <View style={s.statTop}>
                <Text style={s.statIcon}>{st.icon}</Text>
                <Text style={s.statVal}>{st.val}</Text>
              </View>
              <Text style={s.statLabel}>{st.label}</Text>
              <Text style={s.statLink}>View all ›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active jobs */}
        <View style={s.jobsSection}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Your Active Jobs</Text>
            <TouchableOpacity onPress={() => router.push('/applicants')}>
              <Text style={s.sectionLink}>View all jobs ›</Text>
            </TouchableOpacity>
          </View>

          {jobs.length === 0 ? (
            <View style={s.noJobs}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📭</Text>
              <Text style={s.noJobsTxt}>No jobs posted yet</Text>
              <TouchableOpacity style={s.noJobsBtn} onPress={() => setView('post')}>
                <Text style={s.noJobsBtnTxt}>Post your first job →</Text>
              </TouchableOpacity>
            </View>
          ) : jobs.map((j: any, i: number) => (
            <TouchableOpacity
              key={j.id || i}
              style={s.jobRow}
              onPress={() => router.push({ pathname: '/applicants', params: { jobId: j.id, jobTitle: j.title } })}
              activeOpacity={0.75}
            >
              <View style={s.jobAvatar}>
                <Text style={s.jobAvatarTxt}>{(j.title || 'J')[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.jobRowTitle}>{j.title}</Text>
                <Text style={s.jobRowMeta}>{j.jobType?.replace('_',' ')} · {j.locationName}</Text>
              </View>
              <View style={s.jobRowRight}>
                <Text style={s.jobApps}>{j._count?.applications ?? 0}</Text>
                <Text style={s.jobAppsLbl}>Applicants</Text>
                <View style={s.activeBadge}><Text style={s.activeBadgeTxt}>Active</Text></View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_GRAY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: TEXT },
  headerSub:   { fontSize: 12, color: TEXT_MID, marginTop: 1 },
  backBtn: { width: 32, alignItems: 'flex-start' },
  backIcon: { fontSize: 20, color: TEXT, fontWeight: '600' },

  /* Dashboard */
  dash: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 2 },
  greetingSub: { fontSize: 13, color: TEXT_MID, marginBottom: 16 },

  postBanner: {
    backgroundColor: GREEN, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16,
    shadowColor: GREEN, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  bannerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  bannerBtn:   { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  bannerBtnTxt: { fontSize: 13, fontWeight: '700', color: GREEN },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statIcon: { fontSize: 18 },
  statVal:  { fontSize: 22, fontWeight: '800', color: TEXT },
  statLabel: { fontSize: 11, color: TEXT_MID },
  statLink:  { fontSize: 11, color: GREEN, fontWeight: '600', marginTop: 4 },

  jobsSection: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  sectionLink:  { fontSize: 12, color: GREEN, fontWeight: '600' },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  jobAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: GREEN_LIGHT, alignItems: 'center', justifyContent: 'center' },
  jobAvatarTxt: { fontSize: 18, fontWeight: '800', color: GREEN },
  jobRowTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  jobRowMeta:  { fontSize: 11, color: TEXT_MID, marginTop: 2 },
  jobRowRight: { alignItems: 'flex-end' },
  jobApps: { fontSize: 16, fontWeight: '800', color: TEXT },
  jobAppsLbl: { fontSize: 11, color: TEXT_MID },
  activeBadge: { backgroundColor: GREEN_LIGHT, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  activeBadgeTxt: { fontSize: 10, fontWeight: '700', color: GREEN },
  noJobs: { alignItems: 'center', padding: 28 },
  noJobsTxt: { fontSize: 15, color: TEXT_MID, marginBottom: 12 },
  noJobsBtn: { backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  noJobsBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  /* Post form */
  form: { padding: 20, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 8 },
  input: {
    backgroundColor: BG_GRAY, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
    padding: 14, fontSize: 15, color: TEXT, marginBottom: 16,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
  rupee: { fontSize: 18, fontWeight: '700', color: TEXT_MID },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', backgroundColor: '#fff' },
  typeChipOn: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  typeChipTxt: { fontSize: 13, fontWeight: '600', color: TEXT_MID },
  typeChipTxtOn: { color: GREEN_DARK },
  fieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG_GRAY, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, marginBottom: 16 },
  fieldIcon: { fontSize: 16, paddingHorizontal: 12 },
  postBtn: {
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: GREEN, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  postBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 17 },

  /* Worker switch */
  switchTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 8 },
  switchSub: { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 20 },
  switchBtn: { marginTop: 24, backgroundColor: BLUE, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  switchBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
