/* eslint-disable no-console */
/**
 * Migration: Create all production indexes
 * Created: 2026-02-18
 *
 * Since autoIndex is disabled in production for startup performance,
 * this migration explicitly creates all schema-defined indexes.
 * Run once on first production deployment: npm run migrate
 */

module.exports = {
  async up(db) {
    console.log('Creating indexes for all collections...');

    // ── Users ──────────────────────────────────────────────
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true, name: 'email_unique' },
      { key: { googleId: 1 }, unique: true, sparse: true, name: 'googleId_unique' },
      { key: { phone: 1 }, unique: true, sparse: true, name: 'phone_unique' },
      { key: { 'addresses.location': '2dsphere' }, name: 'addresses_location_2dsphere' },
      { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
      { key: { roles: 1 }, name: 'roles' },
      { key: { activeRole: 1, status: 1 }, name: 'activeRole_status' },
      { key: { emailVerified: 1, status: 1 }, name: 'emailVerified_status' },
      { key: { 'stats.ordersCount': -1 }, name: 'stats_ordersCount' },
      { key: { verificationToken: 1 }, sparse: true, name: 'verificationToken' },
      { key: { resetPasswordToken: 1 }, sparse: true, name: 'resetPasswordToken' },
      { key: { otpCode: 1, otpExpires: 1 }, sparse: true, name: 'otpCode_otpExpires' },
    ]);
    console.log('  ✓ users');

    // ── Businesses ─────────────────────────────────────────
    await db.collection('businesses').createIndexes([
      { key: { location: '2dsphere' }, name: 'location_2dsphere' },
      { key: { name: 'text', description: 'text' }, name: 'text_search' },
      { key: { owner: 1 }, name: 'owner' },
      { key: { status: 1, type: 1 }, name: 'status_type' },
      { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
      { key: { 'verification.status': 1, createdAt: -1 }, name: 'verification_status_createdAt' },
      {
        key: { type: 1, status: 1, 'rating.average': -1 },
        name: 'type_status_rating',
      },
      { key: { 'stats.totalOrders': -1 }, name: 'stats_totalOrders' },
      { key: { 'metrics.mealsSaved': -1 }, name: 'metrics_mealsSaved' },
    ]);
    console.log('  ✓ businesses');

    // ── Listings ───────────────────────────────────────────
    await db.collection('listings').createIndexes([
      { key: { business: 1, status: 1 }, name: 'business_status' },
      { key: { business: 1, status: 1, createdAt: -1 }, name: 'business_status_createdAt' },
      {
        key: { 'timeWindow.availableFrom': 1, 'timeWindow.availableUntil': 1 },
        name: 'timeWindow',
      },
      { key: { status: 1, category: 1, createdAt: -1 }, name: 'status_category_createdAt' },
      { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
      {
        key: { category: 1, status: 1, 'pricing.price': 1 },
        name: 'category_status_price',
      },
      { key: { 'pricing.price': 1, status: 1 }, name: 'price_status' },
      { key: { 'inventory.quantity': 1, status: 1 }, name: 'inventory_status' },
      { key: { 'stats.views': -1 }, name: 'stats_views' },
      { key: { 'stats.orders': -1 }, name: 'stats_orders' },
      { key: { title: 'text', description: 'text' }, name: 'text_search' },
    ]);
    console.log('  ✓ listings');

    // ── Orders ─────────────────────────────────────────────
    await db.collection('orders').createIndexes([
      { key: { orderNumber: 1 }, unique: true, name: 'orderNumber_unique' },
      {
        key: { customer: 1, status: 1, createdAt: -1 },
        name: 'customer_status_createdAt',
      },
      {
        key: { business: 1, status: 1, createdAt: -1 },
        name: 'business_status_createdAt',
      },
      { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
      { key: { listing: 1, status: 1 }, name: 'listing_status' },
      { key: { 'payment.paymentStatus': 1, status: 1 }, name: 'payment_status' },
      {
        key: { fulfillmentType: 1, status: 1, createdAt: -1 },
        name: 'fulfillmentType_status_createdAt',
      },
      {
        key: { 'pickupDetails.pickupCode': 1 },
        sparse: true,
        name: 'pickupCode',
      },
      { key: { customer: 1, createdAt: -1 }, name: 'customer_createdAt' },
      { key: { business: 1, createdAt: -1 }, name: 'business_createdAt' },
      {
        key: { 'statusTimestamps.completedAt': -1 },
        sparse: true,
        name: 'completedAt',
      },
      { key: { 'pricing.total': -1, status: 1 }, name: 'pricing_total_status' },
    ]);
    console.log('  ✓ orders');

    // ── Reviews ────────────────────────────────────────────
    await db.collection('reviews').createIndexes([
      { key: { business: 1, status: 1, createdAt: -1 }, name: 'business_status_createdAt' },
      { key: { customer: 1, createdAt: -1 }, name: 'customer_createdAt' },
      { key: { business: 1, rating: -1, status: 1 }, name: 'business_rating_status' },
      { key: { rating: -1, status: 1, createdAt: -1 }, name: 'rating_status_createdAt' },
      {
        key: { 'businessResponse.respondedAt': -1 },
        sparse: true,
        name: 'businessResponse_respondedAt',
      },
    ]);
    console.log('  ✓ reviews');

    // ── Notifications ──────────────────────────────────────
    await db.collection('notifications').createIndexes([
      { key: { user: 1, read: 1, createdAt: -1 }, name: 'user_read_createdAt' },
      { key: { user: 1, type: 1, createdAt: -1 }, name: 'user_type_createdAt' },
      { key: { relatedOrder: 1 }, sparse: true, name: 'relatedOrder' },
      { key: { relatedBusiness: 1 }, sparse: true, name: 'relatedBusiness' },
      { key: { sent: 1, createdAt: -1 }, name: 'sent_createdAt' },
      { key: { read: 1, readAt: 1 }, name: 'read_readAt' },
    ]);
    console.log('  ✓ notifications');

    // ── Disputes ───────────────────────────────────────────
    await db.collection('disputes').createIndexes([
      {
        key: { status: 1, priority: -1, createdAt: -1 },
        name: 'status_priority_createdAt',
      },
      { key: { business: 1, status: 1, createdAt: -1 }, name: 'business_status_createdAt' },
      { key: { customer: 1, status: 1, createdAt: -1 }, name: 'customer_status_createdAt' },
      { key: { order: 1 }, name: 'order' },
      { key: { type: 1, status: 1, createdAt: -1 }, name: 'type_status_createdAt' },
      {
        key: { 'resolution.resolvedBy': 1, 'resolution.resolvedAt': -1 },
        sparse: true,
        name: 'resolution',
      },
    ]);
    console.log('  ✓ disputes');

    // ── Payouts ────────────────────────────────────────────
    await db.collection('payouts').createIndexes([
      {
        key: { business: 1, status: 1, createdAt: -1 },
        name: 'business_status_createdAt',
      },
      { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
      {
        key: { processedBy: 1, processedAt: -1 },
        sparse: true,
        name: 'processedBy_processedAt',
      },
      { key: { method: 1, status: 1 }, name: 'method_status' },
      { key: { amount: -1, status: 1 }, name: 'amount_status' },
    ]);
    console.log('  ✓ payouts');

    // ── Deliveries ─────────────────────────────────────────
    await db.collection('deliveries').createIndexes([
      {
        key: { 'pickupLocation.location': '2dsphere' },
        name: 'pickupLocation_2dsphere',
      },
      {
        key: { 'dropoffLocation.location': '2dsphere' },
        name: 'dropoffLocation_2dsphere',
      },
      { key: { currentLocation: '2dsphere' }, name: 'currentLocation_2dsphere' },
      { key: { rider: 1, status: 1, createdAt: -1 }, name: 'rider_status_createdAt' },
      { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
      {
        key: { 'statusTimestamps.deliveredAt': -1 },
        sparse: true,
        name: 'deliveredAt',
      },
      { key: { status: 1, rider: 1 }, sparse: true, name: 'status_rider' },
    ]);
    console.log('  ✓ deliveries');

    // ── Favorites ──────────────────────────────────────────
    await db.collection('favorites').createIndexes([
      {
        key: { user: 1, favoriteType: 1, listing: 1 },
        unique: true,
        sparse: true,
        name: 'user_type_listing_unique',
      },
      {
        key: { user: 1, favoriteType: 1, business: 1 },
        unique: true,
        sparse: true,
        name: 'user_type_business_unique',
      },
      { key: { user: 1, favoriteType: 1 }, name: 'user_favoriteType' },
    ]);
    console.log('  ✓ favorites');

    // ── Carts ──────────────────────────────────────────────
    await db.collection('carts').createIndexes([
      { key: { 'items.listing': 1 }, name: 'items_listing' },
      { key: { updatedAt: -1 }, name: 'updatedAt' },
    ]);
    console.log('  ✓ carts');

    console.log('\nAll indexes created successfully.');
  },

  async down(db) {
    // Drop custom indexes (unique indexes on fields are kept – dropping them could break data integrity)
    const collections = [
      'users',
      'businesses',
      'listings',
      'orders',
      'reviews',
      'notifications',
      'disputes',
      'payouts',
      'deliveries',
      'favorites',
      'carts',
    ];

    for (const col of collections) {
      try {
        // Drop all non-_id indexes
        const indexes = await db.collection(col).indexes();
        for (const idx of indexes) {
          if (idx.name !== '_id_') {
            await db.collection(col).dropIndex(idx.name);
          }
        }
        console.log(`  Dropped indexes: ${col}`);
      } catch (err) {
        console.warn(`  Could not drop indexes for ${col}: ${err.message}`);
      }
    }
  },
};
