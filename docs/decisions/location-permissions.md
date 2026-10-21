# Research Record: RS-02 & RS-03 — Mobile Location Permissions & Background Execution

**Governing Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part D)  
**Task ID**: **RS-02** (Expo Background Location & Swipe-Away Lifecycle) & **RS-03** (Google Play Policy)  
**Current Status**:
- **RS-02**: **VERIFIED & RESOLVED** (Checked: 2026-10-21)
- **RS-03**: **PENDING RESEARCH** (Awaiting separate authorization)

---

## Part A: RS-02 — Background Location Architecture, Plugin Configuration & Lifecycle

### 1. Exact Research Question (Part D)
> *"Expo background location: config plugin options for an Android foreground service with a location type; Android and iOS permission strings; entitlements and background modes; iOS behaviour when the app is swiped away"*

---

### 2. Authoritative Sources Consulted

All primary sources were verified on **2026-10-21**:

1. **Expo Documentation — Location API & Config Plugin**
   - *Publisher*: 650 Industries, Inc. (Expo)
   - *Direct URL*: `https://docs.expo.dev/versions/latest/sdk/location/`
   - *Relevant Section*: Config plugin options (`isAndroidBackgroundLocationEnabled`, `isAndroidForegroundServiceEnabled`, `androidForegroundServiceIcon`), `startLocationUpdatesAsync`, `foregroundService` object options.
   - *Applicable Version*: Expo SDK 58 / SDK 57 (React Native 0.88 / 0.86).
2. **Expo Documentation — TaskManager API**
   - *Publisher*: Expo
   - *Direct URL*: `https://docs.expo.dev/versions/latest/sdk/task-manager/`
   - *Relevant Section*: Global task definition (`TaskManager.defineTask`), headless background task execution, process decoupling.
   - *Applicable Version*: Expo SDK 58 / SDK 57.
3. **Android Developers Official Guide — Foreground Services**
   - *Publisher*: Google LLC / Android Open Source Project (AOSP)
   - *Direct URL*: `https://developer.android.com/develop/background-work/services/foreground-services`
   - *Relevant Section*: Foreground service types (`foregroundServiceType="location"`), Android 14 (API 34) & Android 15 (API 35) runtime permissions (`FOREGROUND_SERVICE_LOCATION`), manifest restrictions.
   - *Applicable Version*: Android 14 (API 34) and Android 15 (API 35).
4. **Android Developers Official Guide — Request Location Permissions**
   - *Publisher*: Google LLC / AOSP
   - *Direct URL*: `https://developer.android.com/develop/sensors-and-location/location/permissions`
   - *Relevant Section*: Incremental two-step location request requirement (Android 11+), `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, Doze mode, and `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
   - *Applicable Version*: Android 10 (API 29) through Android 15 (API 35).
5. **Apple Developer Documentation — Core Location Background Execution**
   - *Publisher*: Apple Inc.
   - *Direct URL*: `https://developer.apple.com/documentation/corelocation/handling_location_events_in_the_background`
   - *Relevant Section*: `UIBackgroundModes` `location`, `pausesLocationUpdatesAutomatically`, `showsBackgroundLocationIndicator`, `activityType`, and CoreLocation behavior upon user force-quit.
   - *Applicable Version*: iOS 16.4+ and iOS 17+.
6. **Apple Developer Documentation — Information Property List Keys**
   - *Publisher*: Apple Inc.
   - *Direct URL*: `https://developer.apple.com/documentation/bundleresources/information_property_list/nslocationalwaysandwheninuseusagedescription`
   - *Relevant Section*: Privacy descriptions for foreground (`NSLocationWhenInUseUsageDescription`) and background (`NSLocationAlwaysAndWhenInUseUsageDescription`).
   - *Applicable Version*: iOS 16.4+.

---

### 3. Verified Technical Findings

#### 3.1 Expo Config Plugin Configuration (`app.json` / `app.config.js`)
`[VERIFIED FACT: OFFICIAL DOCUMENTATION]`

To enable driver background tracking on Android 14+ and iOS 16.4+, `expo-location` must be registered in the `plugins` array of `app.json`:

