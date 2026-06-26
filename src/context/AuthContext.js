import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCache, setCache } from '../lib/offlineCache';

const AuthContext = createContext(null);

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
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      // Real Supabase email/password sign-in. Throws on failure so the
      // login form can show the message.
      login: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      },
      logout: async () => {
        await supabase.auth.signOut();
        setSession(null);
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
