import AsyncStorage from '@react-native-async-storage/async-storage';

// "Remember me" on the login screen: the last email + password that signed in
// successfully, kept in this app's private storage on this device only. It is
// NOT cleared by "Sign out" — that is the point: the next sign-in is pre-filled.
// Unticking "Remember me" and signing in removes it.
const KEY = 'login:remember';

export async function loadRememberedLogin() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && v.email ? { email: String(v.email), password: String(v.password || '') } : null;
  } catch (e) {
    return null;
  }
}

export async function saveRememberedLogin(remember, email, password) {
  try {
    if (remember) await AsyncStorage.setItem(KEY, JSON.stringify({ email: (email || '').trim(), password: password || '' }));
    else await AsyncStorage.removeItem(KEY);
  } catch (e) {
    /* storage unavailable — nothing to remember */
  }
}
