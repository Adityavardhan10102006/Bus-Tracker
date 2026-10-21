# VJIT College Bus Tracker — Real GPS Hardware Integration & Telemetry Contract Specification

**Document Identifier**: `HW-INT-1.0`  
**Governing Master Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Sections 11, 12, 13, 14, 17, 19, Part E, Part I)  
**Authoritative Operating Rules**: `AGENTS.md` (Part B)  
**Related Specifications**: [`UI-SPEC-1.0`](file:///c:/aditya/Bus%20tracker/docs/specifications/ui-system-specification.md) (Provisional UI Baseline via [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md))  
**Organization / Institution**: Vidya Jyothi Institute of Technology (VJIT), Hyderabad  
**Status**: PROPOSED HARDWARE INTEGRATION CONTRACT (Subject to Project-Owner Review & Hardware Sign-Off — Phase P0 & P1 remain locked)  
**Version**: 1.0  
**Date**: 2026-10-21  

---

## 1. Executive Summary & Governance Authority

This document defines the formal, end-to-end technical integration contract between the **in-bus IoT hardware tracker units** and the **VJIT College Bus Tracker backend ingestion engine**.

### 1.1 Specification Authority Hierarchy
Per `AG-MASTER-1.0-v2-College-Bus-Tracker.md` lines 4–6 and 21:
1. **Software Behaviour Authority**: `SW-MVP-1.0` (What the software does; referenced via master plan extracts).
2. **Device Hardware Authority**: `HW-SPEC-1.0` (What the tracker hardware does; owned by ECE team).
3. **Architecture & Delivery Authority**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Data flow pipelines, security baselines, order of work).

