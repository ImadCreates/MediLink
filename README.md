# MediLink

MediLink is a dispatch and field coordination platform. A dispatcher opens a web dashboard, types a location and a job type, and the system finds the nearest available field worker, shows them on a map, and sends the assignment to their phone. The worker gets a push notification, accepts, navigates to the location, and marks it done. The dispatcher sees every status change as it happens. That loop works for any team that moves people to locations.

---

## Who It Is For

MediLink is built for operations managers, dispatch coordinators, and team leads who currently route jobs by phone, text, or group chat. It replaces that with a live map of available workers, ranked by distance to each job, with one-click assignment and status tracking from dispatch to resolution.

The platform works across industries. Current target verticals include hospital wards routing response teams to patient events, fire and police dispatch centers assigning units to incidents, HVAC and electrical companies sending technicians to service calls, security firms coordinating guards across a property, logistics fleets tracking driver availability, and facilities teams responding to maintenance requests. The system does not know or care what industry it is running in.

Field workers use the Android app to receive assignments, accept or decline, navigate to the location, and update their status. The app is also built for iOS. iOS release is pending an Apple Developer account and Mac build environment; no code changes are required.

Technical teams evaluating the stack will find a fully inspectable codebase: React dashboard, Flutter mobile app, Spring Boot API, Firebase Firestore. Architecture decisions are documented in this file and in comments throughout the source.

---

## Live Demo

| | URL |
|---|---|
| Dispatcher Dashboard | https://medilink-technologies.vercel.app |
| Backend API | https://medilink-production-f576.up.railway.app |

