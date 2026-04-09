import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://kaam-backend-production.up.railway.app';

export default function ChatScreen() {
  const router = useRouter();
  const { matchId, jobTitle, companyName } = useLocalSearchParams<{
    matchId: string; jobTitle: string; companyName: string;
  }>();

  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const t = await AsyncStorage.getItem('userToken');
    const uid = await AsyncStorage.getItem('userId');
    setToken(t);
    setUserId(uid);
    if (matchId && t) await fetchMessages(t);
    else setLoading(false);
  };

  const fetchMessages = async (t: string) => {
    try {
      const res = await fetch(`${API_URL}/api/messages/${matchId}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {}
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!input.trim() || !token || !matchId) return;
    const content = input.trim();
    setInput('');

    const temp = { id: `t_${Date.now()}`, content, senderId: userId, sender: { id: userId }, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, temp]);
    scrollToBottom();

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/messages/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.message) setMessages(prev => prev.map(m => m.id === temp.id ? data.message : m));
    } catch {}
    finally { setSending(false); }
  };

  const scrollToBottom = () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

  const submitReport = async () => {
    if (!reportReason) { Alert.alert('', 'Please select a reason'); return; }
    setReportSubmitting(true);
    try {
      await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId, reason: reportReason, description: reportDesc }),
      });
      setReportDone(true);
    } catch {}
    finally { setReportSubmitting(false); }
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Group messages by date
  const grouped: any[] = [];
  let lastDate = '';
  for (const m of messages) {
    const d = fmtDate(m.createdAt);
    if (d !== lastDate) { grouped.push({ type: 'date', id: `date_${d}`, label: d }); lastDate = d; }
    grouped.push({ type: 'msg', ...m });
  }

  if (loading) return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color="#FF4F5A" />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: nameColor(companyName) }]}>
          <Text style={styles.headerAvatarText}>{(companyName || 'C')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{companyName || 'Employer'}</Text>
          <Text style={styles.headerJob} numberOfLines={1}>{jobTitle || 'Job Opening'}</Text>
        </View>
        <TouchableOpacity onPress={() => setReportModal(true)} style={styles.reportBtn}>
          <Text style={styles.reportIcon}>⚑</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={grouped}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatEmoji}>👋</Text>
            <Text style={styles.emptyChatText}>Say hi to start the conversation!</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'date') {
            return (
              <View style={styles.dateDivider}>
                <View style={styles.dateLine} />
                <Text style={styles.dateLabel}>{item.label}</Text>
                <View style={styles.dateLine} />
              </View>
            );
          }
          const isMe = item.senderId === userId || item.sender?.id === userId;
          return (
            <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapThem]}>
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={isMe ? styles.bubbleMeText : styles.bubbleThemText}>{item.content}</Text>
                <Text style={isMe ? styles.timeMе : styles.timeThem}>{fmtTime(item.createdAt)}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor="#bbb"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onFocus={scrollToBottom}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.sendIcon}>↑</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Report Modal */}
      <Modal visible={reportModal} transparent animationType="slide">
        <View style={styles.reportOverlay}>
          <View style={styles.reportCard}>
            {reportDone ? (
              <>
                <Text style={styles.reportTitle}>Report Submitted</Text>
                <Text style={styles.reportSub}>Our team will review and take action within 24 hours. The user has been flagged.</Text>
                <TouchableOpacity style={styles.reportCloseBtn} onPress={() => { setReportModal(false); setReportDone(false); setReportReason(''); setReportDesc(''); }}>
                  <Text style={styles.reportCloseTxt}>Close</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.reportTitle}>Report User</Text>
                <Text style={styles.reportSub}>What is the issue?</Text>
                {['Fake job posting', 'Asking for money', 'Harassment', 'Fraud / Scam', 'Other'].map(r => (
                  <TouchableOpacity key={r} style={[styles.reportOption, reportReason === r && styles.reportOptionActive]} onPress={() => setReportReason(r)}>
                    <Text style={[styles.reportOptionTxt, reportReason === r && styles.reportOptionTxtActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={styles.reportInput}
                  placeholder="Describe what happened (optional)"
                  placeholderTextColor="#bbb"
                  value={reportDesc}
                  onChangeText={setReportDesc}
                  multiline
                />
                <View style={styles.reportBtns}>
                  <TouchableOpacity style={styles.reportCancelBtn} onPress={() => setReportModal(false)}>
                    <Text style={styles.reportCancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.reportSubmitBtn, reportSubmitting && { opacity: 0.6 }]} onPress={submitReport} disabled={reportSubmitting}>
                    {reportSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.reportSubmitTxt}>Submit Report</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function nameColor(name: string = '') {
  const colors = ['#FF4F5A', '#6C5CE7', '#00B894', '#0984E3', '#E17055'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F2EF' },

  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 50, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 22, color: '#FF4F5A', fontWeight: '700' },
  headerAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  headerJob: { fontSize: 12, color: '#999', marginTop: 1 },

  msgList: { paddingHorizontal: 14, paddingVertical: 16, flexGrow: 1 },

  dateDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
  dateLine: { flex: 1, height: 1, backgroundColor: '#E8E8E8' },
  dateLabel: { fontSize: 11, fontWeight: '700', color: '#bbb', paddingHorizontal: 4 },

  bubbleWrap: { marginBottom: 6 },
  bubbleWrapMe: { alignItems: 'flex-end' },
  bubbleWrapThem: { alignItems: 'flex-start' },

  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#FF4F5A', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },

  bubbleMeText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  bubbleThemText: { color: '#1A1A1A', fontSize: 15, lineHeight: 21 },
  timeMе: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeThem: { color: '#bbb', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyChatEmoji: { fontSize: 48, marginBottom: 12 },
  emptyChatText: { color: '#bbb', fontSize: 14 },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 8 },
  input: { flex: 1, backgroundColor: '#F4F2EF', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1A1A1A', maxHeight: 110, minHeight: 42 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FF4F5A', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#FFB8BB' },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '800' },

  reportBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  reportIcon: { fontSize: 20, color: '#FF4F5A' },
  reportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  reportCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  reportTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginBottom: 6 },
  reportSub: { fontSize: 14, color: '#888', marginBottom: 16 },
  reportOption: { borderWidth: 1.5, borderColor: '#E8E5E2', borderRadius: 12, padding: 14, marginBottom: 8 },
  reportOptionActive: { borderColor: '#FF4F5A', backgroundColor: '#FFF0F0' },
  reportOptionTxt: { fontSize: 14, color: '#555', fontWeight: '600' },
  reportOptionTxtActive: { color: '#FF4F5A', fontWeight: '700' },
  reportInput: { borderWidth: 1.5, borderColor: '#E8E5E2', borderRadius: 12, padding: 14, fontSize: 14, color: '#1A1A1A', height: 80, textAlignVertical: 'top', marginTop: 8, marginBottom: 16 },
  reportBtns: { flexDirection: 'row', gap: 12 },
  reportCancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E5E2', alignItems: 'center' },
  reportCancelTxt: { fontWeight: '700', color: '#888' },
  reportSubmitBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#FF4F5A', alignItems: 'center' },
  reportSubmitTxt: { fontWeight: '800', color: '#fff' },
  reportCloseBtn: { marginTop: 16, backgroundColor: '#F0EDE8', borderRadius: 12, padding: 16, alignItems: 'center' },
  reportCloseTxt: { fontWeight: '800', color: '#1A1A1A' },
});
