# Crestline Bank — Mobile App Build Guide

## Prerequisites
- Node.js 18+
- For Android: Android Studio + JDK 17
- For iOS: Xcode 15+ (Mac only)

## 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your deployed URLs:
```
VITE_API_BASE_URL=https://your-backend.onrender.com/api
VITE_WEBAPP_URL=https://your-frontend.onrender.com
```

## 2. Install Dependencies

```bash
cd mobile-app
npm install
```

## 3. Build Web Assets

```bash
npm run build
```

## 4. Add Platforms (first time only)

```bash
npm run cap:add:android
npm run cap:add:ios        # Mac only
```

## 5. Apply Android Production Settings

After `cap add android`, copy `android-config/proguard-rules.pro` to `android/app/proguard-rules.pro`.

In `android/app/build.gradle`, under `buildTypes.release`:
```gradle
minifyEnabled true
shrinkResources true
proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
```

## 6. Generate Icons & Splash Screens

```bash
npm run gen:icons
```
This uses the SVGs in `resources/` to generate all required icon and splash sizes.

## 7. Sync and Open

```bash
# Android
npm run build:android
npx cap open android
# Then: Build → Generate Signed Bundle/APK in Android Studio

# iOS (Mac only)
npm run build:ios
npx cap open ios
# Then: Product → Archive in Xcode
```

## Size Targets

| Platform | Format | Target |
|----------|--------|--------|
| Android  | APK    | < 7 MB |
| Android  | AAB (Play Store) | < 5 MB |
| iOS      | IPA    | < 8 MB |

## Architecture

```
Mobile App (Capacitor shell ~3-5MB)
    ├── Login / Register         → Native screen, calls /api/auth/*
    ├── KYC Personal             → Native screen, calls /api/kyc/personal
    ├── Dashboard                → Native screen, calls /api/auth/me + /api/transactions
    ├── Transactions (5 days)    → Native screen, calls /api/transactions
    └── Full App                 → Opens webapp URL in in-app browser
                                   (token injected via URL hash for seamless SSO)
```

## Token Handoff (Native → Webapp)

The mobile app opens the webapp with:
```
https://your-webapp.com/dashboard#gb_token=JWT&gb_refresh_token=REFRESH
```

The webapp's `main.tsx` reads the hash on load, stores tokens in `localStorage`, and strips them from the URL. The user lands directly on the dashboard, already authenticated.

## Updating the App

After code changes:
```bash
npm run build && npx cap sync
```
Then rebuild in Android Studio / Xcode.
