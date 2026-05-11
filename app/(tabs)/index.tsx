import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, PanResponder,
  Animated, ActivityIndicator, Modal, Dimensions, Platform,
  StatusBar, TextInput, FlatList, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GREEN    = '#1E8A3C';
const BLUE     = '#1B3FD8';
const TEXT     = '#111827';
const TEXT_MID = '#6B7280';
const RED      = '#EF4444';

const API_URL = 'https://kaam-backend-production.up.railway.app';
const { width: SW } = Dimensions.get('window');
const CARD_H = Math.round(Dimensions.get('window').height * 0.58);

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Indore', 'Jaipur',
  'Lucknow', 'Surat', 'Nagpur', 'Chandigarh', 'Bhopal',
  'Patna', 'Kochi', 'Visakhapatnam', 'Coimbatore', 'Guwahati',
  'Vadodara', 'Agra', 'Nashik', 'Meerut', 'Faridabad',
];

const DEMO_JOBS = [
  { id: '1', title: 'Chef', employer: { companyName: 'Aman Restaurant' }, salaryMin: 18000, jobType: 'FULL_TIME', locationName: 'Indore, MP', distanceKm: 2.5, description: 'Looking for experienced tandoor chef for our busy restaurant.', color: '#1a1a2e', img: '👨‍🍳', isFastHire: true },
  { id: '2', title: 'Cleaner', employer: { companyName: 'CleanPro Services' }, salaryMin: 12000, jobType: 'FULL_TIME', locationName: 'Indore, MP', distanceKm: 1.2, description: 'Office cleaning work, 8am–2pm Monday to Saturday.', color: '#1a2e20', img: '🧹', isFastHire: false },
  { id: '3', title: 'Security Guard', employer: { companyName: 'SafeGuard Co.' }, salaryMin: 15000, jobType: 'FULL_TIME', locationName: 'Indore, MP', distanceKm: 3.8, description: 'Night security for a commercial complex.', color: '#1a1a40', img: '💂', isFastHire: false },
  { id: '4', title: 'Delivery Partner', employer: { companyName: 'QuickDeliver' }, salaryMin: 600, jobType: 'CONTRACT', locationName: 'Indore, MP', distanceKm: 0.8, description: 'Local area delivery, own bike required.', color: '#2e1a10', img: '🛵', isFastHire: true },
];

