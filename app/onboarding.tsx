import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform, StatusBar,
  Modal, FlatList,
} from 'react-native';
import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

const GREEN       = '#1E8A3C';
const GREEN_LIGHT = '#E8F5EE';
const GREEN_DARK  = '#166830';
const BLUE        = '#1B3FD8';
const TEXT        = '#111827';
const TEXT_MID    = '#6B7280';
const TEXT_LIGHT  = '#9CA3AF';
const BORDER      = '#E5E7EB';
const BG_GRAY     = '#F9FAFB';

const API_URL = 'https://kaam-backend-production.up.railway.app';

type Step =
  | 'role'
  | 'w-gender'
  | 'w-type' | 'w-experience' | 'w-location' | 'w-profile'
  | 'e-setup';

const WORK_TYPES = [
  { id: 'data_entry',   icon: '⌨️',  label: 'Data Entry & Back Office' },
  { id: 'sales',        icon: '📣',  label: 'Sales & Marketing' },
  { id: 'bpo',          icon: '🎧',  label: 'BPO & Telecaller' },
  { id: 'driver',       icon: '🚕',  label: 'Driver' },
  { id: 'office_asst',  icon: '📋',  label: 'Office Assistant' },
  { id: 'delivery',     icon: '📦',  label: 'Delivery & Collection' },
  { id: 'teacher',      icon: '👩‍🏫', label: 'Teacher' },
  { id: 'cook',         icon: '🍳',  label: 'Cook / Chef' },
  { id: 'receptionist', icon: '🔔',  label: 'Receptionist & Front Office' },
  { id: 'technician',   icon: '🔩',  label: 'Operator & Technician' },
  { id: 'it_engineer',  icon: '👨‍💻', label: 'IT Engineer & Developer' },
  { id: 'hotel',        icon: '✈️',  label: 'Hotel & Travel Executive' },
  { id: 'accountant',   icon: '🧮',  label: 'Accountant' },
  { id: 'designer',     icon: '🖌️',  label: 'Designer' },
  { id: 'warehouse',    icon: '🏗️',  label: 'Warehouse Staff' },
  { id: 'security',     icon: '🛡️',  label: 'Security Guard' },
  { id: 'cleaner',      icon: '🧽',  label: 'Cleaner' },
  { id: 'electrician',  icon: '💡',  label: 'Electrician' },
  { id: 'helper',       icon: '🙌',  label: 'Helper / Assistant' },
  { id: 'view_all',     icon: '›',   label: 'View All' },
];

const AVAILABILITY = [
  { id: 'full',    icon: '🕐', label: 'Full-time',   sub: 'I can work full time' },
  { id: 'part',    icon: '🕗', label: 'Part-time',   sub: 'I can work part-time' },
  { id: 'daily',   icon: '📅', label: 'Daily wage',  sub: 'I want daily wage work' },
  { id: 'weekend', icon: '🎉', label: 'Weekend',     sub: 'Only on weekends' },
];


const JOB_CATEGORIES = [
  { id: 'cook',         icon: '🍳', label: 'Chef / Cook' },
  { id: 'waiter',       icon: '🍽️', label: 'Waiter / Steward' },
  { id: 'cleaner',      icon: '🧹', label: 'Cleaner / Housekeeping' },
  { id: 'driver',       icon: '🚗', label: 'Driver' },
  { id: 'delivery',     icon: '🛵', label: 'Delivery Partner' },
  { id: 'security',     icon: '💂', label: 'Security Guard' },
  { id: 'helper',       icon: '🤝', label: 'Helper / Assistant' },
  { id: 'electrician',  icon: '⚡', label: 'Electrician' },
  { id: 'plumber',      icon: '🔧', label: 'Plumber' },
  { id: 'carpenter',    icon: '🪚', label: 'Carpenter' },
  { id: 'painter',      icon: '🖌️', label: 'Painter' },
  { id: 'data_entry',   icon: '⌨️', label: 'Data Entry' },
  { id: 'receptionist', icon: '📋', label: 'Receptionist' },
  { id: 'accountant',   icon: '🧮', label: 'Accountant' },
  { id: 'teacher',      icon: '👩‍🏫', label: 'Teacher / Tutor' },
  { id: 'sales',        icon: '📣', label: 'Sales / Marketing' },
  { id: 'it_support',   icon: '💻', label: 'IT Support' },
  { id: 'construction', icon: '🏗️', label: 'Construction Worker' },
  { id: 'mechanic',     icon: '🔩', label: 'Mechanic' },
  { id: 'caretaker',    icon: '🏥', label: 'Nurse / Caretaker' },
  { id: 'other',        icon: '✏️', label: 'Other' },
];

/** Return role suggestions based on business name keywords */
function getEmpSuggestions(name: string): string[] {
  const n = name.toLowerCase();
  const out: string[] = [];
  if (/restaurant|dhaba|cafe|food|kitchen|hotel|biryani|bakery|chai|mess|canteen|catering/.test(n))
    out.push('Chef / Cook', 'Waiter / Steward', 'Cleaner / Housekeeping', 'Delivery Partner');
  if (/security|guard|safe|protect|watch/.test(n))
    out.push('Security Guard', 'Helper / Assistant');
  if (/delivery|courier|logistic|transport|cargo|shipping/.test(n))
    out.push('Delivery Partner', 'Driver', 'Helper / Assistant');
  if (/clean|housekeep|maid|sweep|pest|sanit/.test(n))
    out.push('Cleaner / Housekeeping', 'Helper / Assistant');
  if (/drive|cab|taxi|car|travel|tour|wheels|auto|bike/.test(n))
    out.push('Driver', 'Delivery Partner');
  if (/school|academy|tuition|education|coaching|institute|college/.test(n))
    out.push('Teacher / Tutor', 'Helper / Assistant', 'Cleaner / Housekeeping');
  if (/shop|store|retail|mart|super|medical|pharmacy|chemist/.test(n))
    out.push('Helper / Assistant', 'Delivery Partner', 'Cleaner / Housekeeping');
  if (/hospital|clinic|health|care|nursing|dental/.test(n))
    out.push('Helper / Assistant', 'Cleaner / Housekeeping', 'Delivery Partner');
  if (/build|construct|infra|real estate|property|civil|engineer/.test(n))
    out.push('Helper / Assistant', 'Plumber', 'Electrician');
  if (/salon|beauty|spa|barber|parlour/.test(n))
    out.push('Helper / Assistant', 'Cleaner / Housekeeping');
  if (/office|tech|it |software|agency|consult|firm|pvt|ltd/.test(n))
    out.push('Helper / Assistant', 'Cleaner / Housekeeping', 'Security Guard', 'Driver');
  // Always add a couple of general fallbacks
  if (out.length === 0) out.push('Helper / Assistant', 'Cleaner / Housekeeping', 'Driver', 'Security Guard');
  return [...new Set(out)].slice(0, 6); // max 6, deduped
}

