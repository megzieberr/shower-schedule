# SETUP.md — Setting up Shower Schedule (for a complete beginner)

This guide assumes you have **never** used Supabase, a command line, or GitHub
Pages before. Every step is one action. New words are explained the first time
they appear. After most steps there is a **You should see** line so you know it
worked before moving on.

You will set up four things:

- **Supabase** — a free online service that gives us a database (a place to
  store information) plus the ability to send notifications.
- **VAPID keys** — two special codes that let us send phone notifications safely.
- **GitHub** — a website that stores your code; we'll also use it to publish the app.
- **GitHub Pages** — the free part of GitHub that turns your code into a live website.

You will need: an email address, a phone, and about 30–45 minutes.

> **Two words you'll see a lot**
> - **Dashboard** = the website you log into to manage Supabase or GitHub.
> - **Paste** = Ctrl+V (Windows) or Cmd+V (Mac), after copying with Ctrl+C / Cmd+C.

---

## Before you start: open a terminal once (you barely need it)

A **terminal** (also called a "command line") is a window where you type
commands instead of clicking buttons. You only need it for a couple of tiny
things. To open it on Windows:

1. Press the **Windows key** on your keyboard.
2. Type **PowerShell**.
3. Click **Windows PowerShell** in the results. A dark window opens. That's the terminal.

Leave it open; you'll come back to it. Whenever this guide says "in the
terminal", it means this window.

---

# Part 1 — Make the Supabase project

A **project** is your own private space on Supabase that holds the database.

1. Open your web browser and go to **https://supabase.com**.
2. Click **Start your project** (top right).
3. Click **Continue with GitHub** if you have a GitHub account, or **Sign up**
   with your email and a password.
   - **You should see:** the Supabase dashboard, possibly asking you to create an
     organization. An **organization** is just a folder that holds your projects.
4. If asked, type any name for the organization (for example your surname), leave
   the plan as **Free**, and click **Create organization**.
5. Click the green **New project** button.
6. In **Name**, type `shower-schedule`.
7. In **Database Password**, click **Generate a password**, then click the
   **copy** icon next to it and paste it somewhere safe (a notes app). A
   **database password** is the master key to your data — you probably won't need
   it again, but keep it just in case.
8. In **Region**, choose the location closest to South Africa (for example
   **South Africa (Johannesburg)** if listed, otherwise the nearest, such as
   **EU (Frankfurt)**). The region is just where the data physically lives.
9. Click **Create new project**.
   - **You should see:** a "Setting up project…" screen with a spinner. This takes
     **1–3 minutes**. Wait here until it finishes and you land on the project home.

---

# Part 2 — Create the database

The **database** holds people and bookings. **SQL** is the language we use to
create it. The **SQL Editor** is a page where you paste SQL and click Run.

1. In the **left sidebar**, click **SQL Editor** (icon that looks like a small
   terminal / `>_`).
2. Click **New query** (top of the page). A blank text area appears.
3. Open the file **`supabase/schema.sql`** from this project on your computer
   (open it in Notepad or any text editor), select **all** the text
   (Ctrl+A), and copy it (Ctrl+C).
4. Click into the blank SQL text area in the browser and paste (Ctrl+V).
5. Click **Run** (bottom right), or press **Ctrl+Enter**.
   - **You should see:** a green **Success. No rows returned** message at the
     bottom. That means the tables and rules were created.
6. Now confirm the tables exist. In the **left sidebar**, click **Table Editor**.
   - **You should see:** three tables listed: **people**, **push_subscriptions**,
     and **bookings**. If you see those three, the database is ready.

> If you saw a red error instead of green: re-check that you copied the *whole*
> file (from the very first line to the very last), then run it again. The file
> is safe to run more than once.

---

# Part 3 — Turn on the scheduler

A **schedule** here is a job the database runs by itself at a set time (for
example "every day at 17:00"). We need two of them: one daily reminder and one
hourly "go shower" ping. To make schedules work we first switch on two
**extensions** — an extension is an optional add-on feature for the database.

### 3a. Switch on the two extensions

1. In the **left sidebar**, click **Database**.
2. In the sub-menu that appears, click **Extensions**.
3. In the search box, type **pg_cron**.
4. Click the **toggle switch** next to **pg_cron** so it turns on (green).
   `pg_cron` is the part that runs jobs on a timer.
   - **You should see:** the toggle turn green / the row show as enabled.
