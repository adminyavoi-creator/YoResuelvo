#!/bin/zsh
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_dir"
node scripts/check-android-release.mjs
npm run android:sync
cd android
./gradlew --no-daemon bundleRelease
cd "$project_dir"
release_name="$(node -p "require('./release-version.json').versionName")"
release_code="$(node -p "require('./release-version.json').versionCode")"
artifact_dir="$project_dir/artifacts"
mkdir -p "$artifact_dir"
artifact_path="$artifact_dir/YoResuelvo-${release_name}-codigo-${release_code}-interna.aab"
signature_log="$(mktemp -t yoresuelvo-signature)"
trap 'rm -f "$signature_log"' EXIT
if ! jarsigner -J-Duser.language=en -J-Duser.country=US -verify android/app/build/outputs/bundle/release/app-release.aab > "$signature_log" 2>&1; then
  cat "$signature_log" >&2
  exit 1
fi
if ! /usr/bin/grep -E '^jar verified\.' "$signature_log" > /dev/null; then
  cat "$signature_log" >&2
  echo 'No se pudo verificar la firma del AAB.' >&2
  exit 1
fi
if ! unzip -Z1 android/app/build/outputs/bundle/release/app-release.aab | /usr/bin/grep -E '^META-INF/[^/]+\.(RSA|DSA|EC)$' > /dev/null; then
  echo 'No se encontró firma de release. Revisa android/key.properties.' >&2
  exit 1
fi
cp android/app/build/outputs/bundle/release/app-release.aab "$artifact_path"
shasum -a 256 "$artifact_path" > "$artifact_path.sha256"
echo "AAB listo: $artifact_path"
open -R "$artifact_path"
