const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
    image: {
        type: String,
        default: null
    },
    imageId: {
        type: String,
        default: null
    }
});

const studioRatingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    ratedAt: {
        type: Date,
        default: Date.now
    }
});

const studioSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    location: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    orderedCount: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: true
    },
    services: [{
        type: String,
        enum: ['Wedding Photography', 'Pre-wedding Shoot', 'Video Recording', 'Album Design', 'Digital Copies', 'Drone Photography']
    }],
    photos: [imageSchema],
    studioImage: {
        type: String,
        default: null,
    },
    studioImageId: {
        type: String,
        default: null,
    },
    ratings: [studioRatingSchema],
    totalRatings: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Studio = mongoose.model("Studio", studioSchema);

module.exports = Studio;