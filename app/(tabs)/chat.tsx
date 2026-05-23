import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

const GREEN       = '#1E8A3C';
const GREEN_LIGHT = '#E8F5EE';
const TEXT        = '#111827';
const TEXT_MID    = '#6B7280';
const TEXT_LIGHT  = '#9CA3AF';
const BORDER      = '#E5E7EB';
const BG_GRAY     = '#F9FAFB';
const CHAT_BG     = '#F0F4F0';

const QUICK_REPLIES = [
  'Yes, I am interested',
  'What is the location?',
  'What are the working hours?',
  'Is accommodation provided?',
];

export default function ChatScreen() {
  const router = useRouter();
  const { matchId, jobTitle, companyName } = useLocalSearchParams<{
    matchId: string; jobTitle: string; companyName: string;
  }>();

  const listRef = useRef<FlatList>(null);
  const [msgs, setMsgs]       = useState<any[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId]   = useState('');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const uid = await AsyncStorage.getItem('kaam_uid');
    if (uid) setUserId(uid);
    if (matchId && uid) await fetchMsgs();
    else setLoading(false);
  };

  const fetchMsgs = async () => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('application_id', matchId)
        .order('created_at', { ascending: true });
      setMsgs(data || []);
    } catch {}
    finally { setLoading(false); }
  };

  const send = async (text: string) => {
    const txt = text.trim();
    if (!txt || !matchId) return;
    const uid = await AsyncStorage.getItem('kaam_uid');
    if (!uid) return;
    const temp = { id: `tmp-${Date.now()}`, content: txt, sender_id: uid, created_at: new Date().toISOString() };
    setMsgs(m => [...m, temp]);
    setInput('');
    setSending(true);
    try {
      await supabase.from('messages').insert({
        application_id: matchId,
        sender_id: uid,
        content: txt,
      });
      await fetchMsgs();
    } catch {}
    finally { setSending(false); }
  };

  const scrollToBottom = () => {
    if (msgs.length > 0) listRef.current?.scrollToEnd({ animated: true });
  };

  if (!matchId) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.header}><Text style={s.headerTitle}>Messages</Text></View>
        <View style={s.noChat}>
          <Text style={{ fontSize: 48 }}>💬</Text>
          <Text style={s.noChatTitle}>No messages yet</Text>
          <Text style={s.noChatSub}>Apply to jobs and start chatting with employers</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/')}>
            <Text style={s.browseBtnTxt}>Browse Jobs →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={GREEN} size="large" /></View>;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backIcon}>←</Text></TouchableOpacity>
        <View style={s.headerAvatar}><Text style={s.headerAvatarTxt}>{(companyName || 'C')[0].toUpperCase()}</Text></View>
        <View style={s.headerInfo}>
          <Text style={s.headerName} numberOfLines={1}>{companyName || 'Employer'}</Text>
          <Text style={s.headerJob} numberOfLines={1}>{jobTitle || 'Job Opening'}</Text>
        </View>
        <View style={s.onlineDot} />
      </View>

      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={m => m.id}
        contentContainerStyle={s.msgList}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: CHAT_BG }}
        ListEmptyComponent={
          <View style={s.emptyChat}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>👋</Text>
            <Text style={s.emptyChatTxt}>Say hi to start the conversation!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.sender_id === userId;
          return (
            <View style={[s.bubbleRow, isMe && s.bubbleRowMe]}>
              <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                <Text style={[s.bubbleTxt, isMe && s.bubbleTxtMe]}>{item.content}</Text>
                <Text style={[s.bubbleTime, isMe && s.bubbleTimeMe]}>
                  {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={s.quickRow}>
        <FlatList horizontal data={QUICK_REPLIES} keyExtractor={q => q} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.quickChip} onPress={() => send(item)}>
              <Text style={s.quickTxt}>{item}</Text>
            </TouchableOpacity>
          )} />
      </View>

      <View style={s.inputBar}>
        <TextInput style={s.input} value={input} onChangeText={setInput} placeholder="Type a message…"
          placeholderTextColor={TEXT_LIGHT} multiline maxLength={500}
          onSubmitEditing={() => send(input)} returnKeyType="send" />
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDim]}
          onPress={() => send(input)} disabled={!input.trim() || sending}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendIcon}>➤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 40, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 22, fontWeight: '900', color: TEXT },
  backBtn:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon:    { fontSize: 20, color: TEXT, fontWeight: '600' },
  headerAvatar:{ width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN_LIGHT, alignItems: 'center', justifyContent: 'center' },
  headerAvatarTxt: { fontSize: 18, fontWeight: '800', color: GREEN },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '700', color: TEXT },
  headerJob:  { fontSize: 11, color: GREEN, marginTop: 1 },
  onlineDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN },
  msgList:    { padding: 14, gap: 8, paddingBottom: 8 },
  bubbleRow:   { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubble:     { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  bubbleMe:   { backgroundColor: GREEN, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleTxt:    { fontSize: 14, color: TEXT, lineHeight: 20 },
  bubbleTxtMe:  { color: '#fff' },
  bubbleTime:   { fontSize: 10, color: TEXT_LIGHT, marginTop: 4, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  quickRow:   { backgroundColor: CHAT_BG, paddingVertical: 8 },
  quickChip:  { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5, borderColor: GREEN, borderRadius: 20, backgroundColor: '#fff' },
  quickTxt:   { fontSize: 12, color: GREEN, fontWeight: '600' },
  inputBar:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 10, paddingHorizontal: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: BORDER },
  input:      { flex: 1, backgroundColor: BG_GRAY, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: TEXT, maxHeight: 100, borderWidth: 1.5, borderColor: BORDER },
  sendBtn:    { width: 42, height: 42, borderRadius: 21, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  sendBtnDim: { backgroundColor: TEXT_LIGHT },
  sendIcon:   { fontSize: 18, color: '#fff' },
  noChat:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  noChatTitle:{ fontSize: 20, fontWeight: '800', color: TEXT, marginTop: 12 },
  noChatSub:  { fontSize: 14, color: TEXT_MID, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  browseBtn:  { marginTop: 20, backgroundColor: GREEN, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 24 },
  browseBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyChat:  { alignItems: 'center', paddingTop: 60 },
  emptyChatTxt: { fontSize: 14, color: TEXT_MID, fontWeight: '600' },
});
