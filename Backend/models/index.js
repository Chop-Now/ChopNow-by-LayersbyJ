/**
 * ChopNow Models Index
 *
 * This file exports all Mongoose models for the ChopNow food rescue platform.
 * Import models individually or all at once from this file.
 *
 * Usage:
 *   const { User, Business, Listing } = require('./models');
 *   // or
 *   const models = require('./models');
 */

const User = require('./User');
const Business = require('./Business');
const Listing = require('./Listing');
const Order = require('./Order');
const Delivery = require('./Delivery');
const Favorite = require('./Favorite');
const Review = require('./Review');
const Notification = require('./Notification');

module.exports = {
  User,
  Business,
  Listing,
  Order,
  Delivery,
  Favorite,
  Review,
  Notification,
};
