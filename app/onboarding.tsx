import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform, StatusBar,
  Modal, FlatList, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { getUID, getPhone } from '../lib/session';

const GREEN      = '#08a63f';
const GREEN_DARK = '#057a31';
const GREEN_LIGHT= '#eaf8ef';
const BLUE       = '#1457c8';
const INK        = '#06142f';
const TEXT       = '#17243d';
const MUTED      = '#667085';
const BORDER     = '#e2e8f0';
const BG         = '#f8fbff';



type Step =
  | 'role'
  | 'workerBasic'
  | 'workerWork'
  | 'workerSkills'
  | 'workerLocation'
  | 'workerTrust'
  | 'employerSetup';

const STEP_NUMS: Partial<Record<Step, number>> = {
  workerBasic:    1,
  workerWork:     2,
  workerSkills:   3,
  workerLocation: 4,
  workerTrust:    5,
};
const TOTAL_WORKER_STEPS = 5;

const JOB_CATEGORIES = [
  { id: 'all',           label: 'Show All Jobs',    icon: '🔍' },
  { id: 'cook',          label: 'Chef / Cook',       icon: '🍳' },
  { id: 'waiter',        label: 'Waiter / Steward',  icon: '🍽️' },
  { id: 'cleaner',       label: 'Cleaner',           icon: '🧹' },
  { id: 'driver',        label: 'Driver',            icon: '🚗' },
  { id: 'delivery',      label: 'Delivery',          icon: '🛵' },
  { id: 'security',      label: 'Security Guard',    icon: '💂' },
  { id: 'helper',        label: 'Helper',            icon: '🤝' },
  { id: 'electrician',   label: 'Electrician',       icon: '⚡' },
  { id: 'plumber',       label: 'Plumber',           icon: '🔧' },
  { id: 'carpenter',     label: 'Carpenter',         icon: '🪚' },
  { id: 'data_entry',    label: 'Data Entry',        icon: '⌨️' },
  { id: 'receptionist',  label: 'Receptionist',      icon: '📋' },
  { id: 'accountant',    label: 'Accountant',        icon: '🧮' },
  { id: 'teacher',       label: 'Teacher',           icon: '👩‍🏫' },
  { id: 'sales',         label: 'Sales',             icon: '📣' },
  { id: 'it_support',    label: 'IT Support',        icon: '💻' },
  { id: 'construction',  label: 'Construction',      icon: '🏗️' },
  { id: 'mechanic',      label: 'Mechanic',          icon: '🔩' },
  { id: 'caretaker',     label: 'Caretaker',         icon: '🏥' },
];

const SUGGESTED_SKILLS = [
  'Communication', 'Cooking', 'Driving', 'Cleaning',
  'Customer Service', 'Data Entry', 'Teamwork', 'Time Management',
  'Sales', 'Electrical Work', 'Plumbing', 'Security',
];

const EXPERIENCE_OPTIONS = [
  { id: 'fresher', label: 'Fresher', sub: '0 years', value: 0 },
  { id: '1-2',     label: '1–2 years', sub: '1',    value: 1 },
  { id: '2-5',     label: '2–5 years', sub: '2',    value: 2 },
  { id: '5+',      label: '5+ years',  sub: '5',    value: 5 },
];

const GENDERS = ['Male', 'Female', 'Other'];

