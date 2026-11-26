# Group XP Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js + Supabase web application where temporary users log in to auto-save group XP scores (with full history logging) and upload titled photo evidence, managed via an Admin dashboard.

**Architecture:** Next.js App Router with TypeScript and Tailwind CSS serves both UI pages and server-side API route handlers. Authentication uses custom HMAC-signed HTTP-only cookies verified against Supabase Postgres (`temp_users`) and env-configured Admin credentials, while all database and Supabase Storage operations run server-side via `SUPABASE_SERVICE_ROLE_KEY` to enforce strict per-user data isolation.

**Tech Stack:** Next.js 15+ (App Router), React, TypeScript, Tailwind CSS, `@supabase/supabase-js`, Node `crypto` (`scryptSync` + HMAC-SHA256), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-26-group-xp-tracker-spec.md`

## Global Constraints

- Project root: `E:\webapp\ระบบจดคะแนน`
- Language: Thai UI copy with clean responsive layout (mobile-first for camera/scoring)
- 1 temporary `username` is strictly bound to 1 `group_name`; no email required
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ADMIN_PASSWORD`) must never be exposed to client components or committed to git
- Every score toggle (`ผ่าน` / `ไม่ผ่าน`) auto-saves immediately and appends an immutable snapshot row to `score_history`

## Review Focus

- **Rapid/concurrent toggle clicks**: Clicking multiple items quickly must not leave the top-center save status stuck on "กำลังบันทึก..." or drop `score_history` rows; track in-flight request count and serialize/guard per-item updates.
- **Deactivated or deleted user with active cookie**: Server auth helpers must re-check `temp_users.is_active` in DB so deactivated users are immediately rejected with `401` even with a valid cookie.
- **Deleted category/item after scoring**: `score_history` must store snapshot fields (`category_title`, `item_title`, `xp`) so historical logs remain intact when an Admin edits or deletes categories/items.
- **Invalid/oversized photo upload or blank title**: Photo upload endpoint must reject empty titles, non-image MIME types, and files > 5 MB with `400` and a clear Thai message before touching Supabase Storage.
- **Duplicate username or empty group name in Admin**: Admin user creation/update must validate non-empty `username`/`group_name` and handle Postgres unique constraint (`23505`) with `409` instead of `500`.

---

### Task 1: Project Scaffolding, Dependencies & Supabase Schema

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `supabase/schema.sql`
- Create: `src/lib/supabase-admin.ts`
- Test: `tests/env-and-schema.test.ts`

**Interfaces:**
- Produces: `getSupabaseAdmin(): SupabaseClient` in `src/lib/supabase-admin.ts`

- [ ] **Step 1: Initialize Next.js app and install dependencies**
Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes` in `E:\webapp\ระบบจดคะแนน`, then install `@supabase/supabase-js` and dev deps `vitest @vitejs/plugin-react`.

- [ ] **Step 2: Write `.env.example` and verify `.gitignore` excludes `.env*`**
Include `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.

- [ ] **Step 3: Write `supabase/schema.sql`**
Define tables `app_settings`, `temp_users`, `score_categories`, `score_items`, `user_scores` (with `UNIQUE(user_id, item_id)`), `score_history` (with snapshot columns `category_title`, `item_title`, `xp`), `evidence_photos`, plus default `app_settings` row and `evidence-photos` storage bucket SQL.

