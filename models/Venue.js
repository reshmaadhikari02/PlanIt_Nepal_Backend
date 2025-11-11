const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  image: {
    type: String,
    default: null,
  },
  imageId: {
    type: String,
    default: null,
  },
});

const venueRatingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  ratedAt: {
    type: Date,
    default: Date.now,
  },
});

const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  location: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  capacity: {
    type: String,
    required: true,
  },
  orderedCount: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: true,
  },
  photos: [imageSchema],
  venueImage: {
    type: String,
    required: true,
  },
  venueImageId: {
    type: String,
  },
  ratings: [venueRatingSchema],
  totalRatings: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

const Venue = mongoose.model("Venue", venueSchema);

module.exports = Venue;