```json
{
  "expo": {
    "name": "College Bus Tracker - Driver",
    "slug": "college-bus-tracker-driver",
    "plugins": [
      [
        "expo-location",
        {
          "isAndroidBackgroundLocationEnabled": true,
          "isAndroidForegroundServiceEnabled": true,
          "androidForegroundServiceIcon": "./assets/icons/notification-tracking-icon.png",
          "locationWhenInUsePermission": "College Bus Tracker uses your location during active shifts to display your bus's live position to students and calculate stop ETAs.",
          "locationAlwaysAndWhenInUsePermission": "College Bus Tracker requires continuous background location access while your shift is active so students and coordinators receive live updates even when your phone is locked or navigation is open."
        }
      ]
    ]
  }
}
```

##### Config Plugin Parameters Reference:
- `isAndroidBackgroundLocationEnabled: true`: Automatically injects `<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />` into the generated `AndroidManifest.xml`.
- `isAndroidForegroundServiceEnabled: true`: Injects `<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />` and `<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />`, and configures `android:foregroundServiceType="location"` on the service declaration (mandatory for Android 14+).
- `androidForegroundServiceIcon`: Path to a 96x96 transparent monochrome PNG icon displayed in the Android status bar for the ongoing persistent notification.
- `[CRITICAL ECOSYSTEM LIMITATION]`: Background location with native foreground services **cannot run inside standard pre-compiled Expo Go** on SDK 51+. Development and testing require **Expo Development Builds** (`npx expo run:android` / `npx expo run:ios`) or EAS cloud builds.

---

#### 3.2 Runtime Task Definition & Location Options (`expo-task-manager` + `expo-location`)
`[VERIFIED FACT: OFFICIAL DOCUMENTATION]`

Headless background tasks must be defined at the **top level (global scope)** of the JavaScript/TypeScript bundle, outside any React component:

```typescript
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

export const DRIVER_LOCATION_TASK = 'DRIVER_BACKGROUND_LOCATION_TASK';

// Must be registered globally before the root component mounts
TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    // Internal logging; personal data and tokens are strictly excluded (Part B.7)
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    // Pass batched fixes to local buffer in platform storage (Task P3-T4)
  }
});
```

##### Location Options Configuration (`Location.startLocationUpdatesAsync`):
```typescript
await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
  accuracy: Location.Accuracy.High, // Translates to GPS / fine GNSS fix
  timeInterval: 10000,              // 10s interval moving (Part I.5 & P3-T4)
  distanceInterval: 10,             // 10m displacement trigger
  deferredUpdatesInterval: 5000,    // Power optimization batching
  pausesLocationUpdatesAutomatically: false, // Critical: Prevents iOS from halting GPS at bus stops or red lights
  showsBackgroundLocationIndicator: true,    // iOS blue status bar/pill indicator
  activityType: Location.ActivityType.AutomotiveNavigation, // CoreLocation vehicular movement profile
  foregroundService: {
    notificationTitle: "Bus Shift Active",
    notificationBody: "Transmitting live bus location to transport office.",
    notificationColor: "#002B49",
    killServiceOnDestroy: false     // Prevents Android from killing FGS when activity is closed
  }
});
```

---

#### 3.3 Android Requirements & Version Restrictions (API 29–35)
`[VERIFIED FACT: OFFICIAL DOCUMENTATION]`

1. **Android 11+ Incremental Permission Rule**:
   - `ACCESS_BACKGROUND_LOCATION` cannot be requested simultaneously with foreground permissions (`ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`). Doing so causes Android 11+ to ignore the request completely without showing a prompt.
   - **Mandatory Sequence**:
     1. Request foreground permission first: `await Location.requestForegroundPermissionsAsync()`.
     2. Wait for user consent.
     3. Present educational rationale dialog explaining why background tracking is required during shifts.
     4. Request background permission separately: `await Location.requestBackgroundPermissionsAsync()`, which directs the user to system settings to select **"Allow all the time"**.
2. **Android 14+ (API 34) Foreground Service Type Enforcement**:
   - Android 14 strictly enforces `android:foregroundServiceType="location"`.
   - Starting a foreground service without this type throws `MissingForegroundServiceTypeException` or `SecurityException`.
   - The app must declare `android.permission.FOREGROUND_SERVICE_LOCATION` in the manifest.
3. **Android 13+ (API 33) Notification Permission**:
   - Android 13 requires `android.permission.POST_NOTIFICATIONS` at runtime to show the persistent foreground service notification. If denied, the service cannot start or display ongoing status.
