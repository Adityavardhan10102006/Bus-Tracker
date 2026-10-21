# Security Baseline and Controls Register (Part F)

This register defines, tracks, and audits the **19 mandatory security controls** and the additional specification controls required by **Part F** of `AG-MASTER-1.0-v2-College-Bus-Tracker.md`.

> [!CAUTION]
> **Mandatory Security Rule (Part B.3 & Part F)**:  
> *"Part F lists every security control. Every control is mandatory. A feature is not done until its security checks pass. Security findings of high or critical severity block the release."*

---

## 1. The 19 Mandatory Baseline Controls

| # | Control Name | Master Plan Implementation Requirements | Verification Check | Status | Implementing Phase |
|---|---|---|---|---|---|
| **1** | **Row-Level Security (RLS)** | RLS enabled and forced on 18 sensitive tables. Session values set per transaction with `set_config(..., true)`. Runtime role has no `BYPASSRLS`. | Integration test in `test:security` bypassing service layer | `LOCKED` | `P0-T6`, `RS-12` |
| **2** | **Auth on Every API Route** | Every route declares explicit auth decision in code (`public`, `device`, `driver`, or role list). Routes lacking decision fail build. | `verify:routes-auth` in CI | `LOCKED` | `P0-T13` |
| **3** | **Never Trust the Frontend** | Scope resolved from database on every request; client IDs are filters only; server selects active source (R-10). | Authorisation matrix tests & IDOR tests | `LOCKED` | `P0-T13`, `P1-T12` |
| **4** | **Rate Limiting** | Spec 11.8 limits; WAF rate rules; driver OTP limits (5 codes/hr); IP auth failure limits (P1-T14). | Rate limit integration tests & k6 load tests | `LOCKED` | `P1-T13`, `P1-T14` |
| **5** | **Sanitise User Input** | Zod at every boundary; reject unknown fields; plain-text fields only; React escaping; zero `dangerouslySetInnerHTML`. | Unit tests & Semgrep AST rules | `LOCKED` | Part B.7, `P0-T1` |
| **6** | **Parameterised Queries** | ORM or tagged templates only; lint bans `$queryRawUnsafe`, `$executeRawUnsafe`, and string SQL concatenation. | ESLint rules & Semgrep in `security:scan` | `LOCKED` | Part B.7, `P0-T1` |
| **7** | **Lock Down CORS** | Strict allowlist from `CORS_ALLOWED_ORIGINS` (admin web console only); credentials restricted; zero wildcard. | Header tests in `test:security` | `LOCKED` | `P0-T14` |
| **8** | **HTTPS Everywhere** | TLS 1.2 minimum, 1.3 preferred; HTTP redirected/refused; HSTS on console; ACM auto-renewed certificates. | ZAP baseline scan & infra test | `LOCKED` | `P0-T17`, `P7-T5` |
| **9** | **Stop IDOR** | Out-of-scope IDs return 404, never 403; UUID v4 everywhere except `device_id`; no sequential IDs exposed. | IDOR test harness per endpoint | `LOCKED` | `P0-T13`, `E.4` |
| **10** | **Debug Mode Off in Prod** | `NODE_ENV=production`; OpenAPI UI disabled; stack traces suppressed; device serial consoles disabled. | Startup misconfig check & `verify:prod-clean` | `LOCKED` | `P0-T2`, `P0-T14` |
| **11** | **CAPTCHA on Public Forms** | Cloudflare Turnstile verified server-side (hostname and action checks) on OTP requests after the 1st/hour. | Integration test with Turnstile test secret | `LOCKED` | `P0-T10`, `RS-08` |
| **12** | **Log Admin Actions** | `audit_logs` append-only; every admin write records actor, role, action, entity, before, after, IP, user-agent, request ID. | Admin endpoint integration tests | `LOCKED` | `P0-T4`, `P4-T14` |
| **13** | **Private Storage Buckets** | S3 private buckets, public access blocked, KMS encryption, presigned URLs <= 15 minutes for exports and firmware. | Terraform policy tests & anonymous GET test | `LOCKED` | `P0-T17`, `P4-T11` |
| **14** | **Hide Admin Pages Properly** | Admin console served exclusively on `ADMIN_PUBLIC_HOST`; mobile app excludes admin bundle; unauthorized routes return 404. | Route inventory test & bundle audit | `LOCKED` | `P0-T19`, `P4-T15` |
| **15** | **Update Vulnerable Packages** | Lockfiles committed; Renovate automated PRs; `pnpm audit` in CI; critical patched within 7 days, high within 30 days. | CI `security:scan` & release gate | `LOCKED` | `P0-T1`, `P7-T6` |
| **16** | **Check File Upload Types** | CSV imports (5 MB, streaming) & firmware binaries only. Magic bytes, extension, declared type verified; reject others. | Unit tests with polyglot/malicious files | `LOCKED` | `P4-T8`, `P4-T11` |
| **17** | **Code Security Review** | PR review with CODEOWNERS; Semgrep; CodeQL; threat model in `threat-model.md`; third-party pentest before launch. | Review sign-off in `docs/security/` | `LOCKED` | `P7-T5`, `P7-T6` |
| **18** | **Security Headers** | Helmet on API; web console CSP blocking inline scripts; X-Frame-Options DENY; X-Content-Type-Options nosniff; HSTS. | Header tests in `test:security` | `LOCKED` | `P0-T14`, `P0-T19` |
| **19** | **Verify Webhook Signatures** | SNS certificate URL allowlist & signature check; SMS callback secret check; Turnstile verification; authenticated FCM/APNs. | Tests with valid and tampered signatures | `LOCKED` | `RS-06`, `RS-07`, `RS-08` |

---

## 2. Additional Specification Controls (Section 28)

- **Admin MFA**: TOTP enrollment mandatory for `SEC`, `COR`, `TEC`, `MGT`, `SAD`. 10 single-use recovery codes hashed with `argon2id`.
- **Driver OTP**: 6-digit code, HMAC-stored (`OTP_HMAC_KEY`), 5 attempts, 10-minute validity.
- **Session Security**: Session cookies `HttpOnly`, `Secure`, `SameSite=Strict`. CSRF token header required on every state-changing console request.
- **Credential Redaction in Logs**: Zero personal data, tokens, coordinates of students, cookies, or QR payloads in pino JSON logs.
- **Spreadsheet Protection**: Exported CSV cells starting with `=`, `+`, `-`, or `@` automatically prefixed with apostrophe (`'`).
- **Field-Level Encryption**: Date of birth, guardian contact, and TOTP secrets encrypted with AES-256-GCM.
- **Secrets Management**: AWS Secrets Manager with 90-day rotation; dual-key rotation for device HMAC keys.
- **Network Isolation**: RDS PostgreSQL and ECS tasks in private subnets with no public IPs; ALB is the only public ingress.