| Video | What it shows |
|---|---|
| [Full System Demo](https://youtu.be/ykPL2PVdLWw) | Dispatcher sends alert, FCM fires on phone, responder accepts, map loads, dashboard updates |
| [Hardware Demo](https://youtu.be/KYjn9Eqjglw) | Optional FPGA layer: UART protocol, 4-state FSM, VGA display, buzzer |

---

## Features

**Two-step dispatch.** The dispatcher enters an incident type, priority, and location. The dashboard geocodes the address and ranks every idle field worker by straight-line distance using the haversine formula. A modal opens with the ranked list. The dispatcher confirms the nearest worker or selects a different one. Nothing is sent until that confirmation step.

**Targeted push notifications.** On confirm, the backend looks up the assigned worker's FCM device token from `fcm_tokens/{uid}` and fires a push notification to that device only. No broadcast. The token is stored per user UID so the right device is always reached regardless of how many workers are registered.

**Live responder map.** The dispatcher dashboard shows all idle workers as map markers, updated as position data arrives. Workers who are busy or off-duty are filtered out. Position updates stream from the worker's device to Firestore every 10 metres of movement. When a worker sets themselves to busy or off-duty, writes pause automatically without closing the GPS stream.

**Alert routing by UID.** Every alert document in Firestore carries an `assignedTo` field containing the assigned worker's Firebase UID. The mobile app only surfaces alerts where `assignedTo` matches the logged-in user. Workers never see alerts assigned to someone else.

**Full status lifecycle.** An alert moves through `sent`, `accepted`, and `resolved` or `declined`. Each transition updates Firestore and reflects on the dispatcher dashboard immediately. Accepting an alert sets the worker's status to `busy`. Resolving or declining resets it to `idle`.

**Persistent dispatch history.** The last 20 dispatches load from Firestore on dashboard mount, ordered by creation time. History survives page refresh.

---

## For Developers

*The sections below cover architecture, environment setup, and local development. Non-technical readers can stop here.*

### Architecture

```
┌─────────────────────────────────┐     HTTPS POST /api/alerts/create
│   React Dashboard (Vercel)      │ ──────────────────────────────────► Spring Boot (Railway)
│   dashboard/src/pages/          │                                       Receives alert + assignedTo UID
│                                 │                                       Encodes priority and type to system code
│  Dashboard.jsx                  │                                       Looks up fcm_tokens/{assignedTo}
│   ├─ handleCreateAlert()        │                                       Sends targeted FCM push to
│   │   geocode, rank by          │                                       assigned responder only
│   │   haversine, open modal     │
│   └─ handleConfirmDispatch()    │     Firestore onSnapshot
│       axios POST + addDoc       │ ──────────────────────────────────► Firebase Firestore
│       with assignedTo: uid      │                                       collections:
│                                 │ ◄──────────────────────────────────   alerts     (type, location, status,
│  Map: idle responders only      │     Firestore onSnapshot                          assignedTo, priority,
│  from collection('responders')  │                                                   createdAt)
└─────────────────────────────────┘                                       responders (lat, lng, status,
                                                                                       displayName, updatedAt)
                                                                          fcm_tokens (token, updatedAt,
                                                                                      keyed by UID)
                                                                          waitlist   (email, joinedAt, source)
                                                                                ▲
                                         Flutter App (Android, iOS pending)     │
                                         responder-app/lib/                    │
                                                                               │
                                          main.dart                            │
                                           └─ LocationService.startTracking()  │
                                                                               │
                                          location_service.dart ───────────────┘
                                           ├─ GPS stream → responders/{uid}
                                           └─ updateStatus() → responders/{uid}.status
                                                                               │
                                          alerts_screen.dart                   │
                                           ├─ StreamBuilder: alerts where      │
                                           │   assignedTo == currentUser.uid   │
                                           │   AND status in [sent, accepted]  │
                                           ├─ Accept → updateStatus('busy')    │
                                           └─ Resolve → updateStatus('idle') ──┘
```

### Stack

| Layer | Technology |
|---|---|
| Dispatcher UI | React 18, Vite, Leaflet, GSAP, Three.js, deployed on Vercel |
| Responder App | Flutter 3, Dart. Released on Android. iOS ready, pending Apple Developer account and Mac build environment. |
| Backend API | Java 21, Spring Boot 3, deployed on Railway |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Push Notifications | Firebase Cloud Messaging (FCM v1 API) |
| Maps | OpenStreetMap + Leaflet (dashboard), flutter_map (mobile) |
| Geocoding | Nominatim |

### Repo Structure

```
MediLink/
├── dashboard/        React dispatcher dashboard
├── responder-app/    Flutter app (Android released, iOS pending)
├── backend/          Spring Boot REST API
└── fpga/             Verilog modules for optional hardware integration (not part of core deployment)
```

---

### Firestore Collections

| Collection | Fields |
|---|---|
| `alerts` | `type`, `location`, `priority`, `status`, `assignedTo` (UID), `createdAt` |
| `responders` | `lat`, `lng`, `status` (idle / busy / off_duty), `displayName`, `updatedAt` |
| `fcm_tokens` | Document ID is the responder's Firebase UID. Fields: `token`, `updatedAt` |
| `waitlist` | `email`, `joinedAt`, `source` |

---

### Environment Setup

**Dashboard** (`dashboard/.env`)

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Copy `dashboard/.env.example` and fill in values from your Firebase project settings. All six variables must also be configured in Vercel under Project Settings > Environment Variables before deploying.

**Backend** (`backend/src/main/resources/application.properties`)

```properties
spring.application.name=dispatcher-backend
firebase.api.key=YOUR_FIREBASE_WEB_API_KEY
```

Copy `backend/src/main/resources/application.properties.example`. On Railway, set `FIREBASE_SERVICE_ACCOUNT` as an environment variable containing the full service account JSON string. For local development, place the file at `backend/src/main/resources/serviceAccountKey.json`, which is gitignored.

**Flutter App**

The following files are gitignored and must be generated locally before running the app:

| File | How to get it |
|---|---|
| `responder-app/android/app/google-services.json` | Firebase Console > Project Settings > Android app |
| `responder-app/lib/firebase_options.dart` | Run `flutterfire configure` in the responder-app directory |

---

### Setup Requirements

**Firestore composite index.** The responder app queries the `alerts` collection filtering on both `assignedTo` and `status`. Firestore requires a composite index for multi-field queries. Without it the query throws a runtime exception on first load.

Create the index at Firebase Console > Firestore > Indexes > Composite with these settings:
- Collection: `alerts`
- Fields: `assignedTo` Ascending, `status` Ascending

On first run, the Flutter logs will print a direct link that creates the index automatically when clicked.

**Vercel environment variables.** All six `VITE_FIREBASE_*` variables listed above must be set in Vercel before the production build can connect to Firebase. The build compiles without them but the app fails to authenticate at runtime.

**Railway environment variables.** `FIREBASE_SERVICE_ACCOUNT` must be set as a Railway secret containing the full service account JSON. Without it the backend cannot look up FCM tokens or send push notifications.

---

### Running Locally

**Backend** (requires Java 21)

```bash
cd backend
cp src/main/resources/application.properties.example src/main/resources/application.properties
./mvnw spring-boot:run
```

**Dashboard**

```bash
cd dashboard
cp .env.example .env
npm install
npm run dev
```

**Flutter App**

```bash
cd responder-app
# Place google-services.json in android/app/
# Run flutterfire configure to generate firebase_options.dart
flutter pub get
flutter run
```

---

### Hardware Layer

The `fpga/` directory contains Verilog for a DE10-Lite FPGA integration. The backend encodes each dispatched alert as a single byte (`type_offset + priority`) and transmits it over UART at 9600 baud. The FPGA runs a 4-state FSM, drives a VGA display, and sends a status heartbeat back to the backend every 500 ms. This layer is not part of the core deployment. The FPGA polling loop in `Dashboard.jsx` is commented out by default and only relevant when the hardware is physically connected.

| Module | Description |
|---|---|
| `medilink_top.v` | Top level, UART latch, 500 ms heartbeat TX |
| `alert_fsm.v` | 4-state FSM with debounced KEY inputs |
| `uart_rx.v` | 9600 baud 8N1 receiver |
| `uart_tx.v` | 9600 baud 8N1 transmitter |
| `vga_controller.v` | 640x480 at 60 Hz sync generator |
| `vga_display_gen.v` | State colours, type label, priority meter |
| `clk_divider.v` | 50 MHz to 25 MHz and 1 kHz |
| `alarm_driver.v` | Buzzer square wave driver |
