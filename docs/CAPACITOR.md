# Wrapping ALEF with Capacitor (documentation only; nothing here has been run)

ALEF is a static site, so Capacitor can load it as `webDir`. This needs npm (blocked in the build environment) and, for iOS, macOS + Xcode.

1. In a copy of the repo with network access: `npm init -y && npm i @capacitor/core @capacitor/cli`; `npx cap init ALEF org.example.alef --web-dir=.`
   (better: copy `index.html sw.js manifest.webmanifest precache-manifest.js offline.html src data assets` into a `www/` dir and set `webDir: 'www'`).
2. `npm i @capacitor/ios @capacitor/android && npx cap add ios && npx cap add android && npx cap sync`.
3. Open with `npx cap open ios|android`, set bundle id, icons (from `assets/icons/`), signing.
4. Service workers work in Capacitor webviews only partially (iOS WKWebView with a custom scheme does not register SWs); bundle all
   assets in the app so offline does not depend on the SW.

## Apple App Store Guideline 4.2 (minimum functionality) risk
A thin web wrapper risks rejection. Per the research, mitigate with real native features: camera scanning of printed
prayers (Scan lane; native camera plugin), on-device ML Kit ink recognition and translation (bridged plugins), local
notifications (candle lighting, daily reflection), offline bundle of audio/strokes/registry. These are **not built**; the
research reports the 4.2 risk and mitigation list as unverified against current Apple text. Fees (Apple US$99/yr, Google
US$25 once) come from the research and were not re-checked.

## Native touches to plan
Local notifications and geolocation permission for the calendar module; file sharing for backup export; haptics optional.

## Notes from the accessibility and PWA pass (2026-11-04; none of this was run in a Capacitor shell)
- Progress lives in `localStorage` (`alef:` keys). In a Capacitor webview that storage belongs to the app and is deleted with it; iOS can also purge webview storage under pressure. The Settings backup (JSON download, confirm-before-replace restore, see docs/DEPLOY.md) is the only safety net today. In a wrapper, the Blob-download trick in `src/shell/settings.view.js` (anchor with `download`) is not expected to work in WKWebView; plan to write the file with `@capacitor/filesystem` and hand it to `@capacitor/share` (not built, not tested).
- `navigator.storage.persist()` is requested at onboarding; whether a Capacitor webview honours it was not checked.
- The service-worker update flow tested in Chromium (docs/DEPLOY.md) does not apply when the app files are bundled: updates then arrive as new app-store builds.
- Accessibility in a wrapper is unverified: VoiceOver and TalkBack were not used on this app at all. The bottom tab bar uses `env(safe-area-inset-bottom)`; check it against the home indicator on a notched device.
