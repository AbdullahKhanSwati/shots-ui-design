import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, AUTH_STORAGE_KEY } from '../lib/supabase';
import { getCache, setCache, removeCache } from '../lib/offlineCache';

// Real Supabase auth for the Shots app.
//
// STAYING SIGNED IN
// A login lasts until the user taps "Sign out". Things that used to bounce
// people to the login screen, and how they are handled now:
//   * Offline / weak signal when the access token expired → the refresh fails
//     and getSession() reports "no session". That is NOT a logout: as long as
//     the session is still in storage the user stays signed in with the last
//     known business, and Supabase refreshes the token once the network is back.
//   * Sign out on one phone used to sign out EVERY phone sharing that login
//     (global sign-out revokes all refresh tokens). Sign out is now this device
//     only.
//   * Events that arrive without a session (a failed background refresh, …)
//     are ignored — nothing changed about who is signed in.
// Only two things end a session on their own:
//   * the user taps Sign out, or
//   * the login no longer exists (the admin deleted it) — then the user is told
//     why (see `revoked`).
const AuthContext = createContext(null);

const LAST_USER_KEY = 'auth:last-user';
// How often a signed-in device re-checks that its login still exists.
const ACCESS_CHECK_MS = 60 * 1000;

// Only a DEFINITE "this user no longer exists" answer counts as removed —
// never a network error, an expired token or a refresh-token hiccup.
function isUserDeleted(error) {
  if (!error) return false;
  const code = String(error.code || '').toLowerCase();
  const msg = String(error.message || '').toLowerCase();
  return code === 'user_not_found'
    || msg.includes('user from sub claim in jwt does not exist')
    || msg.includes('user not found');
}

// The raw session auth-js keeps in AsyncStorage. Present ⇒ still signed in
// (even if the access token has expired and can't be refreshed right now).
async function readStoredSession() {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s && s.refresh_token ? s : null;
  } catch (e) {
    return null;
  }
}

// Map a `businesses` DB row → the camelCase shape the UI expects.
function mapBusiness(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    tag: row.tag,
    // UI uses `logo` for the emoji and `color` for the accent.
    logo: row.emoji,
    emoji: row.emoji,
    color: row.accent,
    accent: row.accent,
    accentDark: row.accent_dark,
    available: row.available,
    summary: row.summary,
    defaultEmail: row.default_email,
    defaultPassword: row.default_password,
  };
}

