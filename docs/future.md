# Future Enhancements and Out-of-Scope Ideas

**Governing Plan**: `AG-MASTER-1.0-v2-College-Bus-Tracker.md` (Part B.5)  
**Rule Reference**: AGENTS.md Rule B.5 (*"Build only what SW-MVP-1.0 describes as in scope (section 2.1). Do not add features the specification does not describe. Record ideas in docs/future.md. Items in section 40 of the specification are out of scope for the MVP."*)

---

## 1. Specification Section 40: Out-of-Scope Items for MVP

The following features and integrations are explicitly deferred to post-MVP releases:

1. **Automatic Outbound Emergency Voice Calling**:
   - *Status*: Deferred to Phase 2 (Part E.10 line 410).
   - *Description*: The MVP uses push notifications, SMS, email, and full-screen in-app alarms. Automatic IVR/telephony calls to escalation contacts will be evaluated for subsequent releases.

2. **In-Bus Hardware RFID Readers for Student Taps**:
   - *Status*: Telemetry event `RFID_TAP` is received and stored in Phase P1 (`P1-T8`), but student passenger tap processing is deferred to Phase 2.
   - *Description*: MVP attendance relies exclusively on dynamic QR code rotation and driver manual check-in.

3. **Road Network Map Snapping**:
   - *Status*: Deferred (Part E.9 line 402).
   - *Description*: MVP ETA and map projection calculate distance along the defined route line without live road network map-matching algorithms.

4. **Multi-Region Database Replication & Active-Active Failover**:
   - *Status*: Deferred (Decision 16, Section 41).
   - *Description*: MVP relies on single-region Multi-AZ PostgreSQL in AWS Mumbai (`ap-south-1`) with 4-hour RTO and 15-minute point-in-time recovery.

5. **Direct Student Live Location Sharing**:
   - *Status*: Prohibited in MVP (Rule R-19).
   - *Description*: Student applications do not collect or transmit location data to preserve student privacy.

---

## 2. Deferred Architectural & UX Proposals

- Custom map tile hosting servers (MVP uses OpenStreetMap raster/vector tiles via MapLibre GL).
- Predictive machine-learning ETA models based on historical traffic patterns (MVP uses median moving speed over 5 minutes clamped to 10–60 km/h).
- In-app chat between students and drivers (prohibited for safety and driver distraction reasons).
