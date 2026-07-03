-- =============================================================================
-- SHOTS — Full Supabase setup for a NEW project (all 12 tables + everything
-- "Copy as SQL" leaves out: RLS policies, the tenant function, storage buckets,
-- realtime, seed data, admin link).
--
-- HOW TO RUN (new project): SQL Editor → New query → paste ALL of this → Run.
-- Then create the admin user (section 8) and run section 9.
-- Tables are ordered so every foreign key resolves. Safe to re-run.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. TABLES  (exact structures from your old project's "Copy as SQL")
-- -----------------------------------------------------------------------------

create table if not exists public.businesses (
  id text NOT NULL,
  name text NOT NULL,
  type text,
  tag text,
  emoji text,
  accent text,
  accent_dark text,
  available boolean NOT NULL DEFAULT false,
  summary text,
  default_email text,
  default_password text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT businesses_pkey PRIMARY KEY (id)
);

create table if not exists public.profiles (
  user_id uuid NOT NULL,
  business_id text,
  name text DEFAULT 'Admin'::text,
  role text DEFAULT 'Owner'::text,
  email text,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT profiles_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

create table if not exists public.tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id text NOT NULL,
  tier text NOT NULL,
  monthly numeric NOT NULL DEFAULT 0,
  color text DEFAULT '#E53E3E'::text,
  icon text DEFAULT 'shield'::text,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tiers_pkey PRIMARY KEY (id),
  CONSTRAINT tiers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

create table if not exists public.pool_tables (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id text NOT NULL,
  number integer NOT NULL,
  type text NOT NULL DEFAULT 'Pool'::text,
  location text DEFAULT 'Main Hall'::text,
  status text DEFAULT 'Available'::text,
  condition text DEFAULT 'Excellent'::text,
  last_cleaned date,
  member_rate numeric DEFAULT 400,
  non_member_rate numeric DEFAULT 600,
  open_time text DEFAULT '11:00'::text,
  close_time text DEFAULT '23:00'::text,
  occupied_until timestamp with time zone,
  occupied_by text,
  created_at timestamp with time zone DEFAULT now(),
  image text,
  CONSTRAINT pool_tables_pkey PRIMARY KEY (id),
  CONSTRAINT pool_tables_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

create table if not exists public.members (
  id text NOT NULL,
  business_id text NOT NULL,
  name text NOT NULL,
  type text,
  cnic text,
  join_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  status text DEFAULT 'Active'::text,
  phone text,
  email text,
  visits integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  photo text,
  cnic_image text,
  created_at timestamp with time zone DEFAULT now(),
  cnic_image_back text,
  CONSTRAINT members_pkey PRIMARY KEY (id),
  CONSTRAINT members_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

create table if not exists public.bookings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id text NOT NULL,
  table_id bigint,
  table_number integer,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  intervals jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'Active'::text,
  amount numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  players integer DEFAULT 1,
  is_member boolean DEFAULT true,
  member_id text,
  member_name text,
  member_type text,
  members jsonb DEFAULT '[]'::jsonb,
  discount jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id),
  CONSTRAINT bookings_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.pool_tables(id),
  CONSTRAINT bookings_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);

create table if not exists public.transactions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time text,
  type text NOT NULL DEFAULT 'In'::text,
  category text,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  table_ref integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

create table if not exists public.staff (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id text NOT NULL,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  status text DEFAULT 'Active'::text,
  joined_at date DEFAULT CURRENT_DATE,
  salary numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

create table if not exists public.business_settings (
  business_id text NOT NULL,
  profile jsonb DEFAULT '{}'::jsonb,
  rates jsonb DEFAULT '{}'::jsonb,
  hours jsonb DEFAULT '{}'::jsonb,
  notifications jsonb DEFAULT '{}'::jsonb,
  security jsonb DEFAULT '{}'::jsonb,
  locale jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_settings_pkey PRIMARY KEY (business_id),
  CONSTRAINT business_settings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

create table if not exists public.table_types (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id text NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT table_types_pkey PRIMARY KEY (id),
  CONSTRAINT table_types_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

create table if not exists public.booking_durations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id text NOT NULL,
  minutes integer NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_durations_pkey PRIMARY KEY (id),
  CONSTRAINT booking_durations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

create table if not exists public.expense_categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  business_id text NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expense_categories_pkey PRIMARY KEY (id),
  CONSTRAINT expense_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id)
);

-- -----------------------------------------------------------------------------
-- 2. TENANT HELPER FUNCTION
-- -----------------------------------------------------------------------------
create or replace function public.current_business_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.profiles where user_id = auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.businesses        enable row level security;
alter table public.profiles          enable row level security;
alter table public.tiers             enable row level security;
alter table public.pool_tables       enable row level security;
alter table public.members           enable row level security;
alter table public.bookings          enable row level security;
alter table public.transactions      enable row level security;
alter table public.staff             enable row level security;
alter table public.business_settings enable row level security;
alter table public.table_types       enable row level security;
alter table public.booking_durations enable row level security;
alter table public.expense_categories enable row level security;

-- businesses: world-readable (login/picker screen runs before auth).
drop policy if exists businesses_read_all on public.businesses;
create policy businesses_read_all on public.businesses
  for select using (true);

-- profiles: a user can read only their own row.
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for select using (user_id = auth.uid());

-- Every other table is tenant-scoped: full access where business_id matches
-- the signed-in user's business. One FOR ALL policy per table.
do $$
declare t text;
begin
  foreach t in array array[
    'tiers','pool_tables','members','bookings','transactions','staff',
    'business_settings','table_types','booking_durations','expense_categories'
  ] loop
    execute format('drop policy if exists %I_tenant on public.%I;', t, t);
    execute format(
      'create policy %I_tenant on public.%I for all to authenticated
         using (business_id = public.current_business_id())
         with check (business_id = public.current_business_id());', t, t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4. REALTIME  (app subscribes to these four)
-- -----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.pool_tables;
  alter publication supabase_realtime add table public.members;
  alter publication supabase_realtime add table public.bookings;
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 5. STORAGE BUCKETS + POLICIES
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('member-photos','member-photos',true)
  on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('member-cnic','member-cnic',false)
  on conflict (id) do update set public = false;

drop policy if exists member_photos_read   on storage.objects;
create policy member_photos_read on storage.objects
  for select using (bucket_id = 'member-photos');
drop policy if exists member_photos_write  on storage.objects;
create policy member_photos_write on storage.objects
  for insert to authenticated with check (bucket_id = 'member-photos');
drop policy if exists member_photos_update on storage.objects;
create policy member_photos_update on storage.objects
  for update to authenticated using (bucket_id = 'member-photos');

drop policy if exists member_cnic_read     on storage.objects;
create policy member_cnic_read on storage.objects
  for select to authenticated using (bucket_id = 'member-cnic');
drop policy if exists member_cnic_write    on storage.objects;
create policy member_cnic_write on storage.objects
  for insert to authenticated with check (bucket_id = 'member-cnic');
drop policy if exists member_cnic_update   on storage.objects;
create policy member_cnic_update on storage.objects
  for update to authenticated using (bucket_id = 'member-cnic');

-- -----------------------------------------------------------------------------
-- 6. SEED — default 'shots' business so login can resolve a tenant.
--    (Replace these values if your old 'shots' row differs — or just copy the
--     real row's data in via the data export, see chat instructions.)
-- -----------------------------------------------------------------------------
insert into public.businesses
  (id, name, type, tag, emoji, accent, accent_dark, available, summary,
   default_email, default_password, sort_order)
values
  ('shots', 'Shots Snooker & Pool Club', 'Snooker & Pool', 'ACTIVE', '🎱',
   '#dc143c', '#a10e2c', true, 'Snooker & pool club management',
   'admin@shots.com', 'password', 1)
on conflict (id) do nothing;

-- =============================================================================
-- 7. (done) — schema, security, storage and seed are now in place.
-- =============================================================================

-- =============================================================================
-- 8. ADMIN USER — create in the dashboard FIRST:
--    Authentication → Users → Add user
--      Email: admin@shots.com   Password: <your choice>   ✅ Auto Confirm User
-- =============================================================================

-- 9. Then run this to link that user to the 'shots' business (safe to re-run):
insert into public.profiles (user_id, business_id, name, role, email)
select u.id, 'shots', 'Admin', 'Owner', u.email
from auth.users u
where u.email = 'admin@shots.com'
on conflict (user_id) do update
  set business_id = excluded.business_id;
-- =============================================================================