function cardColor(job: any) {
  if (job.color) return job.color;
  const colors = ['#1a1a2e', '#1a2e20', '#1a1a40', '#2e1a10', '#0d2137', '#1a1535'];
  let h = 0;
  for (let i = 0; i < (job.title || '').length; i++) h = job.title.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function jobEmoji(title = '') {
  const t = title.toLowerCase();
  if (t.includes('chef') || t.includes('cook')) return '👨‍🍳';
  if (t.includes('clean')) return '🧹';
  if (t.includes('driver')) return '🚗';
  if (t.includes('security') || t.includes('guard')) return '💂';
  if (t.includes('delivery')) return '🛵';
  if (t.includes('helper')) return '🤝';
  if (t.includes('electric')) return '⚡';
  if (t.includes('teacher')) return '👩‍🏫';
  if (t.includes('account')) return '🧮';
  if (t.includes('design')) return '🖌️';
  return '🔍';
}

export default function HomeScreen() {
  const router = useRouter();

  const [jobs, setJobs]                   = useState<any[]>([]);
  const [idx, setIdx]                     = useState(0);
  const [history, setHistory]             = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [seekerId, setSeekerId]           = useState<string | null>(null);
  const [userCity, setUserCity]           = useState('');      // current filter
  const [profileCity, setProfileCity]     = useState('');      // from their profile
  const [matchModal, setMatchModal]       = useState(false);
  const [matchData, setMatchData]         = useState<any>(null);
  const [swipeLabel, setSwipeLabel]       = useState<'APPLY' | 'SKIP' | null>(null);
  const [cityModal, setCityModal]         = useState(false);
  const [citySearch, setCitySearch]       = useState('');
  const hasLoaded = useRef(false);

  const [showGuide, setShowGuide]   = useState(false);
  const [ranOut, setRanOut]         = useState(false);   // deck exhausted in this city
  const [widening, setWidening]     = useState(false);   // auto-loading wider area

  const pan        = useRef(new Animated.ValueXY()).current;
  const matchScale = useRef(new Animated.Value(0)).current;
  const guideAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;

  useFocusEffect(useCallback(() => {
    AsyncStorage.multiGet(['userToken', 'userCity', 'profileCity', 'seekerProfileId', 'hasSeenSwipeGuide'])
      .then(([[, token], [, city], [, pCity], [, sid], [, seenGuide]]) => {
        // Restore profile city
        if (pCity) setProfileCity(pCity);
        // Restore last-used filter (defaults to profile city on first load)
        const activeCity = city || pCity || '';
        setUserCity(activeCity);
        if (sid) setSeekerId(sid);
        if (!hasLoaded.current && token) {
          hasLoaded.current = true;
          loadJobs(token, activeCity);
          fetchProfile(token);
        }
        // Show swipe guide once for new users
        if (!seenGuide) {
          setTimeout(() => {
            setShowGuide(true);
            Animated.timing(guideAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
            setTimeout(() => dismissGuide(), 4000);
          }, 1200);
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
        // Only set as filter if no filter is already active
        const existing = await AsyncStorage.getItem('userCity');
        if (!existing) { setUserCity(city); AsyncStorage.setItem('userCity', city); }
      }
    } catch {}
  };

  const dismissGuide = () => {
    Animated.timing(guideAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => setShowGuide(false));
    AsyncStorage.setItem('hasSeenSwipeGuide', 'true');
  };

  const loadJobs = async (token?: string, cityOverride?: string, silent = false) => {
    if (!silent) setLoading(true);
    setRanOut(false);
    try {
      const t    = token || await AsyncStorage.getItem('userToken') || '';
      const city = cityOverride !== undefined ? cityOverride : (await AsyncStorage.getItem('userCity') || '');
      const params = new URLSearchParams({ radius: 'all' });
      if (city) params.set('city', city);
      const res  = await fetch(`${API_URL}/api/jobs/deck?${params}`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      const list = data.jobs?.length ? data.jobs : DEMO_JOBS;
      setJobs(list); setIdx(0); setHistory([]);
    } catch {
      setJobs(DEMO_JOBS); setIdx(0); setHistory([]);
    } finally { if (!silent) setLoading(false); setWidening(false); }
  };

  // Triggered when deck is exhausted — try loading broader area silently
  const widenSearch = () => {
    if (widening || !userCity) return; // already widening, or already on All India
    setWidening(true);
    // Start pulsing the location pill
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const swipe = async (dir: 'right' | 'left') => {
    const job = jobs[idx];
    if (!job) return;
    const action = dir === 'right' ? 'LIKE' : 'SKIP';
    setHistory(h => [...h, { job, idx }]);
    setSwipeLabel(dir === 'right' ? 'APPLY' : 'SKIP');
    Animated.timing(pan, { toValue: { x: dir === 'right' ? SW * 1.5 : -SW * 1.5, y: 0 }, duration: 280, useNativeDriver: false }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      setSwipeLabel(null);
      setIdx(i => {
        const next = i + 1;
        if (next >= jobs.length) {
          // Deck exhausted — trigger location nudge
          setRanOut(true);
          widenSearch();
        }
        return next;
      });
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

  const rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-10deg', '0deg', '10deg'] });
  const likeOp = pan.x.interpolate({ inputRange: [0, 80],  outputRange: [0, 1], extrapolate: 'clamp' });
  const skipOp = pan.x.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const filteredCities = INDIAN_CITIES.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const stopPulse = () => { pulseAnim.stopAnimation(); pulseAnim.setValue(1); };

  const handleCitySelect = async (city: string) => {
    setUserCity(city);
    setRanOut(false); stopPulse();
    await AsyncStorage.setItem('userCity', city);
    setCityModal(false);
    setCitySearch('');
    loadJobs(undefined, city);
  };

  const handleAllIndia = async () => {
    setUserCity('');
    setRanOut(false); stopPulse();
    await AsyncStorage.setItem('userCity', '');
    setCityModal(false);
    setCitySearch('');
    loadJobs(undefined, '');
  };

  const job = jobs[idx];

  if (loading) {
    return (
      <LinearGradient colors={['#1B3FD8', '#1a6b3c', '#1E8A3C']} locations={[0, 0.55, 1]} style={s.splash}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={s.splashLogoBox}>
          <View style={s.handle} />
          <View style={s.body}>
            <View style={s.kL} /><View style={s.kTR} /><View style={s.kBR} />
          </View>
        </View>
        <Text style={s.splashBrand}>KAAMKARO</Text>
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: 24 }} />
        <Text style={s.splashSub}>Finding jobs near you…</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1B3FD8', '#1a6b3c', '#1E8A3C']} locations={[0, 0.55, 1]} style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── HEADER ── */}
      <View style={s.header}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoMark}>
            <View style={s.handle} />
            <View style={s.body}>
              <View style={s.kL} /><View style={s.kTR} /><View style={s.kBR} />
            </View>
          </View>
          <View>
            <Text style={s.logoTxt}>KAAMKARO</Text>
            <Text style={s.logoSub}>SWIPE · DISCOVER · GET HIRED</Text>
          </View>
        </View>

        {/* Location pill */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[s.locPill, ranOut && s.locPillRanOut]}
            onPress={() => setCityModal(true)}
            activeOpacity={0.75}
          >
            <Text style={s.locPillIcon}>{userCity ? '📍' : '🌏'}</Text>
            <Text style={s.locPillTxt} numberOfLines={1}>{userCity || 'All India'}</Text>
            <Text style={s.locPillEdit}>{ranOut ? '⚠️' : '▾'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── STATS BAR ── */}
      <View style={s.statsBar}>
        <View style={s.statItem}>
          <Text style={s.statNum}>{jobs.length > 0 ? `${jobs.length}+` : '—'}</Text>
          <Text style={s.statLabel}> jobs live</Text>
        </View>
        <View style={s.statDot} />
        <View style={s.statItem}>
          <Text style={s.statNum}>8m</Text>
          <Text style={s.statLabel}> avg reply</Text>
        </View>
        <View style={s.statDot} />
        <View style={s.statItem}>
          <Text style={s.statNum}>Free</Text>
          <Text style={s.statLabel}> to apply</Text>
        </View>
      </View>

      {/* ── FILTER TABS ── */}
      <View style={s.filterRow}>
        {(['All', 'Near Me', 'Remote'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.filterTab, (tab === 'All' && !userCity && !jobs.some((j:any) => j.isRemote)) || (tab === 'Remote' && jobs[idx]?.isRemote) ? s.filterTabActive : tab === 'Near Me' && userCity ? s.filterTabActive : tab === 'All' && !userCity ? s.filterTabActive : null]}
            onPress={() => {
              if (tab === 'All') handleAllIndia();
              else if (tab === 'Near Me') setCityModal(true);
              else { loadJobs(undefined, '', false); }
            }}
            activeOpacity={0.75}
          >
            <Text style={[s.filterTabTxt, tab === 'Near Me' && userCity ? s.filterTabTxtActive : tab === 'All' && !userCity ? s.filterTabTxtActive : null]}>
              {tab === 'Near Me' ? (userCity || 'Near Me') : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CARD AREA ── */}
      <View style={s.cardArea}>
        {jobs[idx + 1] && (
          <View style={[s.card, s.cardBack, { backgroundColor: cardColor(jobs[idx + 1]) }]} />
        )}

        {job ? (
          <Animated.View
            style={[s.card, { backgroundColor: cardColor(job), transform: [...pan.getTranslateTransform(), { rotate }] }]}
            {...panResponder.panHandlers}
          >
            {/* APPLY stamp */}
            <Animated.View style={[s.stamp, s.stampApply, { opacity: likeOp }]}>
              <Text style={[s.stampTxt, { color: GREEN }]}>APPLY ✓</Text>
            </Animated.View>
            {/* SKIP stamp */}
            <Animated.View style={[s.stamp, s.stampSkip, { opacity: skipOp }]}>
              <Text style={[s.stampTxt, { color: RED }]}>SKIP ✗</Text>
            </Animated.View>

            {/* Company initial badge — top right */}
            <View style={s.companyBadge}>
              <Text style={s.companyBadgeTxt}>
                {(job.employer?.companyName || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Employer logo or KaamKaro fallback */}
            <View style={s.cardImg}>
              {job.employer?.logoUrl ? (
                <Image source={{ uri: job.employer.logoUrl }} style={s.companyLogoImg} />
              ) : (
                <View style={s.kaamFallback}>
                  {/* KaamKaro briefcase mark */}
                  <View style={s.kHandle} />
                  <View style={s.kBody}>
                    <View style={s.kKL} />
                    <View style={s.kKTR} />
                    <View style={s.kKBR} />
                  </View>
                  <Text style={s.kaamFallbackTxt}>KAAMKARO</Text>
                </View>
              )}
            </View>

            {/* Bottom gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={s.cardGradientOverlay}
              pointerEvents="none"
            />

            <View style={s.cardInfo}>
              {/* Salary pill */}
              {job.salaryMin ? (
                <View style={s.salaryPill}>
                  <Text style={s.salaryPillTxt}>
                    ₹{job.salaryMin.toLocaleString('en-IN')}{job.jobType === 'CONTRACT' ? ' / day' : ' / mo'}
                  </Text>
                </View>
              ) : null}

              <Text style={s.cardTitle}>{job.title}</Text>
              <Text style={s.cardCompany}>{job.employer?.companyName || 'Company'}</Text>

              <View style={s.tagsRow}>
                <View style={s.tag}>
                  <Text style={s.tagTxt}>🕐 {(job.jobType || 'FULL_TIME').replace('_', ' ')}</Text>
                </View>
                {job.locationName && (
                  <View style={s.tag}>
                    <Text style={s.tagTxt}>📍 {job.distanceKm ? `${job.distanceKm} km` : job.locationName}</Text>
                  </View>
                )}
                {job.isFastHire && (
                  <View style={[s.tag, { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: 'rgba(245,158,11,0.4)' }]}>
                    <Text style={[s.tagTxt, { color: '#F59E0B' }]}>⚡ Fast Hire</Text>
                  </View>
                )}
              </View>
              {job.description ? (
                <Text style={s.cardDesc} numberOfLines={2}>{job.description}</Text>
              ) : null}
            </View>
          </Animated.View>
        ) : (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 48 }}>📍</Text>
            <Text style={s.emptyTitle}>
              {userCity ? `No more jobs\nin ${userCity}` : 'All caught up!'}
            </Text>
            <Text style={s.emptySub}>
              {userCity
                ? 'You\'ve seen all jobs here. Try a wider area to find more opportunities.'
                : 'New jobs are added daily. Check back soon!'}
            </Text>

            {/* Expansion options — only when a city is active */}
            {userCity ? (
              <View style={s.emptyActions}>
                <TouchableOpacity style={s.expandBtn} onPress={handleAllIndia}>
                  <Text style={s.expandBtnIcon}>🌏</Text>
                  <View>
                    <Text style={s.expandBtnLabel}>See All India Jobs</Text>
                    <Text style={s.expandBtnSub}>Jobs from across the country</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={s.changeLocBtn} onPress={() => setCityModal(true)}>
                  <Text style={s.changeLocBtnIcon}>🏙️</Text>
                  <View>
                    <Text style={s.changeLocBtnLabel}>Try a Different City</Text>
                    <Text style={s.changeLocBtnSub}>Browse jobs elsewhere</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.reloadBtn} onPress={() => loadJobs()}>
                <Text style={s.reloadTxt}>Refresh Jobs</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── SWIPE GUIDE OVERLAY ── shows once for new users ── */}
        {showGuide && job && (
          <Animated.View style={[s.guideWrap, { opacity: guideAnim }]} pointerEvents="box-none">
            <TouchableOpacity style={s.guidePill} onPress={dismissGuide} activeOpacity={0.9}>
              {/* Left — Pass */}
              <View style={s.guideSide}>
                <Text style={s.guideArrow}>←</Text>
                <Text style={s.guidePassLbl}>PASS</Text>
              </View>
              {/* Centre divider */}
              <View style={s.guideDiv} />
              {/* Right — Apply */}
              <View style={s.guideSide}>
                <Text style={s.guideApplyLbl}>APPLY</Text>
                <Text style={s.guideArrow}>→</Text>
              </View>
            </TouchableOpacity>
            <Text style={s.guideTap}>tap to dismiss</Text>
          </Animated.View>
        )}
      </View>

      {/* ── ACTION BUTTONS — premium redesign ── */}
      {job && (
        <View style={s.actions}>
          {/* PASS button */}
          <TouchableOpacity style={s.passBtn} onPress={() => swipe('left')} activeOpacity={0.8}>
            <Text style={s.passIcon}>✕</Text>
            <Text style={s.passBtnLabel}>Pass</Text>
          </TouchableOpacity>

          {/* APPLY button */}
          <TouchableOpacity style={s.applyBtnWrap} onPress={() => swipe('right')} activeOpacity={0.85}>
            <LinearGradient
              colors={['#1E8A3C', '#2ECC71']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.applyBtnGradient}
            >
              <Text style={s.applyIcon}>♥</Text>
              <Text style={s.applyBtnLabel}>Apply</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ── CITY PICKER MODAL ── */}
      <Modal visible={cityModal} transparent animationType="slide" onRequestClose={() => { setCityModal(false); setCitySearch(''); }}>
        <View style={s.cityModalOverlay}>
          <LinearGradient colors={['#1B3FD8', '#1a6b3c', '#1E8A3C']} locations={[0, 0.55, 1]} style={s.cityModalSheet}>

            {/* Header */}
            <View style={s.cityModalHeader}>
              <Text style={s.cityModalTitle}>Job Location</Text>
              <TouchableOpacity onPress={() => { setCityModal(false); setCitySearch(''); }} style={s.cityCloseBtn}>
                <Text style={s.cityCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Profile location (pinned) */}
            {profileCity ? (
              <>
                <Text style={s.cityGroupLabel}>YOUR PROFILE LOCATION</Text>
                <TouchableOpacity
                  style={[s.cityRow, userCity === profileCity && s.cityRowActive]}
                  onPress={() => handleCitySelect(profileCity)}
                  activeOpacity={0.75}
                >
                  <Text style={s.cityRowIcon}>🏠</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cityRowTxt, userCity === profileCity && s.cityRowTxtActive]}>{profileCity}</Text>
                    <Text style={s.cityRowSub}>Set during your profile setup</Text>
                  </View>
                  {userCity === profileCity && <Text style={s.cityRowCheck}>✓</Text>}
                </TouchableOpacity>
              </>
            ) : null}

            {/* All India option */}
            <Text style={s.cityGroupLabel}>BROWSE WIDER</Text>
            <TouchableOpacity
              style={[s.cityRow, userCity === '' && s.cityRowActive]}
              onPress={handleAllIndia}
              activeOpacity={0.75}
            >
              <Text style={s.cityRowIcon}>🌏</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.cityRowTxt, userCity === '' && s.cityRowTxtActive]}>All India</Text>
                <Text style={s.cityRowSub}>See jobs from everywhere</Text>
              </View>
              {userCity === '' && <Text style={s.cityRowCheck}>✓</Text>}
            </TouchableOpacity>

            {/* Search other cities */}
            <Text style={s.cityGroupLabel}>SEARCH OTHER CITY</Text>
            <View style={s.citySearchWrap}>
              <Text style={s.citySearchIcon}>🔍</Text>
              <TextInput
                style={s.citySearchInput}
                placeholder="Type a city name..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={citySearch}
                onChangeText={setCitySearch}
                autoCorrect={false}
              />
              {citySearch.length > 0 && (
                <TouchableOpacity onPress={() => setCitySearch('')} style={{ paddingRight: 12 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredCities.filter(c => c !== profileCity)}
              keyExtractor={item => item}
              style={s.cityList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.cityRow, item === userCity && s.cityRowActive]}
                  onPress={() => handleCitySelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={s.cityRowIcon}>📍</Text>
                  <Text style={[s.cityRowTxt, item === userCity && s.cityRowTxtActive]}>{item}</Text>
                  {item === userCity && <Text style={s.cityRowCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={s.citySeparator} />}
            />
          </LinearGradient>
        </View>
      </Modal>

      {/* ── MATCH MODAL ── */}
      <Modal visible={matchModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Animated.View style={[s.matchCard, { transform: [{ scale: matchScale }] }]}>
            <Text style={{ fontSize: 56, marginBottom: 8 }}>🎊</Text>
            <Text style={s.matchTitle}>It's a Match!</Text>
            <Text style={s.matchSub}>You matched with</Text>
            <Text style={s.matchCompany}>{matchData?.job?.employer?.companyName || 'the employer'}</Text>
            <Text style={s.matchJob}>{matchData?.job?.title}</Text>
            <TouchableOpacity style={s.matchChatBtn} onPress={() => {
              setMatchModal(false);
              router.push({ pathname: '/chat', params: { matchId: matchData?.id, jobTitle: matchData?.job?.title, companyName: matchData?.job?.employer?.companyName } });
            }}>
              <Text style={s.matchChatTxt}>Message Now 💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.matchKeepBtn} onPress={() => setMatchModal(false)}>
              <Text style={s.matchKeepTxt}>Keep Swiping</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  /* Splash */
  splash:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashLogoBox: { alignItems: 'center', marginBottom: 8 },
  splashBrand:   { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 2, marginTop: 10 },
  splashSub:     { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 10 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 14,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoTxt: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
  logoSub: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.2, marginTop: 1 },

  /* Briefcase logo mark */
  logoMark: { width: 52, height: 52, alignItems: 'center' },
  handle: {
    width: 18, height: 7, borderWidth: 3, borderColor: '#fff',
    borderBottomWidth: 0, borderRadius: 5, marginBottom: -2, zIndex: 1,
  },
  body: {
    width: 48, height: 38,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8, borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  kL:  { position: 'absolute', left: 11, top: 6,  width: 3,  height: 22, backgroundColor: '#fff', borderRadius: 2 },
  kTR: { position: 'absolute', left: 14, top: 6,  width: 12, height: 10, backgroundColor: '#fff', borderRadius: 2, transform: [{ rotate: '-35deg' }, { translateX: 2 }] },
  kBR: { position: 'absolute', left: 14, top: 18, width: 12, height: 10, backgroundColor: '#fff', borderRadius: 2, transform: [{ rotate: '35deg'  }, { translateX: 2 }] },

  /* Location pill — tappable */
  locPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    maxWidth: 160,
  },
  locPillRanOut: {
    backgroundColor: 'rgba(245,158,11,0.3)',
    borderColor: 'rgba(245,158,11,0.8)',
  },
  locPillIcon: { fontSize: 13 },
  locPillTxt:  { fontSize: 12, fontWeight: '700', color: '#fff', flex: 1 },
  locPillEdit: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  /* Stats bar */
  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16, borderRadius: 12, marginBottom: 8,
  },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statNum:  { fontSize: 13, fontWeight: '900', color: '#fff' },
  statLabel:{ fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  statDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 10 },

  /* Filter tabs */
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 6,
  },
  filterTab: {
    flex: 1, paddingVertical: 7, borderRadius: 20, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: '#fff',
  },
  filterTabTxt: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  filterTabTxtActive: { color: '#1E8A3C' },

  /* "Expand area" nudge badge under location pill */
  ranOutBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(245,158,11,0.9)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, alignSelf: 'center',
  },
  ranOutBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  /* Card area */
  cardArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  card: {
    width: '100%', height: CARD_H,
    borderRadius: 24, overflow: 'hidden',
    position: 'absolute',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  cardBack: {
    position: 'relative', transform: [{ scale: 0.95 }],
    marginTop: 16, opacity: 0.7, zIndex: -1,
  },

  /* Stamps */
  stamp: {
    position: 'absolute', top: 24, zIndex: 10,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  stampApply: { right: 20, borderColor: GREEN, transform: [{ rotate: '-15deg' }] },
  stampSkip:  { left: 20,  borderColor: RED,   transform: [{ rotate:  '15deg' }] },
  stampTxt:   { fontSize: 20, fontWeight: '900' },

  /* Company initial badge */
  companyBadge: {
    position: 'absolute', top: 16, right: 16, zIndex: 5,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  companyBadgeTxt: { fontSize: 18, fontWeight: '900', color: '#fff' },

  /* Card content */
  cardImg:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },

  /* Employer logo (when uploaded) */
  companyLogoImg: { width: 96, height: 96, borderRadius: 48, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.6)' },

  /* KaamKaro fallback logo mark — card-sized version */
  kaamFallback: { alignItems: 'center' },
  kHandle: {
    width: 26, height: 10, borderWidth: 3.5, borderColor: 'rgba(255,255,255,0.9)',
    borderBottomWidth: 0, borderRadius: 6, marginBottom: -2, zIndex: 1,
  },
  kBody: {
    width: 72, height: 58,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  kKL:  { position: 'absolute', left: 17, top: 9,  width: 5,  height: 34, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 2 },
  kKTR: { position: 'absolute', left: 21, top: 9,  width: 18, height: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 2, transform: [{ rotate: '-35deg' }, { translateX: 3 }] },
  kKBR: { position: 'absolute', left: 21, top: 29, width: 18, height: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 2, transform: [{ rotate: '35deg'  }, { translateX: 3 }] },
  kaamFallbackTxt: {
    marginTop: 10,
    fontSize: 16, fontWeight: '900', color: 'rgba(255,255,255,0.9)',
    letterSpacing: 3,
  },

  /* Bottom gradient overlay */
  cardGradientOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: 220,
  },

  cardInfo:    { padding: 20, paddingTop: 12 },
  cardTitle:   { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 4 },
  cardCompany: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },

  /* Salary pill */
  salaryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30,138,60,0.9)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 8,
  },
  salaryPillTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  tagTxt:  { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19 },

  /* Empty */
  emptyCard:  { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 22, padding: 28, alignItems: 'center', width: '100%' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 10, textAlign: 'center', lineHeight: 26 },
  emptySub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  reloadBtn:  { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 24 },
  reloadTxt:  { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* Empty-state expansion buttons */
  emptyActions: { marginTop: 20, width: '100%', gap: 10 },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(30,138,60,0.35)',
    borderWidth: 1.5, borderColor: 'rgba(46,204,113,0.6)',
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13,
  },
  expandBtnIcon:  { fontSize: 22 },
  expandBtnLabel: { fontSize: 14, fontWeight: '800', color: '#fff' },
  expandBtnSub:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  changeLocBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13,
  },
  changeLocBtnIcon:  { fontSize: 22 },
  changeLocBtnLabel: { fontSize: 14, fontWeight: '800', color: '#fff' },
  changeLocBtnSub:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },

  /* Action buttons — premium redesign */
  actions: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 20, paddingBottom: 30, paddingTop: 10,
  },

  /* PASS button */
  passBtn: {
    width: 140, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    gap: 2,
  },
  passIcon:     { fontSize: 22, color: RED, lineHeight: 26 },
  passBtnLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },

  /* APPLY button */
  applyBtnWrap: {
    width: 140, height: 60, borderRadius: 30,
    shadowColor: GREEN, shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    overflow: 'hidden',
  },
  applyBtnGradient: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2,
    borderRadius: 30,
  },
  applyIcon:     { fontSize: 24, color: '#fff', lineHeight: 28 },
  applyBtnLabel: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  /* City picker modal */
  cityModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  cityModalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingBottom: 40,
    maxHeight: '80%',
  },
  cityModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, marginBottom: 16,
  },
  cityModalTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  cityCloseBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  cityCloseTxt: { fontSize: 16, color: '#fff', fontWeight: '700' },

  citySearchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  citySearchIcon:  { fontSize: 15, marginRight: 8 },
  citySearchInput: { flex: 1, fontSize: 15, color: '#fff', fontWeight: '600' },

  cityList: { paddingHorizontal: 20 },
  cityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cityRowActive: { backgroundColor: 'rgba(46,204,113,0.25)', borderWidth: 1, borderColor: 'rgba(46,204,113,0.5)' },
  cityRowIcon:   { fontSize: 14 },
  cityRowTxt:    { flex: 1, fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  cityRowTxtActive: { color: '#fff' },
  cityRowCheck:  { fontSize: 16, color: '#2ECC71', fontWeight: '900' },
  citySeparator: { height: 6 },

  /* Match modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  matchCard:    { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%' },
  matchTitle:   { fontSize: 28, fontWeight: '900', color: TEXT, marginBottom: 8 },
  matchSub:     { fontSize: 14, color: TEXT_MID },
  matchCompany: { fontSize: 16, fontWeight: '800', color: TEXT, marginTop: 4 },
  matchJob:     { fontSize: 14, color: GREEN, fontWeight: '700', marginBottom: 24 },
  matchChatBtn: {
    backgroundColor: GREEN, borderRadius: 14,
    paddingHorizontal: 32, paddingVertical: 15,
    width: '100%', alignItems: 'center', marginBottom: 12,
    shadowColor: GREEN, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  matchChatTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  matchKeepBtn: { paddingVertical: 12 },
  matchKeepTxt: { color: TEXT_MID, fontWeight: '600', fontSize: 14 },

  /* Swipe guide overlay — absolute inside cardArea */
  guideWrap: {
    position: 'absolute',
    bottom: 18,
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  guidePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(10,10,30,0.82)',
    borderRadius: 40, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 14, paddingHorizontal: 28,
    gap: 20,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  guideSide:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guideArrow:   { fontSize: 22, color: '#fff', fontWeight: '900' },
  guidePassLbl: { fontSize: 14, fontWeight: '800', color: '#FF6B6B', letterSpacing: 1 },
  guideApplyLbl:{ fontSize: 14, fontWeight: '800', color: '#2ECC71', letterSpacing: 1 },
  guideDiv:     { width: 1.5, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },
  guideTap:     { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 8, letterSpacing: 0.5 },
});
