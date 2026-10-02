const Favorite = require('../models/Favorite');
const logger = require('../utils/logger');

/**
 * @desc    Toggle favorite (add or remove)
 * @route   POST /api/favorites/toggle
 * @access  Private
 */
const toggleFavorite = async (req, res) => {
  try {
    const { favoriteType, referenceId } = req.body;

    if (!favoriteType || !referenceId) {
      return res.status(400).json({ message: 'Please provide favoriteType and referenceId' });
    }

    const result = await Favorite.toggleFavorite(req.user._id, favoriteType, referenceId);

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Favorite error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Get user favorites
 * @route   GET /api/favorites
 * @access  Private
 */
const getFavorites = async (req, res) => {
  try {
    const { favoriteType } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };

    if (favoriteType) {
      query.favoriteType = favoriteType;
    }

    const [favorites, total] = await Promise.all([
      Favorite.find(query)
        .populate('business', 'name type address media stats')
        .populate({
          path: 'listing',
          select: 'title category pricing images inventory status timeWindow business description',
          populate: {
            path: 'business',
            select: 'name type address media stats',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Favorite.countDocuments(query),
    ]);

    res.json({
      favorites,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error({ err: error }, 'Favorite error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * @desc    Check if item is favorited
 * @route   GET /api/favorites/check/:favoriteType/:referenceId
 * @access  Private
 */
const checkFavorite = async (req, res) => {
  try {
    const { favoriteType, referenceId } = req.params;

    const isFavorited = await Favorite.isFavorited(req.user._id, favoriteType, referenceId);

    res.json({ isFavorited });
  } catch (error) {
    logger.error({ err: error }, 'Favorite error');
    res.status(500).json({
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

module.exports = {
  toggleFavorite,
  getFavorites,
  checkFavorite,
};