export function AuthProvider({ children }) {
  // session shape:  { user, email, profile, businessId, business, offline? }
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // Set when the admin deleted this login; the app shows a notice on Login.
  const [revoked, setRevoked] = useState(false);
  const sessionRef = useRef(null);
  sessionRef.current = session;
  const activeRef = useRef(true);

  // Sign this device out because the login no longer exists.
  const revoke = useCallback(async () => {
    await removeCache(LAST_USER_KEY);
    try { await supabase.auth.signOut({ scope: 'local' }); } catch (e) { /* already gone */ }
    try { await AsyncStorage.removeItem(AUTH_STORAGE_KEY); } catch (e) { /* nothing more to clear */ }
    setRevoked(true);
    setSession(null);
    setLoading(false);
  }, []);

  // Ask the server whether this login (and its profile) still exists. Anything
  // other than a definite "deleted" answer keeps the user signed in.
  const checkAccess = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.user) return true;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (isUserDeleted(error)) { await revoke(); return false; }
        return true; // offline / token being refreshed — try again later
      }
      if (!data?.user) return true;
      const { data: prof, error: profErr } = await supabase
        .from('profiles').select('user_id').eq('user_id', data.user.id).maybeSingle();
      // Server reachable, user valid, but the profile row is gone → removed.
      if (!profErr && !prof) { await revoke(); return false; }
    } catch (e) {
      /* offline — try again later */
    }
    return true;
  }, [revoke]);

  useEffect(() => {
    activeRef.current = true;

    // Business + profile for a user: fresh from the server when reachable,
    // otherwise the copy cached the last time we were online.
    const resolveBusiness = async (user) => {
      const cacheKey = `auth:${user.id}`;
      const cached = await getCache(cacheKey);
      let profile = null;
      let profileErr = null;
      try {
        const r = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
        profile = r.data; profileErr = r.error;
      } catch (e) { profileErr = e; }

      if (!profileErr && profile) {
        const businessId = profile.business_id || 'shots';
        let business = cached?.business || null;
        try {
          const { data: row, error } = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle();
          if (!error && row) business = mapBusiness(row);
        } catch (e) { /* keep the cached copy */ }
        await setCache(cacheKey, { businessId, business, profile });
        return { businessId, business, profile, missingProfile: false };
      }
      return {
        businessId: cached?.businessId || 'shots',
        business: cached?.business || null,
        profile: cached?.profile || null,
        // Reached the server and there is definitely no profile row.
        missingProfile: !profileErr && !profile,
      };
    };

    // A live Supabase session → the signed-in user.
    const hydrateLive = async (authSession) => {
      const user = authSession.user;
      setCache(LAST_USER_KEY, { id: user.id, email: user.email || '' });
      const info = await resolveBusiness(user);
      if (!activeRef.current) return;
      if (info.missingProfile) {
        // Confirm with the auth server before signing anyone out.
        const { data, error } = await supabase.auth.getUser().catch(() => ({ data: null, error: null }));
        if (isUserDeleted(error) || (data?.user && !error)) { await revoke(); return; }
      }
      setRevoked(false);
      setSession({ user, email: user.email, profile: info.profile, businessId: info.businessId, business: info.business, offline: false });
      setLoading(false);
    };

    // No live session reported. Decide between "offline, still signed in" and
    // "really signed out" by looking at what auth-js still has in storage.
    const hydrateFromStorage = async () => {
      const stored = await readStoredSession();
      const last = await getCache(LAST_USER_KEY);
      if (!activeRef.current) return;
      if (stored && (stored.user?.id || last?.id)) {
        const user = stored.user?.id ? stored.user : { id: last.id, email: last.email };
        const cached = await getCache(`auth:${user.id}`);
        if (!activeRef.current) return;
        setSession({
          user, email: user.email, profile: cached?.profile || null,
          businessId: cached?.businessId || 'shots', business: cached?.business || null, offline: true,
        });
      } else {
        setSession(null);
      }
      setLoading(false);
    };

    const hydrate = async (authSession) => {
      if (authSession?.user) return hydrateLive(authSession);
      return hydrateFromStorage();
    };

    // Don't let a slow/captive network hold the splash screen: after 6s fall
    // back to what is in storage; a live session that resolves later still
    // arrives through onAuthStateChange.
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 6000));
    Promise.race([supabase.auth.getSession(), timeout])
      .then((r) => (r?.timedOut ? hydrateFromStorage() : hydrate(r?.data?.session)))
      .catch(() => hydrate(null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') {
        // auth-js emits this only after removing the stored session: the user
        // signed out, or the server rejected the login for good.
        hydrateFromStorage();
        return;
      }
      if (s?.user) hydrateLive(s);
      else if (event === 'INITIAL_SESSION') hydrateFromStorage();
      // Any other event without a session is ignored.
    });

    // Keep the token fresh: the refresh ticker pauses while the app is in the
    // background, so restart it (and re-check the login) on every return.
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        supabase.auth.getSession()
          .then(({ data }) => { if (data?.session?.user) hydrateLive(data.session); })
          .catch(() => {});
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    supabase.auth.startAutoRefresh();

    return () => {
      activeRef.current = false;
      sub.subscription.unsubscribe();
      appSub.remove();
    };
  }, [revoke]);

  // Re-check the login when the app comes to the front and every minute, so a
  // staff member removed by the admin is signed out promptly.
  useEffect(() => {
    if (!session?.user) return undefined;
    const appSub = AppState.addEventListener('change', (st) => { if (st === 'active') checkAccess(); });
    const timer = setInterval(checkAccess, ACCESS_CHECK_MS);
    return () => { appSub.remove(); clearInterval(timer); };
  }, [session?.user, checkAccess]);

  const value = useMemo(
    () => ({
      session,
      loading,
      revoked,
      clearRevoked: () => setRevoked(false),
      checkAccess,
      // Real Supabase email/password sign-in. Throws on failure so the
      // login form can show the message.
      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setCache(LAST_USER_KEY, { id: data.user.id, email: data.user.email || '' });
        setRevoked(false);
      },
      // Signs out THIS device only ('local'): the same login on another phone
      // stays signed in. Works offline too — if the server can't be reached
      // the stored session is dropped by hand.
      logout: async () => {
        await removeCache(LAST_USER_KEY);
        try {
          const { error } = await supabase.auth.signOut({ scope: 'local' });
          if (error) throw error;
        } catch (e) {
          try { await AsyncStorage.removeItem(AUTH_STORAGE_KEY); } catch (_) { /* nothing more to clear */ }
        }
        setSession(null);
      },
    }),
    [session, loading, revoked, checkAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
