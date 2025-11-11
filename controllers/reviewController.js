const Review = require('../models/review');

exports.postReviews = async (req, res) => {
  const userId = req.user.id;
  const { rating, comment } = req.body;
  try {
    if (!rating) {
      return res.status(400).json({
        success: false,
        message: "Please fill up the rating before posting"
      });
    }
    const newReview = new Review({
      user: userId,
      rating,
      comment
    });
    await newReview.save();
    res.status(200).json({
      success: true,
      message: "Review Sent Successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const ratingFilter = req.query.rating;
    const filter = {};
    if (ratingFilter) filter.rating = ratingFilter;
    const reviews = await Review.find(filter)
      .populate('user', 'name profileImage verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const totalReviews = await Review.countDocuments(filter);
    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: {
        reviews,
        pagination: {
          totalReviews,
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          limit
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getVerifiedReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const reviews = await Review.find({ verified: true })
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.status(200).json({
      success: true,
      message: `Top ${limit} verified reviews fetched successfully`,
      data: reviews
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.getUnverifiedReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const reviews = await Review.find({ verified: false })
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.status(200).json({
      success: true,
      message: `Top ${limit} unverified reviews fetched successfully`,
      data: reviews
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.deleteReview = async (req, res) => {
  const { reviewId } = req.params;
  try {
    const deletedReview = await Review.findByIdAndDelete(reviewId);
    if (!deletedReview) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }
    return res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.toggleVerified = async (req, res) => {
  const reviewId = req.params.reviewId;
  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }
    review.verified = !review.verified;
    await review.save();
    return res.status(200).json({
      success: true,
      message: `Review verified status updated to ${review.verified}`,
      verified: review.verified
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
