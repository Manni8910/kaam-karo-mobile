import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, PanResponder,
  Animated, ActivityIndicator, Modal, Dimensions, Image, Platform, ScrollView, TextInput
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

type Radius = 'city' | 'state' | 'all';

const CATEGORIES = [
  { key: 'ALL',        label: '🔥 All' },
  { key: 'FULL_TIME',  label: '💼 Full Time' },
  { key: 'PART_TIME',  label: '⏰ Part Time' },
  { key: 'CONTRACT',   label: '📋 Contract' },
  { key: 'INTERNSHIP', label: '🎓 Internship' },
];

const API_URL = 'https://kaam-backend-production.up.railway.app';
const { width: SW } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [lang, setLang] = useState('en');
  const [seekerProfileId, setSeekerProfileId] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [matchModal, setMatchModal] = useState(false);
  const [matchedData, setMatchedData] = useState<any>(null);
  const [swipeLabel, setSwipeLabel] = useState<{ text: string; type: 'like' | 'skip' } | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userState, setUserState] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [radius, setRadius] = useState<Radius>('all');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterState, setFilterState] = useState<string>('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [searchActive, setSearchActive] = useState(false);
  const searchTimer = useRef<any>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const matchScale = useRef(new Animated.Value(0)).current;

  const t = (en: string, hi: string) => lang === 'hi' ? hi : en;

  const hasLoadedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.multiGet(['userToken', 'hasSeenWelcome']).then(([[, token], [, seenWelcome]]) => {
        if (!token) {
          setChecking(false);
          // First-time users → welcome/role selection; returning users → login
          router.replace(seenWelcome ? '/login' : '/welcome');
          return;
        }
        setUserToken(token);
        setChecking(false);
        if (!hasLoadedRef.current) {
          hasLoadedRef.current = true;
          setLoading(true);
          loadJobs();
        }
        // background profile fetch
        fetch(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(async data => {
            const pid = data?.user?.seekerProfile?.id || null;
            if (pid) { setSeekerProfileId(pid); await AsyncStorage.setItem('seekerProfileId', pid); }
          })
          .catch(() => {});
      });
      if (Platform.OS !== 'web') getLocation();
    }, [])
  );

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const savedCity = await AsyncStorage.getItem('userCity');
        const savedState = await AsyncStorage.getItem('userState');
        if (savedCity) setUserCity(savedCity);
        if (savedState) setUserState(savedState);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const city = place?.city || place?.subregion || null;
      const state = place?.region || null;
      if (city) { setUserCity(city); setFilterCity(city); await AsyncStorage.setItem('userCity', city); }
      if (state) { setUserState(state); setFilterState(state); await AsyncStorage.setItem('userState', state); }
    } catch {
      const savedCity = await AsyncStorage.getItem('userCity');
      const savedState = await AsyncStorage.getItem('userState');
      if (savedCity) { setUserCity(savedCity); setFilterCity(savedCity); }
      if (savedState) { setUserState(savedState); setFilterState(savedState); }
    }
  };

  const sortJobsByLocation = (jobList: any[], city: string | null) => {
    if (!city) return jobList;
    const cityLower = city.toLowerCase();
    // Jobs in user's city first, then rest
    const nearby = jobList.filter(j => j.locationName?.toLowerCase().includes(cityLower));
    const rest = jobList.filter(j => !j.locationName?.toLowerCase().includes(cityLower));
    return [...nearby, ...rest];
  };

  const loadJobs = (overrideRadius?: Radius, overrideCity?: string, overrideState?: string, overrideSearch?: string, overrideCategory?: string) => {
    setLoadError(false);
    const r = overrideRadius ?? radius;
    const c = overrideCity ?? filterCity;
    const s = overrideState ?? filterState;
    const q = overrideSearch ?? search;
    const cat = overrideCategory ?? category;

    const params = new URLSearchParams({ radius: r });
    if (c) params.set('city', c);
    if (s) params.set('state', s);
    if (q.trim()) params.set('search', q.trim());
    if (cat !== 'ALL') params.set('category', cat);

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 5000);
    const fallbackTimer = setTimeout(() => { setLoading(false); setLoadError(true); }, 5500);

    fetch(`${API_URL}/api/jobs/deck?${params.toString()}`, { signal: controller.signal })
      .then(r => r.json())
      .then(async data => {
        const city = c || await AsyncStorage.getItem('userCity');
        const sorted = sortJobsByLocation(data.jobs || [], city);
        setAllJobs(sorted);
        setJobs(sorted);
        setIndex(0);
        setHistory([]);
        setLoading(false);
      })
      .catch(() => { setLoading(false); setLoadError(true); })
      .finally(() => { clearTimeout(abortTimer); clearTimeout(fallbackTimer); });
  };

  const showMatchModal = (match: any) => {
    setMatchedData(match);
    setMatchModal(true);
    matchScale.setValue(0);
    Animated.spring(matchScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const handleSwipe = async (action: 'LIKE' | 'SKIP' | 'SUPER_LIKE') => {
    const job = jobs[index];
    if (!job) return;

    setHistory(prev => [...prev, { job, index }]);
    setSwipeLabel(action === 'SKIP' ? { text: t('Nope', 'नहीं'), type: 'skip' } : { text: action === 'SUPER_LIKE' ? '★ Super' : t('Applied!', 'हाँ!'), type: 'like' });

    Animated.timing(pan, {
      toValue: { x: action === 'SKIP' ? -SW * 1.5 : SW * 1.5, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      setSwipeLabel(null);
      setIndex(i => i + 1);
    });

    const sid = seekerProfileId || await AsyncStorage.getItem('seekerProfileId');
    if (!sid || !job?.id) return;

    try {
      const res = await fetch(`${API_URL}/api/swipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seekerId: sid, jobId: job.id, action }),
      });
      const data = await res.json();
      if (data.match && (action === 'LIKE' || action === 'SUPER_LIKE')) {
        setTimeout(() => showMatchModal(data.match), 350);
      }
    } catch {}
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setIndex(prev.index);
    pan.setValue({ x: 0, y: 0 });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 80) {
        handleSwipe('LIKE');
      } else if (gesture.dx < -80) {
        handleSwipe('SKIP');
      } else {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    },
  });

  const job = jobs[index];
  const rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-12deg', '0deg', '12deg'] });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOpacity = pan.x.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  if (checking) return (
    <View style={styles.splash}>
      <Text style={styles.splashLogo}>KaaM</Text>
      <ActivityIndicator size="large" color="#FF4F5A" style={{ marginTop: 32 }} />
    </View>
  );

  if (loading) return (
    <View style={styles.splash}>
      <Text style={styles.splashLogo}>KaaM</Text>
      <ActivityIndicator size="large" color="#FF4F5A" style={{ marginTop: 32 }} />
      <Text style={styles.splashSub}>{t('Finding jobs near you...', 'नौकरियां खोज रहे हैं...')}</Text>
    </View>
  );

  if (loadError) return (
    <View style={styles.splash}>
      <Text style={styles.splashLogo}>KaaM</Text>
      <Text style={styles.splashError}>{t('Could not connect to server', 'सर्वर से कनेक्ट नहीं हो पाया')}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadJobs(); }}>
        <Text style={styles.retryText}>{t('Retry', 'फिर कोशिश करें')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>KaaM</Text>
          <Text style={styles.subtitle}>
            {userCity ? `📍 ${userCity}` : t('Swipe Karo. KaaM Pao.', 'स्वाइप करो। काम पाओ।')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setLang(lang === 'en' ? 'hi' : 'en')}>
            <Text style={styles.iconBtnText}>{lang === 'en' ? 'हिं' : 'EN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/profile')}>
            <Text style={styles.iconBtnText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('Search jobs... e.g. Driver, Cook', 'नौकरी खोजें... जैसे ड्राइवर, कुक')}
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={v => {
              setSearch(v);
              clearTimeout(searchTimer.current);
              searchTimer.current = setTimeout(() => {
                setLoading(true);
                loadJobs(undefined, undefined, undefined, v, undefined);
              }, 500);
            }}
            returnKeyType="search"
            onSubmitEditing={() => { setLoading(true); loadJobs(); }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearch('');
              setLoading(true);
              loadJobs(undefined, undefined, undefined, '', undefined);
            }}>
              <Text style={{ fontSize: 16, color: '#bbb', paddingHorizontal: 8 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar} contentContainerStyle={styles.catBarContent}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.catChip, category === cat.key && styles.catChipActive]}
            onPress={() => {
              setCategory(cat.key);
              setLoading(true);
              loadJobs(undefined, undefined, undefined, undefined, cat.key);
            }}
          >
            <Text style={[styles.catChipText, category === cat.key && styles.catChipTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Location Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.locationBtn, radius !== 'all' && styles.locationBtnActive]}
          onPress={() => setShowLocationModal(true)}
        >
          <Text style={styles.locationBtnIcon}>📍</Text>
          <Text style={[styles.locationBtnText, radius !== 'all' && styles.locationBtnTextActive]} numberOfLines={1}>
            {radius === 'all'
              ? t('All India', 'पूरा भारत')
              : radius === 'city' && filterCity
              ? filterCity
              : filterState || t('My State', 'मेरा राज्य')}
          </Text>
          {radius !== 'all' && <Text style={styles.locationBtnClose} onPress={(e) => {
            e.stopPropagation();
            setRadius('all');
            setLoading(true);
            loadJobs('all');
          }}>✕</Text>}
          <Text style={styles.locationBtnChevron}>›</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingLeft: 8 }}>
          {[
            { key: 'all', label: t('All India', 'सभी') },
            { key: 'state', label: filterState || t('My State', 'राज्य') },
            { key: 'city', label: filterCity || t('My City', 'शहर') },
          ].map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterChip, radius === opt.key && styles.filterChipActive]}
              onPress={() => {
                if (opt.key === 'city' && !filterCity) { setShowLocationModal(true); return; }
                if (opt.key === 'state' && !filterState) { setShowLocationModal(true); return; }
                setRadius(opt.key as Radius);
                setLoading(true);
                loadJobs(opt.key as Radius);
              }}
            >
              <Text style={[styles.filterChipText, radius === opt.key && styles.filterChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Location Filter Modal */}
      <Modal visible={showLocationModal} transparent animationType="slide">
        <View style={styles.locOverlay}>
          <View style={styles.locSheet}>
            <View style={styles.locHandle} />
            <Text style={styles.locTitle}>📍 {t('Set Job Location', 'नौकरी की जगह चुनें')}</Text>
            <Text style={styles.locSub}>{t('See jobs near you or in your state', 'अपने शहर या राज्य की नौकरियां देखें')}</Text>

            <Text style={styles.locLabel}>{t('City / Area', 'शहर / इलाका')}</Text>
            <TextInput
              style={styles.locInput}
              placeholder={t('e.g. Mumbai, Delhi, Pune', 'जैसे मुंबई, दिल्ली, पुणे')}
              placeholderTextColor="#bbb"
              value={filterCity}
              onChangeText={setFilterCity}
            />

            <Text style={styles.locLabel}>{t('State', 'राज्य')}</Text>
            <TextInput
              style={styles.locInput}
              placeholder={t('e.g. Maharashtra, Karnataka', 'जैसे महाराष्ट्र, कर्नाटक')}
              placeholderTextColor="#bbb"
              value={filterState}
              onChangeText={setFilterState}
            />

            <Text style={styles.locLabel}>{t('Show me jobs in...', 'मुझे दिखाएं...')}</Text>
            <View style={styles.radiusRow}>
              {[
                { key: 'city',  icon: '🏘️', label: t('My City',  'मेरा शहर'),  sub: t('Closest jobs first', 'सबसे पास') },
                { key: 'state', icon: '🗺️', label: t('My State', 'मेरा राज्य'), sub: t('All jobs in my state', 'पूरे राज्य में') },
                { key: 'all',   icon: '🇮🇳', label: t('All India', 'पूरा भारत'),  sub: t('No location filter', 'कोई फिल्टर नहीं') },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.radiusCard, radius === opt.key && styles.radiusCardActive]}
                  onPress={() => setRadius(opt.key as Radius)}
                >
                  <Text style={styles.radiusIcon}>{opt.icon}</Text>
                  <Text style={[styles.radiusLabel, radius === opt.key && styles.radiusLabelActive]}>{opt.label}</Text>
                  <Text style={styles.radiusSub}>{opt.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.locApplyBtn}
              onPress={() => {
                setShowLocationModal(false);
                setLoading(true);
                loadJobs(radius, filterCity, filterState);
              }}
            >
              <Text style={styles.locApplyText}>{t('Apply Filter', 'फिल्टर लगाएं')} →</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.locCancelBtn} onPress={() => setShowLocationModal(false)}>
              <Text style={styles.locCancelText}>{t('Cancel', 'रद्द करें')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Progress */}
      {jobs.length > 0 && (
        <Text style={styles.progress}>{index + 1 > jobs.length ? jobs.length : index + 1} / {jobs.length} {t('jobs', 'नौकरियां')}</Text>
      )}

      {/* Card Stack */}
      <View style={styles.cardArea}>
        {/* Next card shadow preview */}
        {jobs[index + 1] && (
          <View style={[styles.card, styles.cardBehind]}>
            <Text style={styles.jobTitleBehind}>{jobs[index + 1].title}</Text>
          </View>
        )}

        {job ? (
          <Animated.View
            style={[styles.card, { transform: [...pan.getTranslateTransform(), { rotate }] }]}
            {...panResponder.panHandlers}
          >
            {/* Like / Skip stamp */}
            <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
              <Text style={styles.stampText}>✓ {t('YES', 'हाँ')}</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampSkip, { opacity: skipOpacity }]}>
              <Text style={styles.stampText}>✕ {t('NOPE', 'नहीं')}</Text>
            </Animated.View>

            {/* Company banner */}
            <View style={styles.companyRow}>
              <View style={[styles.companyAvatar, { backgroundColor: jobColor(job.title) }]}>
                <Text style={styles.companyAvatarText}>{(job.employer?.companyName || 'C')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{job.employer?.companyName || 'Company'}</Text>
                <Text style={styles.companyLocation}>📍 {job.locationName || 'India'}</Text>
              </View>
              {job.isFastHire && (
                <View style={styles.fastBadge}>
                  <Text style={styles.fastText}>⚡ Fast Hire</Text>
                </View>
              )}
            </View>

            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobMeta}>
              {job.jobType?.replace('_', ' ')} · {job.isRemote ? t('Remote', 'घर से काम') : t('On-site', 'ऑफिस')}
            </Text>

            {/* Salary */}
            <View style={styles.salaryBox}>
              <Text style={styles.salaryIcon}>💰</Text>
              <View>
                <Text style={styles.salaryLabel}>{t('Monthly Salary', 'मासिक वेतन')}</Text>
                <Text style={styles.salary}>₹{job.salaryMin?.toLocaleString('en-IN')} – ₹{job.salaryMax?.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Skills */}
            {job.requiredSkills?.length > 0 && (
              <View style={styles.tagsRow}>
                {job.requiredSkills.slice(0, 4).map((s: string, i: number) => (
                  <View key={i} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
                ))}
              </View>
            )}

            {/* Perks */}
            {job.perks?.length > 0 && (
              <View style={styles.perksRow}>
                {job.perks.slice(0, 3).map((p: string, i: number) => (
                  <Text key={i} style={styles.perk}>✓ {p}</Text>
                ))}
              </View>
            )}

            <Text style={styles.swipeHint}>{t('← Skip  •  Apply →', '← छोड़ें  •  आवेदन →')}</Text>
          </Animated.View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 52 }}>🎉</Text>
            <Text style={styles.emptyTitle}>{t('All done!', 'सब देख लिया!')}</Text>
            <Text style={styles.emptySub}>{t('New jobs added daily. Check back tomorrow!', 'रोज नई नौकरियां आती हैं!')}</Text>
            <TouchableOpacity style={styles.reloadBtn} onPress={() => { setIndex(0); setHistory([]); }}>
              <Text style={styles.reloadText}>{t('See Again', 'फिर से देखें')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {job && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.undoBtn, history.length === 0 && { opacity: 0.3 }]}
            onPress={handleUndo}
            disabled={history.length === 0}
          >
            <Text style={styles.undoIcon}>↩</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.skipBtn]} onPress={() => handleSwipe('SKIP')}>
            <Text style={styles.skipIcon}>✕</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.applyBtn]} onPress={() => handleSwipe('LIKE')}>
            <Text style={styles.applyIcon}>✓</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.superBtn]} onPress={() => handleSwipe('SUPER_LIKE')}>
            <Text style={styles.superIcon}>★</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Match Modal */}
      <Modal visible={matchModal} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <Animated.View style={[styles.matchCard, { transform: [{ scale: matchScale }] }]}>
            <Text style={styles.matchEmoji}>🎊</Text>
            <Text style={styles.matchTitle}>{t("It's a Match!", 'मैच हो गया!')}</Text>
            <Text style={styles.matchSub}>
              {t('You matched with', 'आपका मैच हुआ')} {matchedData?.job?.employer?.companyName || 'the employer'}
            </Text>
            <Text style={styles.matchJob}>{matchedData?.job?.title}</Text>

            <TouchableOpacity
              style={styles.matchChatBtn}
              onPress={() => {
                setMatchModal(false);
                router.push({
                  pathname: '/chat',
                  params: {
                    matchId: matchedData?.id,
                    jobTitle: matchedData?.job?.title,
                    companyName: matchedData?.job?.employer?.companyName,
                  },
                });
              }}
            >
              <Text style={styles.matchChatText}>{t('Message Now', 'अभी बात करें')} 💬</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.matchKeepBtn} onPress={() => setMatchModal(false)}>
              <Text style={styles.matchKeepText}>{t('Keep Swiping', 'आगे देखें')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// Give each job a consistent color based on title
function jobColor(title: string) {
  const colors = ['#FF4F5A', '#6C5CE7', '#00B894', '#0984E3', '#E17055', '#6D4C41'];
  let hash = 0;
  for (let i = 0; i < (title || '').length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F2EF' },
  splash: { flex: 1, backgroundColor: '#F4F2EF', alignItems: 'center', justifyContent: 'center' },
  splashLogo: { fontSize: 40, fontWeight: '900', color: '#FF4F5A' },
  splashSub: { color: '#999', marginTop: 12, fontSize: 14 },
  splashError: { color: '#FF4F5A', marginTop: 20, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 20, backgroundColor: '#FF4F5A', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  retryText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8, backgroundColor: '#F4F2EF' },
  logo: { fontSize: 26, fontWeight: '900', color: '#FF4F5A', letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: '#999', marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  iconBtnText: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

  searchRow: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F4F2EF' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '500' },

  catBar: { maxHeight: 42, backgroundColor: '#F4F2EF' },
  catBarContent: { paddingHorizontal: 16, paddingVertical: 4, gap: 8, flexDirection: 'row' },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8E5E2' },
  catChipActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  catChipText: { fontSize: 12, fontWeight: '700', color: '#888' },
  catChipTextActive: { color: '#fff' },

  filterBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F4F2EF', gap: 6 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: '#E8E5E2', gap: 4, maxWidth: 140 },
  locationBtnActive: { borderColor: '#FF4F5A', backgroundColor: '#FFF5F5' },
  locationBtnIcon: { fontSize: 13 },
  locationBtnText: { fontSize: 12, fontWeight: '700', color: '#888', flex: 1 },
  locationBtnTextActive: { color: '#FF4F5A' },
  locationBtnClose: { fontSize: 10, color: '#FF4F5A', fontWeight: '900', paddingHorizontal: 2 },
  locationBtnChevron: { fontSize: 16, color: '#bbb', fontWeight: '700' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8E5E2' },
  filterChipActive: { backgroundColor: '#FF4F5A', borderColor: '#FF4F5A' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#888' },
  filterChipTextActive: { color: '#fff' },

  // Location modal
  locOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  locSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  locHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  locTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginBottom: 4 },
  locSub: { fontSize: 13, color: '#999', marginBottom: 20 },
  locLabel: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
  locInput: { backgroundColor: '#F4F2EF', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A', marginBottom: 4 },
  radiusRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  radiusCard: { flex: 1, backgroundColor: '#F4F2EF', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  radiusCardActive: { borderColor: '#FF4F5A', backgroundColor: '#FFF5F5' },
  radiusIcon: { fontSize: 24, marginBottom: 6 },
  radiusLabel: { fontSize: 12, fontWeight: '900', color: '#888', textAlign: 'center' },
  radiusLabelActive: { color: '#FF4F5A' },
  radiusSub: { fontSize: 10, color: '#bbb', textAlign: 'center', marginTop: 2 },
  locApplyBtn: { backgroundColor: '#FF4F5A', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20, shadowColor: '#FF4F5A', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  locApplyText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  locCancelBtn: { alignItems: 'center', paddingVertical: 14 },
  locCancelText: { color: '#999', fontWeight: '600', fontSize: 14 },

  progress: { textAlign: 'center', fontSize: 12, color: '#bbb', fontWeight: '600', marginBottom: 8 },

  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },

  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 24,
    padding: 22, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20,
    elevation: 8, position: 'absolute',
  },
  cardBehind: {
    position: 'relative', transform: [{ scale: 0.95 }], opacity: 0.6,
    marginBottom: -8, zIndex: -1,
  },
  jobTitleBehind: { fontSize: 18, fontWeight: '800', color: '#ccc', textAlign: 'center', paddingVertical: 20 },

  stamp: { position: 'absolute', top: 24, zIndex: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 3 },
  stampLike: { right: 20, borderColor: '#00B894', transform: [{ rotate: '15deg' }] },
  stampSkip: { left: 20, borderColor: '#FF4F5A', transform: [{ rotate: '-15deg' }] },
  stampText: { fontSize: 18, fontWeight: '900', color: '#1A1A1A' },

  companyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 12 },
  companyAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  companyAvatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  companyInfo: { flex: 1 },
  companyName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  companyLocation: { fontSize: 12, color: '#999', marginTop: 2 },
  fastBadge: { backgroundColor: '#FFF8E1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  fastText: { fontSize: 11, fontWeight: '700', color: '#F9A825' },

  jobTitle: { fontSize: 24, fontWeight: '900', color: '#1A1A1A', marginBottom: 4, lineHeight: 30 },
  jobMeta: { fontSize: 13, color: '#888', marginBottom: 16 },

  salaryBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, marginBottom: 14 },
  salaryIcon: { fontSize: 24 },
  salaryLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
  salary: { fontSize: 17, fontWeight: '800', color: '#00B894', marginTop: 2 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tag: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontSize: 12, fontWeight: '700', color: '#6C5CE7' },

  perksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  perk: { fontSize: 12, color: '#00B894', fontWeight: '600' },

  swipeHint: { fontSize: 11, color: '#ddd', textAlign: 'center', marginTop: 10 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 24, padding: 40, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: '#1A1A1A', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  reloadBtn: { marginTop: 20, backgroundColor: '#FF4F5A', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  reloadText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 20, paddingBottom: 28 },
  actionBtn: { alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  undoBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E0E0' },
  undoIcon: { fontSize: 18, color: '#999' },
  skipBtn: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff', borderWidth: 2, borderColor: '#FFD6D9' },
  skipIcon: { fontSize: 26, color: '#FF4F5A' },
  applyBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#1A1A1A' },
  applyIcon: { fontSize: 32, color: '#fff' },
  superBtn: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff', borderWidth: 2, borderColor: '#FFF0C0' },
  superIcon: { fontSize: 24, color: '#FFB800' },

  matchOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  matchCard: { backgroundColor: '#fff', borderRadius: 28, padding: 32, alignItems: 'center', width: '100%' },
  matchEmoji: { fontSize: 60, marginBottom: 12 },
  matchTitle: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 8 },
  matchSub: { fontSize: 14, color: '#666', textAlign: 'center' },
  matchJob: { fontSize: 16, fontWeight: '800', color: '#FF4F5A', marginTop: 4, marginBottom: 24 },
  matchChatBtn: { backgroundColor: '#1A1A1A', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 12 },
  matchChatText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  matchKeepBtn: { paddingVertical: 12 },
  matchKeepText: { color: '#999', fontWeight: '600', fontSize: 14 },
});