const STATE_CITIES: Record<string, string[]> = {
  'Andhra Pradesh':          ['Visakhapatnam','Vijayawada','Guntur','Nellore','Kurnool','Tirupati','Rajahmundry','Kakinada','Anantapur'],
  'Arunachal Pradesh':       ['Itanagar','Naharlagun','Pasighat','Tezpur'],
  'Assam':                   ['Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon','Tinsukia','Tezpur','Bongaigaon'],
  'Bihar':                   ['Patna','Gaya','Bhagalpur','Muzaffarpur','Purnia','Darbhanga','Bihar Sharif','Arrah','Begusarai','Chhapra'],
  'Chhattisgarh':            ['Raipur','Bhilai','Bilaspur','Korba','Durg','Rajnandgaon','Jagdalpur'],
  'Goa':                     ['Panaji','Vasco da Gama','Margao','Mapusa','Ponda'],
  'Gujarat':                 ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Gandhinagar','Anand','Nadiad','Mehsana','Junagadh'],
  'Haryana':                 ['Faridabad','Gurgaon','Panipat','Ambala','Yamunanagar','Rohtak','Hisar','Karnal','Sonipat','Rewari','Kurukshetra'],
  'Himachal Pradesh':        ['Shimla','Mandi','Solan','Dharamsala','Kullu','Manali','Baddi','Palampur'],
  'Jharkhand':               ['Ranchi','Jamshedpur','Dhanbad','Bokaro','Deoghar','Hazaribagh','Giridih','Ramgarh'],
  'Karnataka':               ['Bengaluru','Mysuru','Hubballi','Mangaluru','Belagavi','Kalaburagi','Ballari','Tumakuru','Shivamogga','Davanagere','Udupi'],
  'Kerala':                  ['Thiruvananthapuram','Kochi','Kozhikode','Kollam','Thrissur','Palakkad','Malappuram','Kannur','Kasaragod','Alappuzha'],
  'Madhya Pradesh':          ['Indore','Bhopal','Jabalpur','Gwalior','Ujjain','Sagar','Dewas','Satna','Ratlam','Rewa','Burhanpur','Singrauli'],
  'Maharashtra':             ['Mumbai','Pune','Nagpur','Thane','Nashik','Aurangabad','Solapur','Navi Mumbai','Kolhapur','Akola','Amravati','Latur','Nanded'],
  'Manipur':                 ['Imphal','Thoubal','Bishnupur','Churachandpur'],
  'Meghalaya':               ['Shillong','Tura','Jowai'],
  'Mizoram':                 ['Aizawl','Lunglei','Champhai'],
  'Nagaland':                ['Kohima','Dimapur','Mokokchung'],
  'Odisha':                  ['Bhubaneswar','Cuttack','Rourkela','Berhampur','Sambalpur','Puri','Balasore','Baripada'],
  'Punjab':                  ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Mohali','Pathankot','Hoshiarpur','Batala'],
  'Rajasthan':               ['Jaipur','Jodhpur','Kota','Bikaner','Ajmer','Udaipur','Bhilwara','Alwar','Sikar','Bharatpur','Sri Ganganagar'],
  'Sikkim':                  ['Gangtok','Namchi','Gyalshing'],
  'Tamil Nadu':              ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Vellore','Erode','Thoothukudi','Tiruppur','Dindigul','Thanjavur'],
  'Telangana':               ['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam','Secunderabad','Ramagundam','Nalgonda'],
  'Tripura':                 ['Agartala','Udaipur','Dharmanagar'],
  'Uttar Pradesh':           ['Lucknow','Kanpur','Ghaziabad','Agra','Varanasi','Meerut','Prayagraj','Bareilly','Aligarh','Moradabad','Noida','Gorakhpur','Mathura','Firozabad','Saharanpur','Jhansi'],
  'Uttarakhand':             ['Dehradun','Haridwar','Roorkee','Haldwani','Rudrapur','Kashipur','Rishikesh','Nainital'],
  'West Bengal':             ['Kolkata','Asansol','Siliguri','Durgapur','Bardhaman','Malda','Barasat','Howrah','Kharagpur','Haldia'],
  'Delhi':                   ['New Delhi','Dwarka','Rohini','Saket','Lajpat Nagar','Karol Bagh','Janakpuri','Pitampura','Shahdara','Connaught Place'],
  'Jammu & Kashmir':         ['Srinagar','Jammu','Anantnag','Baramulla','Sopore','Udhampur'],
  'Ladakh':                  ['Leh','Kargil'],
  'Chandigarh':              ['Chandigarh'],
  'Puducherry':              ['Puducherry','Karaikal','Mahe','Yanam'],
  'Dadra & Nagar Haveli':    ['Silvassa','Amli'],
  'Daman & Diu':             ['Daman','Diu'],
  'Andaman & Nicobar':       ['Port Blair','Car Nicobar'],
  'Lakshadweep':             ['Kavaratti','Agatti'],
};

const INDIA_STATES = Object.keys(STATE_CITIES).sort();
const INDIA_CITIES_FLAT = Object.entries(STATE_CITIES).flatMap(([state, cities]) =>
  cities.map(city => ({ city, state })));

const AVAIL_OPTIONS = [
  { id: 'full',  label: 'Full-time',    icon: '🕐' },
  { id: 'part',  label: 'Part-time',    icon: '🕗' },
  { id: 'daily', label: 'Daily Wages',  icon: '💵' },
];

