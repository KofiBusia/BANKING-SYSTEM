#!/bin/bash
set -e

echo "================================================"
echo "  Crestline Bank - Android AAB Builder"
echo "================================================"

# Install Node.js 20
echo ""
echo "[1/8] Installing Node.js..."
apt-get update -qq > /dev/null 2>&1
apt-get install -y curl python3 unzip openjdk-17-jdk-headless > /dev/null 2>&1
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs > /dev/null 2>&1
echo "    Node $(node --version) ready"

# Download Linux Android SDK command-line tools
echo ""
echo "[2/8] Downloading Android SDK command-line tools (Linux)..."
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
export ANDROID_HOME=/opt/android-sdk
mkdir -p ${ANDROID_HOME}/cmdline-tools
curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" \
    -o /tmp/cmdtools-linux.zip
unzip -q /tmp/cmdtools-linux.zip -d ${ANDROID_HOME}/cmdline-tools
mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest
export PATH="${JAVA_HOME}/bin:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"
echo "    Android tools ready (JAVA_HOME=$JAVA_HOME)"

echo ""
echo "[3/8] Installing Android SDK platform and build tools..."
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
echo "    SDK platform-35 and build-tools-35 installed"

# Install npm packages
echo ""
echo "[4/8] Installing npm packages..."
cd /workspace
npm install --silent

# Build web assets
echo ""
echo "[5/8] Building web assets..."
printf "VITE_API_BASE_URL=https://ghanabank-backend.onrender.com/api\n" > .env
printf "VITE_WEBAPP_URL=https://banking-system-frontend.onrender.com\n" >> .env
npm run build

# Capacitor Android setup
echo ""
echo "[6/8] Setting up Capacitor Android project..."
cd /workspace
rm -rf android
npx cap add android
npx cap sync android

# Patch build files
echo ""
echo "[7/8] Configuring release build..."
cd /workspace

python3 - << 'PYEOF'
import re

path = '/workspace/android/app/build.gradle'
with open(path, 'r') as f:
    content = f.read()
content = content.replace('minifyEnabled false',
                          'minifyEnabled true\n            shrinkResources true')
content = content.replace('proguard-android.txt', 'proguard-android-optimize.txt')
content = re.sub(r'versionCode\s*=?\s*\d+', 'versionCode 7', content)
content = re.sub(r'versionName\s*=?\s*"[^"]*"', 'versionName "1.2.3"', content)
with open(path, 'w') as f:
    f.write(content)
import re as _re
vc = _re.search(r'versionCode\s+(\d+)', content)
print(f"    app/build.gradle patched (ProGuard + shrink, versionCode={vc.group(1) if vc else '???'})")

vpath = '/workspace/android/variables.gradle'
with open(vpath, 'r') as f:
    v = f.read()
v = re.sub(r'compileSdkVersion\s*=\s*\d+', 'compileSdkVersion = 35', v)
v = re.sub(r'targetSdkVersion\s*=\s*\d+', 'targetSdkVersion = 35', v)
with open(vpath, 'w') as f:
    f.write(v)
print("    variables.gradle patched (targetSdk = 35)")
PYEOF

cp /workspace/android-config/proguard-rules.pro /workspace/android/app/proguard-rules.pro

# Keystore
if [ -f /output/crestline-keystore.jks ]; then
    cp /output/crestline-keystore.jks /tmp/crestline-keystore.jks
    echo "    Using existing keystore"
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

# Download Gradle distribution via curl (avoids the 10s wrapper timeout)
GRADLE_VERSION=$(grep distributionUrl gradle/wrapper/gradle-wrapper.properties | sed 's/.*gradle-\(.*\)-all.*/\1/')
echo "    Downloading Gradle ${GRADLE_VERSION}..."
curl -fsSL "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-all.zip" \
  -o /tmp/gradle-${GRADLE_VERSION}-all.zip
sed -i "s|distributionUrl=.*|distributionUrl=file\:///tmp/gradle-${GRADLE_VERSION}-all.zip|" \
  gradle/wrapper/gradle-wrapper.properties
echo "    Gradle ready"

./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file=/tmp/crestline-keystore.jks \
  -Pandroid.injected.signing.store.password="CrestlineBank2024!" \
  -Pandroid.injected.signing.key.alias="crestline-key" \
  -Pandroid.injected.signing.key.password="CrestlineBank2024!" \
  --no-daemon \
  -q

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
echo "================================================"
