import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GREEN       = '#1E8A3C';
const GREEN_LIGHT = '#E8F5EE';
const BLUE        = '#1B3FD8';
const TEXT        = '#111827';
const TEXT_MID    = '#6B7280';
const TEXT_LIGHT  = '#9CA3AF';
const BORDER      = '#E5E7EB';
const BG_GRAY     = '#F9FAFB';
const ORANGE      = '#F59E0B';
const RED         = '#EF4444';

const API_URL = 'https://kaam-backend-production.up.railway.app';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:     { bg: '#FFF7ED', text: ORANGE, label: '⏳ Applied' },
  SHORTLISTED: { bg: GREEN_LIGHT, text: GREEN, label: '✅ Shortlisted' },
  HIRED:       { bg: '#EEF2FF', text: BLUE, label: '🎊 Hired' },
  REJECTED:    { bg: '#FEF2F2', text: RED, label: '✗ Not selected' },
};

export default function MatchesScreen() {
  const router = useRouter();
  const [matches, setMatches]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [tab, setTab]           = useState<'applications' | 'matches'>('applications');

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async (refresh = false) => {
    if (refresh) setRefresh(true); else setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) { router.replace('/login'); return; }
      const res = await fetch(`${API_URL}/api/matches`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMatches(data.matches || []);
    } catch { setMatches([]); }
    finally { setLoading(false); setRefresh(false); }
  };

  const filtered = tab === 'matches'
    ? matches.filter(m => m.status === 'SHORTLISTED' || m.status === 'HIRED')
    : matches;

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
        <Text style={s.headerTitle}>Applications</Text>
        <Text style={s.headerSub}>{matches.length} total</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'applications' && s.tabActive]} onPress={() => setTab('applications')}>
          <Text style={[s.tabTxt, tab === 'applications' && s.tabTxtActive]}>All Applications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'matches' && s.tabActive]} onPress={() => setTab('matches')}>
          <Text style={[s.tabTxt, tab === 'matches' && s.tabTxtActive]}>
            Matches {matches.filter(m => m.status === 'SHORTLISTED' || m.status === 'HIRED').length > 0 ? `(${matches.filter(m => m.status === 'SHORTLISTED' || m.status === 'HIRED').length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[GREEN]} tintColor={GREEN} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
            <Text style={s.emptyTitle}>No applications yet</Text>
            <Text style={s.emptySub}>Start swiping to apply for jobs!</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/')}>
              <Text style={s.emptyBtnTxt}>Browse Jobs →</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const st = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING;
          const job = item.job || {};
          const canChat = item.status === 'SHORTLISTED' || item.status === 'HIRED';
          return (
            <View style={s.card}>
              {/* Job info */}
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{(job.title || 'J')[0]}</Text>
                </View>
                <View style={s.cardMid}>
                  <Text style={s.jobTitle} numberOfLines={1}>{job.title || 'Job'}</Text>
                  <Text style={s.company} numberOfLines={1}>{job.employer?.companyName || 'Company'}</Text>
                  {job.salaryMin && <Text style={s.pay}>₹{job.salaryMin.toLocaleString('en-IN')}/month</Text>}
                </View>
                <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[s.statusTxt, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>

              {/* Location */}
              {job.locationName && (
                <Text style={s.loc}>📍 {job.locationName}</Text>
              )}

              {/* Actions */}
              <View style={s.cardActions}>
                {canChat && (
                  <TouchableOpacity style={s.chatBtn} onPress={() => router.push({ pathname: '/chat', params: { matchId: item.id, jobTitle: job.title, companyName: job.employer?.companyName } })}>
                    <Text style={s.chatBtnTxt}>💬 Message</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'HIRED' && (
                  <TouchableOpacity style={s.hiredBadge}>
                    <Text style={s.hiredTxt}>🎊 You're Hired!</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'HIRED' && (
                  <TouchableOpacity
                    style={s.rateBtn}
                    onPress={() => router.push({ pathname: '/rating', params: { matchId: item.id, jobTitle: job.title, companyName: job.employer?.companyName } })}
                  >
                    <Text style={s.rateBtnTxt}>⭐ Rate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_GRAY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },

  header: {
    backgroundColor: '#fff', paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: TEXT },
  headerSub:   { fontSize: 13, color: TEXT_MID, marginTop: 2 },

  tabRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: BORDER },
  tabBtn: { paddingHorizontal: 4, paddingVertical: 14, marginRight: 24 },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: GREEN },
  tabTxt: { fontSize: 14, fontWeight: '600', color: TEXT_LIGHT },
  tabTxtActive: { color: GREEN, fontWeight: '700' },

  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: BORDER,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: GREEN_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 20, fontWeight: '800', color: GREEN },
  cardMid: { flex: 1 },
  jobTitle: { fontSize: 15, fontWeight: '800', color: TEXT },
  company:  { fontSize: 13, color: TEXT_MID, marginTop: 1 },
  pay:      { fontSize: 13, fontWeight: '700', color: GREEN, marginTop: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  loc: { fontSize: 12, color: TEXT_LIGHT, marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chatBtn: {
    backgroundColor: GREEN, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  chatBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hiredBadge: {
    backgroundColor: '#EEF2FF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  hiredTxt: { color: BLUE, fontWeight: '700', fontSize: 13 },
  rateBtn:  { backgroundColor: '#FFF7ED', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  rateBtnTxt: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  emptySub: { fontSize: 14, color: TEXT_MID, marginTop: 6, textAlign: 'center' },
  emptyBtn: { marginTop: 20, backgroundColor: GREEN, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 24 },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