const PROGRESS: Record<Step, [number, number]> = {
  'role':         [0, 0],
  'w-gender':     [0, 5],
  'w-type':       [1, 5],
  'w-experience': [2, 5],
  'w-location':   [3, 5],
  'w-profile':    [4, 5],
  'e-setup':      [1, 2],
};

const GENDERS = [
  { id: 'male',   icon: '👨', label: 'Male' },
  { id: 'female', icon: '👩', label: 'Female' },
  { id: 'other',  icon: '🧑', label: 'Other' },
];

const EXPERIENCE_LEVELS = [
  { id: 'fresher',  label: 'Fresher',     sub: 'No experience yet' },
  { id: '0-1',      label: '< 1 year',    sub: 'Just started working' },
  { id: '1-2',      label: '1–2 years',   sub: 'Some experience' },
  { id: '2-5',      label: '2–5 years',   sub: 'Good experience' },
  { id: '5+',       label: '5+ years',    sub: 'Very experienced' },
];

export default function OnboardingScreen() {
  const router = useRouter();

  const [step, setStep]       = useState<Step>('role');
  const [loading, setLoading] = useState(false);

  const [workTypes, setWorkTypes]   = useState<string[]>([]);
  const [location, setLocation]     = useState('');
  const [locUsed, setLocUsed]       = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  // Location search
  const [searchText, setSearchText]             = useState('');
  const [searchResults, setSearchResults]       = useState<{city:string;state:string}[]>([]);
  const [selectedState, setSelectedState]       = useState('');
  const [showStateBrowser, setShowStateBrowser] = useState(false);

  // Gender + experience
  const [gender, setGender]           = useState('');
  const [experience, setExperience]   = useState('');

  // Profile step
  const [fullName, setFullName]       = useState('');
  const [extraCats, setExtraCats]     = useState<string[]>([]);
  const [availability, setAvail]      = useState('');
  const [showAddCats, setShowAddCats] = useState(false);
  const [profilePic, setProfilePic]   = useState('');
  const [bio, setBio]                 = useState('');

  const [bizName, setBizName]       = useState('');
  const [empCat, setEmpCat]         = useState('');
  const [empCatOther, setEmpCatOther] = useState(false);   // true when "Other" chosen
  const [showCatModal, setShowCatModal] = useState(false); // job category picker
  const [empLoc, setEmpLoc]         = useState('');
  const [empLocUsed, setEmpLocUsed] = useState(false);

  const [prog, total] = PROGRESS[step];

  const goBack = () => {
    const map: Partial<Record<Step, Step>> = {
      'w-gender': 'role', 'w-type': 'w-gender', 'w-experience': 'w-type',
      'w-location': 'w-experience', 'w-profile': 'w-location',
      'e-setup': 'role',
    };
    const prev = map[step];
    if (prev) setStep(prev);
  };

  const detectLocation = async (
    setter: (v: string) => void,
    setUsed: (v: boolean) => void,
    setLoading?: (v: boolean) => void,
  ) => {
    setLoading?.(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please enable location access in your phone Settings to use this feature.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
      });
      const city  = place?.city || place?.district || place?.subregion || '';
      const state = place?.region || '';
      const loc   = city && state ? `${city}, ${state}` : city || state || '';
      if (loc) { setter(loc); setUsed(true); }
      else Alert.alert('', 'Could not read location name. Please enter manually.');
    } catch {
      Alert.alert('Location Error', 'Could not get your location. Please enter it manually.');
    } finally { setLoading?.(false); }
  };

  const handleSearchLocation = (text: string) => {
    setSearchText(text);
    setSelectedState('');
    if (text.trim().length < 2) { setSearchResults([]); return; }
    const q = text.toLowerCase();
    const results = INDIA_CITIES_FLAT.filter(
      ({ city, state }) => city.toLowerCase().includes(q) || state.toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(results);
  };

  const pickProfilePic = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      {
        text: '📷  Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow camera access in Settings.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) setProfilePic(result.assets[0].uri);
        },
      },
      {
        text: '🖼️  Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) setProfilePic(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const pickLocation = (city: string, state: string) => {
    setLocation(`${city}, ${state}`);
    setLocUsed(false);
    setSearchText('');
    setSearchResults([]);
    setSelectedState('');
    setShowStateBrowser(false);
  };

  const finish = async (role: 'SEEKER' | 'EMPLOYER', extra: any) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/api/users/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userType: role, ...extra }),
      }).catch(() => {});
      await AsyncStorage.setItem('onboardingComplete', 'true');
      await AsyncStorage.setItem('userType', role);
      // Save location so home screen can show it immediately
      if (extra?.location) {
        await AsyncStorage.setItem('profileCity', extra.location);
        await AsyncStorage.setItem('userCity', extra.location);
      }
      // Save local profile pic URI so profile tab can display it
      if (extra?.profilePic) {
        await AsyncStorage.setItem('profilePic', extra.profilePic);
      }
      router.replace('/');
    } catch {
      await AsyncStorage.setItem('onboardingComplete', 'true');
      router.replace('/');
    } finally { setLoading(false); }
  };

  /* ── ROLE STEP — full gradient screen ── */
  if (step === 'role') {
    return (
      <LinearGradient
        colors={['#1B3FD8', '#1a6b3c', '#1E8A3C']}
        locations={[0, 0.55, 1]}
        style={r.root}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Logo — same as login/welcome */}
        <View style={r.logoRow}>
          <View style={r.iconMark}>
            <View style={r.handle} />
            <View style={r.body}>
              <View style={r.kL} />
              <View style={r.kTR} />
              <View style={r.kBR} />
            </View>
          </View>
          <View>
            <Text style={r.brand}>KAAMKARO</Text>
            <Text style={r.brandSub}>SWIPE · DISCOVER · GET HIRED</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={r.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={r.title}>What are you{'\n'}looking for?</Text>
          <Text style={r.sub}>Choose an option to continue</Text>

          {/* Worker card */}
          <TouchableOpacity style={r.card} onPress={() => setStep('w-gender')} activeOpacity={0.88}>
            <Text style={r.cardTitle}>Looking for job?</Text>
            <Text style={r.cardSub}>Find work that matches your skills.</Text>
            <View style={r.workerBtn}>
              <Text style={r.workerBtnTxt}>Continue as Worker</Text>
            </View>
          </TouchableOpacity>

          {/* Employer card */}
          <TouchableOpacity style={[r.card, r.empCard]} onPress={() => setStep('e-setup')} activeOpacity={0.88}>
            <Text style={r.cardTitle}>Looking to hire?</Text>
            <Text style={r.cardSub}>Post jobs and get the right people.</Text>
            <View style={r.empBtn}>
              <Text style={r.empBtnTxt}>Continue as Employer</Text>
            </View>
          </TouchableOpacity>

          <Text style={r.lock}>🔒  Secure. Trusted. Reliable.</Text>
        </ScrollView>
      </LinearGradient>
    );
  }

  /* ── ALL OTHER STEPS — gradient background ── */
  return (
    <LinearGradient colors={['#1B3FD8', '#1a6b3c', '#1E8A3C']} locations={[0, 0.55, 1]} style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {total > 0 && (
        <View style={s.progressRow}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[s.dot, { width: i === prog ? 20 : 8, backgroundColor: i <= prog ? '#fff' : 'rgba(255,255,255,0.3)' }]} />
          ))}
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ══ GENDER ══ */}
        {step === 'w-gender' && (
          <>
            <BackBtn onPress={goBack} />
            <Text style={s.stepTitle}>What is your gender?</Text>
            <Text style={s.stepSub}>This helps match you with the right opportunities</Text>
            <View style={{ gap: 12, marginTop: 8 }}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[s.selCard, gender === g.id && s.selCardOn]}
                  onPress={() => setGender(g.id)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 28 }}>{g.icon}</Text>
                  <Text style={[s.selCardLabel, gender === g.id && s.selCardLabelOn]}>{g.label}</Text>
                  {gender === g.id && <Text style={s.selCardCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 24 }} />
            <Btn label="Continue" onPress={() => setStep('w-type')} disabled={!gender} />
          </>
        )}

        {/* ══ WORK TYPE ══ */}
        {step === 'w-type' && (
          <>
            <BackBtn onPress={goBack} />
            <Text style={s.stepTitle}>What type of work are you looking for?</Text>
            <Text style={s.stepSub}>Select all that apply</Text>
            <View style={s.chipGrid}>
              {WORK_TYPES.map(j => {
                const on = workTypes.includes(j.id);
                return (
                  <TouchableOpacity
                    key={j.id} activeOpacity={0.8}
                    style={[s.chip, on && s.chipOn]}
                    onPress={() => setWorkTypes(p => on ? p.filter(x => x !== j.id) : [...p, j.id])}
                  >
                    <Text style={s.chipEmoji}>{j.icon}</Text>
                    <Text style={[s.chipLabel, on && s.chipLabelOn]}>{j.label}</Text>
                    {on && <Text style={s.chipCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Btn label="Continue" onPress={() => workTypes.length > 0 && setStep('w-experience')} disabled={workTypes.length === 0} />
          </>
        )}

        {/* ══ EXPERIENCE ══ */}
        {step === 'w-experience' && (
          <>
            <BackBtn onPress={goBack} />
            <Text style={s.stepTitle}>How much experience do you have?</Text>
            <Text style={s.stepSub}>Be honest — employers prefer accurate info</Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              {EXPERIENCE_LEVELS.map(e => (
                <TouchableOpacity
                  key={e.id}
                  style={[s.selCard, experience === e.id && s.selCardOn]}
                  onPress={() => setExperience(e.id)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.selCardLabel, experience === e.id && s.selCardLabelOn]}>{e.label}</Text>
                    <Text style={s.selCardSub}>{e.sub}</Text>
                  </View>
                  {experience === e.id && <Text style={s.selCardCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 24 }} />
            <Btn label="Continue" onPress={() => setStep('w-location')} disabled={!experience} />
          </>
        )}

        {/* ══ WORKER LOCATION ══ */}
        {step === 'w-location' && (
          <>
            <BackBtn onPress={goBack} />
            <Text style={s.stepTitle}>Where do you want to work?</Text>
            <Text style={s.stepSub}>We'll show jobs near you across India</Text>

            {/* Selected location badge */}
            {location ? (
              <View style={s.selectedLoc}>
                <Text style={s.selectedLocIcon}>📍</Text>
                <Text style={s.selectedLocTxt}>{location}</Text>
                <TouchableOpacity onPress={() => { setLocation(''); setLocUsed(false); }}>
                  <Text style={s.selectedLocClear}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Current location */}
            <TouchableOpacity
              style={[s.locRow, locUsed && s.locRowOn]}
              onPress={() => detectLocation(setLocation, setLocUsed, setLocLoading)}
              activeOpacity={0.85}
              disabled={locLoading}
            >
              {locLoading
                ? <ActivityIndicator color="#fff" size="small" style={{ width: 22 }} />
                : <Text style={s.locIcon}>🎯</Text>}
              <Text style={s.locLabel}>Use current location</Text>
              {locUsed && <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>}
            </TouchableOpacity>

            <Text style={s.orTxt}>── OR SEARCH ──</Text>

            {/* Search input with autocomplete */}
            <View style={s.fieldRow}>
              <Text style={s.fieldIcon}>🔍</Text>
              <TextInput
                style={s.field}
                placeholder="Type city or state..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={searchText}
                onChangeText={handleSearchLocation}
                autoCorrect={false}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchText(''); setSearchResults([]); }} style={{ paddingRight: 12 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Autocomplete dropdown */}
            {searchResults.length > 0 && (
              <View style={s.dropdown}>
                {searchResults.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.dropItem, i < searchResults.length - 1 && s.dropItemBorder]}
                    onPress={() => pickLocation(item.city, item.state)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.dropItemIcon}>📍</Text>
                    <View>
                      <Text style={s.dropCity}>{item.city}</Text>
                      <Text style={s.dropState}>{item.state}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Browse by State toggle button */}
            {searchText.length === 0 && (
              <TouchableOpacity
                style={[s.stateChip, showStateBrowser && s.stateChipOpen]}
                onPress={() => { setShowStateBrowser(v => !v); setSelectedState(''); }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16, marginRight: 4 }}>🗺️</Text>
                <Text style={s.stateChipTxt}>Browse by State</Text>
                <Text style={[s.stateChipArrow, { transform: [{ rotate: showStateBrowser ? '90deg' : '0deg' }] }]}>›</Text>
              </TouchableOpacity>
            )}

            {/* State list */}
            {showStateBrowser && !selectedState && searchText.length === 0 && (
              <View style={s.stateGrid}>
                {INDIA_STATES.map(st => (
                  <TouchableOpacity key={st} style={s.stateChip} onPress={() => setSelectedState(st)} activeOpacity={0.8}>
                    <Text style={s.stateChipTxt}>{st}</Text>
                    <Text style={s.stateChipArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* City list for selected state */}
            {showStateBrowser && selectedState && (
              <>
                <TouchableOpacity onPress={() => setSelectedState('')} style={s.stateBack}>
                  <Text style={s.stateBackTxt}>← {selectedState}</Text>
                </TouchableOpacity>
                {(STATE_CITIES[selectedState] || []).map(city => (
                  <TouchableOpacity
                    key={city}
                    style={s.cityRow}
                    onPress={() => pickLocation(city, selectedState)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.cityIcon}>📍</Text>
                    <Text style={s.cityName}>{city}</Text>
                    <Text style={s.stateChipArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={{ height: 20 }} />
            <Btn label="Continue →" onPress={() => setStep('w-profile')} disabled={!location} />
          </>
        )}

        {/* ══ PROFILE SETUP ══ */}
        {step === 'w-profile' && (() => {
          const allSelected   = [...workTypes, ...extraCats];
          const remaining     = WORK_TYPES.filter(w => !allSelected.includes(w.id));
          const canAddMore    = extraCats.length < 2;
          const profileReady  = fullName.trim().length > 1 && availability;

          return (
            <>
              <BackBtn onPress={goBack} />

              {/* Header */}
              <Text style={s.stepTitle}>Let's set up your profile</Text>
              <Text style={s.profileStep}>STEP 3 OF 3</Text>

              {/* Profile pic */}
              <TouchableOpacity style={s.picWrap} onPress={pickProfilePic} activeOpacity={0.85}>
                {profilePic
                  ? <Image source={{ uri: profilePic }} style={s.picImage} />
                  : (
                    <View style={s.picPlaceholder}>
                      <Text style={s.picCamera}>📷</Text>
                      <Text style={s.picHint}>Add Photo</Text>
                    </View>
                  )}
                <View style={s.picBadge}><Text style={{ fontSize: 14 }}>✏️</Text></View>
              </TouchableOpacity>

              {/* Full Name */}
              <Text style={s.label}>Full Name</Text>
              <View style={[s.fieldRow, fullName && s.fieldRowOn]}>
                <Text style={s.fieldIcon}>👤</Text>
                <TextInput
                  style={s.field}
                  placeholder="Enter your full name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>

              {/* Work Categories */}
              <Text style={s.label}>Work Categories</Text>
              <View style={s.catChipRow}>
                {allSelected.map(id => {
                  const w = WORK_TYPES.find(x => x.id === id);
                  if (!w) return null;
                  return (
                    <View key={id} style={s.catChip}>
                      <Text style={s.catChipIcon}>{w.icon}</Text>
                      <Text style={s.catChipTxt}>{w.label}</Text>
                    </View>
                  );
                })}
                {canAddMore && (
                  <TouchableOpacity style={s.catChipAdd} onPress={() => setShowAddCats(v => !v)} activeOpacity={0.8}>
                    <Text style={s.catChipAddTxt}>{showAddCats ? '✕ Close' : '+ Add more'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Extra category picker */}
              {showAddCats && (
                <View style={s.extraCatGrid}>
                  {remaining.map(w => {
                    const on = extraCats.includes(w.id);
                    return (
                      <TouchableOpacity
                        key={w.id}
                        style={[s.chip, on && s.chipOn]}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (on) { setExtraCats(p => p.filter(x => x !== w.id)); return; }
                          if (extraCats.length < 2) setExtraCats(p => [...p, w.id]);
                        }}
                      >
                        <Text style={s.chipEmoji}>{w.icon}</Text>
                        <Text style={[s.chipLabel, on && s.chipLabelOn]}>{w.label}</Text>
                        {on && <Text style={s.chipCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Location — pre-filled */}
              <Text style={s.label}>Location</Text>
              <TouchableOpacity style={[s.fieldRow, s.fieldRowOn]} onPress={() => setStep('w-location')} activeOpacity={0.85}>
                <Text style={s.fieldIcon}>📍</Text>
                <Text style={[s.field, { paddingVertical: 13, color: location ? '#fff' : 'rgba(255,255,255,0.5)' }]}>
                  {location || 'Tap to set location'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', paddingRight: 12, fontSize: 16 }}>›</Text>
              </TouchableOpacity>

              {/* Availability */}
              <Text style={s.label}>Availability</Text>
              <View style={s.availBoxRow}>
                {AVAIL_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.id}
                    style={[s.availBox, availability === o.id && s.availBoxOn]}
                    onPress={() => setAvail(o.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.availBoxIcon}>{o.icon}</Text>
                    <Text style={[s.availBoxTxt, availability === o.id && s.availBoxTxtOn]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* About you */}
              <Text style={s.label}>Tell us about you <Text style={s.wordCountTxt}>({wordCount(bio)}/100 words)</Text></Text>
              <View style={[s.fieldRow, { alignItems: 'flex-start' }, bio && s.fieldRowOn]}>
                <TextInput
                  style={[s.field, s.bioField]}
                  placeholder="e.g. I'm a cook with 3 years experience in north Indian cuisine, available for full-time roles..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={bio}
                  onChangeText={t => {
                    if (wordCount(t) <= 100) setBio(t);
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Profile card preview */}
              {profileReady && (
                <View style={s.profileCard}>
                  <View style={s.profileCardHeader}>
                    {profilePic
                      ? <Image source={{ uri: profilePic }} style={[s.profileAvatar, { borderWidth: 2, borderColor: '#fff' }]} />
                      : <View style={s.profileAvatar}>
                          <Text style={s.profileAvatarTxt}>
                            {fullName.trim().split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                          </Text>
                        </View>
                    }
                    <View style={{ flex: 1 }}>
                      <Text style={s.profileName}>{fullName.trim()}</Text>
                      <Text style={s.profileMeta}>📍 {location}</Text>
                    </View>
                    <View style={s.profileBadge}>
                      <Text style={s.profileBadgeTxt}>{AVAIL_OPTIONS.find(o => o.id === availability)?.label}</Text>
                    </View>
                  </View>
                  <View style={s.profileCats}>
                    {allSelected.map(id => {
                      const w = WORK_TYPES.find(x => x.id === id);
                      return w ? (
                        <View key={id} style={s.profileCatPill}>
                          <Text style={s.profileCatPillTxt}>{w.icon} {w.label}</Text>
                        </View>
                      ) : null;
                    })}
                  </View>
                </View>
              )}

              <View style={{ height: 16 }} />
              {loading
                ? <ActivityIndicator color="#fff" size="large" />
                : <Btn label="Create Profile →" onPress={() => profileReady && finish('SEEKER', { fullName, bio, profilePic, workTypes: allSelected, location, availability, gender, experience })} disabled={!profileReady} />}

            </>
          );
        })()}

        {/* ══ EMPLOYER SETUP — all in one ══ */}
        {step === 'e-setup' && (
          <>
            <BackBtn onPress={goBack} />
            <Text style={[s.stepTitle, { marginTop: 4 }]}>Set up your business</Text>
            <Text style={[s.stepSub, { marginBottom: 20 }]}>Fill in your details so workers can trust you.</Text>

            {/* Business name */}
            <Text style={s.label}>Business / Company Name</Text>
            <View style={[s.fieldRow, bizName && s.fieldRowOn]}>
              <Text style={s.fieldIcon}>🏢</Text>
              <TextInput
                style={s.field}
                placeholder="Enter your business name"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={bizName}
                onChangeText={setBizName}
                autoFocus
              />
            </View>

            {/* Hiring role — tappable selector */}
            <Text style={[s.label, { marginTop: 16 }]}>What are you hiring for?</Text>
            <TouchableOpacity
              style={[s.fieldRow, (empCat && !empCatOther) && s.fieldRowOn]}
              onPress={() => setShowCatModal(true)}
              activeOpacity={0.8}
            >
              <Text style={s.fieldIcon}>🔎</Text>
              <Text style={[s.field, { paddingVertical: 14, color: empCat && !empCatOther ? '#fff' : 'rgba(255,255,255,0.45)' }]}>
                {empCat && !empCatOther ? empCat : 'Tap to choose a job category…'}
              </Text>
              {empCat && !empCatOther
                ? <TouchableOpacity onPress={() => { setEmpCat(''); setEmpCatOther(false); }} style={{ paddingRight: 10 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                : <Text style={{ color: 'rgba(255,255,255,0.5)', paddingRight: 12, fontSize: 18 }}>›</Text>
              }
            </TouchableOpacity>

            {/* If "Other" selected — free-text description */}
            {empCatOther && (
              <View style={{ marginTop: 10 }}>
                <View style={[s.fieldRow, empCat && s.fieldRowOn]}>
                  <Text style={s.fieldIcon}>✏️</Text>
                  <TextInput
                    style={[s.field, { flex: 1 }]}
                    placeholder="Describe the role (e.g. Gym Trainer, Barista…)"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={empCat}
                    onChangeText={setEmpCat}
                    autoFocus
                    returnKeyType="done"
                  />
                  {empCat.length > 0 && (
                    <TouchableOpacity onPress={() => setEmpCat('')} style={{ paddingRight: 10 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => { setShowCatModal(true); setEmpCat(''); setEmpCatOther(false); }} style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>← Back to list</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Business location */}
            <Text style={[s.label, { marginTop: 16 }]}>Business Location</Text>
            <TouchableOpacity
              style={[s.locRow, empLocUsed && s.locRowOn]}
              onPress={() => detectLocation(setEmpLoc, setEmpLocUsed, setLocLoading)}
              activeOpacity={0.85}
            >
              <Text style={s.locIcon}>🎯</Text>
              <Text style={s.locLabel}>Use my current location</Text>
              {locLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : empLocUsed && <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>}
            </TouchableOpacity>
            <View style={[s.fieldRow, empLoc && !empLocUsed && s.fieldRowOn, { marginTop: 10 }]}>
              <Text style={s.fieldIcon}>📍</Text>
              <TextInput
                style={s.field}
                placeholder="Or type your city / area"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={empLoc}
                onChangeText={v => { setEmpLoc(v); setEmpLocUsed(false); }}
              />
            </View>

            {/* Security note */}
            <View style={[s.infoBox, { marginTop: 16 }]}>
              <Text style={{ fontSize: 16 }}>🔒</Text>
              <Text style={s.infoTxt}>Your information is safe and only used to improve hiring.</Text>
            </View>

            <View style={{ height: 20 }} />
            {loading
              ? <ActivityIndicator color="#fff" size="large" />
              : <Btn
                  label="Create Business Profile →"
                  onPress={() => {
                    if (bizName.trim() && empCat.trim() && empLoc.trim())
                      finish('EMPLOYER', { businessName: bizName, category: empCat.trim(), location: empLoc });
                  }}
                  disabled={!bizName.trim() || !empCat.trim() || !empLoc.trim()}
                />
            }
          </>
        )}

      </ScrollView>

      {/* ── JOB CATEGORY PICKER MODAL — outside ScrollView so it renders properly ── */}
      <Modal visible={showCatModal} transparent animationType="slide" onRequestClose={() => setShowCatModal(false)}>
        <View style={s.catModalOverlay}>
          <LinearGradient colors={['#1B3FD8', '#1a6b3c', '#1E8A3C']} locations={[0, 0.55, 1]} style={s.catModalSheet}>

            {/* Header */}
            <View style={s.catModalHeader}>
              <Text style={s.catModalTitle}>What are you hiring for?</Text>
              <TouchableOpacity onPress={() => setShowCatModal(false)} style={s.catModalClose}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Smart suggestions based on business name */}
            {bizName.trim().length > 2 && (() => {
              const sugs = getEmpSuggestions(bizName).filter(sg => sg !== 'Other');
              if (!sugs.length) return null;
              return (
                <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                  <Text style={s.suggestLabel}>⚡ Suggested for "{bizName.trim()}"</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
                      {sugs.map(sug => (
                        <TouchableOpacity
                          key={sug}
                          style={[s.suggestChip, empCat === sug && s.suggestChipOn]}
                          onPress={() => { setEmpCat(sug); setEmpCatOther(false); setShowCatModal(false); }}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.suggestChipTxt, empCat === sug && s.suggestChipTxtOn]}>{sug}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              );
            })()}

            <View style={s.catDivider} />

            {/* Full scrollable list of 20 categories */}
            <FlatList
              data={JOB_CATEGORIES}
              keyExtractor={item => item.id}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isOther    = item.id === 'other';
                const isSelected = !isOther && empCat === item.label;
                return (
                  <TouchableOpacity
                    style={[s.catListRow, isSelected && s.catListRowOn, isOther && s.catListRowOther]}
                    onPress={() => {
                      if (isOther) {
                        setEmpCat('');
                        setEmpCatOther(true);
                        setShowCatModal(false);
                      } else {
                        setEmpCat(item.label);
                        setEmpCatOther(false);
                        setShowCatModal(false);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={s.catListIcon}>{item.icon}</Text>
                    <Text style={[s.catListLabel, isSelected && s.catListLabelOn, isOther && s.catListOther]}>
                      {item.label}
                    </Text>
                    {isSelected
                      ? <Text style={s.catListCheck}>✓</Text>
                      : isOther
                        ? <Text style={s.catListArrow}>write your own →</Text>
                        : null
                    }
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </LinearGradient>
        </View>
      </Modal>

    </LinearGradient>
  );
}


/* ── Helpers ── */

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginBottom: 12 }} activeOpacity={0.7}>
      <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>← Back</Text>
    </TouchableOpacity>
  );
}

function Btn({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[btn.b, disabled && btn.dim]} onPress={onPress} disabled={disabled} activeOpacity={0.85}>
      <Text style={btn.t}>{label}</Text>
    </TouchableOpacity>
  );
}
const btn = StyleSheet.create({
  b:   { width: '100%', backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5, borderColor: '#fff', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  dim: { opacity: 0.35 },
  t:   { fontSize: 16, fontWeight: '700', color: '#fff' },
});

/* ── Role step styles (gradient screen) ── */
const r = StyleSheet.create({
  root: { flex: 1 },

  logoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingTop: Platform.OS === 'ios' ? 70 : 56,
    paddingHorizontal: 28, paddingBottom: 20,
  },
  iconMark: { width: 62, height: 62, alignItems: 'center' },
  handle: {
    width: 22, height: 9, borderWidth: 3.5, borderColor: '#fff',
    borderBottomWidth: 0, borderRadius: 6, marginBottom: -2, zIndex: 1,
  },
  body: {
    width: 58, height: 46,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, borderWidth: 2.5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  kL:  { position: 'absolute', left: 14, top: 8,  width: 4,  height: 28, backgroundColor: '#fff', borderRadius: 2 },
  kTR: { position: 'absolute', left: 17, top: 8,  width: 15, height: 13, backgroundColor: '#fff', borderRadius: 2, transform: [{ rotate: '-35deg' }, { translateX: 3 }] },
  kBR: { position: 'absolute', left: 17, top: 23, width: 15, height: 13, backgroundColor: '#fff', borderRadius: 2, transform: [{ rotate: '35deg'  }, { translateX: 3 }] },
  brand:    { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  brandSub: { fontSize: 9,  fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, marginTop: 2 },

  scroll: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 48 },

  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 8, lineHeight: 40 },
  sub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 28 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  empCard: {},

  cardTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 5 },
  cardSub:   { fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 18, marginBottom: 14 },

  workerBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
  },
  workerBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },

  empBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
  },
  empBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },

  lock: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 4 },
});

/* ── Non-role step styles (gradient screen) ── */
const FROSTED      = 'rgba(255,255,255,0.15)';
const FROSTED_ON   = 'rgba(255,255,255,0.28)';
const BORDER_W     = 'rgba(255,255,255,0.35)';
const BORDER_W_ON  = '#fff';

const s = StyleSheet.create({
  root: { flex: 1 },

  progressRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 4 },
  dot: { height: 8, borderRadius: 4 },

  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },

  stepTitle: { fontSize: 21, fontWeight: '900', color: '#fff', marginBottom: 4, marginTop: 6 },
  stepSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 18 },

  /* Work type chips */
  chipGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  chip:        { width: '47%', paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1.5, borderColor: BORDER_W, borderRadius: 14, backgroundColor: FROSTED, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipOn:      { borderColor: BORDER_W_ON, backgroundColor: FROSTED_ON },
  chipEmoji:   { fontSize: 18 },
  chipLabel:   { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)', flex: 1 },
  chipLabelOn: { color: '#fff' },
  chipCheck:   { fontSize: 12, color: '#fff', fontWeight: '900' },

  /* Location map placeholder */
  mapBox:      { height: 120, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER_W, marginBottom: 14, backgroundColor: FROSTED, alignItems: 'center', justifyContent: 'center' },
  mapPin:      { fontSize: 32 },
  mapBadge:    { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  mapBadgeTxt: { fontSize: 11, fontWeight: '600', color: '#fff' },

  /* Location row */
  locRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1.5, borderColor: BORDER_W, borderRadius: 14, backgroundColor: FROSTED, marginBottom: 12 },
  locRowOn: { borderColor: BORDER_W_ON, backgroundColor: FROSTED_ON },
  locIcon:  { fontSize: 18 },
  locLabel: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  orTxt:    { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 12 },

  /* Text field */
  fieldRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER_W, borderRadius: 14, backgroundColor: FROSTED, marginBottom: 16, overflow: 'hidden' },
  fieldRowOn:  { borderColor: BORDER_W_ON, backgroundColor: FROSTED_ON },
  fieldIcon:   { fontSize: 16, paddingHorizontal: 12, color: '#fff' },
  field:       { flex: 1, fontSize: 14, color: '#fff', paddingVertical: 13, paddingRight: 12 },

  /* Availability rows */
  availRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1.5, borderColor: BORDER_W, borderRadius: 14, backgroundColor: FROSTED, marginBottom: 10 },
  availRowOn: { borderColor: BORDER_W_ON, backgroundColor: FROSTED_ON },
  availIcon:  { fontSize: 22 },
  availLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  availSub:   { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  radio:      { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: BORDER_W, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  radioOn:    { borderColor: '#fff', backgroundColor: '#fff' },
  radioDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },

  /* Employer */
  label:   { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 8 },
  infoBox: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: FROSTED, borderWidth: 1, borderColor: BORDER_W, borderRadius: 14, alignItems: 'flex-start', marginTop: 8 },
  infoTxt: { fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1, lineHeight: 20 },

  catRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: 1.5, borderColor: BORDER_W, borderRadius: 14, backgroundColor: FROSTED, marginBottom: 8 },
  catRowOn: { borderColor: BORDER_W_ON, backgroundColor: FROSTED_ON },
  catIcon:  { fontSize: 22 },
  catLabel: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1 },

  /* Smart suggestions strip */
  suggestLabel:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5, textTransform: 'uppercase' },
  suggestChip:     { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.1)' },
  suggestChipOn:   { borderColor: '#2ECC71', backgroundColor: 'rgba(46,204,113,0.2)' },
  suggestChipTxt:  { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  suggestChipTxtOn:{ color: '#fff', fontWeight: '700' },

  /* Job category picker modal */
  catModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  catModalSheet: {
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    maxHeight: '82%', paddingTop: 20, paddingBottom: 10,
  },
  catModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 14,
  },
  catModalTitle: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  catModalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  catDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 20, marginBottom: 10 },

  /* List rows */
  catListRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  catListRowOn:    { borderColor: '#2ECC71', backgroundColor: 'rgba(46,204,113,0.18)' },
  catListRowOther: { borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.35)' },
  catListIcon:     { fontSize: 22, width: 30, textAlign: 'center' },
  catListLabel:    { flex: 1, fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.88)' },
  catListLabelOn:  { color: '#fff', fontWeight: '700' },
  catListOther:    { color: 'rgba(255,255,255,0.65)', fontStyle: 'italic' },
  catListCheck:    { fontSize: 16, color: '#2ECC71', fontWeight: '900' },
  catListArrow:    { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },

  /* Profile pic */
  picWrap:        { alignSelf: 'center', marginBottom: 22, position: 'relative' },
  picImage:       { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#fff' },
  picPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: FROSTED, borderWidth: 2, borderColor: BORDER_W, alignItems: 'center', justifyContent: 'center', gap: 4 },
  picCamera:      { fontSize: 28 },
  picHint:        { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  picBadge:       { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: GREEN, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  /* Bio */
  wordCountTxt: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  bioField:     { paddingTop: 12, minHeight: 90 },

  /* Profile step */
  profileStep:    { fontSize: 12, fontWeight: '800', color: '#7EE8A2', letterSpacing: 1.5, marginBottom: 20, marginTop: -2 },

  catChipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  catChip:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: FROSTED_ON, borderWidth: 1.5, borderColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  catChipIcon:    { fontSize: 14 },
  catChipTxt:     { fontSize: 12, color: '#fff', fontWeight: '700' },
  catChipAdd:     { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderStyle: 'dashed' },
  catChipAddTxt:  { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
  extraCatGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, padding: 14, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 14 },

  availBoxRow:    { flexDirection: 'row', gap: 10, marginBottom: 20 },
  availBox:       { flex: 1, alignItems: 'center', paddingVertical: 14, borderWidth: 1.5, borderColor: BORDER_W, borderRadius: 14, backgroundColor: FROSTED, gap: 4 },
  availBoxOn:     { borderColor: '#fff', backgroundColor: FROSTED_ON },
  availBoxIcon:   { fontSize: 20 },
  availBoxTxt:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  availBoxTxtOn:  { color: '#fff' },

  /* Profile card preview */
  profileCard:       { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 18, padding: 16, marginBottom: 16 },
  profileCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  profileAvatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  profileAvatarTxt:  { fontSize: 18, fontWeight: '900', color: '#fff' },
  profileName:       { fontSize: 16, fontWeight: '900', color: '#fff' },
  profileMeta:       { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  profileBadge:      { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  profileBadgeTxt:   { fontSize: 10, fontWeight: '800', color: '#fff' },
  profileCats:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  profileCatPill:    { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  profileCatPillTxt: { fontSize: 11, color: '#fff', fontWeight: '600' },

  /* Selected location badge */
  selectedLoc:      { flexDirection: 'row', alignItems: 'center', backgroundColor: FROSTED_ON, borderWidth: 1.5, borderColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, gap: 8 },
  selectedLocIcon:  { fontSize: 16 },
  selectedLocTxt:   { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
  selectedLocClear: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '700' },

  /* Autocomplete dropdown */
  dropdown:       { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, marginBottom: 14, overflow: 'hidden' },
  dropItem:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dropItemBorder: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  dropItemIcon:   { fontSize: 14 },
  dropCity:       { fontSize: 14, fontWeight: '700', color: '#111827' },
  dropState:      { fontSize: 11, color: '#6B7280', marginTop: 1 },

  /* State browser */
  stateGrid:      { marginTop: 6, marginBottom: 10 },
  stateChip:      { flexDirection: 'row', alignItems: 'center', backgroundColor: FROSTED, borderWidth: 1, borderColor: BORDER_W, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6 },
  stateChipOpen:  { borderColor: '#fff', backgroundColor: FROSTED_ON },
  stateChipTxt:   { flex: 1, color: '#fff', fontWeight: '600', fontSize: 14 },
  stateChipArrow: { color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: '300' },

  /* City list */
  stateBack:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stateBackTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cityRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: FROSTED, borderWidth: 1, borderColor: BORDER_W, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 8 },
  cityIcon:     { fontSize: 14 },
  cityName:     { flex: 1, color: '#fff', fontWeight: '600', fontSize: 14 },

  /* Gender / Experience selection cards */
  selCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: FROSTED, borderWidth: 1.5, borderColor: BORDER_W,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  selCardOn:      { borderColor: GREEN, backgroundColor: 'rgba(30,138,60,0.15)' },
  selCardLabel:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  selCardLabelOn: { color: GREEN },
  selCardSub:     { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  selCardCheck:   { fontSize: 18, color: GREEN, fontWeight: '900' },
});
