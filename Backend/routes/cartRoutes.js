const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart,
  setCart,
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// All routes are protected (require authentication)

// @route   GET /api/cart
// @desc    Get user's cart
router.get('/', protect, getCart);

// @route   POST /api/cart/add
// @desc    Add item to cart
router.post('/add', protect, addToCart);

// @route   PUT /api/cart/update
// @desc    Update item quantity
router.put('/update', protect, updateCartItem);

// @route   DELETE /api/cart/remove/:listingId
// @desc    Remove item from cart
router.delete('/remove/:listingId', protect, removeFromCart);

// @route   DELETE /api/cart/clear
// @desc    Clear entire cart
router.delete('/clear', protect, clearCart);

// @route   POST /api/cart/sync
// @desc    Sync local cart with server cart (on login)
router.post('/sync', protect, syncCart);

// @route   PUT /api/cart/set
// @desc    Replace entire cart
router.put('/set', protect, setCart);

module.exports = router;
