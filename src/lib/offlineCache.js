import AsyncStorage from '@react-native-async-storage/async-storage';

// Tiny JSON-backed cache used for offline support. Each value is namespaced so
// it never collides with the Supabase auth session AsyncStorage also stores.
const PREFIX = 'shots-offline:';

export async function getCache(key) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function setCache(key, value) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    /* storage full / unavailable — non-fatal for a cache */
  }
}

export async function removeCache(key) {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch (e) {
    /* non-fatal */
  }
}