const BIZ_TYPES = [
  'Restaurant / Dhaba', 'Retail Shop', 'Logistics / Delivery',
  'Construction', 'Security Services', 'Healthcare / Clinic',
  'School / Academy', 'IT / Tech Company', 'Salon / Beauty',
  'Other',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHIFTS = ['Morning', 'Afternoon', 'Evening', 'Anytime'];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep]       = useState<Step>('role');
  const [loading, setLoading] = useState(false);

  // Worker - Basic
  const [wName, setWName]         = useState('');
  const [wGender, setWGender]     = useState('');
  const [wAge, setWAge]           = useState('');
  const [wCity, setWCity]         = useState('');
  const [showGenderModal, setShowGenderModal] = useState(false);

  // Worker - Work
  const [selectedJobs, setSelectedJobs]   = useState<string[]>(['all']);
  const [jobSearch, setJobSearch]         = useState('');

  // Worker - Skills
  const [skills, setSkills]         = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState('');

  // Worker - Location (Availability)
  const [openAny, setOpenAny]       = useState(false);
  const [startNow, setStartNow]     = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);

  // Worker - Trust
  const [profilePic, setProfilePic] = useState('');

  // Employer
  const [bizName, setBizName]   = useState('');
  const [empName, setEmpName]   = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [bizType, setBizType]   = useState('');
  const [showBizTypeModal, setShowBizTypeModal] = useState(false);

  const stepNum = STEP_NUMS[step] ?? 0;

  const goBack = () => {
    const map: Partial<Record<Step, Step>> = {
      workerBasic:    'role',
      workerWork:     'workerBasic',
      workerSkills:   'workerWork',
      workerLocation: 'workerSkills',
      workerTrust:    'workerLocation',
      employerSetup:  'role',
    };
    const prev = map[step];
    if (prev) setStep(prev);
    else router.back();
  };

  const toggleJob = (id: string) => {
    if (id === 'all') {
      setSelectedJobs(['all']);
      return;
    }
    setSelectedJobs(prev => {
      const without = prev.filter(x => x !== 'all');
      if (without.includes(id)) {
        const next = without.filter(x => x !== id);
        return next.length === 0 ? ['all'] : next;
      }
      if (without.length >= 2) return prev;
      return [...without, id];
    });
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(p => [...p, s]);
    setSkillInput('');
  };

  const toggleDay = (d: string) => {
    setSelectedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  };

  const toggleShift = (sh: string) => {
    setSelectedShifts(p => p.includes(sh) ? p.filter(x => x !== sh) : [...p, sh]);
  };

  const pickPhoto = async () => {
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
  };

  const finish = async (role: 'SEEKER' | 'EMPLOYER', extra: any) => {
    setLoading(true);
    try {
      const uid = await getUID();
      if (!uid) throw new Error('Not logged in');
      const phone = (await getPhone()) || '';

      if (role === 'SEEKER') {
        // Update users table
        await supabase.from('users').upsert({
          id: uid,
          phone_number: phone,
          active_role: 'worker',
          has_worker_profile: true,
          language: 'en',
        }, { onConflict: 'id' });

        // Upsert worker profile
        await supabase.from('worker_profiles').upsert({
          user_id: uid,
          full_name: extra.fullName || '',
          city: extra.location || '',
          formatted_location: extra.location ? `${extra.location}, India` : '',
          skills: extra.skills || [],
          category: extra.workTypes?.[0] || 'all',
          experience_years: parseInt(extra.experience) || 0,
          availability: extra.availability || {},
          is_open_to_work: true,
        }, { onConflict: 'user_id' });

      } else {
        // Employer
        await supabase.from('users').upsert({
          id: uid,
          phone_number: extra.phone?.trim() || phone,
          active_role: 'employer',
          has_employer_profile: true,
          language: 'en',
        }, { onConflict: 'id' });

        await supabase.from('employer_profiles').upsert({
          user_id: uid,
          business_name: extra.businessName || '',
          contact_person_name: extra.contactName || '',
          business_type: extra.businessType || 'Other',
          city: '',
          verification_status: 'pending',
        }, { onConflict: 'user_id' });
      }

      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Onboarding error:', e?.message);
      router.replace('/(tabs)');
    } finally { setLoading(false); }
  };

  const finishWorker = () => {
    finish('SEEKER', {
      fullName: wName, gender: wGender, age: wAge, location: wCity,
      workTypes: selectedJobs, skills, experience,
      availability: { openAny, startNow, days: selectedDays, shifts: selectedShifts },
      profilePic,
    });
  };

  const finishEmployer = () => {
    if (!bizName.trim() || !empName.trim()) return;
    finish('EMPLOYER', {
      businessName: bizName, contactName: empName,
      phone: empPhone, businessType: bizType,
    });
  };

  // ── Filtered job list for search
  const filteredJobs = jobSearch.trim().length > 1
    ? JOB_CATEGORIES.filter(j => j.id !== 'all' && j.label.toLowerCase().includes(jobSearch.toLowerCase()))
    : JOB_CATEGORIES;

  // ─────────────────────────────────────────────────────────────
  // ROLE STEP
  // ─────────────────────────────────────────────────────────────
  if (step === 'role') {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Header onBack={goBack} stepLabel="Choose path" />
          <Text style={s.title}>What do you want to do?</Text>
          <Text style={s.sub}>Choose one. You can switch anytime from Menu.</Text>

          <TouchableOpacity
            style={s.choiceBtn}
            onPress={() => setStep('workerBasic')}
            activeOpacity={0.85}
          >
            <View style={[s.ciIcon, { backgroundColor: '#eef2ff' }]}>
              <Text style={s.ciIconTxt}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.choiceBtnTitle}>Looking for work</Text>
              <Text style={s.choiceBtnSub}>Swipe jobs. Get hired faster.</Text>
            </View>
            <Text style={s.choiceArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.choiceBtn}
            onPress={() => setStep('employerSetup')}
            activeOpacity={0.85}
          >
            <View style={[s.ciIcon, { backgroundColor: '#eef2ff' }]}>
              <Text style={s.ciIconTxt}>💼</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.choiceBtnTitle}>Hiring workers</Text>
              <Text style={s.choiceBtnSub}>Post a job. Get workers in minutes.</Text>
            </View>
            <Text style={s.choiceArrow}>›</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // WORKER BASIC (1/5)
  // ─────────────────────────────────────────────────────────────
  if (step === 'workerBasic') {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Header onBack={goBack} stepLabel="1/5" />
          <ProgressBar current={1} total={TOTAL_WORKER_STEPS} />
          <Text style={s.title}>Basic details</Text>
          <Text style={s.sub}>This helps employers find you faster.</Text>

          {/* Name */}
          <View style={s.inputWrap}>
            <TextInput
              style={s.inputField}
              placeholder="Aman Lalh"
              placeholderTextColor={MUTED}
              value={wName}
              onChangeText={setWName}
              autoCapitalize="words"
            />
          </View>

          {/* Gender — tap to show modal */}
          <TouchableOpacity style={s.inputWrap} onPress={() => setShowGenderModal(true)} activeOpacity={0.8}>
            <Text style={[s.inputField, { paddingVertical: 18, color: wGender ? INK : MUTED }]}>
              {wGender || 'Gender'}
            </Text>
            <Text style={s.selectArrow}>›</Text>
          </TouchableOpacity>

          {/* Age */}
          <View style={s.inputWrap}>
            <TextInput
              style={s.inputField}
              placeholder="25"
              placeholderTextColor={MUTED}
              value={wAge}
              onChangeText={setWAge}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          {/* City */}
          <View style={s.inputWrap}>
            <TextInput
              style={s.inputField}
              placeholder="City, district, state"
              placeholderTextColor={MUTED}
              value={wCity}
              onChangeText={setWCity}
              autoCapitalize="words"
            />
          </View>

          <PrimaryBtn
            label="Continue"
            onPress={() => setStep('workerWork')}
            disabled={!wName.trim() || !wCity.trim()}
          />
        </ScrollView>

        {/* Gender picker modal */}
        <Modal visible={showGenderModal} transparent animationType="slide" onRequestClose={() => setShowGenderModal(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <Text style={s.modalTitle}>Select Gender</Text>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.modalItem, wGender === g && s.modalItemOn]}
                  onPress={() => { setWGender(g); setShowGenderModal(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.modalItemTxt, wGender === g && s.modalItemTxtOn]}>{g}</Text>
                  {wGender === g && <Text style={{ color: GREEN, fontWeight: '900' }}>✓</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowGenderModal(false)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // WORKER WORK (2/5)
  // ─────────────────────────────────────────────────────────────
  if (step === 'workerWork') {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Header onBack={goBack} stepLabel="2/5" />
          <ProgressBar current={2} total={TOTAL_WORKER_STEPS} />
          <Text style={s.title}>Job type</Text>
          <Text style={s.sub}>Choose up to TWO types of job you're looking for.</Text>

          {/* Search */}
          <View style={s.searchWrap}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search job title..."
              placeholderTextColor={MUTED}
              value={jobSearch}
              onChangeText={setJobSearch}
            />
          </View>

          {/* Add role button */}
          <TouchableOpacity style={s.outlineBtn} activeOpacity={0.8}>
            <Text style={s.outlineBtnTxt}>+ Add Role</Text>
          </TouchableOpacity>

          {/* Selected panel */}
          <View style={s.panel}>
            <View style={s.panelHeader}>
              <Text style={s.sectionLabel}>SELECTED JOB TYPE</Text>
              <Text style={s.panelCount}>{selectedJobs.length}</Text>
            </View>
            <Text style={s.panelDesc}>
              {selectedJobs.includes('all')
                ? 'All job types'
                : selectedJobs.map(id => JOB_CATEGORIES.find(j => j.id === id)?.label).join(', ')}
            </Text>
          </View>

          {/* Show All Jobs choice */}
          <TouchableOpacity
            style={[s.choiceBtn, selectedJobs.includes('all') && s.choiceBtnOn]}
            onPress={() => toggleJob('all')}
            activeOpacity={0.85}
          >
            <Text style={s.ciIconTxt}>🔍</Text>
            <Text style={[s.choiceBtnTitle, { flex: 1 }]}>Show All Jobs</Text>
            {selectedJobs.includes('all') && <Text style={{ color: GREEN, fontWeight: '900' }}>✓</Text>}
          </TouchableOpacity>

          {/* Grid 2 cols */}
          <View style={s.jobGrid}>
            {filteredJobs.filter(j => j.id !== 'all').map(j => {
              const on = selectedJobs.includes(j.id);
              return (
                <TouchableOpacity
                  key={j.id}
                  style={[s.jobCard, on && s.jobCardOn]}
                  onPress={() => toggleJob(j.id)}
                  activeOpacity={0.8}
                >
                  <Text style={s.jobCardIcon}>{j.icon}</Text>
                  <Text style={[s.jobCardLabel, on && s.jobCardLabelOn]}>{j.label}</Text>
                  {on && <Text style={{ color: GREEN, fontSize: 11, fontWeight: '900' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryBtn
            label="Continue"
            onPress={() => setStep('workerSkills')}
            disabled={selectedJobs.length === 0}
          />
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // WORKER SKILLS (3/5)
  // ─────────────────────────────────────────────────────────────
  if (step === 'workerSkills') {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Header onBack={goBack} stepLabel="3/5" />
          <ProgressBar current={3} total={TOTAL_WORKER_STEPS} />
          <Text style={s.title}>Skills & experience</Text>
          <Text style={s.sub}>Add 2–3 skills to get better matches.</Text>

          <Text style={s.h3}>Suggested Skills</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={s.chipRow}>
              {SUGGESTED_SKILLS.map(sk => {
                const on = skills.includes(sk);
                return (
                  <TouchableOpacity
                    key={sk}
                    style={[s.chip, on && s.chipOn]}
                    onPress={() => setSkills(p => on ? p.filter(x => x !== sk) : [...p, sk])}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>{sk}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Your skills panel */}
          <View style={s.panel}>
            <View style={s.panelHeader}>
              <Text style={s.sectionLabel}>YOUR SKILLS</Text>
              <Text style={s.panelCount}>{skills.length}</Text>
            </View>
            {skills.length === 0
              ? <Text style={s.panelDesc}>No skills added yet.</Text>
              : (
                <View style={s.chipRowWrap}>
                  {skills.map(sk => (
                    <TouchableOpacity key={sk} style={s.chipOn} onPress={() => setSkills(p => p.filter(x => x !== sk))} activeOpacity={0.8}>
                      <Text style={s.chipTxtOn}>{sk} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
          </View>

          <Text style={s.h3}>Add Skill</Text>
          <View style={s.addSkillRow}>
            <View style={[s.inputWrap, { flex: 1, marginBottom: 0 }]}>
              <TextInput
                style={s.inputField}
                placeholder="Type a skill..."
                placeholderTextColor={MUTED}
                value={skillInput}
                onChangeText={setSkillInput}
                onSubmitEditing={addSkill}
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity style={s.addSkillBtn} onPress={addSkill} activeOpacity={0.8}>
              <Text style={s.addSkillBtnTxt}>+ Add Skill</Text>
            </TouchableOpacity>
          </View>

          <Text style={[s.h3, { marginTop: 20 }]}>Experience</Text>
          <View style={s.expGrid}>
            {EXPERIENCE_OPTIONS.map(e => {
              const on = experience === e.id;
              return (
                <TouchableOpacity
                  key={e.id}
                  style={[s.expCard, on && s.expCardOn]}
                  onPress={() => setExperience(e.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.expCardTitle, on && s.expCardTitleOn]}>{e.label}</Text>
                  <Text style={s.expCardSub}>{e.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryBtn
            label="Continue"
            onPress={() => setStep('workerLocation')}
            disabled={skills.length === 0 && !experience}
          />
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // WORKER LOCATION/AVAILABILITY (4/5)
  // ─────────────────────────────────────────────────────────────
  if (step === 'workerLocation') {
    const allDaysSelected = selectedDays.length === DAYS.length;
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Header onBack={goBack} stepLabel="4/5" />
          <ProgressBar current={4} total={TOTAL_WORKER_STEPS} />
          <Text style={s.title}>Availability</Text>
          <Text style={s.sub}>Clear availability helps employers select you faster.</Text>

          <Text style={s.sectionLabel}>FLEXIBLE OPTION</Text>
          <TouchableOpacity
            style={[s.choiceBtn, openAny && s.choiceBtnOn]}
            onPress={() => setOpenAny(v => !v)}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.choiceBtnTitle}>I'm open to any day and any time</Text>
              <Text style={s.choiceBtnSub}>Maximum flexibility for employers</Text>
            </View>
            {openAny && <Text style={{ color: GREEN, fontWeight: '900', fontSize: 16 }}>✓</Text>}
          </TouchableOpacity>

          <Text style={[s.sectionLabel, { marginTop: 16 }]}>START AVAILABILITY</Text>
          <View style={s.availRow}>
            {['Immediate', 'On Demand'].map(opt => (
              <TouchableOpacity
                key={opt}
                style={[s.availChoice, startNow === opt && s.availChoiceOn]}
                onPress={() => setStartNow(opt)}
                activeOpacity={0.8}
              >
                <Text style={[s.availChoiceTxt, startNow === opt && s.availChoiceTxtOn]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.sectionLabel, { marginTop: 16 }]}>DAYS</Text>
          <TouchableOpacity
            style={[s.choiceBtn, allDaysSelected && s.choiceBtnOn, { marginBottom: 10 }]}
            onPress={() => setSelectedDays(allDaysSelected ? [] : [...DAYS])}
            activeOpacity={0.85}
          >
            <Text style={[s.choiceBtnTitle, { flex: 1 }]}>Select All Days</Text>
            {allDaysSelected && <Text style={{ color: GREEN, fontWeight: '900' }}>✓</Text>}
          </TouchableOpacity>
          <View style={s.chipRowWrap}>
            {DAYS.map(d => {
              const on = selectedDays.includes(d);
              return (
                <TouchableOpacity
                  key={d}
                  style={[s.chip, on && s.chipOn]}
                  onPress={() => toggleDay(d)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipTxt, on && s.chipTxtOn]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.sectionLabel, { marginTop: 16 }]}>SHIFT PREFERENCE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={s.chipRow}>
              {SHIFTS.map(sh => {
                const on = selectedShifts.includes(sh);
                return (
                  <TouchableOpacity
                    key={sh}
                    style={[s.chip, on && s.chipOn]}
                    onPress={() => toggleShift(sh)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipTxt, on && s.chipTxtOn]}>{sh}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <PrimaryBtn
            label="Continue"
            onPress={() => setStep('workerTrust')}
            disabled={false}
          />
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // WORKER TRUST (5/5)
  // ─────────────────────────────────────────────────────────────
  if (step === 'workerTrust') {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Header onBack={goBack} stepLabel="5/5" />
          <ProgressBar current={5} total={TOTAL_WORKER_STEPS} />
          <Text style={s.title}>Build Trust and Get Hired</Text>
          <Text style={s.sub}>Increase your chances of getting hired.</Text>

          {/* Phone verified panel */}
          <View style={s.panel}>
            <View style={s.trustBadge}>
              <Text style={s.trustBadgeTxt}>Phone Verified</Text>
            </View>
            <Text style={s.trustPanelTitle}>Verified</Text>
            <Text style={s.trustPanelSub}>Your number is confirmed.</Text>
          </View>

          {/* Photo panel */}
          <View style={s.panel}>
            <View style={[s.trustBadge, { backgroundColor: '#eef2ff', borderColor: 'rgba(20,87,200,0.3)' }]}>
              <Text style={[s.trustBadgeTxt, { color: BLUE }]}>Photo Verification Optional</Text>
            </View>
            <Text style={s.trustPanelTitle}>Add a profile photo</Text>
            <Text style={s.trustPanelSub}>Workers with photos get 3x more responses.</Text>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={s.trustPhoto} />
            ) : null}
            <TouchableOpacity style={s.outlineBtn} onPress={pickPhoto} activeOpacity={0.8}>
              <Text style={s.outlineBtnTxt}>Upload Profile Photo</Text>
            </TouchableOpacity>
          </View>

          {/* btn-row */}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.skipBtn} onPress={finishWorker} activeOpacity={0.8} disabled={loading}>
              <Text style={s.skipBtnTxt}>Skip for now</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={finishWorker} style={s.continueBtnWrap} activeOpacity={0.85} disabled={loading}>
              <LinearGradient
                colors={['#08a63f', '#10bd52', '#1457c8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.continueBtn}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.continueBtnTxt}>Continue</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // EMPLOYER SETUP
  // ─────────────────────────────────────────────────────────────
  if (step === 'employerSetup') {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} translucent={false} />
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Header onBack={goBack} stepLabel="Business" />
          <Text style={s.title}>Set up your business</Text>
          <Text style={s.sub}>This helps workers trust your job posts.</Text>

          {/* Business name */}
          <Text style={s.fieldLabel}>Business Name</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={s.inputField}
              placeholder="Your business name"
              placeholderTextColor={MUTED}
              value={bizName}
              onChangeText={setBizName}
              autoFocus
            />
          </View>

          {/* Your name */}
          <Text style={s.fieldLabel}>Your Name</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={s.inputField}
              placeholder="Contact person name"
              placeholderTextColor={MUTED}
              value={empName}
              onChangeText={setEmpName}
              autoCapitalize="words"
            />
          </View>

          {/* Phone with +91 prefix */}
          <Text style={s.fieldLabel}>Phone</Text>
          <View style={[s.inputWrap, { flexDirection: 'row' }]}>
            <Text style={s.prefix91}>+91</Text>
            <TextInput
              style={[s.inputField, { flex: 1 }]}
              placeholder="Phone number"
              placeholderTextColor={MUTED}
              value={empPhone}
              onChangeText={setEmpPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          {/* Business type */}
          <Text style={s.fieldLabel}>Business Type</Text>
          <TouchableOpacity style={s.inputWrap} onPress={() => setShowBizTypeModal(true)} activeOpacity={0.8}>
            <Text style={[s.inputField, { paddingVertical: 18, color: bizType ? INK : MUTED }]}>
              {bizType || 'Select business type'}
            </Text>
            <Text style={s.selectArrow}>›</Text>
          </TouchableOpacity>

          <PrimaryBtn
            label="Continue"
            onPress={finishEmployer}
            disabled={!bizName.trim() || !empName.trim() || loading}
            loading={loading}
          />
        </ScrollView>

        {/* Biz type modal */}
        <Modal visible={showBizTypeModal} transparent animationType="slide" onRequestClose={() => setShowBizTypeModal(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <Text style={s.modalTitle}>Business Type</Text>
              <FlatList
                data={BIZ_TYPES}
                keyExtractor={item => item}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.modalItem, bizType === item && s.modalItemOn]}
                    onPress={() => { setBizType(item); setShowBizTypeModal(false); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.modalItemTxt, bizType === item && s.modalItemTxtOn]}>{item}</Text>
                    {bizType === item && <Text style={{ color: GREEN, fontWeight: '900' }}>✓</Text>}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: BORDER }} />}
              />
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowBizTypeModal(false)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return null;
}

// ── Sub-components ──────────────────────────────────────────────

function Header({ onBack, stepLabel }: { onBack: () => void; stepLabel?: string }) {
  return (
    <View style={hdr.row}>
      <TouchableOpacity style={hdr.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Text style={hdr.backTxt}>←</Text>
      </TouchableOpacity>
      <Image
        source={require('../assets/images/kaam-karo-logo.jpg')}
        style={hdr.logo}
        resizeMode="contain"
      />
      {stepLabel ? (
        <View style={hdr.tag}>
          <Text style={hdr.tagTxt}>{stepLabel}</Text>
        </View>
      ) : <View style={{ width: 44 }} />}
    </View>
  );
}
const hdr = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  backTxt: { fontSize: 18, color: INK, fontWeight: '700' },
  logo:    { width: 116, height: 34 },
  tag:     { backgroundColor: '#eef2ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  tagTxt:  { fontSize: 12, fontWeight: '700', color: BLUE },
});

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={pb.track}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[pb.seg, { flex: 1 }]}
        >
          {i < current ? (
            <LinearGradient colors={['#08a63f', '#1457c8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pb.fill} />
          ) : (
            <View style={[pb.fill, { backgroundColor: BORDER }]} />
          )}
        </View>
      ))}
    </View>
  );
}
const pb = StyleSheet.create({
  track: { flexDirection: 'row', gap: 4, height: 5, marginBottom: 24 },
  seg:   { borderRadius: 3, overflow: 'hidden' },
  fill:  { flex: 1 },
});

function PrimaryBtn({ label, onPress, disabled = false, loading = false }: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[pb2.wrap, (disabled || loading) && pb2.dim]}
    >
      <LinearGradient
        colors={['#08a63f', '#10bd52', '#1457c8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={pb2.btn}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={pb2.txt}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}
const pb2 = StyleSheet.create({
  wrap: {
    borderRadius: 18, overflow: 'hidden', marginTop: 8,
    shadowColor: GREEN, shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  dim: { opacity: 0.45, shadowOpacity: 0 },
  btn: { minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  txt: { fontSize: 17, fontWeight: '900', color: '#fff' },
});

// ── Shared styles ───────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 48,
  },

  title: { fontSize: 28, fontWeight: '950', color: INK, marginBottom: 8, letterSpacing: -0.4, lineHeight: 34 },
  sub:   { fontSize: 15, color: MUTED, marginBottom: 24, lineHeight: 22 },
  h3:    { fontSize: 15, fontWeight: '800', color: INK, marginBottom: 10 },

  /* Input */
  inputWrap: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 20,
    backgroundColor: '#fff', minHeight: 58, marginBottom: 14,
    overflow: 'hidden', justifyContent: 'center',
    shadowColor: INK, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
    flexDirection: 'row', alignItems: 'center',
  },
  inputField: { flex: 1, fontSize: 16, color: INK, fontWeight: '500', paddingHorizontal: 18, paddingVertical: 0 },
  selectArrow: { fontSize: 20, color: MUTED, paddingRight: 16 },
  prefix91: {
    paddingHorizontal: 16, fontSize: 16, fontWeight: '700', color: INK,
    borderRightWidth: 1, borderRightColor: BORDER,
    alignSelf: 'stretch', textAlignVertical: 'center', lineHeight: 58,
  },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: INK, marginBottom: 8 },

  /* Panel / card */
  panel: {
    backgroundColor: '#fff', borderRadius: 22,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: INK, shadowOpacity: 0.08, shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 }, elevation: 3,
    padding: 16, marginBottom: 14,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  panelCount:  { fontSize: 14, fontWeight: '900', color: GREEN },
  panelDesc:   { fontSize: 13, color: MUTED },

  /* Section label */
  sectionLabel: {
    fontSize: 12, fontWeight: '950', color: MUTED,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  /* Choice button */
  choiceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff',
    borderRadius: 22, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 12,
    shadowColor: INK, shadowOpacity: 0.08, shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 }, elevation: 3,
  },
  choiceBtnOn: {
    backgroundColor: GREEN_LIGHT,
    borderColor: 'rgba(8,166,63,0.45)',
  },
  choiceBtnTitle: { fontSize: 15, fontWeight: '800', color: INK, marginBottom: 2 },
  choiceBtnSub:   { fontSize: 13, color: MUTED },
  choiceArrow:    { fontSize: 22, color: MUTED, fontWeight: '300' },

  ciIcon:    { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ciIconTxt: { fontSize: 20 },

  /* Job grid 2 cols */
  jobGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  jobCard: {
    width: '47%', backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
    padding: 12, alignItems: 'center', gap: 4,
  },
  jobCardOn: { backgroundColor: GREEN_LIGHT, borderColor: 'rgba(8,166,63,0.45)' },
  jobCardIcon:    { fontSize: 22 },
  jobCardLabel:   { fontSize: 12, fontWeight: '600', color: MUTED, textAlign: 'center' },
  jobCardLabelOn: { color: GREEN_DARK },

  /* Search */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 50, marginBottom: 12,
  },
  searchIcon:  { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: INK },

  /* Outline button */
  outlineBtn: {
    borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(8,166,63,0.32)',
    backgroundColor: '#fff', height: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  outlineBtnTxt: { fontSize: 15, fontWeight: '700', color: GREEN_DARK },

  /* Chips */
  chipRow:    { flexDirection: 'row', gap: 8, paddingRight: 16 },
  chipRowWrap:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1.5, borderColor: BORDER },
  chipOn:     { backgroundColor: GREEN, borderColor: GREEN, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipTxt:    { fontSize: 13, fontWeight: '600', color: MUTED },
  chipTxtOn:  { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* Add skill row */
  addSkillRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  addSkillBtn: {
    height: 58, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(8,166,63,0.32)',
    paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  addSkillBtnTxt: { fontSize: 13, fontWeight: '700', color: GREEN_DARK },

  /* Experience grid 2x2 */
  expGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  expCard: {
    width: '47%', backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
    padding: 14, alignItems: 'center',
  },
  expCardOn:      { backgroundColor: GREEN_LIGHT, borderColor: 'rgba(8,166,63,0.45)' },
  expCardTitle:   { fontSize: 14, fontWeight: '800', color: INK, marginBottom: 2 },
  expCardTitleOn: { color: GREEN_DARK },
  expCardSub:     { fontSize: 12, color: MUTED },

  /* Availability */
  availRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  availChoice: {
    flex: 1, height: 50, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  availChoiceOn:  { backgroundColor: GREEN_LIGHT, borderColor: 'rgba(8,166,63,0.45)' },
  availChoiceTxt: { fontSize: 14, fontWeight: '700', color: MUTED },
  availChoiceTxtOn:{ color: GREEN_DARK },

  /* Trust step */
  trustBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GREEN_LIGHT,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(8,166,63,0.3)',
    marginBottom: 8,
  },
  trustBadgeTxt:  { fontSize: 11, fontWeight: '700', color: GREEN_DARK },
  trustPanelTitle:{ fontSize: 16, fontWeight: '800', color: INK, marginBottom: 4 },
  trustPanelSub:  { fontSize: 13, color: MUTED, marginBottom: 12 },
  trustPhoto:     { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },

  /* Finish btn row */
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  skipBtn: {
    flex: 1, height: 58, borderRadius: 18,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(8,166,63,0.32)',
    alignItems: 'center', justifyContent: 'center',
  },
  skipBtnTxt: { fontSize: 15, fontWeight: '700', color: GREEN_DARK },
  continueBtnWrap: {
    flex: 1, borderRadius: 18, overflow: 'hidden',
    shadowColor: GREEN, shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  continueBtn:    { minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  continueBtnTxt: { fontSize: 17, fontWeight: '900', color: '#fff' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 20, paddingBottom: 40, maxHeight: '70%', paddingHorizontal: 20,
  },
  modalTitle:     { fontSize: 18, fontWeight: '900', color: INK, marginBottom: 16 },
  modalItem:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 4 },
  modalItemOn:    { backgroundColor: GREEN_LIGHT, marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 10 },
  modalItemTxt:   { fontSize: 16, fontWeight: '600', color: TEXT },
  modalItemTxtOn: { color: GREEN_DARK, fontWeight: '700' },
  modalCancel:    { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  modalCancelTxt: { fontSize: 15, fontWeight: '700', color: MUTED },
});
