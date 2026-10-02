const axios = require('axios');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

// Load models
const User = require('../models/User');
const Business = require('../models/Business');
const Listing = require('../models/Listing');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

const MONGO_URI = process.env.MONGO_URI;
const API_URL = 'http://localhost:5000/api/v1';

async function runPaymentCallbackTest() {
  console.log('🏁 Starting ChopNow Payment Webhook Callback Verification...');

  if (!MONGO_URI) {
    console.error('❌ MONGO_URI is not set in environment variables.');
    process.exit(1);
  }

  // Connect to DB
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB successfully.');

  let testCustomer;
  let testVendor;

  try {
    // ──────── PREPARATION ────────
    // 1. Get or create a test customer
    testCustomer = await User.findOne({ email: 'payment_tester@chopnow.app' });
    if (!testCustomer) {
      testCustomer = await User.create({
        email: 'payment_tester@chopnow.app',
        passwordHash: '$2b$10$U.F5lW12o16vPjX0Y9/49.kHn7G9jJ9O6n7kHn7G9jJ9O6n7kHn7G',
        firstName: 'Payment',
        lastName: 'Tester',
        phone: '250780000000',
        roles: ['consumer'],
        activeRole: 'consumer',
        emailVerified: true,
      });
    }

    // 2. Get or create a test vendor
    testVendor = await User.findOne({ email: 'payment_vendor@chopnow.app' });
    if (!testVendor) {
      testVendor = await User.create({
        email: 'payment_vendor@chopnow.app',
        passwordHash: '$2b$10$U.F5lW12o16vPjX0Y9/49.kHn7G9jJ9O6n7kHn7G9jJ9O6n7kHn7G',
        firstName: 'Payment',
        lastName: 'Vendor',
        phone: '250780000001',
        roles: ['business_owner'],
        activeRole: 'business_owner',
        emailVerified: true,
      });
    }

    // 3. Get or create a test business
    let testBusiness = await Business.findOne({ name: 'Payment Test Kitchen' });
    if (!testBusiness) {
      testBusiness = await Business.create({
        owner: testVendor._id,
        name: 'Payment Test Kitchen',
        type: 'restaurant',
        description: 'Testing ChopNow mobile money payments integration.',
        contact: { email: 'payment_vendor@chopnow.app', phone: '250780000001' },
        address: {
          street: 'KG 456 Ave',
          city: 'Kigali',
          location: { type: 'Point', coordinates: [30.06, -1.95] },
        },
        status: 'active',
        verification: { status: 'approved' },
      });
    }

    // 4. Get or create a test listing
    let testListing = await Listing.findOne({ title: 'Webhook Test Meal' });
    if (testListing) {
      // Reset inventory values for predictability
      testListing.inventory = { quantity: 20, reserved: 0 };
      await testListing.save();
    } else {
      testListing = await Listing.create({
        business: testBusiness._id,
        title: 'Webhook Test Meal',
        description: 'A delicious test meal reserved for webhook callbacks.',
        category: 'meals',
        pricing: { originalPrice: 4000, price: 1500 },
        inventory: { quantity: 20, reserved: 0 },
        timeWindow: {
          availableFrom: new Date(),
          availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        status: 'active',
      });
    }

    console.log(
      `ℹ️ Test Listing: ${testListing.title} | Stock: ${testListing.inventory.quantity} | Reserved: ${testListing.inventory.reserved}`
    );

    // ──────── TEST CASE 1: SUCCESSFUL PAYMENT CALLBACK ────────
    console.log('\n==================================================');
    console.log('🧪 TEST CASE 1: SUCCESSFUL PAYMENT CALLBACK (COMPLETED)');
    console.log('==================================================');

    // Create an order
    const order1Number = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const itemQuantity1 = 2;
    const order1Total = 3000;

    // Manually reserve inventory
    testListing.inventory.quantity -= itemQuantity1;
    testListing.inventory.reserved += itemQuantity1;
    await testListing.save();

    const order1 = await Order.create({
      orderNumber: order1Number,
      customer: testCustomer._id,
      business: testBusiness._id,
      listing: testListing._id,
      items: [
        {
          listing: testListing._id,
          title: 'Webhook Test Meal',
          quantity: itemQuantity1,
          unitPrice: 1500,
          subtotal: order1Total,
        },
      ],
      pricing: {
        subtotal: order1Total,
        deliveryFee: 0,
        total: order1Total,
        currency: 'RWF',
      },
      fulfillmentType: 'pickup',
      status: 'pending_payment',
      payment: {
        paymentMethod: 'mobile_money',
        paymentStatus: 'pending',
      },
    });

    console.log(`✅ Order 1 Created: ${order1.orderNumber} (Status: ${order1.status})`);

    // Create a pending Payment record
    const depositId1 = crypto.randomUUID();
    const payment1 = await Payment.create({
      order: order1._id,
      depositId: depositId1,
      amount: order1Total,
      currency: 'RWF',
      payerPhoneNumber: '250780000000',
      correspondent: 'MTN_MOMO_RWA',
      status: 'pending',
    });

    console.log(`✅ Payment 1 Created: depositId = ${depositId1} (Status: ${payment1.status})`);

    // Trigger webhook callback via Axios
    console.log('📡 Sending simulated webhook callback (COMPLETED) to Server...');
    const webhookPayload1 = {
      depositId: depositId1,
      status: 'COMPLETED',
      providerTransactionId: 'MOMO-TX-998877',
      customerTimestamp: new Date().toISOString(),
    };

    const response1 = await axios.post(`${API_URL}/payments/webhook`, webhookPayload1);
    console.log(`ℹ️ Server response: Status ${response1.status}, data:`, response1.data);

    // Fetch updated documents
    const updatedOrder1 = await Order.findById(order1._id);
    const updatedPayment1 = await Payment.findById(payment1._id);
    const updatedListing1 = await Listing.findById(testListing._id);

    console.log('\n🔎 Verification results for Test Case 1:');
    console.log(`   - Order Status (Expected: 'paid'): '${updatedOrder1.status}'`);
    console.log(
      `   - Order Payment Status (Expected: 'completed'): '${updatedOrder1.payment.paymentStatus}'`
    );
    console.log(`   - Payment Record Status (Expected: 'completed'): '${updatedPayment1.status}'`);
    console.log(
      `   - Payment Transaction ID (Expected: 'MOMO-TX-998877'): '${updatedPayment1.providerTransactionId}'`
    );
    console.log(
      `   - Listing Inventory Quantity (Expected: 18): ${updatedListing1.inventory.quantity}`
    );
    console.log(
      `   - Listing Inventory Reserved (Expected: 2): ${updatedListing1.inventory.reserved}`
    );

    if (
      updatedOrder1.status === 'paid' &&
      updatedOrder1.payment.paymentStatus === 'completed' &&
      updatedPayment1.status === 'completed' &&
      updatedPayment1.providerTransactionId === 'MOMO-TX-998877' &&
      updatedListing1.inventory.quantity === 18 &&
      updatedListing1.inventory.reserved === 2
    ) {
      console.log('🟢 TEST CASE 1 PASSED SUCCESSFULLY!');
    } else {
      throw new Error('❌ TEST CASE 1 FAILED: Unexpected values in database.');
    }

    // ──────── TEST CASE 2: FAILED PAYMENT CALLBACK ────────
    console.log('\n==================================================');
    console.log('🧪 TEST CASE 2: FAILED PAYMENT CALLBACK (FAILED)');
    console.log('==================================================');

    // Create an order
    const order2Number = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const itemQuantity2 = 3;
    const order2Total = 4500;

    // Manually reserve inventory (subtract 3 from active stock, add 3 to reserved)
    updatedListing1.inventory.quantity -= itemQuantity2;
    updatedListing1.inventory.reserved += itemQuantity2;
    await updatedListing1.save();

    const order2 = await Order.create({
      orderNumber: order2Number,
      customer: testCustomer._id,
      business: testBusiness._id,
      listing: testListing._id,
      items: [
        {
          listing: testListing._id,
          title: 'Webhook Test Meal',
          quantity: itemQuantity2,
          unitPrice: 1500,
          subtotal: order2Total,
        },
      ],
      pricing: {
        subtotal: order2Total,
        deliveryFee: 0,
        total: order2Total,
        currency: 'RWF',
      },
      fulfillmentType: 'pickup',
      status: 'pending_payment',
      payment: {
        paymentMethod: 'mobile_money',
        paymentStatus: 'pending',
      },
    });

    console.log(`✅ Order 2 Created: ${order2.orderNumber} (Status: ${order2.status})`);

    // Create a pending Payment record
    const depositId2 = crypto.randomUUID();
    const payment2 = await Payment.create({
      order: order2._id,
      depositId: depositId2,
      amount: order2Total,
      currency: 'RWF',
      payerPhoneNumber: '250780000000',
      correspondent: 'MTN_MOMO_RWA',
      status: 'pending',
    });

    console.log(`✅ Payment 2 Created: depositId = ${depositId2} (Status: ${payment2.status})`);

    // Trigger webhook callback via Axios
    console.log('📡 Sending simulated webhook callback (FAILED) to Server...');
    const webhookPayload2 = {
      depositId: depositId2,
      status: 'FAILED',
      failureReason: {
        code: 'PAYER_LIMIT_REACHED',
        description: 'The payer has reached their maximum transaction limit',
      },
      customerTimestamp: new Date().toISOString(),
    };

    const response2 = await axios.post(`${API_URL}/payments/webhook`, webhookPayload2);
    console.log(`ℹ️ Server response: Status ${response2.status}, data:`, response2.data);

    // Fetch updated documents
    const updatedOrder2 = await Order.findById(order2._id);
    const updatedPayment2 = await Payment.findById(payment2._id);
    const updatedListing2 = await Listing.findById(testListing._id);

    console.log('\n🔎 Verification results for Test Case 2:');
    console.log(`   - Order Status (Expected: 'cancelled'): '${updatedOrder2.status}'`);
    console.log(
      `   - Order Payment Status (Expected: 'failed'): '${updatedOrder2.payment.paymentStatus}'`
    );
    console.log(`   - Payment Record Status (Expected: 'failed'): '${updatedPayment2.status}'`);
    console.log(
      `   - Payment Failure Code (Expected: 'PAYER_LIMIT_REACHED'): '${updatedPayment2.failureReason?.code}'`
    );
    console.log(
      `   - Listing Inventory Quantity (Expected: 18 - returned to active): ${updatedListing2.inventory.quantity}`
    );
    console.log(
      `   - Listing Inventory Reserved (Expected: 2 - released reservation): ${updatedListing2.inventory.reserved}`
    );

    if (
      updatedOrder2.status === 'cancelled' &&
      updatedOrder2.payment.paymentStatus === 'failed' &&
      updatedPayment2.status === 'failed' &&
      updatedPayment2.failureReason?.code === 'PAYER_LIMIT_REACHED' &&
      updatedListing2.inventory.quantity === 18 &&
      updatedListing2.inventory.reserved === 2
    ) {
      console.log('🟢 TEST CASE 2 PASSED SUCCESSFULLY!');
    } else {
      throw new Error('❌ TEST CASE 2 FAILED: Unexpected values in database.');
    }

    console.log('\n🎉 ALL PAYMENT WEBHOOK CALLBACK VERIFICATION TESTS PASSED!');
    console.log('   ChopNow integration perfectly handles pawaPay transactions,');
    console.log('   manages order states, and handles listing stock reservations.');
  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:');
    console.error(error);
  } finally {
    // Cleanup test records
    console.log('\n🧹 Cleaning up test records...');
    await Payment.deleteMany({ payerPhoneNumber: '250780000000' });
    await Order.deleteMany({ customer: testCustomer?._id });
    await Listing.deleteMany({ title: 'Webhook Test Meal' });
    console.log('✅ Cleanup complete.');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

runPaymentCallbackTest();
