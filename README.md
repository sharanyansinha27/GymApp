# IRON 100

A 100-day bodybuilding training and transformation tracker. The mobile app is built
with Expo and React Native; workout and progress records are stored locally on the
device and are saved as you enter them.

## Run on a phone

1. Install Node.js and the Expo Go app (SDK 57) on your Android phone. Keep
   your phone and computer on the same Wi-Fi network.
2. Install dependencies with `npm install`.
3. Start Expo with `npm run expo:start`.
4. Scan the QR code in Expo Go.

On Windows, if the project folder path contains special characters that prevent
Metro from starting, create an ASCII-only junction in PowerShell before step 3:

```powershell
$project = (Get-Location).Path
$junction = Join-Path $env:TEMP 'iron100-dev-root'
if (-not (Test-Path $junction)) {
  New-Item -ItemType Junction -Path $junction -Target $project
}
Set-Location $junction
$env:EXPO_PUBLIC_FOLDER = '__expo_empty_public__'
npm run expo:start
```

The Expo app does not use files from the browser app's `public` folder at
runtime; this setting works around Expo CLI's public-folder symlink check.

To create a downloadable Android APK, configure an EAS account and run
`npm run eas:build:android`. Open the build link from EAS on your phone to
download and install it. For an iOS build, run `npm run eas:build:ios` (Apple
signing credentials are required).

## Browser version

The existing browser app can still be run with `npm run dev` and built with
`npm run build`.

## Local data

Mobile workout sessions, daily measurements, and progress-photo references are
stored in on-device AsyncStorage. Completed sessions are read-only, and each
challenge date has its own record. Use device backups when moving to a new phone.
