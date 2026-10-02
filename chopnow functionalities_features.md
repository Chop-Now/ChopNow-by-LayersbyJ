---

## **1\. User & Access Management**

* User registration & login (email/phone, password, optional OAuth).

* Roles: consumer, business owner, business staff, rider, admin, support.

* Profile management: name, contact details, preferred language, notification settings.

* Multi-device sessions with JWT \+ refresh tokens and device tracking.

* KYC verification for businesses and (optionally) riders (ID, business docs, status).

---

## **2\. Business & Store Management**

- Business onboarding: create business profile, upload registration/tax docs, submit for KYC.

- Business profile: name, type (restaurant, bakery, supermarket, etc.), address, contact, logo.

- Geolocation: store latitude/longitude for map and “nearby” search.

- Business team management: invite staff, assign roles (manager/staff).

- Business status: active, suspended, verified; reasons and timestamps.

---

## **3\. Listings & Inventory (Surplus Food)**

- Create/edit/delete listings for surplus items or “rescue bags”.

- Live photo capture only (no gallery import), linked to listings.

- Listing attributes: title, description, category, allergens, dietary tags.

- Pricing: original price, rescue price, currency, discounts.

- Inventory: quantity available, quantity reserved, quantity remaining.

- Time windows: pickup start/end time, expiry time.

- Options: pickup-only or delivery-enabled, delivery radius in km.

- Listing states: draft, active, sold out, expired, paused, cancelled, archived.

- Visibility: featured listings, view counts, basic per-listing stats.

---

## **4\. Search, Discovery & Maps**

- Location-based search: find deals within radius (e.g. 5–10 km).

- Filters: category, price range, distance, rating, open now, pickup/delivery.

- Map view with listing pins and list view with sorting (distance, time, price).

- “New nearby deals” notifications based on user location and preferences.

---

## **5\. Orders & Checkout**

- Order creation from a listing with chosen quantity and pickup/delivery type.

- Order state machine: pending payment → paid → confirmed → in preparation → ready for pickup / out for delivery → completed / cancelled / refunded.

- Pickup code generation (numeric and/or QR) for verification at pickup.

- Address capture for delivery orders (geo-coded).

- Automatic inventory locking and adjustment on order creation/payment/cancellation.

- Order history views for consumers and businesses.

---

## **6\. Payments & Payouts**

- Multiple payment methods: cards (Stripe/Paystack/Flutterwave), mobile money (M‑Pesa, Airtel Money, MTN MoMo), optional cash on pickup.

- Payment flows: initiate → pending (3DS/STK/USSD) → success/failed via webhooks.

- Payment records: provider, method, status, amount, fees, references.

- Refund handling (full/partial) linked to orders.

- Commission calculation per order (platform fee, delivery fee, CSR allocation).

- Payouts to businesses on schedule (weekly/monthly) with statements and statuses.

---

## **7\. Delivery & Logistics**

- Two fulfillment modes: customer pickup or delivery via logistics partners.

- Logistics order creation for delivery type orders (pickup/dropoff locations).

- Integration with external logistics APIs (Sendy, Glovo, local couriers) for dispatch and tracking.

- Logistics states: requested, assigned, at pickup, in transit, delivered, cancelled, failed.

- Rider view (internal or via partner) to update status and location.

- Live tracking for consumers (ETA, current rider position).

---

## **8\. Media & Live Photo Verification**

- Media asset management for listing photos, business logos, KYC documents.

- Live camera capture enforcement for food listings (no gallery uploads).

- Storage of metadata: file size, mime type, dimensions, EXIF (timestamp, GPS).

- Flags for live capture, AI validation result, moderation status.

- S3 (or equivalent) object storage with signed URLs and optional CDN.

---

## **9\. Reviews, Ratings & Disputes**

- Post-order reviews (only after completed orders).

- Rating fields: overall rating; optional sub-ratings (food quality, freshness, value).

- Text feedback; verified purchase flag.

- Aggregation into business average rating and rating counts.

- Dispute/complaint creation for problematic orders (late, wrong item, bad quality, fraud).

- Dispute states: open, in review, resolved, escalated, closed; resolution type and amount.

---

## **10\. Notifications & Real-Time**

- Notification types: order placed/confirmed/ready/out for delivery/completed, payment status, new nearby deals, listing expiring, promotions

- Channels: push (mobile), in-app, email, SMS (configurable per user).

- Real-time updates via WebSocket/Socket.io for:
  - New orders (to businesses).

  - Order status changes (to consumers).

  - Rider tracking updates for delivery.

- Notification preferences stored per user.

---

## **11\. Impact & CSR Features**

- Per-order impact metrics:
  - Estimated food weight saved (kg).

  - Estimated meals rescued.

  - CO₂ equivalent avoided (kg).

- Per-user and per-business impact dashboards.

- Automatic CSR allocation: % of platform commission reserved for donations.

- NGO/charity management: partner profiles, verification status, focus area.

- CSR disbursements: pooled amounts paid periodically to NGOs, with tracking and reporting

---

## **12\. Admin, Analytics & Compliance**

- Admin console:
  - Manage users, businesses, listings, NGOs.

  - Approve/reject KYC and NGO applications.

  - View and handle disputes and support tickets.

- Analytics and reporting:
  - Orders, revenue, active users, active businesses.

  - Food waste reduction metrics (meals, weight, CO₂).

  - CSR allocations and NGO disbursements.

- Daily metrics aggregation table/view for fast dashboards.

- Audit logs for sensitive actions (KYC changes, suspensions, payouts).

- Logging and monitoring hooks (not in DB but required at architecture level).

---

This list can be used directly to derive:

- **Core entities**: User, Business, Listing, Order, Payment, LogisticsOrder, MediaAsset, Review, Dispute, NGO, ImpactMetric, CSRDisbursement, Notification, AuditLog.

- **Key relationships**: e.g., User–Business (owner/team), Business–Listing, Listing–Order, Order–Payment, Order–LogisticsOrder, Order–ImpactMetric, Order–Review/Dispute, ImpactMetric–NGO, NGO–CSRDisbursement.

- **Service boundaries**: Auth, Business, Listing, Order, Payment, Logistics, Media, Review, Notification, Impact/CSR, Admin/Analytics.