5. Clear the search box, type **pg_net**.
6. Click the **toggle switch** next to **pg_net** so it turns on (green).
   `pg_net` lets the database call our notification function over the internet.
   - **You should see:** both `pg_cron` and `pg_net` now enabled.

### 3b. Make a CRON secret

A **secret** is a password-like value. We make one now so the scheduler can prove
it's really our scheduler when it triggers notifications.

7. Go to your open **terminal** (PowerShell window).
8. Copy and paste this command, then press **Enter**:

   ```powershell
   python -c "import secrets; print(secrets.token_hex(24))"
   ```

   This prints a long random string. (`python` is a program already on your
   computer; this command just makes a random secret.)
   - **You should see:** a line of 48 letters and numbers, e.g. `9f2c…a71b`.
9. Copy that whole string and paste it somewhere safe (your notes app). Label it
   **CRON_SECRET**. You'll use the exact same value twice later.

### 3c. Create the two schedules

> The schedules below will be created now but will only start **delivering**
> notifications once you finish Parts 4–6 (the keys and the function). That's
> normal — creating them early is fine.

10. You need your **project ref** — a short code that identifies your project.
    In the **left sidebar**, click **Project Settings** (the gear icon at the
    bottom), then click **General**. Find **Reference ID** and copy it (it looks
    like `abcdefghijklmnop`, about 20 lowercase letters).
11. Open the file **`supabase/cron.sql`** on your computer in a text editor.
12. Replace **both** copies of `<PROJECT_REF>` with your Reference ID.
13. Replace **both** copies of `<CRON_SECRET>` with the CRON_SECRET string from
    step 9. Save the file.
14. Select all the text in `cron.sql` (Ctrl+A), copy it (Ctrl+C).
15. Back in the browser, click **SQL Editor** in the left sidebar, click
    **New query**, paste the text, and click **Run**.
    - **You should see:** green success messages. To double-check, click
      **New query** again, paste `select jobname, schedule from cron.job;`, and
      click **Run** — you should see two rows: `shower-daily-reminder` and
      `shower-hourly-ping`.

---

# Part 4 — Make the notification keys (VAPID)

**VAPID keys** are how the phone's push service knows the notifications really
come from your app. There are two: a **public** key that lives inside the website
(safe to share) and a **private** key that must stay **secret** inside Supabase.

1. Go to your open **terminal** (PowerShell window).
2. Copy and paste this command, then press **Enter**. It moves into the project
   folder (change the path if you saved the project elsewhere):

   ```powershell
   cd "$HOME\Desktop\shower-schedule"
   ```
3. Copy and paste this command, then press **Enter**. It creates your two keys:

   ```powershell
   python tools\gen_vapid.py
   ```
   - **You should see:** a block of text with a **PUBLIC** key and a **PRIVATE**
     key (each a long string of letters/numbers).
4. Copy the **PUBLIC** key and paste it into your notes app. Label it
   **VAPID_PUBLIC_KEY**.
5. Copy the **PRIVATE** key and paste it into your notes app. Label it
   **VAPID_PRIVATE_KEY**. Treat this one like a password — never put it on the
   website or in GitHub.

> No-terminal alternative: open **https://web-push-codelab.glitch.me** in your
> browser; it shows a ready-made **Public Key** and **Private Key** you can copy.

---

# Part 5 — Store the secrets in Supabase

The notification function needs the **private** VAPID key and the CRON_SECRET.
These go into **Edge Function secrets** — a safe, hidden store inside Supabase.
**Never** put these in the website code or in GitHub: a public GitHub repo can be
read by anyone on the internet.

1. In the Supabase **left sidebar**, click **Edge Functions**.
   (An **Edge Function** is a small program Supabase runs for us on demand — here,
   the one that sends notifications.)
2. Click **Secrets** (a tab or button on the Edge Functions page; it may be
   called **Manage secrets**).
