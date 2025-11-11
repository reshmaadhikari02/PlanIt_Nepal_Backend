const mongoose = require('mongoose');

const dishRatingSchema = new mongoose.Schema({
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

const dishSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    orderedCount: {
        type: Number,
        default: 0,
    },
    image: {
        type: String,
    },
    imageId: {
        type: String,
    },
    ratings: [dishRatingSchema],
    totalRatings: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

dishRatingSchema.index({ userId: 1 }, { unique: true });

const cuisineSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true
    },
    dishes: [dishSchema]
}, { timestamps: true });

const Cuisine = mongoose.model('Cuisine', cuisineSchema);

module.exports = Cuisine;