- [ ] **Step 4: Write failing test `tests/env-and-schema.test.ts`**
Assert `getSupabaseAdmin()` throws a clear error when `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, and assert `supabase/schema.sql` contains all 7 table definitions.

- [ ] **Step 5: Implement `getSupabaseAdmin()` in `src/lib/supabase-admin.ts` and run `npx vitest run tests/env-and-schema.test.ts`**
Expected: PASS.

- [ ] **Step 6: Commit**
`git init && git add . && git commit -m "chore: scaffold Next.js app and Supabase schema"`

---

### Task 2: Password Hashing & HMAC Session Auth Helpers

**Files:**
- Create: `src/lib/auth.ts`
- Test: `tests/auth.test.ts`

**Interfaces:**
- Consumes: `getSupabaseAdmin` (`src/lib/supabase-admin.ts`)
- Produces:
  - `hashPassword(password: string): string`
  - `verifyPassword(password: string, storedHash: string): boolean`
  - `signSessionToken(payload: SessionPayload): string`
  - `verifySessionToken(token: string): SessionPayload | null`
  - `verifyAdminCredentials(username: string, password: string): boolean`
  - `requireUserSession(): Promise<UserSession | null>`
  - `requireAdminSession(): Promise<AdminSession | null>`

- [ ] **Step 1: Write failing tests in `tests/auth.test.ts`**
Test `hashPassword`/`verifyPassword` (valid, wrong password, malformed hash), `signSessionToken`/`verifySessionToken` (valid, tampered signature, expired token), `verifyAdminCredentials` (timing-safe match/mismatch), and `requireUserSession` returning `null` when DB user has `is_active: false`.

- [ ] **Step 2: Run `npx vitest run tests/auth.test.ts` to verify failure**
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/auth.ts`**
Use `crypto.scryptSync` + `crypto.timingSafeEqual` for passwords, HMAC-SHA256 for session tokens stored in `session` HTTP-only cookie, and DB lookup on `temp_users` for `requireUserSession()`.

- [ ] **Step 4: Run `npx vitest run tests/auth.test.ts` to verify pass**
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/lib/auth.ts tests/auth.test.ts && git commit -m "feat: add scrypt password hashing and HMAC session auth"`

---

### Task 3: Auth API Routes & Login Pages (`/login`, `/admin/login`)

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/admin-login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/admin/login/page.tsx`
- Test: `tests/api-auth.test.ts`

**Interfaces:**
- Consumes: `verifyPassword`, `verifyAdminCredentials`, `signSessionToken`, `requireUserSession`, `requireAdminSession` (`src/lib/auth.ts`), `getSupabaseAdmin` (`src/lib/supabase-admin.ts`)
- Produces: HTTP endpoints `POST /api/auth/login`, `POST /api/auth/admin-login`, `POST /api/auth/logout`, `GET /api/auth/me`

- [ ] **Step 1: Write failing tests in `tests/api-auth.test.ts`**
Mock `getSupabaseAdmin` and test: active user login sets `session` cookie (`200`), inactive user login returns `403`, wrong password returns `401`, admin login sets admin cookie (`200`).

- [ ] **Step 2: Run `npx vitest run tests/api-auth.test.ts` to verify failure**

- [ ] **Step 3: Implement auth route handlers (`login`, `admin-login`, `logout`, `me`)**
Return Thai error messages (`ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง`, `บัญชีนี้ถูกปิดใช้งาน`).

- [ ] **Step 4: Build `/login` and `/admin/login` client pages**
Clean mobile-friendly forms with loading state, error banner, and link between user login and admin login.

- [ ] **Step 5: Run `npx vitest run tests/api-auth.test.ts` and `npm run build` (typecheck)**
Expected: PASS.

- [ ] **Step 6: Commit**
`git add src/app/api/auth src/app/login src/app/admin/login tests/api-auth.test.ts && git commit -m "feat: add login API routes and login pages"`

---

### Task 4: Score Calculation & Scoring / History API Routes

**Files:**
- Create: `src/lib/scoring.ts`
- Create: `src/app/api/scores/route.ts`
- Create: `src/app/api/scores/toggle/route.ts`
- Create: `src/app/api/history/route.ts`
- Test: `tests/scoring.test.ts`

**Interfaces:**
- Consumes: `requireUserSession` (`src/lib/auth.ts`), `getSupabaseAdmin` (`src/lib/supabase-admin.ts`)
- Produces:
  - `calculateCategorySummaries(categories, items, userScores): CategorySummary[]` & `calculateTotalXp(summaries): number` in `src/lib/scoring.ts`
  - `GET /api/scores` (returns `projectName`, `user`, `categories` with items + `passed` state + XP totals)
  - `POST /api/scores/toggle` (body `{ itemId: string, passed: boolean }` -> upserts `user_scores` & inserts snapshot into `score_history`)
  - `GET /api/history` (returns `score_history` for `session.userId`)