3. Click **Add new secret**. You'll add **four** secrets, one at a time. For each:
   type the **Name** exactly as shown, paste the **Value**, then click **Save**
   (or **Add secret**).

   | Name | Value to paste |
   | --- | --- |
   | `VAPID_PRIVATE_KEY` | your **VAPID_PRIVATE_KEY** from Part 4 |
   | `VAPID_PUBLIC_KEY` | your **VAPID_PUBLIC_KEY** from Part 4 |
   | `VAPID_SUBJECT` | `mailto:` followed by your email, e.g. `mailto:you@gmail.com` |
   | `CRON_SECRET` | your **CRON_SECRET** from Part 3b (must match exactly) |

   - **You should see:** all four names listed on the Secrets page (the values
     stay hidden).

> You do **not** need to add the "service role key" yourself — Supabase gives the
> function that automatically. (If you read elsewhere that you must, you can
> ignore it here; names starting with `SUPABASE_` are provided for you.)

---

# Part 6 — Deploy the notification function

**Deploy** means "put the program live so it can run." The easiest way needs **no
command line** — you paste the code straight into Supabase.

1. In the Supabase **left sidebar**, click **Edge Functions**.
2. Click **Create a function** (or **Deploy a new function** /
   **Via editor**). A code editor opens in your browser.
