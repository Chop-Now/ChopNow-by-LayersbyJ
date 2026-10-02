const Cart = require('../models/Cart');
const Listing = require('../models/Listing');
const logger = require('../utils/logger');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    const cart = await Cart.getOrCreateCart(req.user._id);

    // Populate listing details
    await cart.populate({
      path: 'items.listing',
      select: 'title description pricing images inventory business status',
      populate: {
        path: 'business',
        select: 'name',
      },
    });

    // Filter out items where listing no longer exists or is inactive
    const validItems = cart.items.filter(
      (item) => item.listing && item.listing.status === 'active'
    );

    // Transform to frontend format
    const cartItems = {};
    validItems.forEach((item) => {
      cartItems[item.listing._id.toString()] = item.quantity;
    });

    res.json({
      success: true,
      cart: cartItems,
      items: validItems.map((item) => ({
        listingId: item.listing._id,
        title: item.listing.title,
        price: item.listing.pricing?.price || 0,
        originalPrice: item.listing.pricing?.originalPrice,
        image: item.listing.images?.[0] || '/placeholder-food.jpg',
        quantity: item.quantity,
        available: item.listing.inventory?.quantity || 0,
        businessName: item.listing.business?.name || 'Unknown',
      })),
      updatedAt: cart.updatedAt,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error getting cart');
    res.status(500).json({
      success: false,
      message: 'Failed to get cart',
      error: error.message,
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { listingId, quantity = 1 } = req.body;

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: 'Listing ID is required',
      });
    }

    // Verify listing exists and is active
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This listing is no longer available',
      });
    }

    // Check inventory
    if (listing.inventory?.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough items in stock',
      });
    }

    const cart = await Cart.getOrCreateCart(req.user._id);
    await cart.addItem(listingId, quantity);

    // Return updated cart
    await cart.populate({
      path: 'items.listing',
      select: 'title pricing images inventory business status',
      populate: { path: 'business', select: 'name' },
    });

    const cartItems = {};
    cart.items.forEach((item) => {
      if (item.listing) {
        cartItems[item.listing._id.toString()] = item.quantity;
      }
    });

    res.json({
      success: true,
      message: 'Item added to cart',
      cart: cartItems,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error adding to cart');
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
      error: error.message,
    });
  }
};

