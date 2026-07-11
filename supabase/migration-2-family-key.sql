-- ============================================================
--  Migration 2 — Family-key gate (privacy)
--  Run in: Supabase dashboard -> SQL Editor -> New query -> paste -> Run
--  Safe to run more than once.
--
--  ⚠ BEFORE RUNNING: replace  KIES-N-KODE  (both places) with your real
--  family code. The code lives ONLY here in the database — it is never
--  committed to the public GitHub repo. The family types it once per device.
--
--  What this locks (needs the family code):
--    • people             — the family's names
--    • push_subscriptions — device push keys (could be abused to send
--                           notifications to the family's phones)
--    • set_booking / cancel_booking — making or cancelling bookings
--
--  What stays readable WITHOUT the code (deliberate):
--    • bookings — but only as anonymous rows (random person-id + date + hour).
--      Without the people table there are no names, so the rows are
--      meaningless to a stranger. Kept open because the app's live-refresh
--      (Realtime) cannot send the family code; locking it would freeze
--      live updates on everyone's phones.
-- ============================================================

-- 1. The gate itself: checks the x-family-key header the app sends.
create or replace function public.family_key_ok()
returns boolean
language sql
stable
as $$
  select coalesce(
    current_setting('request.headers', true)::json->>'x-family-key', ''
  ) = 'KIES-N-KODE'
$$;

-- 2. people: every action now needs the family code.
drop policy if exists people_read   on public.people;
drop policy if exists people_insert on public.people;
drop policy if exists people_delete on public.people;
create policy people_read   on public.people for select using (public.family_key_ok());
create policy people_insert on public.people for insert with check (public.family_key_ok());
create policy people_delete on public.people for delete using (public.family_key_ok());

-- 3. push_subscriptions: every action now needs the family code.
--    (The send-push Edge Function uses the service role, which skips these
--    policies — scheduled reminders keep working unchanged.)
drop policy if exists subs_read   on public.push_subscriptions;
drop policy if exists subs_insert on public.push_subscriptions;
drop policy if exists subs_update on public.push_subscriptions;
drop policy if exists subs_delete on public.push_subscriptions;
create policy subs_read   on public.push_subscriptions for select using (public.family_key_ok());
create policy subs_insert on public.push_subscriptions for insert with check (public.family_key_ok());
create policy subs_update on public.push_subscriptions for update
  using (public.family_key_ok()) with check (public.family_key_ok());
create policy subs_delete on public.push_subscriptions for delete using (public.family_key_ok());

-- 4. Booking functions: same bodies as before, plus the family-code check
--    at the top. (They are security definer, so RLS alone would not stop a
--    stranger from calling them — this explicit check does.)

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
  if not public.family_key_ok() then
    raise exception 'FAMILY_KEY';
  end if;

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
  if not public.family_key_ok() then
    raise exception 'FAMILY_KEY';
  end if;

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

-- 5. Housekeeping: clear out last season's booking history (old rows are the
--    only real data in the still-open bookings table).
delete from public.bookings where date < current_date;
