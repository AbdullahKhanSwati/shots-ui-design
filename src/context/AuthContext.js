import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { getCache, setCache } from '../lib/offlineCache';

const AuthContext = createContext(null);

// How often a signed-in device re-checks that its login still exists.
const ACCESS_CHECK_MS = 60 * 1000;

// Supabase answers these when the login itself is gone (deleted by the admin)
// — as opposed to a network problem, which must NOT sign anyone out.
function isLoginGone(error) {
  if (!error) return false;
  const status = Number(error.status || 0);
  const msg = String(error.message || '').toLowerCase();
  return (
    status === 401 || status === 403 || status === 404
    || msg.includes('user from sub claim in jwt does not exist')
    || msg.includes('user not found') || msg.includes('user_not_found')
    || msg.includes('session_not_found') || msg.includes('session from session_id claim')
    || msg.includes('invalid refresh token') || msg.includes('refresh token not found')
  );
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
  // session shape:  { user, email, profile, businessId, business }
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // Set when the admin deleted this login; the app shows a notice on Login.
  const [revoked, setRevoked] = useState(false);
  const sessionRef = useRef(null);
  sessionRef.current = session;

  // Sign this device out because the login no longer exists.
  const revoke = useCallback(async () => {
    try { await supabase.auth.signOut({ scope: 'local' }); } catch (e) { /* already gone */ }
    setRevoked(true);
    setSession(null);
    setLoading(false);
  }, []);

  // Ask the server whether this login (and its profile) still exists. Network
  // failures are ignored — offline staff stay signed in.
  const checkAccess = useCallback(async () => {
    const current = sessionRef.current;
    if (!current?.user) return true;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (isLoginGone(error)) { await revoke(); return false; }
        return true;
      }
      if (!data?.user) { await revoke(); return false; }
      const { data: prof, error: profErr } = await supabase
        .from('profiles').select('user_id').eq('user_id', data.user.id).maybeSingle();
      if (!profErr && !prof) { await revoke(); return false; }
    } catch (e) {
      /* offline — try again later */
    }
    return true;
  }, [revoke]);

  useEffect(() => {
    let active = true;

    async function bootstrap(authSession) {
      if (!authSession?.user) {
        if (active) {
          setSession(null);
          setLoading(false);
        }
        return;
      }

      const user = authSession.user;
      const cacheKey = `auth:${user.id}`;
      // Last known business/profile — used when the network is unreachable.
      const cached = await getCache(cacheKey);

      // The Supabase session itself is read from local storage (works offline);
      // only the profile/business lookups below need the network.
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      let businessId;
      let business;
      let prof;

      if (!profileErr && !profile) {
        // Online and signed in, but this login has no profile any more — the
        // admin deleted it. Don't fall back to a default business.
        const { error: userErr } = await supabase.auth.getUser();
        if (!userErr || isLoginGone(userErr)) {
          if (active) await revoke();
          return;
        }
      }

      if (!profileErr) {
        // Online: resolve fresh, then cache for offline use.
        prof = profile || null;
        businessId = profile?.business_id || 'shots';
        const { data: businessRow, error: bizErr } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .maybeSingle();
        business = !bizErr && businessRow ? mapBusiness(businessRow) : cached?.business || null;
        await setCache(cacheKey, { businessId, business, profile: prof });
      } else if (cached) {
        // Offline: fall back to the last known business/profile.
        businessId = cached.businessId;
        business = cached.business;
        prof = cached.profile;
      } else {
        // Offline with no cache yet — best-effort default.
        businessId = 'shots';
        business = null;
        prof = null;
      }

      if (!active) return;
      setRevoked(false);
      setSession({
        user,
        email: user.email,
        profile: prof,
        businessId,
        business,
      });
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => bootstrap(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => bootstrap(s));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
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
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setRevoked(false);
      },
      logout: async () => {
        await supabase.auth.signOut();
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