4. **Battery Optimizations (Doze Mode & App Standby)**:
   - When the device is unplugged and stationary with screen off, Doze restricts network and background CPU.
   - A Foreground Service is exempt from standard Doze restrictions, but aggressive OEM battery killers (MIUI, ColorOS, One UI) can still terminate it.
   - Driver pre-trip check (`P3-T2`) must launch `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.

---

#### 3.4 iOS Requirements & Entitlements (iOS 16.4+)
`[VERIFIED FACT: OFFICIAL DOCUMENTATION]`

1. **Background Modes**:
   - `UIBackgroundModes` array must contain `"location"`.
2. **Privacy Usage Strings**:
   - `NSLocationWhenInUseUsageDescription`: Displays on initial foreground prompt.
   - `NSLocationAlwaysAndWhenInUseUsageDescription`: Displays when requesting "Always" access.
3. **Continuous Tracking Controls**:
   - `pausesLocationUpdatesAutomatically: false`: By default, iOS pauses location updates when a device has not moved for several minutes. This **must** be set to `false` for public transport tracking so buses idling at traffic signals or boarding stops do not drop tracking.
   - `showsBackgroundLocationIndicator: true`: Mandates the prominent blue status bar / pill indicator in iOS 16.4+, ensuring user transparency.
   - `activityType: Location.ActivityType.AutomotiveNavigation`: Optimizes Apple GPS filtering for vehicular routes.

---

### 4. Detailed Analysis of the Six Application Lifecycle States

`[VERIFIED FACT: OFFICIAL DOCUMENTATION — DISTINCTIONS PROVEN]`

The master plan strictly prohibits treating swiping away, force-stopping, permission revocation, and device reboot as equivalent events. The official platform documentation establishes the following distinct behaviors:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              LIFECYCLE STATE TAXONOMY                                  │
├──────────────────────┬──────────────────────────────┬──────────────────────────────────┤
│ Lifecycle State      │ iOS (CoreLocation)           │ Android (AOSP + Foreground Svc)  │
├──────────────────────┼──────────────────────────────┼──────────────────────────────────┤
│ 1. Foreground        │ Normal location streaming    │ Normal location streaming        │
├──────────────────────┼──────────────────────────────┼──────────────────────────────────┤
│ 2. Background        │ Continues streaming GPS with │ Continues streaming GPS via      │
│    (Minimized)       │ blue status pill indicator   │ FGS with ongoing notification    │
├──────────────────────┼──────────────────────────────┼──────────────────────────────────┤
│ 3. Swiped Away from  │ COMPLETELY TERMINATED        │ Activity destroyed; Foreground   │
│    Recents / Switcher│ Continuous updates DIE       │ Service CONTINUES RUNNING        │
├──────────────────────┼──────────────────────────────┼──────────────────────────────────┤
│ 4. Force-Stopped     │ Process purged from memory;  │ Process placed in STOPPED state; │
│    (Settings / CLI)  │ zero wakeups allowed         │ zero code runs until user tap    │
├──────────────────────┼──────────────────────────────┼──────────────────────────────────┤
│ 5. Permission        │ Process killed immediately;  │ Process killed immediately;      │
│    Revoked in OS     │ subsequent calls fail        │ throws SecurityException         │
├──────────────────────┼──────────────────────────────┼──────────────────────────────────┤
│ 6. Device Restart    │ Suspended until unlocked &   │ Suspended; can auto-start only   │
│    (Reboot)          │ manually launched by user    │ if boot receiver registered      │
└──────────────────────┴──────────────────────────────┴──────────────────────────────────┘
```

#### State 1: App in the Foreground
- **iOS**: Continuous GPS fixes delivered to `expo-location` callbacks.
- **Android**: Location delivered normally without foreground service notification requirement.

#### State 2: App Moves into the Background (Home Pressed / Other App in Front)
- **iOS**: CoreLocation continues streaming fixes because `UIBackgroundModes: ["location"]` is enabled and `showsBackgroundLocationIndicator: true` displays the blue pill indicator.
- **Android**: Foreground service remains active. Persistent ongoing notification is displayed in the notification drawer; location callbacks fire uninterrupted.

#### State 3: User Swipes App Away from Recent Apps / App Switcher
- **iOS Behavior `[VERIFIED FACT]`**:
  - Apple classifies a swipe-away from the App Switcher as an **Explicit User Force-Quit (Termination)**.
  - CoreLocation immediately terminates standard continuous streaming (`startUpdatingLocation`). **Location updates stop completely and do not restart.**
  - *Relaunch Exceptions*: CoreLocation only relaunches a terminated app for *Significant Location Changes* (>500m cell tower jump) or *Region Monitoring (Geofencing)*. In iOS 15+, Apple suppresses even significant location restarts after an explicit user force-quit until the user manually relaunches the app.
