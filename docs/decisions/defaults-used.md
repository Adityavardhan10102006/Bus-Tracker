# Register of Defaults Used and Operational Thresholds

This document maintains the official record of architectural, policy, and configuration defaults applied across the College Bus Tracker project, strictly following `AG-MASTER-1.0-v2-College-Bus-Tracker.md` Part B.11, Part H, and Part I.5.

> [!IMPORTANT]
> **Distinction of Status**:
> - **Category 1: Formally Authorized Defaults**: Documented in the master plan with clear consensus for MVP.
> - **Category 2: Temporary Working Assumptions**: Defaults adopted pending formal response from designated owners in Section 41.
> - **Category 3: Baseline Operational Thresholds**: Exact numeric parameters specified in SW-MVP-1.0 Section 35 and Part I.5 to be stored in the database `settings` table. Under Rule B.6, no threshold may ever appear as a hardcoded literal constant in feature files.

---

## 1. Category 1: Formally Authorized Defaults

| Decision / Item | Authorized Default | Master Plan Section | Rationale |
|---|---|---|---|
| **Conflict C-02** | Adopt `RS-` prefix for research tasks and `R-` for business rules. | Part H line 547 | Eliminates naming collisions between research tasks and business rules. |
| **Conflict C-03** | Use `is_mock` across contracts, database columns, and logs. | Part H line 548 | Aligns contracts package and database with the specification schema. |
| **Decision 11** | Exclude Apple Critical Alerts from MVP; use Time-Sensitive notifications. | Part H line 559 | Prevents Apple special entitlement application delays from blocking mobile launch. |
| **Database Deletion Policy** | Soft deactivation for business records; hard deletes restricted to retention and GDPR/DPDP purge jobs. | Part B Rule R-08; Part I.6.1 | Preserves complete operational audit trail and historical integrity. |
| **Timestamp Timezone** | All timestamps stored in UTC (`timestamptz`); presented in `Asia/Kolkata`. | Part B.7; Part I.6.1 | Prevents timezone conversion anomalies across device ingestion and client clocks. |

---

## 2. Category 2: Temporary Working Assumptions (Section 41)

| Decision Item | Topic | Temporary Working Default | Owner | Status & Condition |
|---|---|---|---|---|
| **Decision 2** | AWS Region | `ap-south-1` (Mumbai, India). | DevOps / Eng Lead | Adopted for low latency and local data residency; pending formal cloud account confirmation. |
| **Decision 4** | Boarding Verification Method | Dynamic rotating QR code on driver phone (30s rotation). | Product Owner | Adopted for MVP to avoid in-bus RFID hardware installation dependencies. |
| **Decision 5** | Driver Smartphone Provisioning | College-issued devices preferred; personal devices with consent as fallback. | Transport Office | Adopted to allow driver app testing; college fleet budget pending. |
| **Decision 6** | Security Staff Visibility | Read-only access to all active buses across the fleet. | Security Lead | Working assumption for scope resolution rules. |
| **Decisions 7 & 8** | Minor Student Parental Consent | Feature-flagged limited mode per Section 29.2. | Legal Counsel | Implemented behind administrative feature flag pending legal review. |
| **Decision 10** | Emergency Contacts & Rosters | Real college-provided rosters only (zero synthetic data). | Transport Office | Temporary assumption that college will supply CSV data prior to staging runs. |
| **Decision 14** | Tracker GNSS Hardware Module | Software ingestion contract remains agnostic to GNSS chip. | ECE Team | Decoupled; software handles standard NMEA/coordinate payloads. |
| **Decision 15** | Supported Mobile OS Floors | Android 10+ (API 29) and iOS 16.4+. | Mobile Lead | Verified in RS-01 against Expo SDK 58 toolchains. |
| **Decision 16** | Disaster Recovery Targets | Single-region RDS Multi-AZ; 4-hour RTO, 15-minute RPO. | DevOps Lead | Working assumption for MVP; multi-region deferred to Phase 2. |

---

## 3. Category 3: Baseline Operational Thresholds (Part I.5 / Section 35)

These values are the exact defaults to be inserted into the database `settings` table via `db:seed:config`. Any modification requires super admin authentication, a logged justification, and an entry in `audit_logs`.

