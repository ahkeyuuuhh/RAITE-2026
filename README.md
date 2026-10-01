# ClassAssist · RAITE 2026

A native mobile classroom companion: students book consultations, and teachers prepare, review, and schedule lesson-based assessments.

**React Native + TypeScript (Expo) · Node.js / Express · Supabase Auth and PostgreSQL.** Android and iOS clients; no web frontend.

## Run locally

Requirements: Node.js 22.19+, npm, Docker Desktop, and an Android emulator, Expo Go on a phone, or an iOS simulator on macOS.

```sh
npm ci
npx supabase start -x realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor
node apps/api/scripts/setup-local.js
npm run db:seed
npm run dev
```

In a second terminal:

```sh
npm run android
# Or npm run mobile, then scan the Expo QR code with a compatible Expo Go client.
```

API: `http://127.0.0.1:3001`. Local Supabase ports: API `55321`, database `55322`, email viewer `55324`. Expo: `8082`. `npm run dev` starts the API and separate durable worker. Check `/api/health` for database and worker health.

`setup-local.js` creates ignored `.env` from the running local stack and preserves an existing file. Supabase start applies migrations on first start; `npm run db:migrate` applies new migrations to an existing instance. Seeding is additive and preserves data.

### Mobile networking

- Android emulator defaults to `http://10.0.2.2:3001` (host computer).
- iOS simulator defaults to `http://localhost:3001`.
- Physical phone: set `EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:3001` in `apps/mobile/.env`, set `HOST=0.0.0.0` in server `.env`, and restart. Use the same network and allow development ports through the firewall. Loopback Supabase URLs are rewritten to the API host by the mobile client; hosted Auth uses its HTTPS URL.
- iOS device transport restrictions may require a development build or HTTPS development endpoint. Production endpoints must use HTTPS.

### Synthetic accounts

| Email                       | Role                       |
| --------------------------- | -------------------------- |
| `teacher@classassist.demo`  | Ms. Biel Santos, teacher   |
| `student@classassist.demo`  | Alex Reyes, student        |
| `student2@classassist.demo` | Jamie Cruz, second student |

Local setup uses the deliberately public **demo-only password** `ClassAssist-demo-2026!`, not a production credential. Change `SEED_PASSWORD` before first seed if desired. Rerunning seed does not reset existing passwords. Initial class code: `NEWTON2026`, valid seven days from first seed; teachers can rotate it. Roles are server-assigned. Self-registration is not implemented.

## Configuration

See `.env.example`. Keep server secrets out of the mobile directory.

| Variable                                | Purpose                                                                |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                          | Server-only Supabase Postgres connection; use TLS for hosted databases |
| `SUPABASE_URL`                          | Supabase Auth URL reachable by the backend                             |
| `SUPABASE_PUBLISHABLE_KEY`              | Public Auth client key                                                 |
| `SUPABASE_PUBLIC_URL`                   | Optional Auth URL reachable by the phone                               |
| `SUPABASE_SECRET_KEY`                   | Seed/admin only; never returned by the API                             |
| `PORT`, `HOST`                          | API listener, defaults `3001` / `127.0.0.1`                            |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Server-only OpenAI-compatible chat-completions configuration           |
| `ALLOW_SAMPLE_DRAFTS`                   | Labeled sample in non-production environments                          |
| `SEED_PASSWORD`                         | Fictional demo account password                                        |
| `EXPO_PUBLIC_API_URL`                   | Mobile API endpoint, in `apps/mobile/.env`                             |

The AI adapter validates structured output and uses a 30-second timeout. A real key/model has not been supplied or verified. Sample mode never claims live generation. Configure `AI_*`, restart the server, and reopen the app to enable live AI. The provider must support JSON object responses and `max_completion_tokens`.

## Verification and builds

```sh
npm test
npm run test:integration
npm run build
# From apps/mobile:
npx expo-doctor
```

`build` checks strict TypeScript and exports Android/iOS JS/Hermes bundles to `apps/mobile/dist`. These are **not signed APK/IPA installers**. `apps/mobile/eas.json` includes preview APK and production profiles. After connecting your Expo account, use `npx eas-cli build --platform android --profile preview`, or `npx expo run:android` with a local Android toolchain. iOS binaries require macOS/Xcode or EAS and Apple signing credentials. No app-store upload is performed.

## Documentation

- [Architecture, boundaries, and limitations](docs/ARCHITECTURE.md)
- [Verification record](docs/TEST_RESULTS.md)
- [Mobile demo walkthrough](docs/DEMO_SCRIPT.md)
- [Original implementation plan](RAITE_2026_IMPLEMENTATION_PLAN.md)

Included: class enrollment, consultation rules, conflict-safe booking, exact-version quiz approval, durable publication, in-app calendars/reminders, saved answers, idempotent submission receipts, teacher review, and failed-job retry.

Deferred: push, external calendars, integrity logs, scoring, PDF import, offline exams, institutional onboarding UI, slides, and app-store submission. Live AI and hosted Supabase remain environment setup steps. Use fictional data for the demo.
