# 🚀 Vercel Deployment Checklist for ThriftTheLook

Follow this step-by-step guide to deploy your project live to the web using **Vercel** and configure **Supabase**.

---

## Prerequisites
- A GitHub account with your `Thrift-the-look` repository pushed to `main`.
- A [Vercel account](https://vercel.com/) (sign up with GitHub if you haven't already).
- Your Supabase project URL and anon key (from your `.env.local`).

---

## Step 1: Import Project into Vercel

1. Log in to [vercel.com](https://vercel.com).
2. On your dashboard, click the **"Add New..."** button (top right) and select **"Project"**.
3. Under **"Import Git Repository"**, find `Thrift-the-look` and click **"Import"**.

---

## Step 2: Configure Project Settings

1. **Project Name**: Keep as `thrift-the-look` (or your preferred name).
2. **Framework Preset**: Ensure **Next.js** is detected.
3. **Root Directory**: Leave as `./` (default).
4. **Build & Development Settings**: Leave all at their default values (`next build`).

---

## Step 3: Add Environment Variables

Before clicking Deploy, expand the **"Environment Variables"** section and add the two variables from your `.env.local`:

| Variable Name | Value |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | *Paste your Supabase URL from `.env.local` (e.g. `https://xxxx.supabase.co`)* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Paste your Supabase Anon Key from `.env.local`* |

> ⚠️ **Note**: Do **NOT** add `SUPABASE_SERVICE_KEY` to Vercel. That secret key is only used locally by the Python seed scripts and should never be exposed to the frontend.

---

## Step 4: Deploy

1. Click the **"Deploy"** button.
2. Vercel will build and deploy the Next.js application (takes ~1 to 2 minutes).
3. Once finished, you will see confetti and a screenshot preview with your live URL (e.g., `https://thrift-the-look-xyz.vercel.app`).
4. Copy your live Vercel URL!

---

## Step 5: Update Supabase Authentication URL Configuration

For authentication (log in, sign up, session redirects) to work properly on the live domain:

1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your `ThriftTheLook` project.
3. In the left sidebar, go to **Authentication** → **URL Configuration**.
4. Under **Site URL**, paste your Vercel URL:
   ```
   https://thrift-the-look.vercel.app
   ```
5. Under **Redirect URLs**, click **"Add URL"** and add:
   ```
   https://thrift-the-look.vercel.app/**
   ```
   *(Keep `http://localhost:3000/**` as well so local testing still works).*
6. Click **"Save"** at the bottom of the page.

---

## Step 6: Verify and Test the Live Site

Open your live Vercel deployment URL in your browser and test each core feature:

- [ ] **Home Page**: Check that the 20 initial outfits load in the masonry grid, "Load more" button works, and "Trending this week" carousel scrolls smoothly.
- [ ] **Outfit Detail (`/outfit/[id]`)**: Click an outfit and verify that pieces are broken down into Thrift, Mid, and Premium product options.
- [ ] **Similar Outfits**: Verify the similar outfits section at the bottom of the outfit page.
- [ ] **Vibes (`/vibes`)**: Select different vibe tags (e.g. Minimalist, Y2K) and confirm matching outfits load.
- [ ] **Authentication**:
  - Sign up for a new account at `/signup`.
  - Log in at `/login`.
  - Verify your email or logout status displays in the top navigation bar.
- [ ] **Save / Boards (`/boards`)**:
  - Click the **Save** button on any outfit.
  - Navigate to **Saved** in the header and verify that your saved outfit appears on your board.
- [ ] **Upload (`/upload`)**:
  - While logged in, upload a photo with a title and comma-separated tags.
  - Verify you are redirected to Discover and see the newly uploaded outfit.
