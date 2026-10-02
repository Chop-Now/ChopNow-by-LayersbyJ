/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Business = require('./models/Business');
const Listing = require('./models/Listing');
const bcrypt = require('bcrypt');

// Prevent running seeds in production
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Seeding is disabled in production. Set NODE_ENV to development or test.');
  process.exit(1);
}

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `Connected to MongoDB for seeding (env: ${process.env.NODE_ENV || 'development'})...`
    );

    // Clear existing data
    await User.deleteMany({});
    await Business.deleteMany({});
    await Listing.deleteMany({});
    console.log('Cleared existing data.');

    // Create Consumers
    const consumerPassword = await bcrypt.hash('Consumer123!', 12);
    const consumers = await User.create([
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'consumer@example.com',
        phone: '+250794758542',
        passwordHash: consumerPassword,
        roles: ['consumer'],
        activeRole: 'consumer',
        emailVerified: true,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+250700000002',
        passwordHash: consumerPassword,
        roles: ['consumer'],
        activeRole: 'consumer',
        emailVerified: true,
      },
    ]);
    console.log(`Created ${consumers.length} consumers.`);

    // Create Business Owners and Businesses
    const ownerPassword = await bcrypt.hash('Owner123!', 12);
    const owner1 = await User.create({
      firstName: 'Alice',
      lastName: 'Baker',
      email: 'bakery@example.com',
      phone: '+250700000003',
      passwordHash: ownerPassword,
      roles: ['consumer', 'business_owner'],
      activeRole: 'business_owner',
      emailVerified: true,
    });

    const bakery = await Business.create({
      owner: owner1._id,
      name: 'Kigali Fresh Bakery',
      type: 'bakery',
      description: 'The best fresh bread in town, now rescuing surplus!',
      contact: { email: 'contact@kigalibakery.com', phone: '+250700000003' },
      address: {
        street: 'KG 14 Ave',
        city: 'Kigali',
        location: { type: 'Point', coordinates: [30.0619, -1.9441] }, // Example coords
      },
      verification: {
        status: 'approved',
      },
      status: 'active',
    });

    const owner2 = await User.create({
      firstName: 'Bob',
      lastName: 'Cook',
      email: 'restaurant@example.com',
      phone: '+250700000004',
      passwordHash: ownerPassword,
      roles: ['consumer', 'business_owner'],
      activeRole: 'business_owner',
      emailVerified: true,
    });

    const restaurant = await Business.create({
      owner: owner2._id,
      name: 'Spicy Rwanda',
      type: 'restaurant',
      description: 'Authentic Rwandan cuisine.',
      contact: { email: 'info@spicyrwanda.com', phone: '+250700000004' },
      address: {
        street: 'KN 3 Rd',
        city: 'Kigali',
        location: { type: 'Point', coordinates: [30.0588, -1.9495] },
      },
      verification: {
        status: 'approved',
      },
      status: 'active',
    });
    console.log('Created businesses.');

    // Create Rider
    const riderPassword = await bcrypt.hash('Rider123!', 12);
    const rider1 = await User.create({
      firstName: 'Robert',
      lastName: 'Rider',
      email: 'rider@example.com',
      phone: '+250700000005',
      passwordHash: riderPassword,
      roles: ['consumer', 'rider'],
      activeRole: 'rider',
      riderStatus: 'approved',
      riderDetails: {
        vehicleType: 'motorcycle',
        licensePlate: 'RA 123 A',
        nationalId: '1199580001234567',
        phone: '+250700000005',
        isOnline: true,
      },
      emailVerified: true,
    });
    console.log('Created rider:', rider1.email);

    // Create Listings
    await Listing.create([
      {
        business: bakery._id,
        title: 'Surplus Croissants Bag',
        description: 'A bag of 5 delicious croissants baked this morning.',
        category: 'baked-goods',
        pricing: { originalPrice: 5000, price: 2500, currency: 'RWF' },
        inventory: { quantity: 10 },
        timeWindow: {
          availableFrom: new Date(),
          availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        status: 'active',
      },
      {
        business: restaurant._id,
        title: 'Lunch Buffet Leftovers',
        description: 'High quality rice, beans, and grilled chicken.',
        category: 'meals',
        pricing: { originalPrice: 4000, price: 2000, currency: 'RWF' },
        inventory: { quantity: 5 },
        timeWindow: {
          availableFrom: new Date(),
          availableUntil: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
        },
        status: 'active',
      },
    ]);
    console.log('Created listings.');

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
