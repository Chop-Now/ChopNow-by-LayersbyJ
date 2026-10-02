# ChopNow — repo-wide notes

Surplus food rescue platform. This file holds facts that apply across **all**
three apps. Mobile-specific conventions live in `Mobile/CLAUDE.md` — read both
when working in `Mobile/`. Keep entries short and factual; update when
corrected.

## Layout

| Path        | What it is                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Backend/`  | Node/Express 5 + MongoDB (Mongoose) + Socket.IO API. `npm run dev` → port **5001** (5000 conflicts with macOS AirPlay Receiver). |
| `Frontend/` | React 19 + Vite 7 + Tailwind **v4** web app (`npm run dev`).                                                                     |
| `Mobile/`   | Flutter app, Riverpod + GoRouter (`flutter run`).                                                                                |

Root `package.json` is a thin wrapper: `npm run lint` lints Backend + Frontend,
`npm run format` runs Prettier repo-wide, Husky + lint-staged auto-format
`Backend/**/*.js` and `Frontend/**/*.{js,jsx}` on commit. Flutter code is not
covered by these — use `dart format` / `flutter analyze` for `Mobile/`.

All three apps share **one deployed backend** (Render:
`https://chopnow-backend.onrender.com`) and **one MongoDB Atlas database**, so
data created by anyone on any client shows up for everyone. The custom domain
`api.chopnow.app` is currently broken (points at a dead Vercel deployment) —
don't wire anything to it until DNS is repointed at Render.

## Brand colours

Source: ChopNow brand sheet. This is the canonical palette for web, mobile,
and any marketing surface. It **replaces** the old green/orange brand colours,
and also supersedes an earlier Cocoa/Chartreuse/Amber sheet — if you find those
names anywhere, they are stale.

| Name       | Hex       | Role                                                            |
| ---------- | --------- | --------------------------------------------------------------- |
| Moringa    | `#0F3D2E` | Primary dark green — dark surfaces/cards, primary text on light |
| Now Yellow | `#FFC531` | Accent — primary CTA, logo mark, "last call"/urgency pills      |
| Pepper     | `#E8552F` | Secondary accent red-orange — discounts, prices, "% OFF" badges |
| Fufu       | `#FAF3E4` | Warm off-white — default app background / light surface         |
| Char       | `#17150F` | Near-black — highest-contrast text, mono wordmark               |

### Backgrounds (layered, added after the sheet)

The sheet's Fufu-as-ground was replaced with a layered background scale. Fufu
is **not** the main ground any more:

| Token            | Hex       | Role                                                               |
| ---------------- | --------- | ------------------------------------------------------------------ |
| `scaffold`       | `#F6FFF9` | **Main page ground** — faint off-white green                       |
| `surface`        | `#FFFFFF` | Standard surface: cards, panels, pills, menus                      |
| `fufu`           | `#FAF3E4` | Secondary band colour, to separate a section from the ground       |
| `fufu-dim`       | `#F2EAD6` | Tertiary band, if a third level is ever needed                     |
| `surface-border` | `#E3EBE6` | Cool hairline on scaffold/surface (`fufu-border` reads warm there) |

Scaffold and surface are only 1.02:1 apart, so cards on the ground separate by
**shadow, not contrast** — don't remove the shadows expecting the fill to hold
the edge. Text contrast is marginally better on these than on Fufu:
`pepper-dark` reaches AA (4.58:1) on scaffold but is large-only (4.22:1) on
Fufu.

Applied on the homepage only. FAQ, Privacy Policy, and Terms of Service still
use Fufu as their page ground.

**Proportions (how much of each):** Fufu 58 / Moringa 26 / Yellow 10 /
Pepper 4 / Char 2. Fufu dominates as the ground, Moringa carries structure,
Yellow and Pepper are accents only — don't flood a screen with either.

Approved logo lockups: Moringa mark + Moringa wordmark on Fufu; Yellow mark +
Yellow wordmark on Moringa; Moringa on Yellow; two-tone "Chop" (Moringa) +
"Now" (Pepper) on Fufu; Char wordmark on Fufu. App icon tiles exist in
Moringa, Yellow, and Pepper.

### Contrast pairings — measured, not guessed

Never put **white on Yellow** (1.58:1). Yellow carries Moringa (7.69:1) or
Char (11.54:1).

**Pepper is the trap.** Nothing light passes AA on it at body size: white is
3.64:1, Fufu 3.29:1, Moringa 3.34:1. Only **Char on Pepper** (5.02:1) passes.
Use white/Fufu on Pepper for large display text only, never for badges or
small labels.

On Fufu: Moringa 11.00:1, Char 16.52:1, `moringa-muted` 5.89:1 all pass.
Pepper on Fufu is 3.29:1 — large text only (prices, display headlines).
Fufu on Moringa is 11.00:1.

### Where colours live

- Web tokens: `@theme` block at the top of `Frontend/src/index.css`.
- **The ~500 legacy call sites were not rewritten.** Instead the legacy token
  names now resolve to brand values, so every page renders on-brand:
  `--color-solid` → Moringa, `--color-tertiary` → moringa-dark,
  `--color-solidOne` → Pepper, `--color-solidTwo` → Now Yellow,
  `--color-textColor` → Char, `--color-primary` → scaffold (hex unchanged).
  Prefer the brand names in new work, but the legacy names are safe.
- Mobile tokens: `Mobile/lib/core/theme/app_colors.dart` (+ `app_theme.dart`)
  — migrated to the brand palette; see `Mobile/CLAUDE.md`.
- Keep semantic colours (success / warning / error / info) distinct from brand
  colours. Moringa is a green: it must not become the success colour, and
  Pepper is close enough to a danger red that error states need a cooler,
  deeper red to stay distinguishable.

### Buttons

Primary CTAs are **Moringa with Fufu/white text** — not Now Yellow. The one
exception is a CTA sitting _on_ a Moringa panel (the auth split-screens), where
a Moringa fill is invisible; those use Now Yellow with Char text (11.5:1).

### Known trap: `--color-gray-50`

`--color-gray-50: #8a8a8a` in the legacy block **overwrites Tailwind's
built-in `gray-50`** (near-white `#f9fafb`). Any `bg-gray-50` therefore paints
mid-grey, which reads as a dark overlay on the page. This bit Privacy Policy
and Terms of Service (now fixed) and is still live in ~12 files, including
`ErrorBoundary` as a full-screen background. The real fix is renaming that
token to something outside Tailwind's scale.

## Secrets / PII (all apps)

- Never commit `.env`; never log raw email, phone, password, token, OTP, or
  payment details anywhere in any app.
- Payments run through pawaPay (MTN MoMo / Airtel Money, Rwanda). No card
  numbers or MoMo PINs ever touch our code — pawaPay handles collection.
- Uploads go to Cloudinary through the backend (multer in memory, never to
  disk).
