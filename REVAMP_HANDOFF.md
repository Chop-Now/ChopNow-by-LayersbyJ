# ChopNow by LayersbyJ: UI revamp handoff

Living progress log for the web UI revamp. Updated and pushed after every
finished step, so any agent can pick up exactly where the last one stopped.

## The job

1. This repo is a full copy of `Chop-Now/chopnow` at commit `3f1ca98`
   (Backend, Frontend, Mobile, docs). Work happens ONLY in this repo
   (`J0SHUALU/chopnow-by-layersbyj`). Never push to `Chop-Now/chopnow`.
2. Replace the UI of the React web app in `Frontend/` with the revamped
   "tile" design: the landing page (`/`, `Pages/Home.jsx`) and the web app
   pages (shop, product, cart, orders, profile, auth, etc.).
3. Backend and Mobile (Flutter) are copied as is. Do not change them.

## The revamped design system (source of truth)

Reference: the "ChopNow Website Revamp" design canvas (desktop 1440 +
mobile 390) and Carousel B in `ChopNow Partner Carousel.afdesign`.

- **Layout:** flat colour TILES on a strict grid. Tiles sit edge to edge, no
  gaps, no rounded corners, no drop shadows. Section = row of tiles.
- **Type:**
  - Display: `Anton` (Google Fonts), uppercase, tight leading 0.86 to 0.9.
  - Body/UI: `Geist` 400/500/600/700.
  - Labels/eyebrows/meta: `Geist Mono` 500, uppercase, letter-spacing 0.08em.
  - Wordmark: `Poppins` 800 ("ChopNow").
- **Colours:** Moringa `#0F3D2E`, Now Yellow `#FFC531`, Pepper `#E8552F`,
  Fufu `#FAF3E4`, Char `#17150F`, plus tile tints Lime `#B9E07A`,
  Peach `#F7C4A5`, Mint `#CFE3D6`, Clay `#9E2F14`, Moringa-2 `#1A4D3B`,
  Hairline `#E6DCC6`.
- **Illustrations:** cut-paper vector shapes (fork, spoon, chilli, bread,
  leaf, pin, plate/tomato, bag, phone, C mark) cropped by the tile edge,
  each with 1 to 3 thin highlight strokes in a tint of the tile colour.
  All live in `Frontend/src/Components/brand/Illustrations.jsx`.
- **Buttons:** square, solid. Yellow fill + Moringa text on dark tiles;
  Moringa fill + Fufu text on light tiles. Outline variant = 2px border.
- **Contrast rules from CLAUDE.md still apply** (no white on Yellow, only
  large text on Pepper, Char on Pepper for small text).

## Dos

- Do keep every API call, route, context, service and business rule exactly
  as it is. This is a UI swap, not a logic rewrite.
- Do reuse the shared pieces in `Frontend/src/Components/brand/` (Tile,
  Button, Eyebrow, Display, Illustrations) instead of one-off styles.
- Do check every page at 390px and 1440px.
- Do run `npm run build` and `npm run lint` in `Frontend/` before each push.
- Do commit small and push after each finished page, and update the
  checklist below in the same commit.

## Don'ts

- Don't touch `Backend/` or `Mobile/`.
- Don't rename routes, props, service functions or context keys.
- Don't add rounded-xl cards, shadows, gradients or emoji.
- Don't use em dashes in any copy.
- Don't commit `.env` or any secret.
- Don't push to the original `Chop-Now/chopnow` repo.

## Checklist

Legend: [x] done and pushed, [~] in progress, [ ] not started

- [x] Create private repo `J0SHUALU/chopnow-by-layersbyj`
- [x] Copy full ChopNow codebase (commit `7430f34`)
- [x] Frontend installs and builds before any change
- [ ] Design tokens + fonts in `Frontend/src/index.css`
- [ ] Brand kit: `Components/brand/` (Tile, Button, Eyebrow, Display, Illustrations)
- [ ] Navbar (landing) + PageNavbar (app) + Footer
- [ ] Landing page `Pages/Home.jsx` and its sections
- [ ] Shop + CategoryPage + ProductCard + ShopSidebar
- [ ] ProductDetails
- [ ] Cart + payment modal
- [ ] Login, SignUp, ForgotPassword, VerifyEmail, AdminLogin
- [ ] MyOrders, MyImpact, MyProfile, Notification
- [ ] BusinessVerification, PendingReview, RiderRegistration, RiderDashboard
- [ ] FAQ, ContactUs, Terms, Privacy, NotFound, Maintenance, ErrorBoundary
- [ ] Admin dashboard shell (sidebar/header) restyle
- [ ] Final pass: 390px + 1440px check, build, lint, push

## Log

- 2026-10-02: Repo created, codebase imported, baseline build passes.
