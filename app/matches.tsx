import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://kaam-backend-production.up.railway.app';

export default function MatchesScreen() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useFocusEffect(useCallback(() => { fetchMatches(); }, []));

  const fetchMatches = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const seekerProfileId = await AsyncStorage.getItem('seekerProfileId');
      if (!seekerProfileId) { setLoading(false); setRefreshing(false); return; }
      const res = await fetch(`${API_URL}/api/swipes/matches/${seekerProfileId}`);
      const data = await res.json();
      setMatches(data.matches || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const lastMsg = (match: any) => {
    const m = match.messages?.[0];
    if (!m) return 'Tap to start chatting';
    return m.content.length > 40 ? m.content.slice(0, 40) + '...' : m.content;
  };

  const timeAgo = (iso: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#FF4F5A" /></View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
        {matches.length > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{matches.length}</Text></View>
        )}
      </View>

      {matches.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤝</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>Swipe right on jobs you like.{'\n'}Matches appear here instantly!</Text>
          <TouchableOpacity style={styles.swipeBtn} onPress={() => router.push('/')}>
            <Text style={styles.swipeBtnText}>Start Swiping →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMatches(true)} tintColor="#FF4F5A" />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({
                pathname: '/chat',
                params: {
                  matchId: item.id,
                  jobTitle: item.job?.title || 'Job',
                  companyName: item.job?.employer?.companyName || 'Company',
                },
              })}
              activeOpacity={0.75}
            >
              <View style={[styles.avatar, { backgroundColor: companyColor(item.job?.employer?.companyName) }]}>
                <Text style={styles.avatarText}>
                  {(item.job?.employer?.companyName || 'C')[0].toUpperCase()}
                </Text>
              </View>

              <View style={styles.info}>
                <View style={styles.infoTop}>
                  <Text style={styles.company} numberOfLines={1}>{item.job?.employer?.companyName || 'Company'}</Text>
                  <Text style={styles.time}>{timeAgo(item.matchedAt)}</Text>
                </View>
                <Text style={styles.jobTitle} numberOfLines={1}>{item.job?.title}</Text>
                <Text style={styles.lastMsg} numberOfLines={1}>{lastMsg(item)}</Text>
              </View>

              <View style={styles.arrow}>
                <Text style={styles.arrowText}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function companyColor(name: string = '') {
  const colors = ['#FF4F5A', '#6C5CE7', '#00B894', '#0984E3', '#E17055'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F2EF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1A1A1A' },
  badge: { backgroundColor: '#FF4F5A', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 22 },
  swipeBtn: { marginTop: 24, backgroundColor: '#FF4F5A', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24 },
  swipeBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 18, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  info: { flex: 1 },
  infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  company: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', flex: 1 },
  time: { fontSize: 11, color: '#bbb', marginLeft: 8 },
  jobTitle: { fontSize: 12, color: '#FF4F5A', fontWeight: '700', marginBottom: 3 },
  lastMsg: { fontSize: 13, color: '#999' },
  arrow: { paddingLeft: 8 },
  arrowText: { fontSize: 22, color: '#ddd', fontWeight: '300' },
});
