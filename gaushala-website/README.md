# सर्व हितम सेवा गौशाला — वेबसाइट + Admin CMS

React + Vite + Tailwind CSS public website with a frontend-only Admin
Content Management Panel at `/admin`.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`), and
visit `/admin` for the CMS.

## Public site

| Route | Page | Reads from context |
| --- | --- | --- |
| `/` | Home (Hero + Stats) | `statistics` |
| `/about` | About | `siteInfo.about` |
| `/gau-mata` | Gau Mata | `cows` |
| `/gallery` | Gallery | `gallery` |
| `/donation` | Donation (info-only) | `donation` |
| `/contact` | Contact | `siteInfo` |

`TopBar`, `Navbar` (brand name only) and `Footer` also read from
`siteInfo` — their design/layout is unchanged, only the hardcoded strings
were replaced with context values.

## Admin panel — `/admin`

Login required. `/admin/login` is public; every other `/admin/*` route is
wrapped in `ProtectedRoute` (`src/admin/components/ProtectedRoute.jsx`),
which checks `AdminAuthContext` and redirects to `/admin/login` when not
logged in — including direct URL entry and browser back/forward.

Current admin authentication is **frontend/demo only** (see
`src/admin/authConfig.js` and `src/context/AdminAuthContext.jsx`) and must
be replaced with secure backend authentication before production. Demo
credentials (not shown in the UI):

```
Email:    admin@gaushala.local
Password: change-this-password
```

Login state is mirrored to `localStorage`, so it survives a refresh and
clears on Logout (sidebar → Logout).

- `/admin/login` — Admin Login (email/username, password with show/hide,
  validation, invalid-credentials message)
- `/admin` — Dashboard (summary cards + Reports summary/badge)
- `/admin/website-info` — गौशाला name, address, phone, email, WhatsApp,
  map link, about text
- `/admin/statistics` — add/edit/delete/enable-disable stat cards
- `/admin/gau-mata` — add/edit/delete cow records with photo upload
- `/admin/gallery` — add/edit/delete gallery photos with category
- `/admin/donation` — UPI ID, QR image, description, suggested amounts
- `/admin/reports` — 🚨 गौ माता problem reports submitted by public
  visitors: filter (All/New/Under Review/Resolved), search by cow name/ID
  or report ID, view details, change status, delete (with confirmation)

## गौ माता की समस्या बताएं (public problem reports)

On `/gau-mata`, every cow card has a "समस्या बताएं" button — no login
needed. It opens a modal with the cow already attached (name/photo shown,
never manually selected), a required problem description, an optional
photo upload (JPG/PNG/WebP, validated, with preview + remove), and
optional contact name/phone. On submit it's saved via
`src/context/ReportsContext.jsx` and a Hindi success message is shown.
Reports show up immediately in `/admin/reports` and on the Dashboard.

Each report stores a **snapshot** of the cow's name/photo at submit time
(plus its `cowId`), so editing or deleting that cow later doesn't corrupt
existing report history.

## Data architecture

Single source of truth: `src/context/DataContext.jsx`, seeded from
`src/data/defaultData.js` and persisted to `localStorage` via
`src/utils/storage.js`. Both the public site and `/admin` read/write the
same context — nothing is duplicated or hardcoded per-component.

**To connect a real backend later:** only `DataContext.jsx` needs to
change — swap each state update for an API call and keep the same
function signatures (`updateSiteInfo`, `addCow`, `deletePhoto`, etc.), so
no component that calls `useGaushalaData()` has to change.

`ImageUploadField` currently stores images as base64 strings; swap the
`FileReader` step for a real upload endpoint when one exists.

Reports have their own context/store, `src/context/ReportsContext.jsx`,
seeded from `defaultReports` in `src/data/defaultData.js` and persisted to
`localStorage` under the same `gaushala_admin:*` namespace (key
`reports`) via `src/utils/storage.js`. Same swap-in-place pattern applies:
replace `addReport` / `updateReportStatus` / `deleteReport` with API calls
and keep the signatures.

Admin login state lives in `src/context/AdminAuthContext.jsx`
(`localStorage` key `adminSession`, a boolean flag only — not a real
session token). To connect real auth: replace the check inside `login()`
with an API call that returns a token, store that token instead of the
boolean, and verify it server-side per request.

## Design tokens (see `tailwind.config.js`)

| Token | Role |
| --- | --- |
| `brown-*` | Primary identity color |
| `cream-*` | Warm section backgrounds |
| `pasture-*` | Green accent — donate button, active states |
| `marigold-*` | Small warm highlights |
| `font-display` | Tiro Devanagari Hindi — headings/brand |
| `font-sans` | Hind — body text, nav, buttons, forms |

## Intentionally not built

Real authentication, backend/database, file storage, payment gateway/
verification — all explicitly out of scope for this step. Default data
uses bracketed placeholders (`[GAUSHALA NAME]`, etc.) and empty lists,
never fake-looking numbers.
