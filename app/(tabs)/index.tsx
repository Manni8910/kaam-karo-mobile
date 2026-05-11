import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, PanResponder,
  Animated, ActivityIndicator, Modal, Dimensions, Platform,
  StatusBar, TextInput, FlatList, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GREEN    = '#08a63f';
const GREEN_DK = '#057a31';
const BLUE     = '#1457c8';
const INK      = '#06142f';
const TEXT     = '#17243d';
const MUTED    = '#667085';
const BG       = '#f8fbff';
const BORDER   = '#e2e8f0';
const RED      = '#e5484d';

const API_URL = 'https://kaam-backend-production.up.railway.app';
const { width: SW } = Dimensions.get('window');
const CARD_H = Math.round(Dimensions.get('window').height * 0.56);

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Indore', 'Jaipur',
  'Lucknow', 'Surat', 'Nagpur', 'Chandigarh', 'Bhopal',
  'Patna', 'Kochi', 'Visakhapatnam', 'Coimbatore', 'Guwahati',
  'Vadodara', 'Agra', 'Nashik', 'Meerut', 'Faridabad',
];

const DEMO_JOBS = [
  {
    id: '1', title: 'Chef', employer: { companyName: 'Aman Restaurant' },
    salaryMin: 18000, jobType: 'FULL_TIME', locationName: 'Delhi, NCR',
    distanceKm: 2.5, description: 'Looking for an experienced tandoor chef for our busy restaurant.',
    color: '#1a1a2e', hookText: 'Immediate joining. Meals provided.', isFastHire: true,
  },
  {
    id: '2', title: 'Cleaner', employer: { companyName: 'CleanPro Services' },
    salaryMin: 12000, jobType: 'FULL_TIME', locationName: 'Delhi, NCR',
    distanceKm: 1.2, description: 'Office cleaning work, 8am–2pm Monday to Saturday.',
    color: '#0d2137', hookText: 'Morning shift only. Stable work.', isFastHire: false,
  },
  {
    id: '3', title: 'Security Guard', employer: { companyName: 'SafeGuard Co.' },
    salaryMin: 15000, jobType: 'FULL_TIME', locationName: 'Delhi, NCR',
    distanceKm: 3.8, description: 'Night security for a commercial complex. Experience required.',
    color: '#1a1535', hookText: 'Uniform + PF provided.', isFastHire: false,
  },
  {
    id: '4', title: 'Delivery Partner', employer: { companyName: 'QuickDeliver' },
    salaryMin: 600, jobType: 'CONTRACT', locationName: 'Delhi, NCR',
    distanceKm: 0.8, description: 'Local area delivery, own bike required. Daily payout.',
    color: '#2e1a10', hookText: 'Daily payout. Flexible hours.', isFastHire: true,
  },
];