- [ ] **Step 1: Write failing tests in `tests/scoring.test.ts`**
Test `calculateCategorySummaries` & `calculateTotalXp` (e.g., Cat 1 = 150 XP with 1 passed / 1 failed = 150 XP; Cat 2 = 200 XP with 2 passed = 400 XP; Total = 550 XP), plus `POST /api/scores/toggle` rejecting unauthenticated requests (`401`) and inserting a `score_history` snapshot with `category_title`, `item_title`, `xp`, `passed`.

- [ ] **Step 2: Run `npx vitest run tests/scoring.test.ts` to verify failure**

- [ ] **Step 3: Implement `src/lib/scoring.ts` and API routes (`/api/scores`, `/api/scores/toggle`, `/api/history`)**

- [ ] **Step 4: Run `npx vitest run tests/scoring.test.ts` to verify pass**
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/lib/scoring.ts src/app/api/scores src/app/api/history tests/scoring.test.ts && git commit -m "feat: add scoring calculation, auto-save toggle API, and history API"`

---

### Task 5: User App Shell, Scoring Page (`/`) & History Page (`/history`)

**Files:**
- Create: `src/components/AppHeader.tsx`
- Create: `src/components/NavTabs.tsx`
- Create: `src/components/ScoringBoard.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/history/page.tsx`

**Interfaces:**
- Consumes: `GET /api/scores`, `POST /api/scores/toggle`, `GET /api/history`, `POST /api/auth/logout`
- Produces:
  - `AppHeader` props: `{ projectName: string; saveStatus: 'saved' | 'saving' | 'error'; username: string; groupName: string }`
  - Main scoring UI at `/` and history log UI at `/history`

- [ ] **Step 1: Implement `AppHeader` and `NavTabs`**
Top-left: `projectName`; Top-center: live `saveStatus` badge (`บันทึกแล้ว` / `กำลังบันทึก...` / `บันทึกไม่สำเร็จ`); Top-right: User icon button opening popover with `username`, `groupName`, and Logout button.

- [ ] **Step 2: Implement `ScoringBoard` and `/` (`src/app/page.tsx`)**
Display `groupName` as Head + total XP badge; render category boxes with earned category XP and sub-item `ผ่าน`/`ไม่ผ่าน` toggle buttons. Track in-flight toggle count (`pendingCount > 0 ? 'saving' : hasError ? 'error' : 'saved'`) so rapid clicks never desync status; optimistic update with rollback on error.

- [ ] **Step 3: Implement `/history` (`src/app/history/page.tsx`)**
Show chronological history cards/table for the logged-in user's group (timestamp in Thai locale, category, item, `ผ่าน`/`ไม่ผ่าน`, XP).

- [ ] **Step 4: Verify TypeScript & production build (`npm run build`)**
Expected: PASS with zero errors.

- [ ] **Step 5: Commit**
`git add src/components src/app/page.tsx src/app/history && git commit -m "feat: add scoring board UI, top status header, and user history page"`

---

### Task 6: Photo Evidence API & Page (`/photos`)

**Files:**
- Create: `src/lib/photo-validation.ts`
- Create: `src/app/api/photos/route.ts`
- Create: `src/app/api/photos/[id]/route.ts`
- Create: `src/app/photos/page.tsx`
- Test: `tests/photos.test.ts`

**Interfaces:**
- Consumes: `requireUserSession` (`src/lib/auth.ts`), `getSupabaseAdmin` (`src/lib/supabase-admin.ts`)
- Produces:
  - `validatePhotoUpload(file: { type: string; size: number }, title: string): { ok: true } | { ok: false; error: string }`
  - `GET /api/photos`, `POST /api/photos` (multipart form: `file`, `title`, optional `categoryId`)
  - `PATCH /api/photos/[id]` (rename `title`), `DELETE /api/photos/[id]` (verifies `user_id` ownership before deleting from Storage & DB)

- [ ] **Step 1: Write failing tests in `tests/photos.test.ts`**
Test `validatePhotoUpload`: rejects empty/whitespace title, rejects `application/pdf`, rejects size > 5 MB, accepts `image/jpeg` <= 5 MB with valid title. Test `DELETE /api/photos/[id]` returns `404`/`403` when photo belongs to another user.

- [ ] **Step 2: Run `npx vitest run tests/photos.test.ts` to verify failure**

- [ ] **Step 3: Implement `src/lib/photo-validation.ts` and `/api/photos` routes**

- [ ] **Step 4: Implement `/photos` (`src/app/photos/page.tsx`)**
Include camera capture (`<input type="file" accept="image/*" capture="environment">`), gallery upload, required photo title input, optional category dropdown, image preview, and group gallery with inline rename & delete.

- [ ] **Step 5: Run `npx vitest run tests/photos.test.ts` and `npm run build`**
Expected: PASS.

- [ ] **Step 6: Commit**
`git add src/lib/photo-validation.ts src/app/api/photos src/app/photos tests/photos.test.ts && git commit -m "feat: add photo evidence upload, validation, and gallery page"`

---

### Task 7: Admin API Routes (Users, Categories, Settings, Overview & CSV Export)

**Files:**
- Create: `src/app/api/admin/settings/route.ts`
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[id]/route.ts`
- Create: `src/app/api/admin/categories/route.ts`
- Create: `src/app/api/admin/categories/[id]/route.ts`
- Create: `src/app/api/admin/items/route.ts`
- Create: `src/app/api/admin/items/[id]/route.ts`
- Create: `src/app/api/admin/overview/route.ts`
- Create: `src/app/api/admin/export/route.ts`
- Test: `tests/admin-api.test.ts`