| Key | Default Value | Unit / Format | Spec Section | Purpose |
|---|---|---|---|---|
| `hw.stale_after_s` | `60` | seconds | 13.1 | Hardware sample staleness threshold |
| `hw.min_satellites` | `4` | integer | 13.1 | Minimum GPS satellites for valid hardware fix |
| `hw.max_hdop` | `5.0` | float | 13.1 | Maximum acceptable HDOP for hardware fix |
| `phone.max_accuracy_m` | `50` | meters | 13.1 | Maximum acceptable phone GPS accuracy |
| `selector.cooldown_s` | `30` | seconds | 13.3 | Anti-flapping cooldown between auto source switches |
| `selector.return_fixes` | `3` | count | 13.3 | Consecutive valid HW fixes needed to return to HW |
| `selector.return_window_s` | `30` | seconds | 13.3 | Window within which return fixes must occur |
| `selector.both_down_s` | `120` | seconds | 13.3 | Time both sources down before UNAVAILABLE state |
| `selector.flap_limit` | `6 switches in 600 s` | rule | 13.5 | Threshold to trigger flap hold |
| `selector.flap_hold_s` | `300` | seconds | 13.5 | Hold duration when flapping is detected |
| `phone.standby_interval_s` | `30` | seconds | 13.6 | Phone sampling interval when HW is active |
| `phone.fallback_interval_s` | `10` | seconds | 13.6 | Phone sampling interval when Phone is active |
| `hw.moving_interval_s` | `10` | seconds | 11.4 | Hardware sampling interval when bus moving |
| `hw.stopped_interval_s` | `30` | seconds | 11.4 | Hardware sampling interval when stopped (ign ON) |
| `hw.parked_heartbeat_s` | `600` | seconds | 11.6 | Heartbeat cadence when bus parked (ign OFF) |
| `hw.heartbeat_moving_s` | `60` | seconds | 11.6 | Heartbeat cadence when ignition is ON |
| `hw.gps_lost_after_s` | `30` | seconds | 12 | GNSS loss threshold before GPS_LOST event |
| `hw.gps_lost_ticket_min` | `10` | minutes | 12 | Continuous GPS loss before opening ticket |
| `vehicle.battery_mv_12v` | `11800` | millivolts | 12 | Low battery threshold for 12V vehicle |
| `vehicle.battery_mv_24v` | `23500` | millivolts | 12 | Low battery threshold for 24V vehicle |
| `ingest.future_tolerance_s` | `60` | seconds | 11.5 | Max future timestamp drift permitted |
| `ingest.buffered_after_min` | `10` | minutes | 11.5 | Samples older than this accepted as BUFFERED only |
| `ingest.stale_timestamp_days` | `7` | days | 11.5 | Samples older than this rejected STALE_TIMESTAMP |
| `ingest.jump_max_kmh` | `150` | km/h | 11.5 | Max plausible velocity jump threshold |
| `ingest.jump_reset_min` | `30` | minutes | 11.5 | Jump reference point reset window |
| `ingest.clock_skew_s` | `300` | seconds | 11.5 | Device-server clock skew before technician alert |
| `ingest.service_area_buffer_km` | `10` | km | 11.5 | Geofence buffer around campus service territory |
| `ingest.batch_max` | `50` | count | 11.3 | Max telemetry samples per request batch |
| `ingest.body_max_kb` | `8` | KB | 11.3 | Maximum hardware request body size |
| `ingest.phone_body_max_kb` | `16` | KB | 11.7 | Maximum driver phone request body size |
| `ingest.global_rps` | `200` | requests/sec | 11.8 | Ingestion rate limit capacity |
| `sos.dedupe_s` | `60` | seconds | 19.2 | SOS incident deduplication window per bus |
| `sos.cancel_window_s` | `30` | seconds | 19.6 | Driver window to cancel accidental SOS |
| `sos.escalation_min` | `0, 2, 5, 10` | minutes | 19.3 | Tier escalation schedule (Tiers 0, 1, 2, 3) |
| `sos.device_delay_flag_s` | `60` | seconds | 19.8 | Threshold to label incident DEVICE_DELAYED |
| `stop.radius_m` | `50` | meters | 17.4 | Geofence arrival detection radius |
| `stop.arrival_speed_kmh` | `5` | km/h | 17.4 | Speed threshold to detect arrival |
| `stop.arrival_dwell_s` | `15` | seconds | 17.4 | Required dwell time below speed to detect ARRIVED |
| `stop.departure_dwell_s` | `10` | seconds | 17.4 | Dwell time outside radius to detect DEPARTED |
| `stop.departure_speed_kmh` | `10` | km/h | 17.4 | Speed exceeding this marks DEPARTED |
| `eta.speed_min_kmh` | `10` | km/h | 17.5 | Minimum clamped speed for ETA computation |
| `eta.speed_max_kmh` | `60` | km/h | 17.5 | Maximum clamped speed for ETA computation |
| `eta.speed_default_kmh` | `20` | km/h | 17.5 | Default speed when no moving samples available |
| `eta.speed_window_min` | `5` | minutes | 17.5 | Moving speed median sample window |
| `snapshot.cache_s` | `3` | seconds | 17.3 | Route snapshot server cache TTL |
| `qr.rotation_s` | `30` | seconds | 18.1 | Boarding QR code rotation interval |
| `boarding.window_before_min` | `10` | minutes | 18.5 | Boarding window open before departure |
| `boarding.window_after_min` | `15` | minutes | 18.5 | Boarding window close after departure |
| `leave.cutoff_before_trip_min` | `30` | minutes | 18.7 | Student leave marking cutoff before departure |
| `shift.idle_min` | `20` | minutes | 15.4 | Idle duration before prompting driver |
| `shift.idle_speed_kmh` | `3` | km/h | 15.4 | Speed below which vehicle is considered idle |
| `shift.idle_grace_min` | `10` | minutes | 15.4 | Grace window to respond to idle prompt |
| `shift.timeout_h` | `14` | hours | 15.4 | Absolute shift duration timeout |
| `shift.late_start_min` | `10` | minutes | 15.6 | Late start threshold before faculty alert |
| `shift.late_start_coordinator_min` | `20` | minutes | 15.6 | Late start threshold before coordinator alert |
| `trip.generate_days_ahead` | `7` | days | 15.5 | Number of days ahead generated nightly |
| `route.corridor_m` | `300` | meters | 20.1 | Max distance from route for proposed stops |
| `stop.duplicate_m` | `100` | meters | 20.1 | Duplicate stop detection radius |
| `stop_request.limit_days` | `7` | days | 20.1 | Stop request voting lifecycle |
| `notify.quiet_start` | `22:00` | HH:MM | 21.4 | Quiet hours start (campus local time) |
| `notify.quiet_end` | `06:00` | HH:MM | 21.4 | Quiet hours end (campus local time) |
| `notify.push_per_hour` | `6` | count | 21.3 | Max non-safety push notifications per hour |
| `notify.group_window_s` | `120` | seconds | 21.3 | Notification grouping window |
| `notify.retry_min` | `1, 5, 30, 120` | minutes | 21.2 | Dispatch retry backoff intervals |
| `summary.send_time` | `08:00` | HH:MM | 21.9 | Daily coordinator summary dispatch time |
| `approach.default_min` | `5` | minutes | 16.1 | Default approach notification lead time (range 2–15) |
| `app.poll_foreground_s` | `10` | seconds | 17.2 | Mobile app foreground polling interval |
| `web.poll_s` | `10` | seconds | 17.2 | Admin web console polling interval |
| `session.idle_min` | `30` | minutes | 24 | Web console idle timeout (Security `SEC`: 15 min) |
| `otp.ttl_min` | `10` | minutes | 8 | Driver email OTP validity duration |
| `otp.attempts` | `5` | count | 8 | Maximum invalid attempts per OTP code |
| `otp.lock_min` | `15` | minutes | 8 | Account lockout after 10 consecutive failures |
| `doc.expiry_warn_days` | `30, 7` | days | 22 | Document expiry warning intervals (buses) |
| `service.hours` | `05:30 to 22:30` | hours | 31.9 | Daily operational service window (Asia/Kolkata) |
