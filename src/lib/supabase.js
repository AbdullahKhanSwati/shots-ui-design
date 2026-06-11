import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Same Supabase project as the admin dashboard. The anon key is safe to ship in
// the client — every table is protected by Row Level Security + the
// current_business_id() tenant policy, so a signed-in staff member can only ever
// read/write their own business's rows.
const SUPABASE_URL = 'https://ejrqnrccfjmmlbjnpurw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcnFucmNjZmptbWxiam5wdXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Njg1MDUsImV4cCI6MjA5NjE0NDUwNX0.0ewnDI33U-bLDWu9cPI4WX57AzIFLsyVu5gNpJ4774I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // No URL session detection on native — there is no browser redirect.
    detectSessionInUrl: false,
  },
});

/**
 * Upload an image to a Storage bucket and return a usable reference.
 *  - 'member-photos' (public bucket)  → returns a public URL (works as <Image source={{uri}}>)
 *  - other (private) buckets          → returns the stored object path
 *
 * `file` is an object shaped like { uri, name?, type? } (what expo image/camera
 * pickers return). On React Native we upload via FormData so the binary is sent
 * correctly.
 */
export async function uploadToBucket(bucket, file, prefix = '') {
  const name = file.name || file.uri?.split('/').pop() || 'upload.jpg';
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const contentType = file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const path = `${prefix}${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name,
    type: contentType,
  });

  const { error } = await supabase.storage.from(bucket).upload(path, formData, {
    cacheControl: '3600',
    upsert: true,
    contentType,
  });
  if (error) throw error;

  if (bucket === 'member-photos') {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  return path;
}
