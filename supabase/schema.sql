-- ============================================================
--  Shower Schedule — database setup
--  Run in: Supabase dashboard -> SQL Editor -> New query -> paste -> Run
--  Safe to run more than once.
-- ============================================================

-- 1. TABLES ---------------------------------------------------

create table if not exists public.people (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references public.people(id) on delete cascade,
  endpoint      text not null unique,           -- one row per device
  subscription  jsonb not null,                 -- the full web-push subscription
  created_at    timestamptz not null default now()
);

create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.people(id) on delete cascade,
  date        date not null,
  slot        int  not null check (slot between 17 and 23),
  created_at  timestamptz not null default now(),
  unique (person_id, date)                       -- one shower per person per day
);

create index if not exists bookings_date_slot_idx on public.bookings (date, slot);


-- 2. BOOKING RULES (server-side, cannot be bypassed) ----------
-- All booking changes go through these two functions. Because they run with
-- the owner's rights (security definer), the browser can call them but can
-- never write to the bookings table directly.

create or replace function public.set_booking(p_person_id uuid, p_date date, p_slot int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_others int;
  v_before int;
  v_after  int;
  v_now    timestamp;
  v_today  date;
  v_hour   int;
  v_existing int;
begin
  if p_slot < 17 or p_slot > 23 then
    raise exception 'INVALID_SLOT';
  end if;

  -- Current South African date and hour (used to block past times).
  v_now   := now() at time zone 'Africa/Johannesburg';
  v_today := v_now::date;
  v_hour  := extract(hour from v_now)::int;

  -- You cannot book a time that has already passed.
  if p_date < v_today or (p_date = v_today and p_slot < v_hour) then
    raise exception 'SLOT_PAST';
  end if;

  -- Handle one day at a time so two people booking at the same instant
  -- cannot both slip past the geyser rule.
  perform pg_advisory_xact_lock(hashtext(p_date::text));

  -- You cannot change a booking whose time has already passed today.
  if p_date = v_today then
    select slot into v_existing
      from public.bookings
      where person_id = p_person_id and date = p_date;
    if found and v_existing < v_hour then
      raise exception 'ALREADY_PASSED';
    end if;
  end if;

  -- Booking a new slot also moves you: drop your existing booking for the day.
  delete from public.bookings where person_id = p_person_id and date = p_date;

  -- How many people are already in the target slot?
  select count(*) into v_others from public.bookings where date = p_date and slot = p_slot;

  if v_others >= 2 then
    raise exception 'SLOT_FULL';
  end if;

  -- If this booking would make the slot reach 2, the geyser rule applies:
  -- neither neighbouring slot may already be full (2 people).
  if v_others = 1 then
    select count(*) into v_before from public.bookings where date = p_date and slot = p_slot - 1;
    select count(*) into v_after  from public.bookings where date = p_date and slot = p_slot + 1;
    -- Skip the neighbour that does not exist (no 16:00 before 17, no 00:00 after 23).
    if (p_slot > 17 and v_before >= 2) or (p_slot < 23 and v_after >= 2) then
      raise exception 'GEYSER_RULE';
    end if;
  end if;

  insert into public.bookings (person_id, date, slot) values (p_person_id, p_date, p_slot);
end;
$$;

create or replace function public.cancel_booking(p_person_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now    timestamp;
  v_today  date;
  v_hour   int;
  v_existing int;
begin
  perform pg_advisory_xact_lock(hashtext(p_date::text));

  v_now   := now() at time zone 'Africa/Johannesburg';
  v_today := v_now::date;
  v_hour  := extract(hour from v_now)::int;

  -- You cannot cancel a shower whose time has already passed today.
  if p_date = v_today then
    select slot into v_existing
      from public.bookings
      where person_id = p_person_id and date = p_date;
    if found and v_existing < v_hour then
      raise exception 'ALREADY_PASSED';
    end if;
  end if;

  delete from public.bookings where person_id = p_person_id and date = p_date;
end;
$$;


-- 3. ROW LEVEL SECURITY --------------------------------------
-- "Row Level Security" (RLS) decides which rows the app is allowed to touch.

alter table public.people             enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.bookings           enable row level security;

-- people: the app can read everyone, add a new person, and remove a person.
drop policy if exists people_read   on public.people;
drop policy if exists people_insert on public.people;
drop policy if exists people_delete on public.people;
create policy people_read   on public.people for select using (true);
create policy people_insert on public.people for insert with check (true);
create policy people_delete on public.people for delete using (true);

-- push_subscriptions: the app can read/add/update/remove device registrations.
drop policy if exists subs_read   on public.push_subscriptions;
drop policy if exists subs_insert on public.push_subscriptions;
drop policy if exists subs_update on public.push_subscriptions;
drop policy if exists subs_delete on public.push_subscriptions;
create policy subs_read   on public.push_subscriptions for select using (true);
create policy subs_insert on public.push_subscriptions for insert with check (true);
create policy subs_update on public.push_subscriptions for update using (true) with check (true);
create policy subs_delete on public.push_subscriptions for delete using (true);

-- bookings: the app may READ them, but NOT write them directly.
-- Writes are only possible through set_booking / cancel_booking above, so the
-- geyser rules can never be broken from the browser.
drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings for select using (true);
-- (deliberately no insert / update / delete policy)


-- 4. LET THE APP CALL THE BOOKING FUNCTIONS -------------------
grant execute on function public.set_booking(uuid, date, int) to anon, authenticated;
grant execute on function public.cancel_booking(uuid, date)   to anon, authenticated;


-- 5. REALTIME (live updates when bookings change) -------------
do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;   -- already added, ignore
end $$;