> [!CAUTION]
> **Authoritative Specification Tracking (BLK-01 & BLK-02)**:  
> As audited in [`docs/specifications/README.md`](file:///c:/aditya/Bus%20tracker/docs/specifications/README.md), the physical PDF files `SW-MVP-1.0.pdf` and `HW-SPEC-1.0.pdf` are **not yet supplied in the workspace**. Research task `RS-16` remains strictly **BLOCKED**. All technical contracts in this document are synthesized from the authoritative specifications transcribed into the master plan (`AG-MASTER-1.0-v2-College-Bus-Tracker.md`), the 72 operational defaults in Part I.5, and established embedded IoT communication standards.
> 
> Throughout this document, every architectural decision is explicitly tagged with its governance state:
> - **`[CONFIRMED]`**: Explicitly mandated by `AG-MASTER-1.0-v2-College-Bus-Tracker.md` or `AGENTS.md`.
> - **`[PROPOSED]`**: Concrete engineering proposal designed to fulfill master plan requirements without contradicting existing rules.
> - **`[UNRESOLVED]`**: Directly dependent on missing hardware documents, open conflict sign-offs, or unconfirmed institutional policies.

---

## 2. Hardware Subsystem Architecture & Component Evaluation

The master plan strictly decouples software ingestion contracts from specific microcontroller silicon (Decision 14). However, for physical bus installation, the hardware tracker comprises six primary subsystems:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        IN-BUS HARDWARE TRACKER ARCHITECTURE                            │
│                                                                                        │
│  ┌───────────────────────┐                               ┌──────────────────────────┐  │
│  │ 1. GNSS RECEIVER      │      NMEA 0183 (UART)         │ 2. MICROCONTROLLER (MCU) │  │
│  │   u-blox NEO-6M       ├──────────────────────────────>│   Espressif ESP8266      │  │
│  │   (or internal SIM7600│  $GPRMC, $GPGGA               │   (or ESP32 recommended) │  │
│  └───────────▲───────────┘                               └─────────────┬────────────┘  │
│              │                                                         │               │
│  ┌───────────┴───────────┐    Digital Inputs                           │ AT Commands   │
│  │ 5. RF ANTENNAS        │    ├── Ignition Sense (12V/24V via Opto)───>│    (UART)     │
│  │   Active Ceramic Patch│    └── Dashboard Panic SOS Button (GND)────>│               │
│  │   + 4G Blade Antenna  │                                             ▼               │
│  └───────────────────────┘                               ┌──────────────────────────┐  │
│                                                          │ 3. CELLULAR MODEM        │  │
│  ┌───────────────────────┐                               │   SIMCom SIM7600G (LTE)  │  │
│  │ 4. POWER SUBSYSTEM    │  Regulated 3.8V - 4.2V Rail   │   with 4G M2M Nano-SIM   │  │
│  │   Vehicle Battery In  ├──────────────────────────────>└─────────────┬────────────┘  │
│  │   Buck Step-Down Reg  │  Peak 2.0A Transient Cap                    │               │
│  └───────────────────────┘                                             │ HTTPS TLS 1.3 │
└────────────────────────────────────────────────────────────────────────┼───────────────┘
                                                                         ▼
                                                       [VJIT INGESTION API GATEWAY]
```

### 2.1 GNSS Positioning Receiver
- **Documented Component**: u-blox NEO-6M GNSS module `[PROPOSED - Candidate Module]`.
- **Interface**: 3.3V TTL UART serial at 9600 baud `[PROPOSED]`.
- **Protocol**: Standard NMEA 0183 sentences (`$GPRMC`, `$GPGGA`, `$GPVTG`, `$GPGSA`) `[CONFIRMED]`.
- **Target Performance Parameters**:
  - Horizontal Position Accuracy: < 2.5 m Circular Error Probable (CEP) under open sky `[CONFIRMED]`.
  - Fix Quality Threshold: Horizontal Dilution of Precision $\le 5.0$ (`hw.max_hdop = 5.0`) `[CONFIRMED]`.
  - Satellite Acquisition: $\ge 4$ operational satellites locked (`hw.min_satellites = 4`) `[CONFIRMED]`.
  - Fix Update Frequency: 1 Hz (1 fix per second) internal sampling `[CONFIRMED]`.
- **Architectural Alternative**: SIMCom SIM7600G integrated GNSS engine via `AT+CGPS` commands `[UNRESOLVED - Pending ECE Decision 14]`.

### 2.2 Host Controller Unit (MCU)
- **Documented Component**: Espressif ESP8266 (Tensilica 32-bit RISC core, 80/160 MHz, 80 KB user DRAM, 4 MB SPI flash) `[PROPOSED - Candidate Module]`.
- **Responsibilities**:
  1. Parse raw NMEA sentences and extract timestamp, latitude, longitude, speed, heading, HDOP, and satellites.
  2. Sample vehicle ignition state via an optoisolated GPIO pin.
  3. Detect instantaneous dashboard panic button depression via interrupt-driven GPIO.
  4. Manage non-volatile SPI flash ring buffer (LittleFS) during cellular outages.
  5. Assemble JSON payload envelopes conforming to the 8 KB body limit.
  6. Execute AT command sequences over UART to drive the SIM7600G cellular modem.
- **Hardware Constraint Note**: ESP8266 contains only one full-duplex hardware UART (`UART0`). If `UART0` receives NMEA data, modem communication requires `SoftwareSerial` or pin swapping. An **ESP32** (with 3 hardware UARTs) is strongly recommended as a drop-in production alternative `[PROPOSED]`.

### 2.3 Cellular Telemetry Modem
- **Documented Component**: SIMCom SIM7600G LTE Cat-4 modem `[PROPOSED - Candidate Module]`.
- **Bands**: Multi-band LTE-FDD/LTE-TDD (compatible with Indian M2M carriers: Band 1, 3, 5, 8, 40, 41) `[CONFIRMED]`.
- **Protocol Stack**: Native embedded TCP/IP with TLS 1.2 / TLS 1.3 encryption `[CONFIRMED]`.
- **Serial Interface**: AT commands over UART at 115200 baud `[PROPOSED]`.

### 2.4 Power Supply & Electrical Hardening
- **Primary Source**: Vehicle battery electrical system (Nominal 12V DC on light buses, 24V DC on heavy buses) `[CONFIRMED]`.
- **Voltage Cutoff & Sensing**:
  - 12V bus system: Low vehicle battery threshold is **11,800 mV** (`vehicle.battery_mv_12v = 11800`) `[CONFIRMED]`.
  - 24V bus system: Low vehicle battery threshold is **23,500 mV** (`vehicle.battery_mv_24v = 23500`) `[CONFIRMED]`.
- **Power Regulation**: Automotive-grade buck step-down converter delivering 3.8V–4.2V with minimum 2.0A peak transient current capacity (cellular burst buffer) and reverse-polarity/load-dump overvoltage protection `[PROPOSED]`.
- **Backup Battery**: Optional internal 3.7V 800–1200 mAh LiPo cell for tamper alerting (`LOW_DEVICE_BATTERY`) if bus battery is disconnected `[CONFIRMED]`.

### 2.5 RF Antenna Subsystem
- **GNSS Antenna**: External active ceramic patch antenna (28 dB LNA gain) mounted on the bus roof or top center of the front windshield with unobstructed sky visibility `[PROPOSED]`.
- **Cellular Antenna**: External adhesive blade antenna or vandal-resistant puck antenna mounted away from the GNSS patch to avoid RF desensitization `[PROPOSED]`.

### 2.6 SIM Card & Carrier Setup
- **Format**: Industrial-grade M2M Nano-SIM (Form factor: 4FF) rated for automotive temperature ranges (-40°C to +105°C) `[PROPOSED]`.
- **Carrier Configuration**: Indian national roaming M2M APN (Airtel IoT, Jio M2M, or Vi Business) with persistent data sessions and static or dynamic private IP `[UNRESOLVED - College Procurement Dependency]`.

---

## 3. Authentication, Security & Credential Protection

### 3.1 Device Identity Model
- **`device_id`**: Immutable alphanumeric identifier assigned during factory provisioning. Format: `HW_` prefix followed by 3 or 4 uppercase alphanumeric characters (e.g., `HW_1042`) `[CONFIRMED - Spec 10.3 & P4-T2]`.
- **`imei`**: 15-digit unique cellular modem IMEI string `[CONFIRMED]`.
- **`iccid`**: 19- or 20-digit unique SIM card ICCID string `[CONFIRMED]`.

### 3.2 Bearer Token Authentication
- **Transport Security**: Strictly HTTPS over TLS 1.3 (fallback TLS 1.2). Unencrypted HTTP port 80 is disabled on `INGEST_PUBLIC_HOST` `[CONFIRMED - Rule F-AUTH-03]`.
- **Header**: Exactly one `Authorization` header with the `Bearer` scheme `[CONFIRMED - Spec 11.1]`:
  ```http
  Authorization: Bearer <token>
  ```
- **Token Format**: Exactly **43 base64url characters** representing 256 bits of cryptographically secure random entropy `[CONFIRMED - Spec 11.1 & P1-T2]`.
- **Validation**: Any request missing the `Authorization` header, using an improper scheme, or carrying an invalid token length returns:
  ```http
  HTTP/1.1 401 Unauthorized
  Content-Type: application/json

  {
    "error": {
      "code": "AUTH_REQUIRED",
      "message": "Bearer authentication token missing, malformed, or invalid."
    }
  }
  ```

### 3.3 Server-Side Token Storage & Key Rotation
- **Zero Plaintext Storage**: The server never stores the plaintext token in database rows, caches, or files `[CONFIRMED - Rule B.7]`.
- **HMAC-SHA256 Derivation**: The server computes `HMAC-SHA256(token, SERVER_SECRET_KEY)` and queries the unique index on `(key_version, token_hash)` `[CONFIRMED - Spec 11.1 & P1-T2]`.
- **Key Versioning**: The server supports up to two active key versions simultaneously (`key_version = 1`, `key_version = 2`) to enable zero-downtime key rotation `[CONFIRMED - Part F Control 18]`.
- **Anti-Logging Rule**: Plaintext tokens are strictly excluded from structured logs, APM traces, and telemetry tables. Ingestion logs record `device_id` only after successful authentication `[CONFIRMED - Rule B.7 & Part F Control 18]`.
- **Rate-Limiting on Auth Failures**: More than 20 authentication failures from a single IP within 5 minutes returns `HTTP 429 Too Many Requests`. More than 50 failures for a specific `device_id` within 5 minutes triggers a high-severity security alert `[CONFIRMED - Spec 11.8 & P1-T14]`.

---

## 4. Telemetry Endpoint & Payload Contract

### 4.1 Ingestion Host & Endpoint Specification
- **Ingestion Route**: `POST /api/v1/telemetry` `[CONFIRMED - Spec 11.3 & Part I.7]`.
- **Host**: `INGEST_PUBLIC_HOST` (e.g., `https://ingest.vjitbus.ac.in`) `[CONFIRMED - Part I.7]`.
- **Request Headers**:
  - `Host`: `ingest.vjitbus.ac.in`
  - `Authorization`: `Bearer <43-char-token>`
  - `Content-Type`: `application/json` (Non-JSON returns `HTTP 415 Unsupported Media Type`)
  - `Content-Length`: Maximum **8,192 bytes (8 KB)** (`ingest.body_max_kb = 8`) `[CONFIRMED - Spec 11.3]`. Bodies exceeding 8 KB are rejected with `HTTP 413 Payload Too Large`.

---

### 4.2 Ingestion Request JSON Schema

The telemetry envelope contains device tracking metadata, an array of 0 to 50 location samples, and an array of 0 to 20 hardware events:

```json
{
  "device_id": "HW_1042",
  "boot_id": "9f8b4c2e-4b21-4f12-a1b2-9d3c8e4f1a20",
  "firmware_version": "1.0.4",
  "samples": [
    {
      "seq": 14201,
      "recorded_at": "2026-10-21T08:30:15.000Z",
      "latitude": 17.348215,
      "longitude": 78.339142,
      "speed_kmh": 34.2,
      "bearing": 182.5,
      "altitude_m": 532.0,
      "gps_valid": true,
      "hdop": 1.2,
      "satellites": 9,
      "ignition": true,
      "battery_mv": 12450
    }
  ],
  "events": [
    {
      "seq": 88,
      "type": "SOS",
      "triggered_at": "2026-10-21T08:30:15.000Z",
      "payload": {
        "source": "DASHBOARD_PANIC_BUTTON",
        "ignition_state": true
      }
    }
  ]
}
```

#### Field-Level Specification & Validation Rules:

| Field Path | Type | Constraints & Bounds | Error Code on Failure | Status |
|---|---|---|---|---|
| `device_id` | String | Must match pattern `^HW_[0-9A-Z]{3,4}$`. Must exist in database. | `INVALID_DEVICE_ID` / `DEVICE_NOT_FOUND` | `[CONFIRMED]` |
| `boot_id` | String | Non-empty UUID or alphanumeric string (max 64 chars) unique to current MCU boot session. | `INVALID_BOOT_ID` | `[CONFIRMED]` |
| `firmware_version` | String | Semantic version string `^\d+\.\d+\.\d+$` (max 16 chars). | `INVALID_FIRMWARE_VERSION` | `[CONFIRMED]` |
| `samples` | Array | 0 to 50 items (`ingest.batch_max = 50`). | `BATCH_SIZE_EXCEEDED` | `[CONFIRMED]` |
| `samples[].seq` | Integer | Monotonically increasing 32-bit unsigned integer ($1 \le seq \le 2^{31}-1$). | `INVALID_SEQ` | `[CONFIRMED]` |
| `samples[].recorded_at`| String | UTC ISO 8601 with trailing `Z`. Bounds: not $>60$s in future, not $>7$ days in past. | `FUTURE_TIMESTAMP` / `STALE_TIMESTAMP` | `[CONFIRMED]` |
| `samples[].latitude` | Float | WGS84 decimal degrees: $-90.0 \le lat \le +90.0$. Precision: $\ge 5$ decimal places. | `OUT_OF_RANGE` | `[CONFIRMED]` |
| `samples[].longitude`| Float | WGS84 decimal degrees: $-180.0 \le lng \le +180.0$. | `OUT_OF_RANGE` | `[CONFIRMED]` |
| `samples[].speed_kmh`| Float | Ground speed in km/h ($0.0 \le speed \le 150.0$). Speed $>150$ km/h rejected. | `IMPLAUSIBLE_JUMP` | `[CONFIRMED]` |
| `samples[].bearing` | Float | Degrees clockwise from True North ($0.0 \le bearing < 360.0$). Optional. | `OUT_OF_RANGE` | `[CONFIRMED]` |
| `samples[].altitude_m`| Float | Height above mean sea level in meters ($-100.0 \le alt \le 5000.0$). Optional. | `OUT_OF_RANGE` | `[PROPOSED]` |
| `samples[].gps_valid` | Boolean | `true` if GNSS solution valid; `false` if antenna disconnected / no fix. | `SCHEMA_ERROR` | `[CONFIRMED]` |
| `samples[].hdop` | Float | Horizontal Dilution of Precision ($0.1 \le hdop \le 50.0$). | `OUT_OF_RANGE` | `[CONFIRMED]` |
| `samples[].satellites`| Integer | Number of satellites tracked ($0 \le sats \le 32$). | `OUT_OF_RANGE` | `[CONFIRMED]` |
| `samples[].ignition` | Boolean | `true` if vehicle ignition sensing line is energized; `false` if engine off. | `SCHEMA_ERROR` | `[CONFIRMED]` |
| `samples[].battery_mv`| Integer | Vehicle battery input in millivolts ($0 \le mv \le 35000$). | `OUT_OF_RANGE` | `[CONFIRMED]` |
| `events` | Array | 0 to 20 hardware event objects. | `EVENT_BATCH_EXCEEDED` | `[CONFIRMED]` |
| `events[].seq` | Integer | Monotonic integer sequence unique per boot session. | `INVALID_SEQ` | `[CONFIRMED]` |
| `events[].type` | String | Valid event enum (see Section 6.2). Unknown events stored as `IGNORED`. | Stored as `IGNORED` | `[CONFIRMED]` |
| `events[].triggered_at`| String | UTC ISO 8601 timestamp when physical event occurred. | `INVALID_TIMESTAMP` | `[CONFIRMED]` |
| `events[].payload` | Object | Event-specific JSON payload (max 512 bytes). | `SCHEMA_ERROR` | `[CONFIRMED]` |

---

### 4.3 Ingestion Response JSON Contract

On processing the request, the server returns `HTTP 200 OK` containing the acknowledgment sequence, rejected sample items, processed event results, active configuration directives, and UTC server time:

```json
{
  "ack_seq": 14201,
  "rejected": [],
  "event_results": [
    {
      "seq": 88,
      "status": "ACCEPTED",
      "incident_id": "7b2d5f30-8a12-4c3e-9b10-6e4f3a2b1c09"
    }
  ],
  "config": {
    "hw_moving_interval_s": 10,
    "hw_stopped_interval_s": 30,
    "hw_parked_heartbeat_s": 600
  },
  "server_time": "2026-10-21T08:30:15.120Z"
}
```

#### Response Fields:
- **`ack_seq`**: The highest sequence number up to which all samples were accepted, or rejected with a recorded reason `[CONFIRMED - Spec 11.3 & P1-T6]`. The device uses `ack_seq` to safely truncate its local flash ring buffer.
- **`rejected`**: Array of `{ "seq": number, "reason": string }` detailing specific samples dropped and why (e.g., `NULL_ISLAND`, `IMPLAUSIBLE_JUMP`, `OUT_OF_RANGE`) `[CONFIRMED]`.
- **`event_results`**: Array of `{ "seq": number, "status": "ACCEPTED" | "DUPLICATE" | "IGNORED", "incident_id"?: string }`. If an event was an `SOS`, the generated or joined UUID `incident_id` is returned `[CONFIRMED - P1-T6]`.
- **`config`**: Dynamic configuration parameters instructing the device how frequently to sample and transmit `[CONFIRMED - P1-T6]`.
- **`server_time`**: Authoritative UTC server timestamp enabling the microcontroller to detect RTC drift `[CONFIRMED]`.

---

## 5. Heartbeat & Health Monitoring Contract

When a bus is parked or stationary with ignition off, transmitting continuous GPS batches wastes power and cellular bandwidth. The hardware switches to periodic health heartbeats.

### 5.1 Heartbeat Endpoint Specification
- **Route**: `POST /api/v1/heartbeat` `[CONFIRMED - Spec 11.6 & P1-T7]`.
- **Host**: `INGEST_PUBLIC_HOST`.
- **Headers**: Same Bearer token authentication as telemetry endpoint.
- **Cadence**:
  - Engine Running (Ignition ON): Every **60 seconds** (`hw.heartbeat_moving_s = 60`) `[CONFIRMED]`.
  - Parked / Engine Off (Ignition OFF): Every **600 seconds (10 minutes)** (`hw.parked_heartbeat_s = 600`) `[CONFIRMED]`.

### 5.2 Heartbeat Request Payload Schema

```json
{
  "device_id": "HW_1042",
  "boot_id": "9f8b4c2e-4b21-4f12-a1b2-9d3c8e4f1a20",
  "firmware_version": "1.0.4",
  "timestamp": "2026-10-21T08:30:00.000Z",
  "gps_status": "FIX_3D",
  "satellites": 8,
  "hdop": 1.4,
  "rssi_dbm": -78,
  "cellular_rat": "LTE",
  "battery_mv": 12600,
  "internal_battery_mv": 4120,
  "temperature_c": 38.5,
  "ignition": false,
  "buffer_count": 0
}
```

### 5.3 Heartbeat Response & Remote Device Control

```json
{
  "status": "HEALTHY",
  "pending_action": "NONE",
  "server_time": "2026-10-21T08:30:00.085Z"
}
```

Where `pending_action` can command remote device maintenance `[CONFIRMED - Spec 11.6 & P1-T7]`:
- `NONE`: Normal operation.
- `UPDATE_CONFIG`: Device must fetch updated intervals.
- `REBOOT`: Device must execute an orderly controller reset.
- `FIRMWARE_UPDATE`: Device must download new firmware image specified in `firmware_target` URL. (Served only while parked with ignition OFF and vehicle voltage above threshold per Task `P4-T11`).

### 5.4 Device Health Classification (Server State Machine)
Per master plan Section 11.6, the server evaluates device operational state from heartbeats:
- **`ONLINE`**: Heartbeat received within $1.5 \times$ the expected interval (within 90s moving or 900s parked) `[CONFIRMED]`.
- **`DELAYED`**: Expected heartbeat missed by $>1.5 \times$ interval `[CONFIRMED]`.
- **`OFFLINE`**: No contact for $>3 \times$ interval or $>20$ minutes. If ignition was ON when contact ceased, an automatic technician maintenance ticket is opened (`P4-T12`) `[CONFIRMED]`.

---

## 6. Device Hardware Events & In-Bus SOS Contract

### 6.1 Supported Hardware Event Types
The microcontroller reports discrete operational and electrical events in the `events` array `[CONFIRMED - Spec 12 & P1-T8]`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      HARDWARE EVENT CATALOGUE                          │
├───────────────────────┬────────────────────────────────────────────────┤
│ Event Code            │ Trigger Condition & Action                     │
├───────────────────────┼────────────────────────────────────────────────┤
│ `SOS`                 │ Physical dashboard panic button pressed.       │
│                       │ Creates or joins emergency incident within 1s. │
├───────────────────────┼────────────────────────────────────────────────┤
│ `GPS_LOST`            │ HDOP > 5.0 or satellites < 4 for > 30s.        │
│                       │ Marks GNSS fix invalid; increments counter.    │
├───────────────────────┼────────────────────────────────────────────────┤
│ `GPS_RECOVERED`       │ Valid GNSS fix restored (3 fixes within 30s).  │
├───────────────────────┼────────────────────────────────────────────────┤
│ `IGNITION_ON`         │ Vehicle ignition sensing pin transitioned HIGH.│
├───────────────────────┼────────────────────────────────────────────────┤
│ `IGNITION_OFF`        │ Vehicle ignition sensing pin transitioned LOW. │
│                       │ Starts 20-minute idle countdown (shift.idle_min│
├───────────────────────┼────────────────────────────────────────────────┤
│ `POWER_DISCONNECTED`  │ Main 12V/24V power lost; running on backup cell│
├───────────────────────┼────────────────────────────────────────────────┤
│ `LOW_VEHICLE_BATTERY` │ Battery voltage dropped below 11.8V / 23.5V.   │
├───────────────────────┼────────────────────────────────────────────────┤
│ `LOW_DEVICE_BATTERY`  │ Internal backup cell dropped below 3.5V.       │
├───────────────────────┼────────────────────────────────────────────────┤
│ `BUFFER_OVERFLOW`     │ Flash ring buffer filled; oldest samples purged│
├───────────────────────┼────────────────────────────────────────────────┤
│ `BOOT`                │ Controller rebooted. Carries reset cause       │
│                       │ (POWER_ON, WATCHDOG, BROWNOUT, SOFTWARE).      │
├───────────────────────┼────────────────────────────────────────────────┤
│ `TAMPER`              │ Enclosure opened or external antenna cut.      │
├───────────────────────┼────────────────────────────────────────────────┤
│ `RFID_TAP`            │ Bus RFID scanner detected card UID (Phase P2). │
└───────────────────────┴────────────────────────────────────────────────┘
```

---

### 6.2 Emergency In-Bus SOS Pipeline (Specification 19 & Part E.10)

The physical panic button interface represents the highest-priority safety path in the hardware integration contract:

```
[PANIC BUTTON PRESSED] ──────────────────────────────────────────┐
  │ Physical button shorts GPIO to GND (Debounced 50ms)           │
  ▼                                                               │
[MICROCONTROLLER: Immediate Priority Send]                        │
  ├── Immediately suspends normal cadence timers                  │
  ├── Formulates emergency payload with type: "SOS"               │
  └── Sends HTTPS POST to /api/v1/telemetry                       │
         │                                                        │
         ▼                                                        │
[SERVER INGESTION: < 1.0 Second Execution]                        │
  ├── 1. Matches active open link to Bus NN                       │
  ├── 2. Incident Deduplication:                                  │
  │      - Existing OPEN incident for this bus within 60s?        │
  │        --> Joins existing incident (AC-SOS-02)                │
  │      - No open incident?                                      │
  │        --> Creates new `sos_incidents` row (AC-SOS-01)        │
  ├── 3. Returns HTTP 200 with `incident_id` in `event_results`   │
  └── 4. Tier 0 Immediate Dispatch (< 5 seconds):                 │
         - Assigned Faculty on bus (Push + High-Priority Sound)   │
         - Security Staff on duty (Full-screen console alert)     │
         - Transport Coordinators on duty                         │
         │                                                        │
         ▼                                                        │
[HARDWARE CONFIRMATION LED] <─────────────────────────────────────┘
  Device receives `incident_id` in response body.
  Microcontroller illuminates physical Green/Red LED on dashboard
  confirming to driver/passengers that the college emergency desk
  has received the alert.
```

#### Safety Invariants:
1. **Unmutable Alerting**: SOS events bypass all quiet hours, mute preferences, and rate limits (`R-11`) `[CONFIRMED]`.
2. **Device Delay Flag**: If the difference between `triggered_at` and server `received_at` exceeds 60 seconds (due to network buffering), the incident is flagged `DEVICE_DELAYED` (`sos.device_delay_flag_s = 60`) `[CONFIRMED - Spec 19.8]`.
3. **Escalation Ladder**: If unacknowledged within 2 minutes, the `sos-escalator` job automatically triggers Tier 1 (DLT SMS to escalation contacts); at 5 minutes Tier 2 (Super Admins, Police/Security desk); at 10 minutes Tier 3 (College Executive Emergency Desk) `[CONFIRMED - Spec 19.3 & Part E.10]`.

---

## 7. Ingestion Validation Pipeline & Rejection Taxonomy

Per master plan Section 11.5, every telemetry request passes through a **14-step pure domain validation pipeline** executed in strict sequential order. Each step is implemented as a pure function in `packages/domain` `[CONFIRMED - P1-T3]`:

```
Incoming Request -> [1. Transport HTTPS Check]
                 -> [2. Single Bearer Header & 43-char Length]
                 -> [3. HMAC-SHA256 Token Auth & Revocation Check]
                 -> [4. Device Status: PROVISIONED/ACTIVE (Conflict C-01)]
                 -> [5. Payload Size <= 8,192 Bytes (HTTP 413)]
                 -> [6. Zod Envelope Schema Validation (HTTP 400)]
                 -> [7. Per-Sample Value Range Checks (lat/lng/speed/hdop)]
                 -> [8. Timestamp Freshness Window Check]
                 -> [9. Deduplication Key Guard: (device_id, boot_id, seq)]
                 -> [10. Null Island Coordinate Filter: (0.0, 0.0)]
                 -> [11. Campus Transit Service Area Geofence Check]
                 -> [12. Plausibility Jump Check (> 150 km/h from last fix)]
                 -> [13. Clock Skew Detector (> 300s raises alert)]
                 -> [14. Atomic Transaction: Storage, Health & Selector Outbox]
```

### Detailed Rejection Code Reference:

| Rejection Code | Trigger Condition | Disposition | Impact on Live Map |
|---|---|---|---|
| `AUTH_REQUIRED` | Missing, malformed, or non-matching Bearer token. | Entire request dropped (HTTP 401). | None. |
| `DEVICE_INACTIVE`| Device status is `REVOKED` or `RETIRED`. | Entire request dropped (HTTP 403). | Bus transitions to UNAVAILABLE. |
| `SCHEMA_ERROR` | Unknown JSON keys, missing required fields, bad types. | Entire request dropped (HTTP 400). | None stored. |
| `OUT_OF_RANGE` | Latitude/longitude/speed/HDOP outside physical bounds. | Sample rejected alone; listed in `rejected`.| Discarded from live track. |
| `FUTURE_TIMESTAMP`| Sample `recorded_at` > 60s ahead of server UTC time. | Sample rejected alone. | Discarded from live track. |
| `STALE_TIMESTAMP` | Sample `recorded_at` > 7 days in the past. | Sample rejected alone. | Discarded completely. |
| `BUFFERED` | Sample `recorded_at` between 10 min and 7 days old. | Sample accepted & stored; flagged `BUFFERED`.| Used for history; never updates live map. |
| `NULL_ISLAND` | Exact coordinates `latitude: 0.0` and `longitude: 0.0`. | Sample rejected alone; listed in `rejected`.| Discarded. |
| `OUT_OF_AREA` | Location outside Telangana/campus bounding geofence. | Sample stored with flag; rejected for live. | Excluded from route display. |
| `IMPLAUSIBLE_JUMP`| Implied speed $>150$ km/h from last accepted fix. | Sample stored with flag; rejected for live. | Ignored for map and ETA. |
| `CLOCK_SKEW` | Time difference $|recorded\_at - received\_at| > 300$s. | Sample accepted; technician alert raised. | Ordered by `received_at`. |
| `CONFLICT` | Same `(device_id, boot_id, seq)` but payload differs. | Sample rejected alone with `CONFLICT`. | Preserves original sample. |

---

## 8. Update Cadence, Acknowledgments, Retries & Offline Buffering

### 8.1 Transmission Cadence
- **Moving State** (Ignition ON, Speed $> 3$ km/h):
  - GNSS Sample Rate: Every **10 seconds** (`hw.moving_interval_s = 10`) `[CONFIRMED]`.
  - Telemetry Batch Upload: Every **10 seconds**, or immediately upon reaching **10 accumulated samples** `[CONFIRMED - Part I.10]`.
- **Stopped / Idling State** (Ignition ON, Speed $\le 3$ km/h):
  - GNSS Sample Rate: Every **30 seconds** (`hw.stopped_interval_s = 30`) `[CONFIRMED]`.
  - Telemetry Batch Upload: Every **30 seconds** `[CONFIRMED]`.
- **Parked State** (Ignition OFF):
  - GNSS engine enters ultra-low-power standby.
  - Heartbeat Transmission: Every **600 seconds (10 minutes)** (`hw.parked_heartbeat_s = 600`) `[CONFIRMED]`.

### 8.2 Device Acknowledgment Protocol
- The microcontroller retains transmitted samples in a temporary transmit queue until it receives an HTTP 200 response with `ack_seq` `[CONFIRMED - Part I.10]`.
- When `ack_seq` is received, the microcontroller purges all samples with `seq <= ack_seq` from flash memory.
- If individual samples are listed in `rejected`, the device acknowledges them as disposed of and deletes them, preventing endless resubmission loops.

### 8.3 Offline Ring Buffering (Cellular Dead Zones)
When a college bus traverses cellular dead zones:
1. Microcontroller detects cellular network loss (`AT+NETOPEN` failure or socket timeout).
2. Microcontroller writes valid GNSS samples to a persistent circular ring buffer in SPI flash (LittleFS).
3. **Storage Allocation**: With an average binary/JSON sample footprint of 80 bytes, a 1 MB flash allocation accommodates **~13,000 samples (>36 hours of continuous driving buffer)** `[PROPOSED]`.
4. When cellular service is re-established:
   - Microcontroller transmits buffered batches (up to 50 samples per POST) sequentially.
   - Samples older than 10 minutes (`ingest.buffered_after_min = 10`) are marked as historical buffered records by the server, preserving full trip audit trails without corrupting live tracking `[CONFIRMED - Spec 11.5]`.
   - If buffer capacity is exhausted, the microcontroller overwrites the oldest unacknowledged samples and logs a `BUFFER_OVERFLOW` event `[CONFIRMED - Spec 12]`.

### 8.4 Network Failure & Backoff Schedule
If the ingestion API returns an error or connection times out, the hardware modem must execute the exact backoff ladder defined in master plan Part I.10 `[CONFIRMED]`:
- **HTTP 200 OK**: Delete acknowledged samples; reset retry counter.
- **HTTP 400 Bad Request**: Fatal client error. Drop malformed payload; do not resend.
- **HTTP 401 Unauthorized / HTTP 403 Forbidden**: Token revoked or device inactive. **Halt all telemetry uploads**. Re-check authentication once every 15 minutes.
- **HTTP 413 Payload Too Large**: Batch exceeds 8 KB. Split batch in half and retry immediately.
- **HTTP 429 Too Many Requests**: Rate limit tripped. Read `Retry-After` header and wait designated duration before resending.
- **HTTP 5xx Server Error / Connection Timeout**: Execute exponential backoff with jitter:
  $$\text{Delay} = \text{Base} \times (1 \pm 0.2)$$
  Sequence: **5 s, 10 s, 20 s, 40 s, 80 s, then clamp at 120 s**. Resend identical payload body.

---

## 9. Deduplication, Sequence Integrity & Out-of-Order Handling

### 9.1 Hardware Sequence Triplet
Every sample and event is uniquely identified by the hardware sequence triplet `[CONFIRMED - Spec 11.5 & P1-T5]`:
$$\text{Sample Identity} = (\text{device\_id}, \text{boot\_id}, \text{seq})$$

1. **`device_id`**: Identifies physical hardware unit.
2. **`boot_id`**: Random UUID v4 generated by the MCU on every cold boot or watchdog restart. Prevents sequence collisions when counter resets to 1 after power cycling.
3. **`seq`**: Strictly monotonic integer incrementing by 1 for every recorded sample during that boot session.

### 9.2 Database Duplicate Guard
The database enforces deduplication via a partial unique index on `(device_id, boot_id, seq)` across the `location_samples` table `[CONFIRMED - P1-T5]`:
- **Identical Duplicate**: If an incoming sample matches an existing `(device_id, boot_id, seq)` record and its payload bytes are identical, it is **accepted silently** and acknowledged in `ack_seq` (idempotent retry safety).
- **Conflicting Duplicate**: If the sequence matches but coordinates or timestamps differ, the new sample is **rejected with `CONFLICT`**, preserving original telemetry integrity and incrementing technician conflict counters `[CONFIRMED - Spec 11.5]`.

### 9.3 Out-of-Order Resolution
When flushing offline buffers or experiencing retransmissions:
- The server records each sample with its explicit `recorded_at` timestamp.
- The `bus_state` live position evaluator advances the live marker **only if `recorded_at` is newer than the currently displayed live fix**. Older buffered samples are stored for historical reporting without rewinding the live vehicle pin on mobile maps `[CONFIRMED - Part E.3]`.

---

## 10. Bus Association, Dynamic Reassignment & Historical Traceability

### 10.1 Decoupled Device-to-Bus Architecture
- **Hardware Isolation**: The tracker unit does not store, report, or configure which bus it is installed in. Firmware operates identically whether installed on Bus 14 or Bus 22 `[CONFIRMED - Part E.5]`.
- **Server-Side Binding**: The association between `device_id` and `bus_id` is maintained entirely within the server database via the `device_bus_links` table `[CONFIRMED - Spec 13.1 & Part E.6]`.

### 10.2 Device Linking Protocol (Part E.6)
1. **Coordinator Privilege**: Only Transport Coordinators (`COR` role) can link or move devices. Technicians cannot link devices (`HW-SPEC 1.4` and `13.2`) `[CONFIRMED]`.
2. **Single Open Link Invariant**: Enforced by partial unique indexes in PostgreSQL: exactly one open link per device and one open link per bus `[CONFIRMED]`.
3. **Atomic Reassignment Transaction**:
   ```sql
   BEGIN;
   -- Lock rows to prevent race conditions
   SELECT * FROM buses WHERE id = $bus_id FOR UPDATE;
   SELECT * FROM devices WHERE id = $device_id FOR UPDATE;
   
   -- Terminate existing open links at valid_from timestamp
   UPDATE device_bus_links 
   SET valid_to = $valid_from 
   WHERE (bus_id = $bus_id OR device_id = $device_id) AND valid_to IS NULL;
   
   -- Insert new active link
   INSERT INTO device_bus_links (device_id, bus_id, valid_from, created_by)
   VALUES ($device_id, $bus_id, $valid_from, $user_id);
   
   -- Write mandatory audit log row (Rule R-09)
   INSERT INTO audit_logs (...);
   COMMIT;
   ```
4. **Historical Attribution Integrity**: Telemetry samples are attributed to buses based on their historical `recorded_at` timestamp:
   - A buffered sample recorded at 08:15 by `HW_1042` while linked to Bus 14 is permanently attributed to Bus 14, even if the device was physically moved to Bus 22 at 09:00 and the buffer flushed at 09:30 `[CONFIRMED - Part E.6]`.
   - Telemetry received from unlinked devices is safely stored with `bus_id = null`, generating an unlinked device warning on technician consoles (`P4-T5`) `[CONFIRMED - P1-T4]`.

---

## 11. Downstream Exposure to Authorized Applications

To ensure student privacy and prevent unauthorized fleet scraping, client applications never query the hardware ingestion endpoint or communicate with trackers directly:

```
[HARDWARE TRACKER]
         │ (POST raw coordinates to INGEST_PUBLIC_HOST)
         ▼
[INGESTION API & DATABASE]
         │
         ▼
[READ PIPELINE: GET /api/v1/snapshot?route_id=...] (API_PUBLIC_HOST)
  ├── 1. Role-Based Scope Resolution (Rule R-12, Part E.4):
  │      - Student: Only buses assigned to their active route today.
  │      - Faculty: Only buses assigned to their transit roster today.
  │      - Coordinator / Admin: All fleet buses.
  ├── 2. Server Computes Data Age & Active Source (Rule R-10, Part E.3):
  │      - Clients NEVER select or infer the active tracking source.
  │      - Coordinates > 60s old are NEVER flagged as live.
  ├── 3. Snapshot Caching (ETag & Cache-Control: private, max-age=0):
  │      - Cached for 3 seconds per route version (`snapshot.cache_s = 3`).
  └── 4. Formats Sanitized JSON Payload (Excludes IMEI, ICCID, Raw Hardware Tokens).
         │
         ▼
[STUDENT/FACULTY MOBILE APPLICATION (Surface 1)]
  MapLibre renders bus location, stop ETA, and verified state badge:
  - "Live, bus tracker" (Green badge, fix age <= 60s)
  - "Last update 75 seconds ago" (Slate badge, fix age 61-120s)
  - "Location unavailable" (Muted badge, fix age > 120s; ETA displays em-dash '—')
```

---

## 12. Decision Status & Governance Classification Matrix

| Subsystem / Parameter | Specification Value / Threshold | Classification | Authority / Decision Ref |
|---|---|---|---|
| Ingestion URL Path | `POST /api/v1/telemetry` | **`[CONFIRMED]`** | Master Plan Part I.7, Spec 11.3 |
| Heartbeat URL Path | `POST /api/v1/heartbeat` | **`[CONFIRMED]`** | Master Plan Part I.7, Spec 11.6 |
| Token Rotation Path| `POST /api/v1/devices/token/rotate` | **`[CONFIRMED]`** | Master Plan Spec 11.1, HW-SPEC 13.4 |
| Authentication Format | `Authorization: Bearer <43-char-token>` | **`[CONFIRMED]`** | Master Plan Spec 11.1, Part F-AUTH-03 |
| Max Request Body Size| 8,192 bytes (8 KB) | **`[CONFIRMED]`** | Master Plan Part I.5 (`ingest.body_max_kb`) |
| Max Samples per POST | 50 samples | **`[CONFIRMED]`** | Master Plan Part I.5 (`ingest.batch_max`) |
| Max Events per POST  | 20 events | **`[CONFIRMED]`** | Master Plan Part I.10 |
| Moving Upload Interval| 10 seconds | **`[CONFIRMED]`** | Master Plan Part I.5 (`hw.moving_interval_s`) |
| Stopped Upload Interval| 30 seconds | **`[CONFIRMED]`** | Master Plan Part I.5 (`hw.stopped_interval_s`) |
| Parked Heartbeat Interval| 600 seconds (10 minutes) | **`[CONFIRMED]`** | Master Plan Part I.5 (`hw.parked_heartbeat_s`) |
| Maximum Plausible Speed| 150 km/h | **`[CONFIRMED]`** | Master Plan Part I.5 (`ingest.jump_max_kmh`) |
| Max HDOP Allowed | 5.0 | **`[CONFIRMED]`** | Master Plan Part I.5 (`hw.max_hdop`) |
| Min Satellites Required| 4 satellites | **`[CONFIRMED]`** | Master Plan Part I.5 (`hw.min_satellites`) |
| Clock Skew Alert Threshold| 300 seconds | **`[CONFIRMED]`** | Master Plan Part I.5 (`ingest.clock_skew_s`) |
| Staleness Map Cutoff | 60 seconds (Never live > 60s) | **`[CONFIRMED]`** | Master Plan Part I.5 (`hw.stale_after_s`) |
| Unavailable Cutoff | 120 seconds | **`[CONFIRMED]`** | Master Plan Part I.5 (`selector.both_down_s`) |
| Low Vehicle Battery (12V)| 11,800 mV | **`[CONFIRMED]`** | Master Plan Part I.5 (`vehicle.battery_mv_12v`) |
| Low Vehicle Battery (24V)| 23,500 mV | **`[CONFIRMED]`** | Master Plan Part I.5 (`vehicle.battery_mv_24v`) |
| First Auth State Transition| `PROVISIONED` -> `ACTIVE` on 1st request | **`[UNRESOLVED]`** | **Conflict C-01** (Pending ECE Lead Sign-off)|
| GNSS Receiver Hardware | u-blox NEO-6M vs internal SIM7600 GNSS| **`[UNRESOLVED]`** | **Decision 14** (ECE BOM selection) |
| MCU Selection | ESP8266 (Candidate) vs ESP32 (Recommended)| **`[PROPOSED]`** | Engineering Proposal (UART limits) |
| Cellular Modem Module | SIMCom SIM7600G (LTE Cat-4) | **`[PROPOSED]`** | Candidate Hardware Evaluation |
| Indian M2M Carrier APN | Airtel IoT / Jio M2M / Vi Business | **`[UNRESOLVED]`** | College IT Procurement Dependency |
| Flash Ring Buffer Format| LittleFS on 4MB SPI Flash | **`[PROPOSED]`** | Embedded Engineering Design |
| Hardware SOS Panic Wiring| Optocoupler / Pulled-up GPIO to GND | **`[PROPOSED]`** | Embedded Electrical Design |

---

## 13. Test Harness & Contract Acceptance Criteria

Prior to approving Phase P1 completion or connecting physical buses, the integration implementation must satisfy the following automated verification gates:

### 13.1 Contract Replay Harness (`test:contract` / Task P1-T16)
- Automated Vitest test suite replays recorded binary and JSON payloads captured from firmware versions.
- Validates that every sample in specification sections 11.3 and 11.4 parses identically across firmware revisions.
- Verifies that malformed, truncated, or unknown JSON fields trigger immediate rejection.

### 13.2 Pure Domain Pipeline Unit Tests (Task P1-T3)
- Table-driven unit tests covering all 14 validation steps in isolation.
- Verifies that Null Island `(0, 0)`, coordinates with $lat > 90$, timestamps $>60$s in the future, and speeds $>150$ km/h are correctly rejected and cited in `rejected`.
- Verifies that identical sequence duplicates return `ack_seq` while conflicting duplicates return `CONFLICT`.

### 13.3 Ingestion Load & Soak Test (`load:test` / Task P1-T17)
- k6 load test simulating 50 concurrent hardware trackers transmitting every 10 seconds.
- Sustains **200 requests per second** on ingestion for 30 minutes without dropped packets.
- Verifies database connection pool stability and partition creation.

### 13.4 Physical Benchtop Hardware Acceptance Checklist
Before deploying trackers to physical college buses, the ECE team and software team must execute benchtop hardware testing:
- [ ] Tracker boots and obtains 3D fix ($HDOP \le 5.0$, $Sats \ge 4$) within 45 seconds of antenna exposure.
- [ ] Tracker establishes TLS 1.3 session with `INGEST_PUBLIC_HOST` using provisioned Bearer token.
- [ ] Telemetry envelope is accepted by server and returns HTTP 200 with matching `ack_seq`.
- [ ] Disconnecting cellular antenna causes tracker to buffer samples in SPI flash without crash or reset.
- [ ] Reconnecting cellular antenna flushes buffered batch with `ack_seq` successfully pruning flash storage.
- [ ] Pressing dashboard panic button transmits `SOS` event within 1.0 second, triggering server incident creation and lighting the hardware confirmation LED.
- [ ] Toggling ignition sensing line switches device between 10s moving cadence and 600s parked heartbeat.

---

## 14. Phase Gate Status & Prohibitions

> [!IMPORTANT]
> **Implementation Strictly Gated**:  
> In strict adherence to `AGENTS.md` and Decision Record [`APR-UI-001`](file:///c:/aditya/Bus%20tracker/docs/decisions/APR-UI-001.md):
> 1. This specification is submitted for **Project-Owner and Hardware Team Review Only**.
> 2. **Phase P0 and Phase P1 remain STRICTLY LOCKED**.
> 3. No backend endpoints, firmware scripts, or integration code may be written during this step.
> 4. Physical PDF specifications (`SW-MVP-1.0.pdf` and `HW-SPEC-1.0.pdf`) remain tracked as unresolved blockers (`BLK-01`, `BLK-02`).
> 5. Conflict `C-01` and Conflict `C-06` remain open and must be dispositioned prior to Phase P1 implementation.