// @desc    Update item quantity in cart
// @route   PUT /api/cart/update
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { listingId, quantity } = req.body;

    if (!listingId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Listing ID and quantity are required',
      });
    }

    const cart = await Cart.getOrCreateCart(req.user._id);

    if (quantity <= 0) {
      await cart.removeItem(listingId);
    } else {
      // Verify stock availability
      const listing = await Listing.findById(listingId);
      if (listing && listing.inventory?.quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${listing.inventory.quantity} items available`,
        });
      }
      await cart.updateItemQuantity(listingId, quantity);
    }

    // Return updated cart
    const cartItems = {};
    cart.items.forEach((item) => {
      cartItems[item.listing.toString()] = item.quantity;
    });

    res.json({
      success: true,
      message: 'Cart updated',
      cart: cartItems,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating cart');
    res.status(500).json({
      success: false,
      message: 'Failed to update cart',
      error: error.message,
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:listingId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: 'Listing ID is required',
      });
    }

    const cart = await Cart.getOrCreateCart(req.user._id);
    await cart.removeItem(listingId);

    // Return updated cart
    const cartItems = {};
    cart.items.forEach((item) => {
      cartItems[item.listing.toString()] = item.quantity;
    });

    res.json({
      success: true,
      message: 'Item removed from cart',
      cart: cartItems,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error removing from cart');
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
      error: error.message,
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart/clear
// @access  Private
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.getOrCreateCart(req.user._id);

    // Decrement cartCount for all items before clearing
    if (cart.items.length > 0) {
      await Promise.all(
        cart.items.map((item) =>
          Listing.findOneAndUpdate(
            { _id: item.listing, 'stats.cartCount': { $gt: 0 } },
            { $inc: { 'stats.cartCount': -1 } }
          )
        )
      );
    }

    await cart.clearCart();

    res.json({
      success: true,
      message: 'Cart cleared',
      cart: {},
    });
  } catch (error) {
    logger.error({ err: error }, 'Error clearing cart');
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message,
    });
  }
};

// @desc    Sync cart (merge local cart with server cart on login)
// @route   POST /api/cart/sync
// @access  Private
const syncCart = async (req, res) => {
  try {
    const { localCart } = req.body;

    const cart = await Cart.getOrCreateCart(req.user._id);

    if (localCart && Object.keys(localCart).length > 0) {
      // Verify all listings exist and are active
      const listingIds = Object.keys(localCart);
      const validListings = await Listing.find({
        _id: { $in: listingIds },
        status: 'active',
      }).select('_id');

      const validIds = new Set(validListings.map((l) => l._id.toString()));

      // Filter to only valid listings
      const validLocalCart = {};
      for (const [id, qty] of Object.entries(localCart)) {
        if (validIds.has(id) && qty > 0) {
          validLocalCart[id] = qty;
        }
      }

      // Merge with server cart
      await cart.mergeWithLocal(validLocalCart);
    }

    // Return merged cart
    await cart.populate({
      path: 'items.listing',
      select: 'title pricing images inventory business status',
      populate: { path: 'business', select: 'name' },
    });

    const cartItems = {};
    const items = [];

    cart.items.forEach((item) => {
      if (item.listing && item.listing.status === 'active') {
        cartItems[item.listing._id.toString()] = item.quantity;
        items.push({
          listingId: item.listing._id,
          title: item.listing.title,
          price: item.listing.pricing?.price || 0,
          originalPrice: item.listing.pricing?.originalPrice,
          image: item.listing.images?.[0] || '/placeholder-food.jpg',
          quantity: item.quantity,
          available: item.listing.inventory?.quantity || 0,
          businessName: item.listing.business?.name || 'Unknown',
        });
      }
    });

    res.json({
      success: true,
      message: 'Cart synced successfully',
      cart: cartItems,
      items,
      updatedAt: cart.updatedAt,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error syncing cart');
    res.status(500).json({
      success: false,
      message: 'Failed to sync cart',
      error: error.message,
    });
  }
};

// @desc    Set entire cart (replace server cart with client cart)
// @route   PUT /api/cart/set
// @access  Private
const setCart = async (req, res) => {
  try {
    const { cartItems } = req.body;

    // Capture old listing IDs BEFORE modifying the cart
    const existingCart = await Cart.findOne({ user: req.user._id });
    const oldListingIds = new Set(
      (existingCart?.items || []).map((item) => item.listing.toString())
    );

    const cart = await Cart.getOrCreateCart(req.user._id);
    cart.items = [];

    const newListingIds = new Set();

    if (cartItems && Object.keys(cartItems).length > 0) {
      const listingIds = Object.keys(cartItems);
      const validListings = await Listing.find({
        _id: { $in: listingIds },
        status: 'active',
      }).select('_id');

      const validIds = new Set(validListings.map((l) => l._id.toString()));

      for (const [listingId, quantity] of Object.entries(cartItems)) {
        if (validIds.has(listingId) && quantity > 0) {
          cart.items.push({ listing: listingId, quantity });
          newListingIds.add(listingId);
        }
      }
    }

    await cart.save();

    // Diff: increment cartCount for newly added listings, decrement for removed
    const added = [...newListingIds].filter((id) => !oldListingIds.has(id));
    const removed = [...oldListingIds].filter((id) => !newListingIds.has(id));

    await Promise.all([
      ...added.map((id) => Listing.findByIdAndUpdate(id, { $inc: { 'stats.cartCount': 1 } })),
      ...removed.map((id) =>
        Listing.findOneAndUpdate(
          { _id: id, 'stats.cartCount': { $gt: 0 } },
          { $inc: { 'stats.cartCount': -1 } }
        )
      ),
    ]);

    // Return updated cart
    const resultCart = {};
    cart.items.forEach((item) => {
      resultCart[item.listing.toString()] = item.quantity;
    });

    res.json({
      success: true,
      message: 'Cart updated',
      cart: resultCart,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error setting cart');
    res.status(500).json({
      success: false,
      message: 'Failed to set cart',
      error: error.message,
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart,
  setCart,
};