function cardColor(job: any) {
  if (job.color) return job.color;
  const colors = ['#1a1a2e', '#0d2137', '#1a1535', '#2e1a10', '#1a2e20', '#1a1a40'];
  let h = 0;
  for (let i = 0; i < (job.title || '').length; i++) h = job.title.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function fmtSalary(job: any) {
  if (!job.salaryMin) return null;
  return `₹${job.salaryMin.toLocaleString('en-IN')}${job.jobType === 'CONTRACT' ? '/day' : '/mo'}`;
}

export default function HomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [jobs, setJobs]             = useState<any[]>([]);
  const [idx, setIdx]               = useState(0);
  const [loading, setLoading]       = useState(true);
  const [seekerId, setSeekerId]     = useState<string | null>(null);
  const [userCity, setUserCity]     = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [matchModal, setMatchModal] = useState(false);
  const [matchData, setMatchData]   = useState<any>(null);
  const [cityModal, setCityModal]   = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Near Me' | 'Remote'>('All');
  const hasLoaded = useRef(false);

  const pan        = useRef(new Animated.ValueXY()).current;
  const matchScale = useRef(new Animated.Value(0)).current;
  const likeOp     = pan.x.interpolate({ inputRange: [0, 80],  outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOp     = pan.x.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const rotate     = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-8deg', '0deg', '8deg'] });

  useFocusEffect(useCallback(() => {
    AsyncStorage.multiGet(['userToken', 'userCity', 'profileCity', 'seekerProfileId'])
      .then(([[, token], [, city], [, pCity], [, sid]]) => {
        if (pCity) setProfileCity(pCity);
        const activeCity = city || pCity || '';
        setUserCity(activeCity);
        if (sid) setSeekerId(sid);
        if (!hasLoaded.current && token) {
          hasLoaded.current = true;
          loadJobs(token, activeCity);
          fetchProfile(token);
        }
      });
  }, []));

  const fetchProfile = async (token: string) => {
    try {
      const r = await fetch(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      const pid = d?.user?.seekerProfile?.id;
      if (pid) { setSeekerId(pid); AsyncStorage.setItem('seekerProfileId', pid); }
      const city = d?.user?.city || d?.user?.location;
      if (city) {
        setProfileCity(city);
        AsyncStorage.setItem('profileCity', city);
        const existing = await AsyncStorage.getItem('userCity');
        if (!existing) { setUserCity(city); AsyncStorage.setItem('userCity', city); }
      }
    } catch {}
  };

  const loadJobs = async (token?: string, cityOverride?: string) => {
    setLoading(true);
    try {
      const t    = token || await AsyncStorage.getItem('userToken') || '';
      const city = cityOverride !== undefined ? cityOverride : (await AsyncStorage.getItem('userCity') || '');
      const params = new URLSearchParams({ radius: 'all' });
      if (city) params.set('city', city);
      const res  = await fetch(`${API_URL}/api/jobs/deck?${params}`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      const list = data.jobs?.length ? data.jobs : DEMO_JOBS;
      setJobs(list); setIdx(0);
    } catch {
      setJobs(DEMO_JOBS); setIdx(0);
    } finally { setLoading(false); }
  };

  const swipe = async (dir: 'right' | 'left') => {
    const job = jobs[idx];
    if (!job) return;
    const action = dir === 'right' ? 'LIKE' : 'SKIP';
    Animated.timing(pan, { toValue: { x: dir === 'right' ? SW * 1.5 : -SW * 1.5, y: 0 }, duration: 280, useNativeDriver: false }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      setIdx(i => i + 1);
    });
    const sid = seekerId || await AsyncStorage.getItem('seekerProfileId');
    if (!sid || !job.id) return;
    try {
      const res = await fetch(`${API_URL}/api/swipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seekerId: sid, jobId: job.id, action }),
      });
      const d = await res.json();
      if (d.match && action === 'LIKE') setTimeout(() => showMatch(d.match), 350);
    } catch {}
  };

  const showMatch = (m: any) => {
    setMatchData(m); setMatchModal(true);
    matchScale.setValue(0);
    Animated.spring(matchScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > 80) swipe('right');
      else if (g.dx < -80) swipe('left');
      else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    },
  });

  const handleCitySelect = async (city: string) => {
    setUserCity(city);
    await AsyncStorage.setItem('userCity', city);
    setCityModal(false); setCitySearch('');
    setActiveFilter('Near Me');
    loadJobs(undefined, city);
  };

  const handleAllIndia = async () => {
    setUserCity('');
    await AsyncStorage.setItem('userCity', '');
    setCityModal(false); setCitySearch('');
    setActiveFilter('All');
    loadJobs(undefined, '');
  };

  const filteredCities = INDIAN_CITIES.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const job = jobs[idx];
  const nextJob = jobs[idx + 1];

  if (loading) {
    return (
      <View style={[s.splash, { backgroundColor: BG }]}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <ActivityIndicator color={GREEN} size="large" />
        <Text style={s.splashSub}>Finding jobs near you…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: Platform.OS === 'ios' ? insets.top + 10 : 44 }]}>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <Text style={s.iconBtnTxt}>☰</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Job Feed</Text>
          <Text style={s.headerSub}>Showing nearby options</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <Text style={s.iconBtnTxt}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* ── SEARCH + CITY ── */}
      <View style={s.searchRow}>
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search city"
            placeholderTextColor={MUTED}
            value={citySearch}
            onChangeText={setCitySearch}
            onFocus={() => setCityModal(true)}
          />
        </View>
        <TouchableOpacity style={s.useCityBtn} onPress={() => setCityModal(true)} activeOpacity={0.8}>
          <Text style={s.useCityBtnTxt}>+ Use City</Text>
        </TouchableOpacity>
      </View>

      {/* ── SELECTED CITY CHIP ── */}
      {userCity ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
          <View style={s.cityChip}>
            <Text style={s.cityChipTxt}>📍 {userCity}</Text>
            <TouchableOpacity onPress={handleAllIndia} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.cityChipX}>✕</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}

      {/* ── FILTER CHIPS ── */}
      <View style={s.filterRow}>
        {(['All', 'Near Me', 'Remote'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.filterChip, activeFilter === tab && s.filterChipOn]}
            onPress={() => {
              if (tab === 'All') handleAllIndia();
              else if (tab === 'Near Me') setCityModal(true);
              else { setActiveFilter('Remote'); loadJobs(undefined, ''); }
            }}
            activeOpacity={0.75}
          >
            <Text style={[s.filterChipTxt, activeFilter === tab && s.filterChipTxtOn]}>
              {tab === 'Near Me' && userCity ? userCity : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── FEED NOTICE ── */}
      <View style={s.feedNotice}>
        <Text style={s.feedNoticeTxt}>Showing nearby options.</Text>
      </View>

      {/* ── SWIPE STACK ── */}
      <View style={s.cardArea}>
        {/* Background card */}
        {nextJob && (
          <View style={[s.stackCard, { backgroundColor: cardColor(nextJob) }]} />
        )}

        {job ? (
          <Animated.View
            style={[s.card, { backgroundColor: cardColor(job), transform: [...pan.getTranslateTransform(), { rotate }] }]}
            {...panResponder.panHandlers}
          >
            {/* APPLY label */}
            <Animated.View style={[s.swipeLabel, s.swipeLabelApply, { opacity: likeOp }]}>
              <Text style={[s.swipeLabelTxt, { color: GREEN }]}>APPLY</Text>
            </Animated.View>
            {/* SKIP label */}
            <Animated.View style={[s.swipeLabel, s.swipeLabelSkip, { opacity: skipOp }]}>
              <Text style={[s.swipeLabelTxt, { color: RED }]}>SKIP</Text>
            </Animated.View>

            {/* job-hero */}
            <View style={s.jobHero}>
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
                style={StyleSheet.absoluteFill}
              />
              {/* employer badge */}
              <View style={s.employerBadge}>
                <View style={s.employerBadgeIcon}>
                  <Text style={{ fontSize: 14 }}>🏢</Text>
                </View>
                <Text style={s.employerBadgeName} numberOfLines={1}>
                  {job.employer?.companyName || 'Company'}
                </Text>
              </View>
              <Text style={s.jobTitle}>{job.title}</Text>
              <Text style={s.jobLocation}>📍 {job.locationName}</Text>
            </View>

            {/* job-meta */}
            <View style={s.jobMeta}>
              {fmtSalary(job) ? (
                <Text style={s.jobSalary}>{fmtSalary(job)}</Text>
              ) : null}
              {job.hookText ? (
                <Text style={s.jobHook}>{job.hookText}</Text>
              ) : null}
              <View style={s.trustLine}>
                <View style={s.verifiedPill}>
                  <Text style={s.verifiedPillTxt}>✓ Verified employer</Text>
                </View>
              </View>
              <View style={s.metaTags}>
                <View style={s.metaTag}>
                  <Text style={s.metaTagTxt}>{(job.jobType || 'FULL_TIME').replace('_', ' ')}</Text>
                </View>
                {job.distanceKm ? (
                  <View style={s.metaTag}>
                    <Text style={s.metaTagTxt}>{job.distanceKm} km away</Text>
                  </View>
                ) : null}
                {job.isFastHire ? (
                  <View style={[s.metaTag, s.metaTagFast]}>
                    <Text style={[s.metaTagTxt, { color: '#F59E0B' }]}>⚡ Fast Hire</Text>
                  </View>
                ) : null}
              </View>
              {job.description ? (
                <Text style={s.jobDesc} numberOfLines={2}>{job.description}</Text>
              ) : null}
            </View>
          </Animated.View>
        ) : (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 40 }}>📍</Text>
            <Text style={s.emptyTitle}>{userCity ? `No more jobs in ${userCity}` : 'All caught up!'}</Text>
            <Text style={s.emptySub}>
              {userCity
                ? 'Try a wider area to find more opportunities.'
                : 'New jobs are added daily. Check back soon!'}
            </Text>
            <TouchableOpacity style={s.reloadBtn} onPress={() => loadJobs()}>
              <Text style={s.reloadTxt}>Refresh Jobs</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── SWIPE BUTTONS ── */}
      {job ? (
        <View style={[s.actions, { paddingBottom: insets.bottom + 10 }]}>
          {/* X circle — red */}
          <TouchableOpacity style={s.skipCircle} onPress={() => swipe('left')} activeOpacity={0.8}>
            <Text style={s.skipCircleIcon}>✕</Text>
          </TouchableOpacity>

          {/* ♥ circle — green */}
          <TouchableOpacity onPress={() => swipe('right')} activeOpacity={0.85} style={s.likeCircleWrap}>
            <LinearGradient
              colors={['#08a63f', '#10bd52']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.likeCircle}
            >
              <Text style={s.likeCircleIcon}>♥</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── CITY PICKER MODAL ── */}
      <Modal visible={cityModal} transparent animationType="slide" onRequestClose={() => { setCityModal(false); setCitySearch(''); }}>
        <View style={s.cityModalOverlay}>
          <View style={s.cityModalSheet}>
            <View style={s.cityModalHeader}>
              <Text style={s.cityModalTitle}>Job Location</Text>
              <TouchableOpacity onPress={() => { setCityModal(false); setCitySearch(''); }} style={s.cityCloseBtn}>
                <Text style={s.cityCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {profileCity ? (
              <>
                <Text style={s.cityGroupLabel}>YOUR PROFILE LOCATION</Text>
                <TouchableOpacity style={[s.cityRow, userCity === profileCity && s.cityRowOn]} onPress={() => handleCitySelect(profileCity)} activeOpacity={0.75}>
                  <Text style={s.cityRowIcon}>🏠</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cityRowTxt, userCity === profileCity && s.cityRowTxtOn]}>{profileCity}</Text>
                    <Text style={s.cityRowSub}>Set during profile setup</Text>
                  </View>
                  {userCity === profileCity && <Text style={{ color: GREEN, fontWeight: '900' }}>✓</Text>}
                </TouchableOpacity>
              </>
            ) : null}

            <Text style={s.cityGroupLabel}>BROWSE WIDER</Text>
            <TouchableOpacity style={[s.cityRow, !userCity && s.cityRowOn]} onPress={handleAllIndia} activeOpacity={0.75}>
              <Text style={s.cityRowIcon}>🌏</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.cityRowTxt, !userCity && s.cityRowTxtOn]}>All India</Text>
                <Text style={s.cityRowSub}>See jobs from everywhere</Text>
              </View>
              {!userCity && <Text style={{ color: GREEN, fontWeight: '900' }}>✓</Text>}
            </TouchableOpacity>

            <Text style={s.cityGroupLabel}>SEARCH CITY</Text>
            <View style={s.citySearchWrap}>
              <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
              <TextInput
                style={s.citySearchInput}
                placeholder="Type a city name..."
                placeholderTextColor={MUTED}
                value={citySearch}
                onChangeText={setCitySearch}
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={filteredCities.filter(c => c !== profileCity)}
              keyExtractor={item => item}
              style={s.cityList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={[s.cityRow, item === userCity && s.cityRowOn]} onPress={() => handleCitySelect(item)} activeOpacity={0.7}>
                  <Text style={s.cityRowIcon}>📍</Text>
                  <Text style={[s.cityRowTxt, item === userCity && s.cityRowTxtOn]}>{item}</Text>
                  {item === userCity && <Text style={{ color: GREEN, fontWeight: '900' }}>✓</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
            />
          </View>
        </View>
      </Modal>

      {/* ── MATCH MODAL ── */}
      <Modal visible={matchModal} transparent animationType="fade">
        <View style={s.matchOverlay}>
          <Animated.View style={[s.matchCard, { transform: [{ scale: matchScale }] }]}>
            <Text style={{ fontSize: 52, marginBottom: 8 }}>🎊</Text>
            <Text style={s.matchTitle}>It's a Match!</Text>
            <Text style={s.matchSub}>You matched with</Text>
            <Text style={s.matchCompany}>{matchData?.job?.employer?.companyName || 'the employer'}</Text>
            <Text style={s.matchJob}>{matchData?.job?.title}</Text>
            <TouchableOpacity style={s.matchChatBtn} onPress={() => {
              setMatchModal(false);
              router.push({ pathname: '/chat', params: { matchId: matchData?.id } });
            }}>
              <Text style={s.matchChatTxt}>Message Now 💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.matchKeepBtn} onPress={() => setMatchModal(false)}>
              <Text style={s.matchKeepTxt}>Keep Swiping</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  splashSub: { fontSize: 14, color: MUTED, marginTop: 12 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: BG,
  },
  iconBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconBtnTxt: { fontSize: 20 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '800', color: INK },
  headerSub:    { fontSize: 11, color: MUTED, marginTop: 1 },

  /* Search row */
  searchRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, marginBottom: 8,
  },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 12, height: 44,
  },
  searchIcon:  { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: INK },
  useCityBtn: {
    height: 44, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(8,166,63,0.32)',
    alignItems: 'center', justifyContent: 'center',
  },
  useCityBtnTxt: { fontSize: 13, fontWeight: '700', color: GREEN_DK },

  /* City chip scroll */
  chipScroll:  { paddingHorizontal: 16, marginBottom: 8, flexGrow: 0 },
  cityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GREEN, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  cityChipTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  cityChipX:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },

  /* Filter chips */
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 6 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: BORDER,
  },
  filterChipOn:  { backgroundColor: '#eaf8ef', borderColor: 'rgba(8,166,63,0.45)' },
  filterChipTxt: { fontSize: 13, fontWeight: '700', color: MUTED },
  filterChipTxtOn: { color: GREEN_DK },

  /* Feed notice */
  feedNotice: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  feedNoticeTxt: { fontSize: 12, color: MUTED },

  /* Card area */
  cardArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16,
  },
  stackCard: {
    position: 'absolute',
    width: '100%', height: CARD_H,
    borderRadius: 24, overflow: 'hidden',
    transform: [{ scale: 0.95 }],
    opacity: 0.65,
  },
  card: {
    width: '100%', height: CARD_H,
    borderRadius: 24, overflow: 'hidden',
    position: 'absolute',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },

  /* Swipe labels */
  swipeLabel: {
    position: 'absolute', top: 24, zIndex: 10,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  swipeLabelApply: { right: 20, borderColor: GREEN, transform: [{ rotate: '-12deg' }] },
  swipeLabelSkip:  { left: 20,  borderColor: RED,   transform: [{ rotate: '12deg' }] },
  swipeLabelTxt:   { fontSize: 18, fontWeight: '900' },

  /* Job hero (dark gradient top portion) */
  jobHero: {
    flex: 1, padding: 16, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  employerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8,
  },
  employerBadgeIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  employerBadgeName: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  jobTitle:    { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 4 },
  jobLocation: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  /* Job meta (white bg bottom portion) */
  jobMeta: {
    backgroundColor: '#fff',
    padding: 14,
  },
  jobSalary: { fontSize: 20, fontWeight: '900', color: INK, marginBottom: 4 },
  jobHook:   { fontSize: 14, color: MUTED, marginBottom: 8 },
  trustLine: { flexDirection: 'row', marginBottom: 8 },
  verifiedPill: {
    backgroundColor: '#eaf8ef', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(8,166,63,0.3)',
  },
  verifiedPillTxt: { fontSize: 11, fontWeight: '700', color: GREEN_DK },
  metaTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  metaTag: {
    backgroundColor: '#f4f8ff', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: BORDER,
  },
  metaTagFast: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.4)' },
  metaTagTxt:  { fontSize: 11, color: MUTED, fontWeight: '600' },
  jobDesc:     { fontSize: 12, color: MUTED, lineHeight: 18 },

  /* Empty */
  emptyCard:  { backgroundColor: '#fff', borderWidth: 1.5, borderColor: BORDER, borderRadius: 22, padding: 28, alignItems: 'center', width: '100%' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: INK, marginTop: 10, textAlign: 'center' },
  emptySub:   { fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  reloadBtn:  { marginTop: 18, backgroundColor: GREEN, paddingHorizontal: 26, paddingVertical: 12, borderRadius: 22 },
  reloadTxt:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  /* Action buttons — circle style */
  actions: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 32, paddingTop: 10,
  },
  skipCircle: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: INK, shadowOpacity: 0.1, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  skipCircleIcon: { fontSize: 22, color: RED },
  likeCircleWrap: {
    width: 62, height: 62, borderRadius: 31, overflow: 'hidden',
    shadowColor: GREEN, shadowOpacity: 0.5, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  likeCircle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  likeCircleIcon: { fontSize: 26, color: '#fff' },

  /* City modal */
  cityModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  cityModalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingBottom: 40, maxHeight: '80%',
  },
  cityModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, marginBottom: 16,
  },
  cityModalTitle: { fontSize: 20, fontWeight: '900', color: INK },
  cityCloseBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  cityCloseTxt:    { fontSize: 16, color: INK, fontWeight: '700' },
  cityGroupLabel:  { fontSize: 11, fontWeight: '900', color: MUTED, letterSpacing: 1, marginHorizontal: 20, marginBottom: 6, marginTop: 8 },
  citySearchWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 10 },
  citySearchInput: { flex: 1, fontSize: 15, color: INK, fontWeight: '600' },
  cityList:        { paddingHorizontal: 20 },
  cityRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: BG },
  cityRowOn:       { backgroundColor: '#eaf8ef', borderWidth: 1, borderColor: 'rgba(8,166,63,0.3)' },
  cityRowIcon:     { fontSize: 14 },
  cityRowTxt:      { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT },
  cityRowTxtOn:    { color: GREEN_DK },
  cityRowSub:      { fontSize: 11, color: MUTED, marginTop: 1 },

  /* Match modal */
  matchOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  matchCard:    { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', width: '100%' },
  matchTitle:   { fontSize: 26, fontWeight: '900', color: INK, marginBottom: 6 },
  matchSub:     { fontSize: 14, color: MUTED },
  matchCompany: { fontSize: 16, fontWeight: '800', color: INK, marginTop: 4 },
  matchJob:     { fontSize: 14, color: GREEN, fontWeight: '700', marginBottom: 22 },
  matchChatBtn: {
    backgroundColor: GREEN, borderRadius: 14,
    paddingHorizontal: 30, paddingVertical: 14,
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  matchChatTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  matchKeepBtn: { paddingVertical: 12 },
  matchKeepTxt: { color: MUTED, fontWeight: '600', fontSize: 14 },
});
