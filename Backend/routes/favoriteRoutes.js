const express = require('express');
const router = express.Router();
const {
  toggleFavorite,
  getFavorites,
  checkFavorite,
} = require('../controllers/favoriteController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.post('/toggle', protect, toggleFavorite);
router.get('/', protect, getFavorites);
router.get('/check/:favoriteType/:referenceId', protect, checkFavorite);

module.exports = router;
