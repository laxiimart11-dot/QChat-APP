# QChat — Google Play Store Upload & Mobile Installation Guide
## Complete Production Publishing & Installation Documentation

---

### 1. Direct Mobile Installation (Progressive Web App - PWA)
You can install QChat directly on any Android smartphone, tablet, or iPhone without downloading APK files:

#### Android (Chrome / Samsung Internet / Edge):
1. Open the application URL in Chrome on your phone:
   `https://ais-pre-yek2ndeu5s4fqu2uhhikvm-756728280730.asia-southeast1.run.app`
2. Tap the **"📱 Install App"** button at the bottom of the screen or in the settings drawer.
3. Or tap the 3 dots at the top right of Chrome and select **"Install app"** or **"Add to Home screen"**.
4. The **QChat** native icon will appear in your phone's app drawer and home screen, running full-screen with native hardware acceleration.

#### iPhone / iPad (Safari):
1. Open the application URL in Safari.
2. Tap the **Share** icon at the bottom of Safari.
3. Scroll down and tap **"Add to Home Screen"**, then tap **"Add"**.

---

### 2. Google Play Store Configuration Files Provided

All necessary production files have been generated in your repository:

| File Name | Description |
|---|---|
| `/android/twa-manifest.json` | Google Bubblewrap TWA configuration file (Package: `com.qchat.messenger`) |
| `/android/app/src/main/AndroidManifest.xml` | Complete Android Manifest with Camera, Microphone, GPS, and Notification permissions |
| `/android/app/src/main/java/com/qchat/messenger/MainActivity.java` | Native Activity with `FLAG_SECURE` hardware screenshot and screen recording blocking |
| `/android/app/build.gradle` | Android SDK 35 (Android 15) compatible build configuration |
| `/public/.well-known/assetlinks.json` | Digital Asset Links for full-screen native verification |
| `/public/pwa-512x512.png` | Play Store high-resolution icon (512x512 PNG) |
| `/public/pwa-maskable-512x512.png` | Android adaptive maskable icon |
| `/android/playstore-metadata.json` | Play Store listing title, short description, and full description |

---

### 3. Two Easy Methods to Build Signed `.aab` for Google Play Store

#### Method 1: PWABuilder (Fastest & Easiest — 2 Minutes)
1. In your computer browser, visit: **[https://www.pwabuilder.com](https://www.pwabuilder.com)**
2. Enter your application URL in the input box:
   `https://ais-pre-yek2ndeu5s4fqu2uhhikvm-756728280730.asia-southeast1.run.app`
3. Click **"Start"**. PWABuilder validates your PWA manifest with a 100% pass score.
4. Click **"Package for Stores"** and select **"Android"**.
5. Set your Package ID: `com.qchat.messenger`
6. Click **"Generate"** to immediately download your signed **`.aab`** bundle!

#### Method 2: Official Google Bubblewrap CLI
Run these commands in your computer terminal:

```bash
# 1. Install Google Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. Initialize from your hosted manifest
bubblewrap init --manifest="https://ais-pre-yek2ndeu5s4fqu2uhhikvm-756728280730.asia-southeast1.run.app/manifest.json"

# 3. Build signed Play Store bundle
bubblewrap build
```
This generates your production `app-release-signed.aab` bundle.

---

### 4. Publishing to Google Play Console

1. Log in to **Google Play Console** (`play.google.com/console`).
2. Click **"Create app"**:
   - App name: **QChat - Real-time Messenger**
   - Default language: **English (United States)**
   - App or game: **App**
   - Free or paid: **Free**
3. **App Content & Policies**:
   - Privacy Policy URL:
     `https://ais-pre-yek2ndeu5s4fqu2uhhikvm-756728280730.asia-southeast1.run.app`
   - Content rating: All Ages / Everyone
   - Target audience: 13+
4. **Main Store Listing**:
   - Copy and paste Title, Short Description, and Full Description from `/android/playstore-metadata.json`.
   - Upload App Icon from: `/public/pwa-512x512.png`.
   - Upload 4-6 app screenshots.
5. **Release Management**:
   - Go to **Production** or **Closed Testing**.
   - Click **"Create new release"**.
   - Drag and drop your **`.aab`** file.
   - Click **"Review release"** and **"Start rollout to Production"**.
6. Google reviews your app and publishes it live to the Google Play Store within 24 to 48 hours!