3. In the **name** box at the top, type exactly: `send-push`
   (the name must match, or the schedules won't find it).
4. Open the file **`supabase/functions/send-push/index.ts`** on your computer in a
   text editor. Select all (Ctrl+A), copy (Ctrl+C).
5. In the browser code editor, select any sample code that's already there
   (Ctrl+A) and paste your code over it (Ctrl+V).
6. Find the **Verify JWT** option for this function (a checkbox/toggle, usually
   near the Deploy button or under the function's settings) and turn it **OFF**.
   This lets our scheduler call the function using the CRON_SECRET we set, instead
   of a login token.
7. Click **Deploy** (or **Deploy function**).
   - **You should see:** a success message and the function `send-push` listed
     with a green/"Deployed" status.

That's it — the function is live. (The schedules from Part 3 will now be able to
reach it.)

> **Command-line alternative (only if the dashboard editor isn't available):**
> 1. Install the Supabase CLI (a **CLI** is a tool you run in the terminal). On
>    Windows the simplest way is to download `supabase_windows_amd64.tar.gz` from
>    **https://github.com/supabase/cli/releases**, unzip it, and note where
>    `supabase.exe` is.
> 2. In the terminal: `supabase login` (opens your browser to confirm).
> 3. `supabase link --project-ref YOUR_REFERENCE_ID` (links this folder to your project).
> 4. `supabase functions deploy send-push --no-verify-jwt` (uploads the function).
>    `--no-verify-jwt` does the same as turning Verify JWT off in step 6.

---

# Part 7 — Put the website online (GitHub Pages)

**GitHub** stores your code online. **GitHub Pages** turns it into a live website
for free. We'll let GitHub **build** the site for you, so you don't need any
build tools on your computer.

### 7a. Create the repository

A **repository** ("repo") is one project's folder on GitHub.

1. Go to **https://github.com** and sign in (or sign up — it's free).
2. Click the **+** icon (top right) and choose **New repository**.
3. In **Repository name**, type `shower-schedule`.
4. Choose **Public** or **Private** (Private is fine; GitHub Pages still works on
   free accounts). Leave everything else as-is.
5. Click **Create repository**.
   - **You should see:** a page titled "…set up in Desktop or…" with some command
     examples. Keep this page open.

### 7b. Upload your code

**Easiest (no terminal): upload in the browser**

6. On that repository page, click the link **uploading an existing file**.
7. Open your `shower-schedule` folder on your computer, select all files and
   folders **except** `node_modules` (if it exists), and drag them into the
   browser upload area.
8. Scroll down and click **Commit changes**. ("Commit" = save this upload.)
   - **You should see:** your files now listed on the repo page.

**Or, using the terminal (git):** `git` is a tool for sending code to GitHub.
   Run these in the terminal one at a time (replace `YOURNAME`):

   ```powershell
   cd "$HOME\Desktop\shower-schedule"
   git init
   git add .
   git commit -m 'Initial commit'
   git branch -M main
   git remote add origin https://github.com/YOURNAME/shower-schedule.git
   git push -u origin main
   ```
   - `git init` starts tracking the folder; `git add .` selects all files;
     `git commit` saves them; `git push` sends them to GitHub.

### 7c. Add the three public build values

GitHub needs your three public values to build the site. We store them as
**Variables** (for non-secret values).

9. On your repo, click **Settings** (top menu).
10. In the left menu, click **Secrets and variables**, then **Actions**.
11. Click the **Variables** tab, then **New repository variable**. Add these three,
    one at a time (Name, then Value, then **Add variable**):

    | Name | Value |
    | --- | --- |
    | `VITE_SUPABASE_URL` | your Project URL — find it in Supabase: **Project Settings → API → Project URL** (looks like `https://abc….supabase.co`) |
    | `VITE_SUPABASE_ANON_KEY` | the **anon public** key — Supabase: **Project Settings → API → Project API keys → `anon` `public`** (a long string) |
    | `VITE_VAPID_PUBLIC_KEY` | your **VAPID_PUBLIC_KEY** from Part 4 |

    - **You should see:** three variables listed under the Variables tab.

### 7d. Switch on GitHub Pages

12. Still in **Settings**, click **Pages** in the left menu.
13. Under **Build and deployment → Source**, choose **GitHub Actions** from the
    dropdown. (This tells GitHub to build the site using the recipe we included.)
    - **You should see:** the page change to show GitHub Actions is selected.
14. Make the build run now: click the **Actions** tab (top menu). If you see a
    workflow called **Deploy to GitHub Pages**, click it, then click
    **Run workflow → Run workflow**. (If you just uploaded the files, it may
    already be running.)
    - **You should see:** a yellow dot turn into a green tick after 1–2 minutes.
      A green tick means the site built and published.
15. Find your web address: go back to **Settings → Pages**.
    - **You should see:** "Your site is live at
      `https://YOURNAME.github.io/shower-schedule/`". That link is your app. Open
      it on your phone and computer.

> Whenever you change the code later, just upload/push again — GitHub rebuilds and
> republishes automatically.

---

# Part 8 — Test that it all works

Open your live site (`https://YOURNAME.github.io/shower-schedule/`).

1. **Add yourself:** type your name, tap **Add me**.
   - ✅ You should land on the day view with seven time slots.
2. **Allow notifications:** when the phone asks, tap **Allow**.
   - On an **iPhone**, this only works after you **add the app to your home
     screen** and open it from that icon first (see PHONES.md). On Android it works
     in Chrome directly.
3. **Book a slot:** tap **Book this time** on, say, 19:00.
   - ✅ Your name appears in that slot and it's highlighted as yours.
4. **Check the live update / rules** (optional): open the same link on a second
   phone, add a second person, and book the same slot — it should show "1 spot
   left", then "Full" at 2 people, and the neighbouring slots should refuse a 2nd
   person.
5. **Test a notification now (don't wait for 17:00):** in Supabase, click
   **Edge Functions → send-push → Invoke** (or the "Test"/"Run" button). Where it
   asks for a request **body**, paste:

   ```json
   { "type": "daily" }
   ```

   and add a **header** named `x-cron-secret` with your CRON_SECRET value, then
   click **Send/Invoke**. Make sure you have **no** booking for today first, so
   you qualify for the daily reminder.
   - ✅ Within a few seconds you should get a "Pick your shower time for today"
     notification on your phone.

### If a notification does not arrive

- Make sure you tapped **Allow** (not Block) for notifications.
- **iPhone only:** the app **must** be added to the home screen and opened from
  that icon — notifications never work in the Safari tab.
- Check the phone isn't in Do-Not-Disturb / Focus mode.
- In Supabase, open **Edge Functions → send-push → Logs** and look for errors. A
  `401` means the `x-cron-secret` didn't match; re-check that the CRON_SECRET in
  your secrets (Part 5) and in `cron.sql` (Part 3c) are identical.
- Re-open the app once after installing — that's when the device registers for push.

---

## You're done 🎉

- Daily at **17:00 SA**, anyone without a booking gets a reminder.
- At the **top of each booked hour (17:00–23:00)**, that person gets a "shower
  now" ping.
- Everyone's screen updates live as people book, move, and cancel.

To change the app's name, edit the title in `index.html`, `public/manifest.json`,
and `src/components/Header.jsx`, then upload/push again.
