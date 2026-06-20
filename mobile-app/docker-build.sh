#!/bin/bash
set -e

echo "================================================"
echo "  Crestline Bank - Android AAB Builder"
echo "================================================"

# Install Node.js 20
echo ""
echo "[1/8] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs python3 unzip wget > /dev/null 2>&1
echo "    Node $(node --version) ready"

# Install npm packages
echo ""
echo "[2/8] Installing npm packages..."
cd /workspace
npm install --silent

# Build web assets
echo ""
echo "[3/8] Building web assets..."
printf "VITE_API_BASE_URL=https://ghanabank-backend.onrender.com/api\n" > .env
printf "VITE_WEBAPP_URL=https://banking-system-frontend.onrender.com\n" >> .env
npm run build

# Install Android SDK FIRST (needed before cap add android)
echo ""
echo "[4/8] Downloading Android command-line tools..."
export ANDROID_HOME=/opt/android-sdk
mkdir -p ${ANDROID_HOME}/cmdline-tools
wget -q "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -O /tmp/cmdtools.zip
unzip -q /tmp/cmdtools.zip -d ${ANDROID_HOME}/cmdline-tools
mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest
rm /tmp/cmdtools.zip
export PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"
echo "    Android tools ready"

echo ""
echo "[5/8] Installing Android SDK platform and build tools..."
yes | sdkmanager --licenses > /dev/null 2>&1
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" > /dev/null 2>&1
echo "    SDK platform-35 and build-tools-35 installed"

# Capacitor Android setup
echo ""
echo "[6/8] Setting up Capacitor Android project..."
cd /workspace
rm -rf android
npx cap add android
npx cap sync android

# Patch build.gradle for optimized release
echo ""
echo "[7/8] Configuring release build..."
cd /workspace

python3 - << 'PYEOF'
import re

# Patch app/build.gradle — enable ProGuard
path = '/workspace/android/app/build.gradle'
with open(path, 'r') as f:
    content = f.read()
content = content.replace('minifyEnabled false',
                          'minifyEnabled true\n            shrinkResources true')
content = content.replace('proguard-android.txt', 'proguard-android-optimize.txt')
content = re.sub(r'versionCode \d+', 'versionCode 2', content)
content = re.sub(r'versionName "[^"]*"', 'versionName "1.1.0"', content)
with open(path, 'w') as f:
    f.write(content)
print("    app/build.gradle patched (ProGuard + shrink enabled, versionCode=2)")

# Patch variables.gradle — bump compile + target SDK to 35
vpath = '/workspace/android/variables.gradle'
with open(vpath, 'r') as f:
    v = f.read()
v = re.sub(r'compileSdkVersion\s*=\s*\d+', 'compileSdkVersion = 35', v)
v = re.sub(r'targetSdkVersion\s*=\s*\d+', 'targetSdkVersion = 35', v)
v = re.sub(r"compileSdk\s*=\s*\d+", "compileSdk = 35", v)
v = re.sub(r"targetSdk\s*=\s*\d+", "targetSdk = 35", v)
with open(vpath, 'w') as f:
    f.write(v)
print("    variables.gradle patched (targetSdk = 35)")
PYEOF

cp /workspace/android-config/proguard-rules.pro /workspace/android/app/proguard-rules.pro

# Use existing keystore from Desktop if present, otherwise generate a new one
if [ -f /output/crestline-keystore.jks ]; then
    cp /output/crestline-keystore.jks /tmp/crestline-keystore.jks
    echo "    Using existing keystore from Desktop"
else
    keytool -genkey -v \
      -keystore /tmp/crestline-keystore.jks \
      -alias crestline-key \
      -keyalg RSA -keysize 2048 -validity 10000 \
      -storepass "CrestlineBank2024!" \
      -keypass "CrestlineBank2024!" \
      -dname "CN=Crestline Solutions LTD, O=Crestline Solutions LTD, C=GH" \
      > /dev/null 2>&1
    cp /tmp/crestline-keystore.jks /output/crestline-keystore.jks
    echo "    New keystore generated and saved to Desktop"
fi

# Build signed AAB
echo ""
echo "[8/8] Building signed release AAB (5-10 minutes)..."
cd /workspace/android
chmod +x gradlew

./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file=/tmp/crestline-keystore.jks \
  -Pandroid.injected.signing.store.password="CrestlineBank2024!" \
  -Pandroid.injected.signing.key.alias="crestline-key" \
  -Pandroid.injected.signing.key.password="CrestlineBank2024!" \
  --no-daemon \
  -q

# Copy to desktop
cp /workspace/android/app/build/outputs/bundle/release/app-release.aab /output/CrestlineBank.aab
cp /tmp/crestline-keystore.jks /output/crestline-keystore.jks

AAB_SIZE=$(du -sh /output/CrestlineBank.aab | cut -f1)

echo ""
echo "================================================"
echo "  BUILD COMPLETE!"
echo "================================================"
echo ""
echo "  CrestlineBank.aab  ($AAB_SIZE)  <-- upload to Google Play"
echo "  crestline-keystore.jks          <-- KEEP THIS FOREVER"
echo ""
echo "  Keystore password : CrestlineBank2024!"
echo "  Key alias         : crestline-key"
echo ""
echo "  SAVE the password and alias - you need them"
echo "  every time you update the app on Play Store."
echo "================================================"