**Interfaces:**
- Consumes: `requireAdminSession`, `hashPassword` (`src/lib/auth.ts`), `calculateCategorySummaries`, `calculateTotalXp` (`src/lib/scoring.ts`), `getSupabaseAdmin` (`src/lib/supabase-admin.ts`)
- Produces: Admin CRUD endpoints + `GET /api/admin/overview` (all groups' scores, history, photos) + `GET /api/admin/export` (UTF-8 BOM CSV download)

- [ ] **Step 1: Write failing tests in `tests/admin-api.test.ts`**
Test: non-admin session gets `401` on `/api/admin/users`; duplicate `username` returns `409`; empty `groupName` returns `400`; `GET /api/admin/export` outputs valid CSV with UTF-8 BOM and group XP totals.

- [ ] **Step 2: Run `npx vitest run tests/admin-api.test.ts` to verify failure**

- [ ] **Step 3: Implement all Admin API routes**

- [ ] **Step 4: Run `npx vitest run tests/admin-api.test.ts` to verify pass**
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/app/api/admin tests/admin-api.test.ts && git commit -m "feat: add admin API routes for users, categories, overview, and CSV export"`

---

### Task 8: Admin Dashboard UI (`/admin`) & End-to-End Verification

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/UsersTab.tsx`
- Create: `src/components/admin/CategoriesTab.tsx`
- Create: `src/components/admin/OverviewTab.tsx`
- Create: `src/components/admin/PhotosTab.tsx`
- Create: `src/components/admin/SettingsTab.tsx`
- Create: `README.md` (setup instructions for Supabase SQL, Storage bucket, and `.env.local`)

**Interfaces:**
- Consumes: All `/api/admin/*` endpoints from Task 7

- [ ] **Step 1: Build Admin Dashboard `/admin` with 5 tabs**
  - `UsersTab`: Create/edit/toggle active/reset password for temporary users + group names
  - `CategoriesTab`: Create/edit/delete/reorder categories and sub-items with XP
  - `OverviewTab`: Summary table of all groups' XP, filterable history log, and "Export CSV" button
  - `PhotosTab`: View all evidence photos filtered by group
  - `SettingsTab`: Update `project_name`

- [ ] **Step 2: Write `README.md` with exact Supabase & Vercel setup steps**

- [ ] **Step 3: Run full test suite and production build**
Run: `npx vitest run && npm run build`
Expected: All Vitest suites PASS and Next.js build succeeds cleanly.

- [ ] **Step 4: Commit**
`git add src/app/admin src/components/admin README.md && git commit -m "feat: add admin dashboard UI and setup README"`
