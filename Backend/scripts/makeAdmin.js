/* eslint-disable no-console */
/**
 * Script to promote a user to admin
 * Usage: node scripts/makeAdmin.js <email>
 * Example: node scripts/makeAdmin.js admin@chopnow.app
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const makeAdmin = async () => {
  const email = process.argv[2];

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    if (!email) {
      console.log('\nUsage: node scripts/makeAdmin.js <email>');
      console.log('Example: node scripts/makeAdmin.js admin@chopnow.app');
      console.log('\nAvailable users to promote:');
      const users = await User.find({})
        .select('email firstName lastName roles activeRole')
        .limit(15);
      if (users.length === 0) {
        console.log('  No users found. Please register a user first via the app.');
      } else {
        users.forEach((u) => {
          const isAdmin = u.roles?.includes('admin') || u.activeRole === 'admin';
          console.log(
            `  - ${u.email} (${u.firstName || ''} ${u.lastName || ''}) ${isAdmin ? '[ADMIN]' : ''}`
          );
        });
      }
      await mongoose.disconnect();
      process.exit(0);
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`User with email "${email}" not found.`);
      console.log('\nAvailable users:');
      const users = await User.find({}).select('email firstName lastName roles').limit(10);
      users.forEach((u) => {
        console.log(
          `  - ${u.email} (${u.firstName} ${u.lastName}) - Roles: ${u.roles?.join(', ') || u.role}`
        );
      });
      process.exit(1);
    }

    // Add admin role if not already present
    if (!user.roles) {
      user.roles = [user.role || 'consumer'];
    }

    if (!user.roles.includes('admin')) {
      user.roles.push('admin');
    }

    // Set active role to admin
    user.activeRole = 'admin';

    await user.save();

    console.log(`\n✅ Successfully promoted "${user.email}" to admin!`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Roles: ${user.roles.join(', ')}`);
    console.log(`   Active Role: ${user.activeRole}`);
    console.log('\nYou can now login and access the admin dashboard.');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

makeAdmin();
