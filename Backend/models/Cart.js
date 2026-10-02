const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartItemSchema = new Schema(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
);

// Method to add item to cart
cartSchema.methods.addItem = function (listingId, quantity = 1) {
  const existingItem = this.items.find((item) => item.listing.toString() === listingId.toString());

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({ listing: listingId, quantity });
  }

  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function (listingId, quantity) {
  const item = this.items.find((item) => item.listing.toString() === listingId.toString());

  if (item) {
    if (quantity <= 0) {
      this.items = this.items.filter((item) => item.listing.toString() !== listingId.toString());
    } else {
      item.quantity = quantity;
    }
  }

  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = function (listingId) {
  this.items = this.items.filter((item) => item.listing.toString() !== listingId.toString());
  return this.save();
};

// Method to clear cart
cartSchema.methods.clearCart = function () {
  this.items = [];
  return this.save();
};

// Method to merge with local cart (for login sync)
cartSchema.methods.mergeWithLocal = function (localItems) {
  // localItems is an object like { listingId: quantity, ... }
  for (const [listingId, quantity] of Object.entries(localItems)) {
    if (quantity > 0) {
      const existingItem = this.items.find((item) => item.listing.toString() === listingId);

      if (existingItem) {
        // Take the higher quantity
        existingItem.quantity = Math.max(existingItem.quantity, quantity);
      } else {
        this.items.push({ listing: listingId, quantity });
      }
    }
  }

  return this.save();
};

// Static method to get or create cart for user
cartSchema.statics.getOrCreateCart = async function (userId) {
  let cart = await this.findOne({ user: userId });
  if (!cart) {
    cart = new this({ user: userId, items: [] });
    await cart.save();
  }
  return cart;
};

// Indexes for query optimization
// Note: user index is already created by unique: true constraint
cartSchema.index({ 'items.listing': 1 }); // Find carts containing specific listings
cartSchema.index({ updatedAt: -1 }); // Recently updated carts (for cleanup)

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
