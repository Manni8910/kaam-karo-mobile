import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, FlatList
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import LocationPicker from './components/LocationPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';

const API_URL = 'https://kaam-backend-production.up.railway.app';
const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'];
const JOB_LABELS: Record<string, string> = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERNSHIP: 'Internship' };

type Screen = 'company' | 'list' | 'form' | 'detail';

const INDUSTRIES = ['Retail', 'Food & Restaurant', 'Transport', 'Security', 'Hospitality', 'Healthcare', 'Construction', 'IT / Tech', 'Education', 'Other'];

export default function PostJobScreen() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('list');
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [posting, setPosting] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Company profile state
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companyLocation, setCompanyLocation] = useState<any>(null);
  const [companyBio, setCompanyBio] = useState('');
  const [employerProfile, setEmployerProfile] = useState<any>(null);

  // Job form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [jobType, setJobType] = useState('FULL_TIME');
  const [location, setLocation] = useState<any>(null);
  const [duration, setDuration] = useState<'week' | 'twoweeks' | 'month'>('week');
  const [plans, setPlans] = useState<any>(null);
  const [isFree, setIsFree] = useState(true);

  useFocusEffect(useCallback(() => {
    loadMyJobs();
  }, []));

  const authFetch = async (url: string, options: any = {}) => {
    const t = token || await AsyncStorage.getItem('userToken');
    if (!t) { router.replace('/login'); throw new Error('no token'); }
    if (!token) setToken(t);
    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${t}` },
    });
    if (res.status === 401) { router.replace('/login'); throw new Error('expired'); }
    return res;
  };

  const loadMyJobs = async () => {
    setLoadingJobs(true);
    try {
      // Load company profile
      const profileRes = await authFetch(`${API_URL}/api/profile`);
      const profileData = await profileRes.json();
      const ep = profileData.user?.employerProfile;
      setEmployerProfile(ep || null);

      if (ep) {
        setCompanyName(ep.companyName || '');
        setIndustry(ep.industry || '');
        setCompanyBio(ep.bio || '');
        if (ep.locationName) setCompanyLocation({ label: ep.locationName });
      }

      // If no company name set (or still default), go to company setup first
      if (!ep || !ep.companyName || ep.companyName === 'My Company') {
        setScreen('company');
        setLoadingJobs(false);
        return;
      }

      // Load pricing plans
      try {
        const plansRes = await authFetch(`${API_URL}/api/payments/plans`);
        const plansData = await plansRes.json();
        setPlans(plansData.plans);
        setIsFree(plansData.isFree);
      } catch {}

      const res = await authFetch(`${API_URL}/api/jobs/mine`);
      const data = await res.json();
      const jobs = data.jobs || [];
      setMyJobs(jobs);
      setScreen(jobs.length === 0 ? 'form' : 'list');
    } catch {}
    finally { setLoadingJobs(false); }
  };

  const saveCompany = async () => {
    if (!companyName.trim()) { Alert.alert('', 'Please enter your company name'); return; }
    setSavingCompany(true);
    try {
      const res = await authFetch(`${API_URL}/api/profile/employer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          industry,
          locationName: (companyLocation as any)?.label || '',
          bio: companyBio.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) { Alert.alert('Error', data.error); return; }
      setEmployerProfile(data.profile);
      // After saving company, go to job list or form
      const jobsRes = await authFetch(`${API_URL}/api/jobs/mine`);
      const jobsData = await jobsRes.json();
      setMyJobs(jobsData.jobs || []);
      setScreen(jobsData.jobs?.length === 0 ? 'form' : 'list');
    } catch (e: any) {
      if (e.message !== 'expired') Alert.alert('Error', 'Could not save. Try again.');
    } finally {
      setSavingCompany(false);
    }
  };

  const loadApplicants = async (job: any) => {
    setSelectedJob(job);
    setScreen('detail');
    setLoadingApplicants(true);
    try {
      const res = await authFetch(`${API_URL}/api/jobs/${job.id}/applicants`);
      const data = await res.json();
      setApplicants(data.applicants || []);
    } catch {}
    finally { setLoadingApplicants(false); }
  };

  const postJobDirectly = async (durationDays: number, paymentId?: string) => {
    const res = await authFetch(`${API_URL}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, description,
        salaryMin: parseInt(salaryMin),
        salaryMax: parseInt(salaryMax),
        jobType,
        locationName: (location as any)?.label || (location as any)?.state,
        durationDays,
        paymentId,
      }),
    });
    const data = await res.json();
    if (data.error) { Alert.alert('Error', data.error); return; }
    setTitle(''); setDescription(''); setSalaryMin(''); setSalaryMax(''); setJobType('FULL_TIME'); setLocation(null);
    Alert.alert('🎉 Job Posted!', 'Your job is now live and seekers can start applying.');
    await loadMyJobs();
  };

  const handlePost = async () => {
    if (!title || !salaryMin || !salaryMax || !location) {
      Alert.alert('', 'Please fill title, salary and location');
      return;
    }
    setPosting(true);
    try {
      // Step 1: Create order (free or paid)
      const orderRes = await authFetch(`${API_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: duration, testPayment: __DEV__ }),
      });
      const orderData = await orderRes.json();
      if (orderData.error) { Alert.alert('Error', orderData.error); return; }

      // Step 2: Free period — post directly
      if (orderData.isFree) {
        await postJobDirectly(orderData.durationDays);
        return;
      }

      // Step 3: Paid — open Razorpay checkout in browser
      const checkoutUrl = `${API_URL}/api/payments/checkout?orderId=${orderData.orderId}&amount=${orderData.amount}&keyId=${orderData.keyId}&plan=${duration}&name=${encodeURIComponent(title)}`;
      const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
        toolbarColor: '#FF4F5A',
        controlsColor: '#fff',
      });

      // Step 4: After browser closes, check payment status
      const statusRes = await authFetch(`${API_URL}/api/payments/status/${orderData.orderId}`);
      const statusData = await statusRes.json();

      if (statusData.paid) {
        await postJobDirectly(statusData.durationDays, statusData.paymentId);
      } else {
        Alert.alert(
          'Payment Incomplete',
          'Payment was not completed. Your job was not posted. Try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      if (e.message !== 'expired') Alert.alert('Error', 'Could not post job. Try again.');
    } finally {
      setPosting(false);
    }
  };

  if (loadingJobs) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F2EF' }}>
      <ActivityIndicator size="large" color="#FF4F5A" />
    </View>
  );

  // ─── JOB DETAIL + APPLICANTS ───
  if (screen === 'detail' && selectedJob) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('list')} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedJob.title}</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Job stats */}
        <View style={styles.statsCard}>
          <StatBox value={selectedJob.stats?.seen || 0} label="Seen" color="#6C5CE7" />
          <View style={styles.statDiv} />
          <StatBox value={selectedJob.stats?.applied || 0} label="Applied" color="#FF4F5A" />
          <View style={styles.statDiv} />
          <StatBox value={selectedJob.stats?.matched || 0} label="Matched" color="#00B894" />
        </View>

        <View style={styles.jobInfoRow}>
          <Text style={styles.jobInfoText}>{selectedJob.locationName}</Text>
          <Text style={styles.jobInfoDot}>·</Text>
          <Text style={styles.jobInfoText}>{JOB_LABELS[selectedJob.jobType] || selectedJob.jobType}</Text>
          <Text style={styles.jobInfoDot}>·</Text>
          <Text style={styles.jobInfoText}>₹{selectedJob.salaryMin?.toLocaleString('en-IN')}–{selectedJob.salaryMax?.toLocaleString('en-IN')}/mo</Text>
        </View>

        <Text style={styles.sectionTitle}>Applicants</Text>

        {loadingApplicants ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#FF4F5A" />
          </View>
        ) : applicants.length === 0 ? (
          <View style={styles.emptyApplicants}>
            <Text style={styles.emptyApplicantsIcon}>👥</Text>
            <Text style={styles.emptyApplicantsTitle}>No applicants yet</Text>
            <Text style={styles.emptyApplicantsSub}>People will appear here when they swipe right on your job</Text>
          </View>
        ) : (
          <FlatList
            data={applicants}
            keyExtractor={item => item.swipeId}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            renderItem={({ item }) => (
              <View style={[styles.applicantCard, item.isMatched && styles.applicantMatched]}>
                <View style={styles.applicantLeft}>
                  <View style={[styles.applicantAvatar, { backgroundColor: item.isMatched ? '#00B894' : '#E0E0E0' }]}>
                    <Text style={styles.applicantAvatarText}>
                      {item.isMatched ? item.name[0].toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={styles.applicantInfo}>
                    <View style={styles.applicantNameRow}>
                      <Text style={styles.applicantName}>{item.name}</Text>
                      {item.isMatched && <View style={styles.matchedBadge}><Text style={styles.matchedBadgeText}>Matched</Text></View>}
                      {item.action === 'SUPER_LIKE' && <View style={styles.superBadge}><Text style={styles.superBadgeText}>Super Applied</Text></View>}
                    </View>
                    {item.isMatched && item.phone && (
                      <Text style={styles.applicantPhone}>{item.phone}</Text>
                    )}
                    {item.skills?.length > 0 && (
                      <Text style={styles.applicantSkills}>{item.skills.join(' · ')}</Text>
                    )}
                    {item.locationName && (
                      <Text style={styles.applicantLocation}>{item.locationName}</Text>
                    )}
                    {!item.isMatched && (
                      <Text style={styles.privacyNote}>Name and contact hidden until matched</Text>
                    )}
                  </View>
                </View>
                {item.isMatched && (
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => router.push({
                      pathname: '/chat',
                      params: { matchId: item.matchId, jobTitle: selectedJob.title, companyName: 'My Company' },
                    })}
                  >
                    <Text style={styles.chatBtnText}>Chat</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // ─── POST FORM ───
  if (screen === 'form') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {myJobs.length > 0 ? (
            <TouchableOpacity onPress={() => setScreen('list')} style={styles.backBtn}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 50 }} />}
          <Text style={styles.headerTitle}>Post a Job</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.form}>
          <Label text="Job Title" />
          <TextInput style={styles.input} placeholder="e.g. Chef, Driver, Cashier" placeholderTextColor="#bbb" value={title} onChangeText={setTitle} />

          <Label text="Job Description (optional)" />
          <TextInput style={[styles.input, styles.multiline]} placeholder="Describe the role and requirements..." placeholderTextColor="#bbb" value={description} onChangeText={setDescription} multiline numberOfLines={4} />

          <Label text="Job Type" />
          <View style={styles.typeRow}>
            {JOB_TYPES.map(t => (
              <TouchableOpacity key={t} style={[styles.typeBtn, jobType === t && styles.typeBtnActive]} onPress={() => setJobType(t)}>
                <Text style={[styles.typeBtnText, jobType === t && styles.typeBtnTextActive]}>{JOB_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Label text="Location" />
          <LocationPicker value={location} onChange={setLocation} placeholder="Select job location" />

          <Label text="Salary Range (per month in INR)" />
          <View style={styles.salaryRow}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min e.g. 12000" placeholderTextColor="#bbb" value={salaryMin} onChangeText={setSalaryMin} keyboardType="numeric" />
            <Text style={styles.dash}>to</Text>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max e.g. 20000" placeholderTextColor="#bbb" value={salaryMax} onChangeText={setSalaryMax} keyboardType="numeric" />
          </View>

          {/* Duration Picker */}
          <Label text="How long to post?" />
          {isFree && (
            <View style={styles.freeBanner}>
              <Text style={styles.freeBannerText}>Launch Offer: FREE for first 3 months!</Text>
            </View>
          )}
          <View style={styles.typeRow}>
            {([
              { key: 'week', label: '7 Days', price: 199 },
              { key: 'twoweeks', label: '14 Days', price: 349 },
              { key: 'month', label: '30 Days', price: 599 },
            ] as const).map(plan => (
              <TouchableOpacity
                key={plan.key}
                style={[styles.durationBtn, duration === plan.key && styles.durationBtnActive]}
                onPress={() => setDuration(plan.key)}
              >
                <Text style={[styles.durationLabel, duration === plan.key && styles.durationLabelActive]}>{plan.label}</Text>
                <Text style={[styles.durationPrice, duration === plan.key && styles.durationPriceActive]}>
                  {isFree ? 'FREE' : `₹${plan.price}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.postBtn, posting && { opacity: 0.6 }]} onPress={handlePost} disabled={posting}>
            {posting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.postBtnText}>
                  {isFree
                    ? 'Post Job FREE →'
                    : `Pay & Post Job ₹${duration === 'week' ? 199 : duration === 'twoweeks' ? 349 : 599} →`}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ─── COMPANY SETUP ───
  if (screen === 'company') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.companyHeader}>
          <View style={styles.companyHeaderIcon}>
            <Text style={styles.companyHeaderIconText}>{companyName ? companyName[0].toUpperCase() : 'C'}</Text>
          </View>
          <Text style={styles.companyHeaderTitle}>
            {employerProfile && employerProfile.companyName !== 'My Company' ? 'Edit Company' : 'Set Up Your Company'}
          </Text>
          <Text style={styles.companyHeaderSub}>This appears on all your job listings</Text>
        </View>

        <View style={styles.form}>
          <Label text="Company Name" />
          <TextInput style={styles.input} placeholder="e.g. D-Mart, Zomato, Star Health" placeholderTextColor="#bbb" value={companyName} onChangeText={setCompanyName} />

          <Label text="Industry" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
              {INDUSTRIES.map(ind => (
                <TouchableOpacity key={ind} style={[styles.typeBtn, industry === ind && styles.typeBtnActive]} onPress={() => setIndustry(ind)}>
                  <Text style={[styles.typeBtnText, industry === ind && styles.typeBtnTextActive]}>{ind}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Label text="Company Location" />
          <LocationPicker value={companyLocation} onChange={setCompanyLocation} placeholder="Where is your company based?" />

          <Label text="About Company (optional)" />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Brief description of your company..."
            placeholderTextColor="#bbb"
            value={companyBio}
            onChangeText={setCompanyBio}
            multiline numberOfLines={3}
          />

          <TouchableOpacity style={[styles.postBtn, savingCompany && { opacity: 0.6 }]} onPress={saveCompany} disabled={savingCompany}>
            {savingCompany ? <ActivityIndicator color="#fff" /> : <Text style={styles.postBtnText}>Save & Continue</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ─── MY JOBS LIST ───
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('company')} style={styles.companyPill}>
          <View style={styles.companyPillAvatar}>
            <Text style={styles.companyPillAvatarText}>{(employerProfile?.companyName || 'C')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.companyPillName} numberOfLines={1}>{employerProfile?.companyName || 'My Company'}</Text>
          <Text style={styles.companyPillEdit}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setScreen('form')} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={myJobs}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyApplicants}>
            <Text style={styles.emptyApplicantsTitle}>No jobs posted yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.jobCard} onPress={() => loadApplicants(item)} activeOpacity={0.75}>
            <View style={styles.jobCardTop}>
              <Text style={styles.jobCardTitle}>{item.title}</Text>
              <View style={[styles.activeBadge, !item.isActive && { backgroundColor: '#eee' }]}>
                <Text style={[styles.activeBadgeText, !item.isActive && { color: '#999' }]}>
                  {item.isActive ? 'Live' : 'Paused'}
                </Text>
              </View>
            </View>
            <Text style={styles.jobCardMeta}>{item.locationName} · {JOB_LABELS[item.jobType]}</Text>
            <Text style={styles.jobCardSalary}>₹{item.salaryMin?.toLocaleString('en-IN')} – ₹{item.salaryMax?.toLocaleString('en-IN')}/mo</Text>

            <View style={styles.jobCardStats}>
              <MiniStat value={item.stats?.seen || 0} label="Seen" color="#6C5CE7" />
              <MiniStat value={item.stats?.applied || 0} label="Applied" color="#FF4F5A" />
              <MiniStat value={item.stats?.matched || 0} label="Matched" color="#00B894" />
            </View>

            <Text style={styles.viewApplicants}>View Applicants</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 }}>{text}</Text>;
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: 12, color: '#999', fontWeight: '600', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F2EF' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0EDE8' },
  backBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  backText: { color: '#FF4F5A', fontSize: 15, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#1A1A1A', flex: 1, textAlign: 'center' },
  newBtn: { backgroundColor: '#FF4F5A', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Job list card
  jobCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  jobCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  jobCardTitle: { fontSize: 17, fontWeight: '900', color: '#1A1A1A', flex: 1 },
  activeBadge: { backgroundColor: '#E8FFF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  activeBadgeText: { fontSize: 11, fontWeight: '800', color: '#00B894' },
  jobCardMeta: { fontSize: 13, color: '#999', marginBottom: 2 },
  jobCardSalary: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  jobCardStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F4F2EF', paddingTop: 12, marginBottom: 10 },
  viewApplicants: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#FF4F5A' },

  // Stats card
  statsCard: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 18, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statDiv: { width: 1, backgroundColor: '#F4F2EF' },
  jobInfoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16, flexWrap: 'wrap', gap: 4 },
  jobInfoText: { fontSize: 12, color: '#999', fontWeight: '600' },
  jobInfoDot: { fontSize: 12, color: '#ddd', marginHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1A1A1A', paddingHorizontal: 16, marginBottom: 10 },

  // Applicant cards
  applicantCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  applicantMatched: { borderWidth: 1.5, borderColor: '#00B894' },
  applicantLeft: { flexDirection: 'row', flex: 1, gap: 12 },
  applicantAvatar: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  applicantAvatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  applicantInfo: { flex: 1 },
  applicantNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  applicantName: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  matchedBadge: { backgroundColor: '#E8FFF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  matchedBadgeText: { fontSize: 10, fontWeight: '800', color: '#00B894' },
  superBadge: { backgroundColor: '#FFF8E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  superBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFB800' },
  applicantPhone: { fontSize: 13, color: '#FF4F5A', fontWeight: '700', marginBottom: 3 },
  applicantSkills: { fontSize: 12, color: '#6C5CE7', fontWeight: '600', marginBottom: 2 },
  applicantLocation: { fontSize: 12, color: '#999' },
  privacyNote: { fontSize: 11, color: '#bbb', fontStyle: 'italic', marginTop: 4 },
  chatBtn: { backgroundColor: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginLeft: 8 },
  chatBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Form
  form: { padding: 16, paddingBottom: 60 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A' },
  multiline: { height: 100, textAlignVertical: 'top', paddingTop: 14 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8E5E2' },
  typeBtnActive: { backgroundColor: '#FF4F5A', borderColor: '#FF4F5A' },
  typeBtnText: { fontSize: 13, fontWeight: '700', color: '#888' },
  typeBtnTextActive: { color: '#fff' },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dash: { color: '#bbb', fontWeight: '700', fontSize: 13 },
  postBtn: { backgroundColor: '#FF4F5A', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 24, shadowColor: '#FF4F5A', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  postBtnText: { color: '#fff', fontWeight: '900', fontSize: 17 },

  emptyApplicants: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyApplicantsIcon: { fontSize: 48, marginBottom: 12 },
  emptyApplicantsTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  emptyApplicantsSub: { fontSize: 14, color: '#bbb', textAlign: 'center', lineHeight: 20 },

  // Company setup
  companyHeader: { backgroundColor: '#FF4F5A', alignItems: 'center', paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24 },
  companyHeaderIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: '#fff' },
  companyHeaderIconText: { fontSize: 34, fontWeight: '900', color: '#fff' },
  companyHeaderTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  companyHeaderSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  // Company pill in header
  companyPill: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 10 },
  companyPillAvatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FF4F5A', alignItems: 'center', justifyContent: 'center' },
  companyPillAvatarText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  companyPillName: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', flex: 1 },
  companyPillEdit: { fontSize: 12, color: '#FF4F5A', fontWeight: '700' },

  freeBanner: { backgroundColor: '#E8FFF4', borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center' },
  freeBannerText: { color: '#00B894', fontWeight: '800', fontSize: 13 },
  durationBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E8E5E2', borderRadius: 14, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  durationBtnActive: { borderColor: '#FF4F5A', backgroundColor: '#FFF5F5' },
  durationLabel: { fontSize: 13, fontWeight: '800', color: '#888' },
  durationLabelActive: { color: '#FF4F5A' },
  durationPrice: { fontSize: 16, fontWeight: '900', color: '#1A1A1A', marginTop: 4 },
  durationPriceActive: { color: '#FF4F5A' },
});
