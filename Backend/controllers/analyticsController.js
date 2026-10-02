const Order = require('../models/Order');
const Business = require('../models/Business');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Review = require('../models/Review');
const logger = require('../utils/logger');

/**
 * @desc    Get Platform Overview Stats (Admin)
 * @route   GET /api/analytics/platform/overview
 * @access  Private (Admin)
 */
const getPlatformOverview = async (req, res) => {
  try {
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 4 * 7);

    // Run all independent queries in parallel
    const [
      totalOrders,
      totalBusinesses,
      totalUsers,
      revenueResult,
      impactResult,
      weeklyImpactData,
      monthlyImpact,
      categoryImpact,
    ] = await Promise.all([
      Order.countDocuments(),
      Business.countDocuments(),
      User.countDocuments({ roles: { $in: ['consumer'] } }),
      // Real terminal status is 'completed' - 'delivered' isn't in the Order
      // status enum at all, so this always matched zero documents before.
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
      Business.aggregate([
        {
          $group: {
            _id: null,
            totalCo2Saved: { $sum: '$stats.impact.co2Saved' },
            totalMealsRescued: { $sum: '$stats.impact.mealsRescued' },
            totalWaterSaved: { $sum: '$stats.impact.waterSaved' },
          },
        },
      ]),
      // Meals rescued platform-wide, bucketed by week, so we can derive a real
      // week-over-week CO2e trend instead of splitting the running total into
      // made-up fractions.
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: fourWeeksAgo } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              week: {
                $floor: { $divide: [{ $subtract: [now, '$createdAt'] }, 7 * 24 * 60 * 60 * 1000] },
              },
            },
            meals: { $sum: { $ifNull: ['$items.quantity', 1] } },
          },
        },
      ]),
      // Real monthly meals/CO2e/water trend and category split, platform-wide -
      // replaces the old fully-hardcoded Monthly Impact Trend / Impact by
      // Category tables on the Platform Impact page.
      calculateMonthlyImpact(null, 'platform'),
      calculateCategoryImpact(null),
    ]);

    const weekMap = {};
    (weeklyImpactData || []).forEach((r) => {
      weekMap[r._id.week] = r.meals;
    });
    const weeklyImpact = [];
    for (let i = 3; i >= 0; i--) {
      const meals = weekMap[i] || 0;
      weeklyImpact.push({
        week: `Week ${4 - i}`,
        meals,
        co2Saved: Math.round(meals * IMPACT_FACTORS.CO2_PER_MEAL * 10) / 10,
      });
    }

    const totalMealsRescued = impactResult.length > 0 ? impactResult[0].totalMealsRescued : 0;

    res.json({
      overview: {
        totalOrders,
        totalBusinesses,
        totalUsers,
        totalRevenue: revenueResult.length > 0 ? revenueResult[0].total : 0,
      },
      impact:
        impactResult.length > 0
          ? {
              ...impactResult[0],
              totalFoodWasteSaved:
                Math.round(totalMealsRescued * IMPACT_FACTORS.AVG_MEAL_WEIGHT * 10) / 10,
            }
          : {
              totalCo2Saved: 0,
              totalMealsRescued: 0,
              totalWaterSaved: 0,
              totalFoodWasteSaved: 0,
            },
      weeklyImpact,
      monthlyImpact,
      categoryImpact,
    });
  } catch (error) {
    logger.error({ err: error }, 'Analytics error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get Business Overview Stats
 * @route   GET /api/analytics/business/overview
 * @access  Private (Business Owner/Manager)
 */
const getBusinessOverview = async (req, res) => {
  try {
    const business = await Business.findOne({ owner: req.user._id }).lean();
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Run independent aggregations in parallel
    const [
      weeklySales,
      topProductsIds,
      peakHoursData,
      customerOrderCounts,
      revenueData,
      monthlyRevenue,
      categoryBreakdown,
      monthlyImpact,
      categoryImpact,
      betterRankedBusinesses,
      fulfillmentFacet,
    ] = await Promise.all([
      // Real terminal status is 'completed' - 'delivered' isn't in the
      // Order status enum at all, so this (and topProductsIds below)
      // always matched zero documents before.
      Order.aggregate([
        {
          $match: {
            business: business._id,
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: { $week: '$createdAt' },
            sales: { $sum: '$pricing.total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { business: business._id, status: 'completed' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.listing',
            count: { $sum: '$items.quantity' },
            // orderItemSchema has no `price` field (that's why this was
            // silently always 0/undefined too) - `subtotal` already is
            // unitPrice * quantity, so no need to re-multiply by quantity.
            revenue: { $sum: '$items.subtotal' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      // Orders per hour-of-day over the last 30 days, for a real peak-hours chart
      Order.aggregate([
        { $match: { business: business._id, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            orders: { $sum: 1 },
          },
        },
      ]),
      // Distinct customers vs. customers with more than one completed order,
      // to compute a real returning-customer rate
      Order.aggregate([
        { $match: { business: business._id, status: 'completed' } },
        { $group: { _id: '$customer', orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { business: business._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } },
      ]),
      calculateMonthlyRevenue(business._id),
      calculateCategoryBreakdown(business._id),
      calculateMonthlyImpact(business._id, 'business'),
      calculateCategoryImpact(business._id),
      // Real platform rank: how many businesses have rescued more meals than this one
      Business.countDocuments({
        'stats.impact.mealsRescued': { $gt: business.stats?.impact?.mealsRescued || 0 },
      }),
      // Order fulfillment breakdown - real counts for the "Order Fulfillment
      // Status" chart, replacing the old fixed 85/10/5% placeholder.
      Order.aggregate([
        { $match: { business: business._id } },
        {
          $facet: {
            completed: [{ $match: { status: 'completed' } }, { $count: 'count' }],
            cancelled: [{ $match: { status: 'cancelled' } }, { $count: 'count' }],
            total: [{ $count: 'count' }],
          },
        },
      ]),
    ]);

    // Populate top product names — filter out any listings deleted since the order was placed
    const topProducts = await Listing.populate(topProductsIds, { path: '_id', select: 'title' });

    const peakHours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
    peakHoursData.forEach((r) => {
      if (r._id >= 0 && r._id < 24) peakHours[r._id].orders = r.orders;
    });

    const totalCustomers = customerOrderCounts.length;
    const returningCustomers = customerOrderCounts.filter((c) => c.orders > 1).length;
    const returningCustomerRate =
      totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 1000) / 10 : null;

    const completedOrders = revenueData[0]?.count || 0;
    const completedRevenue = revenueData[0]?.total || 0;
    const avgOrderValue = completedOrders > 0 ? Math.round(completedRevenue / completedOrders) : 0;

    // Real order-status split for the "Order Fulfillment Status" chart. No
    // "late delivery" status is tracked anywhere in the Order model, so this
    // reports Completed/Cancelled/In Progress rather than fabricating one.
    const fulfillmentTotal = fulfillmentFacet[0]?.total[0]?.count || 0;
    const fulfillmentCompleted = fulfillmentFacet[0]?.completed[0]?.count || 0;
    const fulfillmentCancelled = fulfillmentFacet[0]?.cancelled[0]?.count || 0;
    const fulfillmentInProgress = fulfillmentTotal - fulfillmentCompleted - fulfillmentCancelled;
    const pct = (n) => (fulfillmentTotal > 0 ? Math.round((n / fulfillmentTotal) * 1000) / 10 : 0);
    const fulfillmentBreakdown = {
      total: fulfillmentTotal,
      completed: { count: fulfillmentCompleted, percent: pct(fulfillmentCompleted) },
      cancelled: { count: fulfillmentCancelled, percent: pct(fulfillmentCancelled) },
      inProgress: { count: fulfillmentInProgress, percent: pct(fulfillmentInProgress) },
    };

    res.json({
      stats: business.stats,
      // business.stats doesn't track a running revenue total (only
      // balance/totalOrders/etc.) - compute it on-demand from completed
      // orders instead of leaving the frontend with nothing to show for
      // "Total Revenue" (see Phase 7 audit finding: this showed RWF 0 even
      // after a completed order, because the field never existed at all).
      revenue: completedRevenue,
      weeklyTrend: weeklySales,
      topProducts: topProducts
        .filter(
          (p) =>
            p._id !== null &&
            p._id !== undefined &&
            p._id.title !== null &&
            p._id.title !== undefined
        )
        .map((p) => ({
          name: p._id.title,
          sold: p.count,
          revenue: p.revenue,
        })),
      peakHours,
      returningCustomerRate,
      avgOrderValue,
      monthlyRevenue,
      categoryBreakdown,
      monthlyImpact,
      categoryImpact,
      platformRank: betterRankedBusinesses + 1,
      fulfillmentBreakdown,
    });
  } catch (error) {
    logger.error({ err: error }, 'Analytics error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get Impact Leaderboard
 * @route   GET /api/analytics/impact/leaderboard
 * @access  Public
 */
const getImpactLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Business.find({})
      .select('name stats.impact')
      .sort({ 'stats.impact.mealsRescued': -1 })
      .limit(10)
      .lean();

    res.json(leaderboard);
  } catch (error) {
    logger.error({ err: error }, 'Analytics error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * Environmental Impact Constants
 * Based on research data for food waste environmental impact
 */
const IMPACT_FACTORS = {
  CO2_PER_MEAL: 2.5, // kg CO2e saved per meal rescued
  WATER_PER_MEAL: 1000, // liters of water saved per meal
  AVG_MEAL_WEIGHT: 0.5, // average kg per meal for food waste calculation
};

/**
 * @desc    Get my impact (Consumer/Business)
 * @route   GET /api/analytics/impact/my
 * @access  Private
 */
const getMyImpact = async (req, res) => {
  try {
    const userRole = req.user.activeRole || req.user.role;

    if (userRole === 'consumer') {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Use $facet to get total impact, this month, and last month in a single aggregation
      const [impactResult, monthlyData] = await Promise.all([
        Order.aggregate([
          { $match: { customer: req.user._id, status: 'completed' } },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'listings',
              localField: 'items.listing',
              foreignField: '_id',
              as: 'listingInfo',
            },
          },
          {
            $addFields: {
              itemOriginalPrice: { $arrayElemAt: ['$listingInfo.pricing.originalPrice', 0] },
            },
          },
          {
            $facet: {
              totals: [
                {
                  $group: {
                    _id: null,
                    totalMeals: { $sum: { $ifNull: ['$items.quantity', 1] } },
                    totalSavings: {
                      $sum: {
                        $multiply: [
                          { $ifNull: ['$items.quantity', 1] },
                          {
                            $subtract: [
                              {
                                $ifNull: [
                                  '$itemOriginalPrice',
                                  { $multiply: ['$items.unitPrice', 2] },
                                ],
                              },
                              '$items.unitPrice',
                            ],
                          },
                        ],
                      },
                    },
                    ordersCount: { $addToSet: '$_id' },
                  },
                },
                {
                  $project: {
                    totalMeals: 1,
                    totalSavings: 1,
                    ordersCount: { $size: '$ordersCount' },
                  },
                },
              ],
              thisMonth: [
                { $match: { createdAt: { $gte: thisMonthStart } } },
                {
                  $group: {
                    _id: null,
                    meals: { $sum: { $ifNull: ['$items.quantity', 1] } },
                    ordersCount: { $addToSet: '$_id' },
                  },
                },
                {
                  $project: {
                    meals: 1,
                    ordersCount: { $size: '$ordersCount' },
                  },
                },
              ],
              lastMonth: [
                { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
                {
                  $group: {
                    _id: null,
                    meals: { $sum: { $ifNull: ['$items.quantity', 1] } },
                    ordersCount: { $addToSet: '$_id' },
                  },
                },
                {
                  $project: {
                    meals: 1,
                    ordersCount: { $size: '$ordersCount' },
                  },
                },
              ],
            },
          },
        ]),
        calculateMonthlyImpact(req.user._id, 'consumer'),
      ]);

      const totals = impactResult[0]?.totals[0] || {
        totalMeals: 0,
        totalSavings: 0,
        ordersCount: 0,
      };
      const thisMonthData = impactResult[0]?.thisMonth[0] || { meals: 0, ordersCount: 0 };
      const lastMonthData = impactResult[0]?.lastMonth[0] || { meals: 0, ordersCount: 0 };

      const totalMealsRescued = totals.totalMeals;
      const totalCo2Saved = totalMealsRescued * IMPACT_FACTORS.CO2_PER_MEAL;
      const totalWaterSaved = totalMealsRescued * IMPACT_FACTORS.WATER_PER_MEAL;
      const totalFoodWasteSaved = totalMealsRescued * IMPACT_FACTORS.AVG_MEAL_WEIGHT;
      const totalSavings = totals.totalSavings || 0;

      const thisMonthMeals = thisMonthData.meals;
      const lastMonthMeals = lastMonthData.meals;

      const mealsChange =
        lastMonthMeals > 0
          ? (((thisMonthMeals - lastMonthMeals) / lastMonthMeals) * 100).toFixed(1)
          : thisMonthMeals > 0
            ? 100
            : 0;

      res.json({
        mealsRescued: totalMealsRescued,
        co2Saved: Math.round(totalCo2Saved * 10) / 10,
        waterSaved: Math.round(totalWaterSaved),
        foodWasteSaved: Math.round(totalFoodWasteSaved * 10) / 10,
        moneySaved: Math.round(totalSavings),
        ordersCount: totals.ordersCount,
        monthlyData,
        comparison: {
          thisMonth: {
            meals: thisMonthMeals,
            co2: Math.round(thisMonthMeals * IMPACT_FACTORS.CO2_PER_MEAL * 10) / 10,
            orders: thisMonthData.ordersCount,
          },
          lastMonth: {
            meals: lastMonthMeals,
            co2: Math.round(lastMonthMeals * IMPACT_FACTORS.CO2_PER_MEAL * 10) / 10,
            orders: lastMonthData.ordersCount,
          },
          percentageChange: {
            meals: parseFloat(mealsChange),
            trend: parseFloat(mealsChange) >= 0 ? 'up' : 'down',
          },
        },
      });
    } else if (userRole === 'business_owner' || userRole === 'manager') {
      const business = await Business.findOne({ owner: req.user._id }).lean();
      if (!business) {
        return res.status(404).json({ message: 'Business not found' });
      }

      // Use aggregation instead of loading all orders into memory
      const [impactResult, monthlyData] = await Promise.all([
        Order.aggregate([
          { $match: { business: business._id, status: 'completed' } },
          { $unwind: '$items' },
          {
            $group: {
              _id: null,
              totalMeals: { $sum: { $ifNull: ['$items.quantity', 1] } },
              ordersCount: { $addToSet: '$_id' },
            },
          },
          {
            $project: {
              totalMeals: 1,
              ordersCount: { $size: '$ordersCount' },
            },
          },
        ]),
        calculateMonthlyImpact(business._id, 'business'),
      ]);

      const totals = impactResult[0] || { totalMeals: 0, ordersCount: 0 };
      const totalMealsRescued = totals.totalMeals;
      const totalCo2Saved = totalMealsRescued * IMPACT_FACTORS.CO2_PER_MEAL;
      const totalWaterSaved = totalMealsRescued * IMPACT_FACTORS.WATER_PER_MEAL;
      const totalFoodWasteSaved = totalMealsRescued * IMPACT_FACTORS.AVG_MEAL_WEIGHT;

      // Update business stats with real calculated values
      await Business.findByIdAndUpdate(business._id, {
        'stats.impact.co2Saved': totalCo2Saved,
        'stats.impact.mealsRescued': totalMealsRescued,
        'stats.impact.waterSaved': totalWaterSaved,
      });

      res.json({
        mealsRescued: totalMealsRescued,
        co2Saved: Math.round(totalCo2Saved * 10) / 10,
        waterSaved: Math.round(totalWaterSaved),
        foodWasteSaved: Math.round(totalFoodWasteSaved * 10) / 10,
        moneySaved: 0,
        ordersCount: totals.ordersCount,
        monthlyData,
      });
    } else {
      // Return empty stats for riders/admin to prevent app crash
      res.json({
        mealsRescued: 0,
        co2Saved: 0,
        waterSaved: 0,
        foodWasteSaved: 0,
        moneySaved: 0,
        ordersCount: 0,
        monthlyData: [],
      });
    }
  } catch (error) {
    logger.error({ err: error }, 'Analytics error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * Calculate monthly impact data for the last 12 months
 * @param {ObjectId} id - User ID or Business ID
 * @param {string} type - 'consumer' or 'business'
 * @returns {Array} Monthly impact data
 */
const calculateMonthlyImpact = async (id, type) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const now = new Date();

  // Calculate the start date (12 months ago)
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  // Build match filter
  const matchFilter = {
    status: 'completed',
    createdAt: { $gte: startDate },
  };
  if (type === 'consumer') {
    matchFilter.customer = id;
  } else if (type === 'business') {
    matchFilter.business = id;
  }
  // type === 'platform': no customer/business filter - aggregate across everyone

  // Single aggregation for all 12 months instead of 12 separate queries
  const results = await Order.aggregate([
    { $match: matchFilter },
    { $unwind: '$items' },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        meals: { $sum: { $ifNull: ['$items.quantity', 1] } },
        orderIds: { $addToSet: '$_id' },
      },
    },
    {
      $project: {
        _id: 1,
        meals: 1,
        orders: { $size: '$orderIds' },
      },
    },
  ]);

  // Build a lookup map from aggregation results (month is 1-indexed from $month)
  const resultMap = {};
  results.forEach((r) => {
    resultMap[`${r._id.year}-${r._id.month}`] = r;
  });

  // Build the 12-month array
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const monthNum = monthDate.getMonth() + 1; // 1-indexed to match $month
    const key = `${year}-${monthNum}`;
    const data = resultMap[key] || { meals: 0, orders: 0 };

    monthlyData.push({
      month: months[monthDate.getMonth()],
      year,
      meals: data.meals,
      co2: Math.round(data.meals * IMPACT_FACTORS.CO2_PER_MEAL * 10) / 10,
      water: Math.round(data.meals * IMPACT_FACTORS.WATER_PER_MEAL),
      orders: data.orders,
    });
  }

  return monthlyData;
};

/**
 * Calculate monthly revenue for the last 12 months.
 * @param {ObjectId} [businessId] - Restrict to one business; omit for platform-wide.
 * "profit" is the vendorAmount (what the vendor actually nets after the
 * platform fee) for a single business, or the platformFee (the platform's
 * actual cut) platform-wide - there is no cost-of-goods field to derive a
 * real margin from, so these are the closest real "profit" figures the data
 * model supports.
 * @returns {Array<{month: string, year: number, revenue: number, profit: number}>}
 */
const calculateMonthlyRevenue = async (businessId) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const matchFilter = {
    status: 'completed',
    createdAt: { $gte: startDate },
  };
  if (businessId) matchFilter.business = businessId;

  const results = await Order.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        revenue: { $sum: '$pricing.total' },
        profit: { $sum: businessId ? '$pricing.vendorAmount' : '$pricing.platformFee' },
        orders: { $sum: 1 },
      },
    },
  ]);

  const resultMap = {};
  results.forEach((r) => {
    resultMap[`${r._id.year}-${r._id.month}`] = r;
  });

  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const monthNum = monthDate.getMonth() + 1;
    const key = `${year}-${monthNum}`;
    const data = resultMap[key] || { revenue: 0, profit: 0, orders: 0 };

    monthlyData.push({
      month: months[monthDate.getMonth()],
      year,
      revenue: Math.round(data.revenue),
      profit: Math.round(data.profit),
      orders: data.orders,
    });
  }

  return monthlyData;
};

// Human-readable labels for the Listing.category enum.
const CATEGORY_LABELS = {
  'fruit-veg': 'Fruits & Veg',
  'baked-goods': 'Baked Goods',
  meals: 'Prepared Meals',
  dairy: 'Dairy & Eggs',
  meat: 'Meat & Seafood',
  beverages: 'Beverages',
  pantry: 'Pantry',
  other: 'Other',
};

/**
 * Break down completed-order revenue by listing category.
 * @param {ObjectId} [businessId] - Restrict to one business; omit for platform-wide.
 * @returns {Array<{category: string, name: string, revenue: number, percent: number}>}
 */
const calculateCategoryBreakdown = async (businessId) => {
  const matchFilter = { status: 'completed' };
  if (businessId) matchFilter.business = businessId;

  const results = await Order.aggregate([
    { $match: matchFilter },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'listings',
        localField: 'items.listing',
        foreignField: '_id',
        as: 'listingInfo',
      },
    },
    { $unwind: '$listingInfo' },
    {
      $group: {
        _id: '$listingInfo.category',
        revenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);

  return results
    .filter((r) => r.revenue > 0)
    .map((r) => ({
      category: r._id,
      name: CATEGORY_LABELS[r._id] || r._id || 'Other',
      revenue: Math.round(r.revenue),
      percent: totalRevenue > 0 ? Math.round((r.revenue / totalRevenue) * 1000) / 10 : 0,
    }));
};

/**
 * Break down completed-order meals rescued (and the CO2e/water this implies)
 * by listing category - the real-data equivalent of the old hardcoded
 * "Impact by Category" tables.
 * @param {ObjectId} [businessId] - Restrict to one business; omit for platform-wide.
 * @returns {Array<{category: string, name: string, meals: number, co2: number, water: number, percent: number}>}
 */
const calculateCategoryImpact = async (businessId) => {
  const matchFilter = { status: 'completed' };
  if (businessId) matchFilter.business = businessId;

  const results = await Order.aggregate([
    { $match: matchFilter },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'listings',
        localField: 'items.listing',
        foreignField: '_id',
        as: 'listingInfo',
      },
    },
    { $unwind: '$listingInfo' },
    {
      $group: {
        _id: '$listingInfo.category',
        meals: { $sum: { $ifNull: ['$items.quantity', 1] } },
      },
    },
    { $sort: { meals: -1 } },
  ]);

  const totalMeals = results.reduce((sum, r) => sum + r.meals, 0);

  return results
    .filter((r) => r.meals > 0)
    .map((r) => ({
      category: r._id,
      name: CATEGORY_LABELS[r._id] || r._id || 'Other',
      meals: r.meals,
      co2: Math.round(r.meals * IMPACT_FACTORS.CO2_PER_MEAL * 10) / 10,
      water: Math.round(r.meals * IMPACT_FACTORS.WATER_PER_MEAL),
      percent: totalMeals > 0 ? Math.round((r.meals / totalMeals) * 1000) / 10 : 0,
    }));
};

/**
 * @desc    Get Recent Platform Activity (Admin)
 * @route   GET /api/analytics/platform/activity
 * @access  Private (Admin)
 */
const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activities = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Run all 4 queries in parallel
    const [recentUsers, recentOrders, recentBusinesses, recentReviews] = await Promise.all([
      User.find({ createdAt: { $gte: sevenDaysAgo } })
        .select('firstName lastName activeRole createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.find({ createdAt: { $gte: sevenDaysAgo } })
        .select('orderNumber status pricing createdAt updatedAt customer')
        .populate('customer', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Business.find({ createdAt: { $gte: sevenDaysAgo } })
        .select('name type status createdAt')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Review.find({ createdAt: { $gte: sevenDaysAgo } })
        .select('rating comment createdAt customer business')
        .populate('customer', 'firstName lastName')
        .populate('business', 'name')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
    ]);

    recentUsers.forEach((user) => {
      // User has no `role` field - only `roles` (array) and `activeRole`.
      // This previously read `user.role`, which is always undefined, so
      // every entry here said "registered as a undefined" regardless of
      // the user's real role.
      const roleName = user.activeRole === 'business_owner' ? 'vendor' : user.activeRole;
      activities.push({
        id: `user-${user._id}`,
        type: 'user',
        title:
          user.activeRole === 'business_owner' ? 'New Vendor Registered' : 'New User Registered',
        description:
          `${user.firstName || ''} ${user.lastName || ''} has registered as a ${roleName}.`.trim(),
        timestamp: user.createdAt,
        icon: 'user',
      });
    });

    recentOrders.forEach((order) => {
      const customerName = order.customer
        ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
        : 'A customer';

      if (order.status === 'pending' || order.status === 'confirmed') {
        activities.push({
          id: `order-${order._id}`,
          type: 'order',
          title: 'New Order Placed',
          description: `Order ${order.orderNumber} placed by ${customerName} for RWF ${(order.pricing?.total || 0).toLocaleString()}.`,
          timestamp: order.createdAt,
          icon: 'order',
        });
      } else if (order.status === 'completed') {
        activities.push({
          id: `delivery-${order._id}`,
          type: 'delivery',
          title: 'Order Completed',
          description: `Order ${order.orderNumber} has been completed successfully.`,
          timestamp: order.updatedAt || order.createdAt,
          icon: 'delivery',
        });
      }
    });

    recentBusinesses.forEach((business) => {
      activities.push({
        id: `business-${business._id}`,
        type: 'business',
        title: business.status === 'approved' ? 'New Business Approved' : 'New Business Pending',
        description: `${business.name} (${business.type}) has been registered.`,
        timestamp: business.createdAt,
        icon: 'store',
      });
    });

    recentReviews.forEach((review) => {
      const customerName = review.customer
        ? `${review.customer.firstName || ''} ${review.customer.lastName || ''}`.trim()
        : 'A customer';
      activities.push({
        id: `review-${review._id}`,
        type: 'review',
        title: 'New Review Posted',
        description: `${customerName} left a ${review.rating}-star review for ${review.business?.name || 'a business'}.`,
        timestamp: review.createdAt,
        icon: 'star',
      });
    });

    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit to requested number
    const limitedActivities = activities.slice(0, limit);

    res.json({
      activities: limitedActivities,
      total: activities.length,
    });
  } catch (error) {
    logger.error({ err: error }, 'Analytics error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get User Activity Log (Admin)
 * @route   GET /api/analytics/user-activity
 * @access  Private (Admin)
 */
const getUserActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const timeRange = req.query.timeRange || '7days';

    // Calculate date filter
    let dateFilter = new Date();
    switch (timeRange) {
      case '24hours':
        dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const activities = [];

    // Run all 4 independent queries in parallel
    const [recentOrders, recentUsers, recentBusinesses, recentReviews] = await Promise.all([
      Order.find({ createdAt: { $gte: dateFilter } })
        .select('orderNumber status pricing createdAt customer business')
        .populate('customer', 'firstName lastName email avatar activeRole')
        .populate('business', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      User.find({ createdAt: { $gte: dateFilter } })
        .select('firstName lastName email avatar activeRole createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Business.find({ updatedAt: { $gte: dateFilter } })
        .select('name owner status createdAt updatedAt')
        .populate('owner', 'firstName lastName email avatar')
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),
      Review.find({ createdAt: { $gte: dateFilter } })
        .select('rating comment createdAt customer business order')
        .populate('customer', 'firstName lastName email avatar')
        .populate('business', 'name')
        .populate('order', 'orderNumber')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    recentOrders.forEach((order) => {
      if (order.customer) {
        activities.push({
          id: `order-${order._id}`,
          user: {
            name:
              `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() ||
              order.customer.email,
            email: order.customer.email,
            avatar:
              order.customer.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${order.customer.email}`,
            role:
              order.customer.activeRole === 'business_owner'
                ? 'vendor'
                : order.customer.activeRole || 'customer',
          },
          action: 'Placed a new order',
          details: `Order #${order.orderNumber} - ${order.business?.name || 'Unknown vendor'} - RWF ${(order.pricing?.total || 0).toLocaleString()}`,
          timestamp: order.createdAt,
          type: 'order',
        });
      }
    });

    recentUsers.forEach((user) => {
      activities.push({
        id: `registration-${user._id}`,
        user: {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          role: user.activeRole === 'business_owner' ? 'vendor' : user.activeRole || 'customer',
        },
        action: 'Account created',
        details: `New ${user.activeRole === 'business_owner' ? 'vendor' : user.activeRole} registration`,
        timestamp: user.createdAt,
        type: 'registration',
      });
    });

    recentBusinesses.forEach((business) => {
      if (business.owner) {
        activities.push({
          id: `business-${business._id}`,
          user: {
            name: business.name,
            email: business.owner.email,
            avatar:
              business.owner.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${business.name}`,
            role: 'vendor',
          },
          action:
            business.status === 'pending' ? 'Submitted verification' : 'Updated business profile',
          details:
            business.status === 'pending'
              ? 'Business documents uploaded for review'
              : 'Business information updated',
          timestamp: business.updatedAt,
          type: business.status === 'pending' ? 'verification' : 'update',
        });
      }
    });

    recentReviews.forEach((review) => {
      if (review.customer) {
        activities.push({
          id: `review-${review._id}`,
          user: {
            name:
              `${review.customer.firstName || ''} ${review.customer.lastName || ''}`.trim() ||
              review.customer.email,
            email: review.customer.email,
            avatar:
              review.customer.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.customer.email}`,
            role: 'customer',
          },
          action: 'Left a review',
          details: `${review.rating}-star review for ${review.business?.name || 'Unknown'}`,
          timestamp: review.createdAt,
          type: 'review',
        });
      }
    });

    // Sort all by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const paginatedActivities = activities.slice(skip, skip + limit);

    res.json({
      activities: paginatedActivities,
      total: activities.length,
      currentPage: page,
      totalPages: Math.ceil(activities.length / limit),
    });
  } catch (error) {
    logger.error({ err: error }, 'Analytics error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get Admin Dashboard Stats
 * @route   GET /api/analytics/admin/stats
 * @access  Private (Admin)
 */
const getAdminStats = async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Calculate week boundaries for weekly trends (last 8 weeks: 4 current + 4 previous)
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 8 * 7);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all independent aggregations in parallel
    const [
      userStats,
      businessStats,
      orderStats,
      revenueStats,
      impactStats,
      ratingData,
      weeklyTrendData,
      peakHoursData,
      monthlyRevenue,
      categoryBreakdown,
    ] = await Promise.all([
      // 1. User stats - single aggregation with $facet
      User.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            byRole: [
              { $unwind: { path: '$roles', preserveNullAndEmptyArrays: true } },
              { $group: { _id: '$roles', count: { $sum: 1 } } },
            ],
            thisMonth: [{ $match: { createdAt: { $gte: thisMonthStart } } }, { $count: 'count' }],
            lastMonth: [
              { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
              { $count: 'count' },
            ],
            thisWeek: [{ $match: { createdAt: { $gte: weekAgo } } }, { $count: 'count' }],
            lastWeek: [
              { $match: { createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } } },
              { $count: 'count' },
            ],
          },
        },
      ]),

      // 2. Business stats - single aggregation with $facet
      Business.aggregate([
        {
          $facet: {
            active: [{ $match: { status: 'active' } }, { $count: 'count' }],
            pending: [{ $match: { 'verification.status': 'pending' } }, { $count: 'count' }],
            thisMonth: [{ $match: { createdAt: { $gte: thisMonthStart } } }, { $count: 'count' }],
            lastMonth: [
              { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
              { $count: 'count' },
            ],
          },
        },
      ]),

      // 3. Order stats - single aggregation with $facet
      Order.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            completed: [{ $match: { status: 'completed' } }, { $count: 'count' }],
            pending: [
              {
                $match: {
                  status: {
                    $in: [
                      'pending_payment',
                      'paid',
                      'confirmed',
                      'ready_for_pickup',
                      'out_for_delivery',
                    ],
                  },
                },
              },
              { $count: 'count' },
            ],
            thisMonth: [{ $match: { createdAt: { $gte: thisMonthStart } } }, { $count: 'count' }],
            lastMonth: [
              { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
              { $count: 'count' },
            ],
          },
        },
      ]),

      // 4. Revenue stats - single aggregation with $facet
      Order.aggregate([
        { $match: { status: 'completed' } },
        {
          $facet: {
            total: [{ $group: { _id: null, total: { $sum: '$pricing.total' } } }],
            thisMonth: [
              { $match: { createdAt: { $gte: thisMonthStart } } },
              { $group: { _id: null, total: { $sum: '$pricing.total' } } },
            ],
            lastMonth: [
              { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
              { $group: { _id: null, total: { $sum: '$pricing.total' } } },
            ],
          },
        },
      ]),

      // 5. Impact stats - single aggregation with $facet (replaces loading all orders into memory)
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $unwind: '$items' },
        {
          $facet: {
            total: [
              {
                $group: {
                  _id: null,
                  totalMeals: { $sum: { $ifNull: ['$items.quantity', 1] } },
                },
              },
            ],
            thisMonth: [
              { $match: { createdAt: { $gte: thisMonthStart } } },
              {
                $group: {
                  _id: null,
                  totalMeals: { $sum: { $ifNull: ['$items.quantity', 1] } },
                },
              },
            ],
            lastMonth: [
              { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
              {
                $group: {
                  _id: null,
                  totalMeals: { $sum: { $ifNull: ['$items.quantity', 1] } },
                },
              },
            ],
          },
        },
      ]),

      // 6. Average rating
      Review.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),

      // 7. Weekly trends - single aggregation instead of 8 sequential countDocuments
      Order.aggregate([
        { $match: { createdAt: { $gte: eightWeeksAgo } } },
        {
          $group: {
            _id: {
              // Group by week number relative to now
              week: {
                $floor: { $divide: [{ $subtract: [now, '$createdAt'] }, 7 * 24 * 60 * 60 * 1000] },
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // 8. Orders per hour-of-day over the last 30 days, for a real peak-hours chart
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            orders: { $sum: 1 },
          },
        },
      ]),

      // 9. Platform-wide monthly revenue/profit for the last 12 months
      calculateMonthlyRevenue(null),

      // 10. Platform-wide sales-by-category breakdown
      calculateCategoryBreakdown(null),
    ]);

    const peakHours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
    (peakHoursData || []).forEach((r) => {
      if (r._id >= 0 && r._id < 24) peakHours[r._id].orders = r.orders;
    });

    // Extract user stats
    const userRoleMap = {};
    (userStats[0]?.byRole || []).forEach((r) => {
      userRoleMap[r._id] = r.count;
    });
    const totalUsers = userStats[0]?.total[0]?.count || 0;
    const consumers = userRoleMap['consumer'] || 0;
    const vendors = userRoleMap['business_owner'] || 0;
    const riders = userRoleMap['rider'] || 0;
    const usersThisMonth = userStats[0]?.thisMonth[0]?.count || 0;
    const usersLastMonth = userStats[0]?.lastMonth[0]?.count || 0;
    const newUsersThisWeek = userStats[0]?.thisWeek[0]?.count || 0;
    const newUsersLastWeek = userStats[0]?.lastWeek[0]?.count || 0;
    const weeklyChange = newUsersThisWeek - newUsersLastWeek;
    const usersPercentChange =
      usersLastMonth > 0
        ? (((usersThisMonth - usersLastMonth) / usersLastMonth) * 100).toFixed(1)
        : usersThisMonth > 0
          ? 100
          : 0;

    // Extract business stats
    const activeVendors = businessStats[0]?.active[0]?.count || 0;
    const pendingVendors = businessStats[0]?.pending[0]?.count || 0;
    const vendorsThisMonth = businessStats[0]?.thisMonth[0]?.count || 0;
    const vendorsLastMonth = businessStats[0]?.lastMonth[0]?.count || 0;
    const vendorsPercentChange =
      vendorsLastMonth > 0
        ? (((vendorsThisMonth - vendorsLastMonth) / vendorsLastMonth) * 100).toFixed(1)
        : vendorsThisMonth > 0
          ? 100
          : 0;

    // Extract order stats
    const totalOrders = orderStats[0]?.total[0]?.count || 0;
    const completedOrders = orderStats[0]?.completed[0]?.count || 0;
    const pendingOrders = orderStats[0]?.pending[0]?.count || 0;
    const ordersThisMonth = orderStats[0]?.thisMonth[0]?.count || 0;
    const ordersLastMonth = orderStats[0]?.lastMonth[0]?.count || 0;
    const ordersPercentChange =
      ordersLastMonth > 0
        ? (((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100).toFixed(1)
        : ordersThisMonth > 0
          ? 100
          : 0;

    // Extract revenue stats
    const totalRevenue = revenueStats[0]?.total[0]?.total || 0;
    const revenueThisMonth = revenueStats[0]?.thisMonth[0]?.total || 0;
    const revenueLastMonth = revenueStats[0]?.lastMonth[0]?.total || 0;
    const revenuePercentChange =
      revenueLastMonth > 0
        ? (((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1)
        : revenueThisMonth > 0
          ? 100
          : 0;

    // Extract impact stats
    const totalMealsRescued = impactStats[0]?.total[0]?.totalMeals || 0;
    const totalCo2Saved = totalMealsRescued * IMPACT_FACTORS.CO2_PER_MEAL;
    const mealsThisMonth = impactStats[0]?.thisMonth[0]?.totalMeals || 0;
    const mealsLastMonth = impactStats[0]?.lastMonth[0]?.totalMeals || 0;
    const co2ThisMonth = mealsThisMonth * IMPACT_FACTORS.CO2_PER_MEAL;
    const co2LastMonth = mealsLastMonth * IMPACT_FACTORS.CO2_PER_MEAL;
    const co2PercentChange =
      co2LastMonth > 0
        ? (((co2ThisMonth - co2LastMonth) / co2LastMonth) * 100).toFixed(1)
        : co2ThisMonth > 0
          ? 100
          : 0;

    // Extract rating data
    const avgRating = ratingData.length > 0 ? Math.round(ratingData[0].avgRating * 10) / 10 : 0;
    const reviewCount = ratingData.length > 0 ? ratingData[0].count : 0;

    // Build weekly trends from aggregation results
    const weekMap = {};
    (weeklyTrendData || []).forEach((r) => {
      weekMap[r._id.week] = r.count;
    });

    const weeklyTrends = [];
    for (let i = 3; i >= 0; i--) {
      weeklyTrends.push({
        name: `Week ${4 - i}`,
        thisMonth: weekMap[i] || 0,
        lastMonth: weekMap[i + 4] || 0,
      });
    }

    res.json({
      users: {
        total: totalUsers,
        consumers,
        vendors,
        riders,
        weeklyChange,
        thisMonth: usersThisMonth,
        lastMonth: usersLastMonth,
        percentChange: parseFloat(usersPercentChange),
        trend: parseFloat(usersPercentChange) >= 0 ? 'up' : 'down',
      },
      businesses: {
        active: activeVendors,
        pending: pendingVendors,
        thisMonth: vendorsThisMonth,
        lastMonth: vendorsLastMonth,
        percentChange: parseFloat(vendorsPercentChange),
        trend: parseFloat(vendorsPercentChange) >= 0 ? 'up' : 'down',
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        pending: pendingOrders,
        thisMonth: ordersThisMonth,
        lastMonth: ordersLastMonth,
        percentChange: parseFloat(ordersPercentChange),
        trend: parseFloat(ordersPercentChange) >= 0 ? 'up' : 'down',
      },
      revenue: {
        total: totalRevenue,
        thisMonth: revenueThisMonth,
        lastMonth: revenueLastMonth,
        percentChange: parseFloat(revenuePercentChange),
        trend: parseFloat(revenuePercentChange) >= 0 ? 'up' : 'down',
      },
      impact: {
        mealsRescued: totalMealsRescued,
        co2Saved: Math.round(totalCo2Saved * 10) / 10,
        co2ThisMonth: Math.round(co2ThisMonth * 10) / 10,
        co2LastMonth: Math.round(co2LastMonth * 10) / 10,
        percentChange: parseFloat(co2PercentChange),
        trend: parseFloat(co2PercentChange) >= 0 ? 'up' : 'down',
      },
      reviews: {
        avgRating,
        count: reviewCount,
      },
      weeklyTrends,
      peakHours,
      monthlyRevenue,
      categoryBreakdown,
    });
  } catch (error) {
    logger.error({ err: error }, 'Analytics error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  getPlatformOverview,
  getBusinessOverview,
  getImpactLeaderboard,
  getMyImpact,
  getRecentActivity,
  getUserActivity,
  getAdminStats,
};
