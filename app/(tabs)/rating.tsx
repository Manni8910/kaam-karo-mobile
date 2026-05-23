import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, StatusBar, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const GREEN       = '#1E8A3C';
const GREEN_LIGHT = '#E8F5EE';
const TEXT        = '#111827';
const TEXT_MID    = '#6B7280';
const TEXT_LIGHT  = '#9CA3AF';
const BORDER      = '#E5E7EB';
const BG_GRAY     = '#F9FAFB';
const ORANGE      = '#F59E0B';



const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

export default function RatingScreen() {
  const router = useRouter();
  const { matchId, companyName, jobTitle } = useLocalSearchParams<{
    matchId?: string; companyName?: string; jobTitle?: string;
  }>();

  const [stars, setStars]       = useState(0);
  const [hoveredStar, setHover] = useState(0);
  const [review, setReview]     = useState('');
  const [submitting, setSubmit] = useState(false);
  const [done, setDone]         = useState(false);

  const displayed = hoveredStar || stars;

  const submit = async () => {
    if (stars === 0) { Alert.alert('', 'Please select a star rating'); return; }
    setSubmit(true);
    try {
      const uid = await AsyncStorage.getItem('kaam_uid');
      if (!uid) throw new Error('Not logged in');
      const { error } = await supabase.from('ratings').upsert({
        application_id: matchId,
        rater_id: uid,
        rating: stars,
        review: review.trim(),
      }, { onConflict: 'application_id,rater_id' });
      if (error) { Alert.alert('Error', error.message); return; }
      setDone(true);
    } catch { Alert.alert('Error', 'Could not submit. Try again.'); }
    finally { setSubmit(false); }
  };

  // ── Success state ──
  if (done) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.successWrap}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🙏</Text>
          <Text style={s.successTitle}>Thank you!</Text>
          <Text style={s.successSub}>Your review helps other workers make better decisions.</Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/')}>
            <Text style={s.doneBtnTxt}>Back to Jobs →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Rate Experience</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Company info */}
        <View style={s.companyCard}>
          <View style={s.companyAvatar}>
            <Text style={s.companyAvatarTxt}>{(companyName || 'C')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.companyName}>{companyName || 'Employer'}</Text>
            {jobTitle ? <Text style={s.jobTitle}>{jobTitle}</Text> : null}
          </View>
        </View>

        {/* Rating prompt */}
        <Text style={s.prompt}>How was your experience?</Text>
        <Text style={s.promptSub}>with {companyName || 'this employer'}</Text>

        {/* Stars */}
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity
              key={n}
              onPress={() => setStars(n)}
              style={s.starBtn}
              activeOpacity={0.7}
            >
              <Text style={[s.star, n <= displayed && s.starFilled]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        {displayed > 0 && (
          <Text style={s.starLabel}>{STAR_LABELS[displayed]}</Text>
        )}

        {/* Quick tags */}
        <View style={s.tagsRow}>
          {['Great pay', 'Good environment', 'On time payment', 'Friendly staff', 'Would recommend'].map(tag => {
            const selected = review.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[s.tag, selected && s.tagOn]}
                onPress={() => setReview(prev =>
                  prev.includes(tag)
                    ? prev.replace(tag, '').replace(/  /g, ' ').trim()
                    : (prev ? prev + ' ' + tag : tag)
                )}
              >
                <Text style={[s.tagTxt, selected && s.tagTxtOn]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Review text */}
        <Text style={s.reviewLabel}>Write a review (optional)</Text>
        <TextInput
          style={s.reviewInput}
          value={review}
          onChangeText={t => t.length <= 200 && setReview(t)}
          placeholder="Share your experience to help other workers…"
          placeholderTextColor={TEXT_LIGHT}
          multiline
          numberOfLines={4}
        />
        <Text style={s.charCount}>{review.length}/200</Text>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, (stars === 0 || submitting) && { opacity: 0.6 }]}
          onPress={submit}
          disabled={stars === 0 || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.submitTxt}>Submit Review ✓</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={() => router.replace('/')}>
          <Text style={s.skipTxt}>Skip for now</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

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
  headerTitle:{ fontSize: 22, fontWeight: '900', color: TEXT },

  scroll: { padding: 24, paddingBottom: 48 },

  companyCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BG_GRAY, borderRadius: 16,
    padding: 16, marginBottom: 28,
    borderWidth: 1, borderColor: BORDER,
  },
  companyAvatar:   { width: 52, height: 52, borderRadius: 16, backgroundColor: GREEN_LIGHT, alignItems: 'center', justifyContent: 'center' },
  companyAvatarTxt:{ fontSize: 24, fontWeight: '900', color: GREEN },
  companyName:  { fontSize: 16, fontWeight: '800', color: TEXT },
  jobTitle:     { fontSize: 13, color: TEXT_MID, marginTop: 2 },

  prompt:    { fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center' },
  promptSub: { fontSize: 14, color: TEXT_MID, textAlign: 'center', marginTop: 4, marginBottom: 24 },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  starBtn:  { padding: 4 },
  star:     { fontSize: 44, color: BORDER },
  starFilled:{ color: ORANGE },
  starLabel: { fontSize: 16, fontWeight: '800', color: ORANGE, textAlign: 'center', marginBottom: 24 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tag:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#fff' },
  tagOn:   { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  tagTxt:    { fontSize: 12, fontWeight: '600', color: TEXT_MID },
  tagTxtOn:  { color: GREEN },

  reviewLabel: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 8 },
  reviewInput: {
    backgroundColor: BG_GRAY, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
    padding: 14, fontSize: 14, color: TEXT, minHeight: 100, textAlignVertical: 'top',
  },
  charCount: { textAlign: 'right', fontSize: 11, color: TEXT_LIGHT, marginTop: 4, marginBottom: 24 },

  submitBtn: {
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: GREEN, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  skipBtn: { paddingVertical: 16, alignItems: 'center' },
  skipTxt: { fontSize: 14, color: TEXT_MID, fontWeight: '600' },

  // Success
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successTitle:{ fontSize: 28, fontWeight: '900', color: TEXT, marginBottom: 10 },
  successSub:  { fontSize: 15, color: TEXT_MID, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  doneBtn:     { backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 15 },
  doneBtnTxt:  { color: '#fff', fontWeight: '800', fontSize: 16 },
});
