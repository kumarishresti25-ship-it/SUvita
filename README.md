# SUvita

**Scan Smart. Live Green.**

SUvita is a web app that helps people make more informed purchasing decisions by scanning product barcodes and understanding a product's ingredients, sustainability profile, and greener alternatives.

> **Project status:** work in progress. The app foundation, navigation, authentication, and onboarding are built. Product scanning, scoring, and the other features listed under [Roadmap](#roadmap) are planned and are being built stage by stage.

---

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React + TypeScript, built with Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Routing | React Router |
| Backend / database / auth | Supabase (PostgreSQL with Row Level Security) |
| Barcode scanning | html5-qrcode (installed, not yet used) |
| Charts | Recharts (installed, not yet used) |
| UI components | shadcn/ui (planned) |

---

## What works today

- Dark eco-tech design system (Inter font, `#00FFAA` accent)
- Responsive navigation: left sidebar on desktop, bottom bar with a prominent Scan button on mobile
- All main pages routed: Overview, Scan Product, Explore Products, Compare Products, My Collection, Sustainability Insights, SUvita AI, My Profile, Settings (page content is placeholder for now)
- Authentication with Supabase: sign up, log in, log out, password recovery
- Onboarding questionnaire (skippable) with preferences saved to the database
- Protected routes: logged-out users are sent to the login page, and new users are sent to onboarding
- Row Level Security so each user can only read and change their own data

---

## Prerequisites

- **Windows, macOS, or Linux**
- **Node.js** (LTS version). Check with:
  ```
  node -v
  npm -v
  ```
  On Windows you can install it with `winget install OpenJS.NodeJS.LTS`, then close and reopen PowerShell.
- **A free Supabase account** at [supabase.com](https://supabase.com)
- **VS Code** (recommended)

On Windows, if npm is blocked with a "running scripts is disabled" error, run this once in PowerShell:

```
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## Setup

### 1. Install dependencies

Open a terminal in the project folder and run:

```
npm install
```

### 2. Create your Supabase project

1. In Supabase, create an organization (type **Personal**, plan **Free**), then a new project.
2. Go to **Authentication**, **Sign In / Providers**, **Email**. For local testing, turn **off** "Confirm email".
3. Go to **Authentication**, **URL Configuration**. Set **Site URL** to `http://localhost:5173` and add the same address under **Redirect URLs**.

### 3. Create the database tables

In Supabase open **SQL Editor**, then **New query**, paste the SQL below and click **Run**. You should see "Success. No rows returned".

<details>
<summary>Click to show the SQL</summary>

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  main_reason text,
  categories text[] default '{}',
  priorities text[] default '{}',
  notifications boolean default true,
  onboarding_completed boolean default false,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;

create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "prefs select own" on public.user_preferences
  for select using (auth.uid() = user_id);
create policy "prefs insert own" on public.user_preferences
  for insert with check (auth.uid() = user_id);
create policy "prefs update own" on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

</details>

The trigger at the end automatically creates a profile and a preferences row whenever someone signs up.

### 4. Add your environment variables

Create a file named `.env.local` in the project's main folder (next to `package.json`):

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

Find both values in Supabase under **Project Settings**, **API Keys**. Use the **Project URL** and the **Publishable** (or **anon public**) key.

> **Never** use the `secret` or `service_role` key in this app, and never commit `.env.local` to GitHub. Keep real secrets (such as a future AI provider key) on a backend only.

### 5. Run the app

```
npm run dev
```

Open the link it prints, normally `http://localhost:5173/`. If you change `.env.local`, stop the app (**Ctrl + C**) and start it again.

---

## Testing the sign-up flow

1. Open the app. You should see the **Log in** page.
2. Click **Create account**, fill in your name, email, and a password (6 or more characters), and click **Sign up**.
3. Complete or skip the onboarding questions.
4. You should land on **Overview**, with your name at the bottom of the sidebar.
5. In Supabase, open **Table Editor**. The `profiles` and `user_preferences` tables should each contain one row for your account.

---

## Project structure

```
suvita/
├── index.html
├── vite.config.ts
├── .env.local                  # your Supabase keys (not committed)
└── src/
    ├── main.tsx                # app entry, router and auth provider
    ├── App.tsx                 # all routes
    ├── index.css               # Tailwind import
    ├── theme.css               # SUvita colours and font
    ├── lib/
    │   └── supabase.ts         # Supabase client
    ├── context/
    │   └── AuthContext.tsx     # session, preferences, sign out
    ├── components/
    │   ├── Layout.tsx          # sidebar and mobile bottom bar
    │   ├── PageStub.tsx        # temporary page placeholder
    │   ├── ProtectedRoute.tsx  # login and onboarding guard
    │   └── AuthShell.tsx       # shared look for auth pages
    └── pages/
        ├── Login.tsx
        ├── Signup.tsx
        ├── ForgotPassword.tsx
        ├── ResetPassword.tsx
        └── Onboarding.tsx
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run build` | Creates a production build |
| `npm run preview` | Previews the production build locally |

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `node` or `npm` "not recognized" | Close and reopen the terminal. If it persists, restart the computer. |
| "Failed to resolve import" in the browser | A file is missing, misnamed, or in the wrong folder. Check the [project structure](#project-structure) and file name capitalisation. |
| `duplicate field baseUrl` | Remove the repeated `baseUrl` and `paths` lines in `tsconfig.app.json` so only one copy remains. |
| "Invalid API key" or "Failed to fetch" | Check the two values in `.env.local`, then restart `npm run dev`. |
| Leaf icon keeps pulsing after login | The user has no `user_preferences` row. Make sure the SQL from step 3 ran, delete the user under **Authentication**, **Users**, and sign up again. |
| Tables are empty | Normal until someone signs up. Rows are created at sign-up. |

---

## Roadmap

- [x] **Stage 1:** project setup
- [x] **Stage 2:** design system, navigation, and page routes
- [x] **Stage 3:** Supabase authentication, onboarding, and preferences
- [ ] **Stage 4:** barcode scanner and product page with the EcoScore
- [ ] **Stage 5:** Explore, Compare, and My Collection
- [ ] **Stage 6:** Scan & Compare (two-product scanning)
- [ ] **Stage 7:** Sustainability Insights, Profile, and Settings
- [ ] **Stage 8:** SUvita AI assistant

### Planned scoring approach

The EcoScore will combine four weighted dimensions, each normalised to 0 to 100:

| Dimension | Weight |
| --- | --- |
| Ingredient Safety | 40% |
| Packaging Type | 30% |
| Brand Ethics | 20% |
| Energy Footprint | 10% |

Grades: A (80 to 100), B (65 to 79), C (50 to 64), D (35 to 49), E (0 to 34). Missing data will be treated as missing rather than zero, and each score will show a data-confidence indicator. Sustainability claims will only come from attributable sources, and any demonstration data will be clearly labelled as sample data.

---

## Data sources (planned)

- [Open Food Facts](https://world.openfoodfacts.org/) for food product data
- Cosmetic and personal-care ingredient sources, subject to confirming API access and licensing
- Packaging and brand sustainability information from credible, attributable sources

---

## Author

Built by Shresti Kumari as a portfolio project.