- **Android Behavior `[VERIFIED FACT]`**:
  - Under AOSP rules, when an app has an active Foreground Service with an ongoing notification, swiping the app away from Recents destroys the UI `Activity`, but **the background process and Foreground Service remain alive and continue tracking**.
  - `killServiceOnDestroy: false` prevents Android from tearing down the service on activity destruction.
  - `[REQUIRES PHYSICAL DEVICE TEST IN PHASE P3]`: Proprietary OEM skins (Xiaomi HyperOS, Samsung One UI, Oppo ColorOS) frequently deviate from AOSP by treating "Clear Recents" as a force-stop command. Pre-trip battery optimization exemption (`P3-T2`) mitigates this.

#### State 4: User Force-Stops the App (`Settings -> Apps -> Force Stop`)
- **iOS Behavior `[VERIFIED FACT]`**:
  - Identical to swipe-away: Process is killed, volatile state purged, zero background execution permitted until manual launch.
- **Android Behavior `[VERIFIED FACT]`**:
  - Puts the application into the Android **`STOPPED` state** (`FLAG_EXCLUDE_STOPPED_PACKAGES`).
  - In this state, the OS prohibits all background services, alarms, jobs, and broadcast receivers from firing. The app is completely inert until the user explicitly taps its launcher icon.
  - *Distinction from Swipe-Away*: A swipe-away on AOSP keeps the foreground service alive; a force-stop unconditionally terminates both activity and foreground service.

#### State 5: Location Permissions Revoked in OS Settings
- **iOS Behavior `[VERIFIED FACT]`**:
  - Changing permission to "Never" or "Ask Next Time" while tracking is active causes iOS to immediately terminate the process via `SIGKILL`.
- **Android Behavior `[VERIFIED FACT]`**:
  - Revoking location permissions from Android Settings immediately terminates the process. Any attempt to restart location services without re-granting throws `SecurityException`.
  - In Task `P3-T6`, the driver app sends a permission update event to the server upon detecting missing permissions.

#### State 6: Device Restarts (Phone Reboot)
- **iOS Behavior `[VERIFIED FACT]`**:
  - All tracking stops upon device shutdown. After reboot, the app remains unlaunched until the user enters their passcode and manually opens the app.
- **Android Behavior `[VERIFIED FACT]`**:
  - Foreground services stop on power off. Upon boot, services do not automatically resurrect unless a `RECEIVE_BOOT_COMPLETED` broadcast receiver is configured.
  - Even if registered, Android 12+ restricts starting foreground services from the background immediately after boot. User intervention (opening the driver app) is required.

---

### 5. Implications for Reliable Driver Location Tracking

`[RECOMMENDATION: ARCHITECTURAL DESIGN]`

1. **Pre-Trip Checklist Gate (Task `P3-T2`)**:
   - The driver app must verify that foreground location, background location ("Allow all the time"), and notification permissions are granted before allowing shift start.
   - On Android, the app must display an intent prompt for `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
2. **Driver Training & UI Prompts**:
   - Because iOS stops tracking upon a swipe-away, the driver app must display a warning: *"Keep app open or minimized using the Home bar. Do not swipe away from the app switcher during a shift."*
3. **Shift Resumption Protocol (Task `P3-T8`)**:
   - If the driver accidentally swipes away the app or reboots their phone, reopening the app must automatically query `GET /api/v1/driver/status`, detect the active `shift_id`, and resume location tracking without creating a duplicate shift.
4. **Student/Faculty Exemption (Rule R-19)**:
   - Student and faculty applications must **never** request background location or include foreground service permissions.

---

### 6. Summary of Unresolved Questions & Testing Needs

- `[REQUIRES PHYSICAL DEVICE TEST IN PHASE P3]`: Verify background location durability across specific college-issued driver phone hardware (e.g. Samsung Galaxy A-series vs Xiaomi Redmi) under aggressive OEM battery profiles.
- `[RESOLVED FOR MVP]`: iOS swipe-away termination behavior is an immutable Apple platform constraint; operational SOP and driver training are the required mitigation.

---

## Part B: RS-03 — Google Play Background Location Policy & Declaration Form

> [!NOTE]
> **Status: PENDING RESEARCH**  
> Task RS-03 focuses specifically on the Google Play Console background location policy declaration, prominent in-app disclosure requirements, and video demonstration guidelines. Research on RS-03 will be conducted in a separate authorized step.
