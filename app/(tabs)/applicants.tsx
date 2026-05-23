import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GREEN       = '#1E8A3C';
const GREEN_LIGHT = '#E8F5EE';
const GREEN_DARK  = '#166830';
const BLUE        = '#1B3FD8';
const BLUE_LIGHT  = '#EEF2FF';
const TEXT        = '#111827';
const TEXT_MID    = '#6B7280';
const TEXT_LIGHT  = '#9CA3AF';
const BORDER      = '#E5E7EB';
const BG_GRAY     = '#F9FAFB';
const ORANGE      = '#F59E0B';
const ORANGE_LIGHT= '#FFF7ED';
const RED         = '#EF4444';
const RED_LIGHT   = '#FEF2F2';



const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:     { bg: ORANGE_LIGHT, text: ORANGE,  label: '⏳ Pending' },
  SHORTLISTED: { bg: GREEN_LIGHT,  text: GREEN,   label: '✅ Shortlisted' },
  HIRED:       { bg: BLUE_LIGHT,   text: BLUE,    label: '🎊 Hired' },
  REJECTED:    { bg: RED_LIGHT,    text: RED,      label: '✗ Rejected' },
};

export default function ApplicantsScreen() {
  const router  = useRouter();
  const { jobId, jobTitle } = useLocalSearchParams<{ jobId?: string; jobTitle?: string }>();

  const [apps, setApps]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [tab, setTab]           = useState<'all' | 'pending' | 'shortlisted'>('all');

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      const { data: ep } = await supabase.from('employer_profiles').select('id').eq('user_id', session.user.id).maybeSingle();
      if (!ep) { setApps([]); return; }

      let query = supabase
        .from('applications')
        .select('*, jobs:job_id(id, title, salary, salary_type, city), worker_profiles:worker_id(full_name, city, skills, photo_url)')
        .eq('employer_id', ep.id)
        .neq('status', 'skipped')
        .order('created_at', { ascending: false });
      if (jobId) query = query.eq('job_id', jobId);

      const { data: rows } = await query;
      setApps((rows || []).map((r: any) => ({
        id: r.id,
        status: r.status,
        job: { id: r.jobs?.id, title: r.jobs?.title, salaryMin: r.jobs?.salary, locationName: r.jobs?.city },
        worker: {
          name: r.worker_profiles?.full_name || 'Applicant',
          location: r.worker_profiles?.city || '',
          skills: r.worker_profiles?.skills || [],
        },
      })));
    } catch { setApps([]); }
    finally { setLoading(false); }
  };

  const updateStatus = async (appId: string, status: string) => {
    setUpdating(appId);
    try {
      const { error } = await supabase.from('applications').update({ status }).eq('id', appId);
      if (error) { Alert.alert('Error', error.message); return; }
      setApps(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    } catch { Alert.alert('Error', 'Could not update. Try again.'); }
    finally { setUpdating(null); }
  };

  const confirmAction = (appId: string, action: string, label: string) => {
    Alert.alert(label, `Are you sure you want to ${label.toLowerCase()} this applicant?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: () => updateStatus(appId, action) },
    ]);
  };

  const filtered = tab === 'all'
    ? apps
    : tab === 'pending'
    ? apps.filter(a => a.status === 'PENDING')
    : apps.filter(a => a.status === 'SHORTLISTED');

  const counts = {
    all:        apps.length,
    pending:    apps.filter(a => a.status === 'PENDING').length,
    shortlisted:apps.filter(a => a.status === 'SHORTLISTED').length,
  };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color={GREEN} size="large" />
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{jobTitle ? `${jobTitle}` : 'All Applicants'}</Text>
          <Text style={s.headerSub}>{apps.length} total applicant{apps.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {([
          { key: 'all',         label: `All (${counts.all})` },
          { key: 'pending',     label: `Pending (${counts.pending})` },
          { key: 'shortlisted', label: `Shortlisted (${counts.shortlisted})` },
        ] as const).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabBtn, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
            <Text style={s.emptyTitle}>No applicants yet</Text>
            <Text style={s.emptySub}>Share your job post to attract candidates</Text>
          </View>
        }
        renderItem={({ item }) => {
          const st     = STATUS_MAP[item.status] || STATUS_MAP.PENDING;
          const seeker = item.seekerProfile || item.worker || {};
          const name   = [seeker.firstName, seeker.lastName].filter(Boolean).join(' ') || 'Worker';
          const loc    = seeker.locationName || item.job?.locationName || '—';
          const skills = seeker.skills?.map((s: any) => s.name || s).join(', ') || '—';
          const isUpdating = updating === item.id;

          return (
            <View style={s.card}>
              {/* Top row */}
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.workerName}>{name}</Text>
                  {item.job?.title && (
                    <Text style={s.jobTag}>💼 {item.job.title}</Text>
                  )}
                  <View style={s.metaRow}>
                    <Text style={s.meta}>📍 {loc}</Text>
                  </View>
                  {skills !== '—' && <Text style={s.skills} numberOfLines={1}>🔧 {skills}</Text>}
                </View>
                <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusTxt, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>

              {/* Applied at */}
              {item.createdAt && (
                <Text style={s.appliedAt}>
                  Applied {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              )}

              {/* Action buttons */}
              {item.status === 'PENDING' && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.rejectBtn, isUpdating && { opacity: 0.5 }]}
                    onPress={() => confirmAction(item.id, 'REJECTED', 'Reject')}
                    disabled={!!updating}
                  >
                    {isUpdating ? <ActivityIndicator color={RED} size="small" /> : <Text style={s.rejectTxt}>✗ Reject</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.shortlistBtn, isUpdating && { opacity: 0.5 }]}
                    onPress={() => confirmAction(item.id, 'SHORTLISTED', 'Shortlist')}
                    disabled={!!updating}
                  >
                    {isUpdating ? <ActivityIndicator color={GREEN} size="small" /> : <Text style={s.shortlistTxt}>✅ Shortlist</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.hireBtn, isUpdating && { opacity: 0.5 }]}
                    onPress={() => confirmAction(item.id, 'HIRED', 'Hire')}
                    disabled={!!updating}
                  >
                    {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.hireTxt}>🎊 Hire</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {item.status === 'SHORTLISTED' && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.rejectBtn, isUpdating && { opacity: 0.5 }]}
                    onPress={() => confirmAction(item.id, 'REJECTED', 'Reject')}
                    disabled={!!updating}
                  >
                    <Text style={s.rejectTxt}>✗ Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.chatBtn, isUpdating && { opacity: 0.5 }]}
                    onPress={() => router.push({ pathname: '/chat', params: { matchId: item.id, jobTitle: item.job?.title, companyName: seeker.firstName } })}
                    disabled={!!updating}
                  >
                    <Text style={s.chatTxt}>💬 Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.hireBtn, isUpdating && { opacity: 0.5 }]}
                    onPress={() => confirmAction(item.id, 'HIRED', 'Hire')}
                    disabled={!!updating}
                  >
                    {isUpdating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.hireTxt}>🎊 Hire</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {item.status === 'HIRED' && (
                <View style={s.hiredBanner}>
                  <Text style={s.hiredBannerTxt}>🎊 Hired — Welcome to the team!</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG_GRAY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn:    { width: 32, alignItems: 'flex-start' },
  backIcon:   { fontSize: 20, color: TEXT, fontWeight: '600' },
  headerTitle:{ fontSize: 20, fontWeight: '900', color: TEXT },
  headerSub:  { fontSize: 12, color: TEXT_MID, marginTop: 1 },

  tabRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  tabBtn:      { paddingHorizontal: 4, paddingVertical: 13, marginRight: 18 },
  tabActive:   { borderBottomWidth: 2.5, borderBottomColor: GREEN },
  tabTxt:      { fontSize: 13, fontWeight: '600', color: TEXT_LIGHT },
  tabTxtActive:{ color: GREEN, fontWeight: '700' },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: BORDER,
  },
  cardTop:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  avatar:   { width: 48, height: 48, borderRadius: 14, backgroundColor: GREEN_LIGHT, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:{ fontSize: 22, fontWeight: '900', color: GREEN },

  workerName: { fontSize: 15, fontWeight: '800', color: TEXT },
  jobTag:     { fontSize: 12, color: BLUE, fontWeight: '600', marginTop: 2 },
  metaRow:    { flexDirection: 'row', gap: 10, marginTop: 3 },
  meta:       { fontSize: 12, color: TEXT_LIGHT },
  skills:     { fontSize: 12, color: TEXT_MID, marginTop: 2 },

  statusBadge:{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  statusTxt:  { fontSize: 11, fontWeight: '700' },

  appliedAt:  { fontSize: 11, color: TEXT_LIGHT, marginBottom: 12 },

  actions: { flexDirection: 'row', gap: 8 },

  rejectBtn:   { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: RED, alignItems: 'center' },
  rejectTxt:   { fontSize: 13, fontWeight: '700', color: RED },

  shortlistBtn:{ flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: GREEN, alignItems: 'center' },
  shortlistTxt:{ fontSize: 13, fontWeight: '700', color: GREEN },

  hireBtn:  { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: GREEN, alignItems: 'center' },
  hireTxt:  { fontSize: 13, fontWeight: '700', color: '#fff' },

  chatBtn:  { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: BLUE_LIGHT, alignItems: 'center' },
  chatTxt:  { fontSize: 13, fontWeight: '700', color: BLUE },

  hiredBanner: { backgroundColor: BLUE_LIGHT, borderRadius: 10, padding: 10, alignItems: 'center' },
  hiredBannerTxt: { fontSize: 13, fontWeight: '700', color: BLUE },

  empty:      { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  emptySub:   { fontSize: 14, color: TEXT_MID, marginTop: 6, textAlign: 'center' },
});
