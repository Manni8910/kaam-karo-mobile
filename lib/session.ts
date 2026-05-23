import AsyncStorage from '@react-native-async-storage/async-storage';

const UID_KEY   = 'kaam_uid';
const PHONE_KEY = 'kaam_phone';

/**
 * Generate a deterministic UUID-like ID from a 10-digit phone number.
 * Same phone always → same UID, so data persists across logouts.
 */
export function phoneToUid(phone: string): string {
  const p = phone.padStart(12, '0');
  return `91000000-0000-4000-8000-00${p}`;
}

export const getUID   = (): Promise<string | null> => AsyncStorage.getItem(UID_KEY);
export const getPhone = (): Promise<string | null> => AsyncStorage.getItem(PHONE_KEY);

export async function setSession(uid: string, phone: string): Promise<void> {
  await AsyncStorage.multiSet([[UID_KEY, uid], [PHONE_KEY, phone]]);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([
    UID_KEY, PHONE_KEY,
    'userCity', 'profileCity', 'profilePic', 'hasSeenSwipeGuide',
  ]);
}
