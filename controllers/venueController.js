const Venue = require('../models/Venue');
const Order = require('../models/order');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinaryConfig');
const mongoose = require('mongoose');

exports.uploadVenue = async (req, res) => {
    const { name, location, description, capacity, price } = req.body;
    try {
        if (!name || !location || !description || !capacity || !price) {
            return res.status(400).json({ success: false, message: "Fill all the fields" });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please provide a venue image" });
        }
        if (price <= 0) {
            return res.status(400).json({ success: false, message: "Price must be a positive number" });
        }
        const result = await uploadToCloudinary(req.file.buffer);
        const newVenue = new Venue({
            name,
            location,
            description,
            capacity,
            price,
            venueImage: result.secure_url,
            venueImageId: result.public_id,
            photos: []
        });
        await newVenue.save();
        return res.status(201).json({ success: true, message: "Venue Added Successfully", venue: newVenue });
    } catch(error) {
        console.log(error)
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.addVenuePhotos = async (req, res) => {
    try {
        const venueId = req.params.venueId;
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: "Please provide at least one photo" });
        }
        const venue = await Venue.findById(venueId);
        if (!venue) {
            return res.status(404).json({ success: false, message: "Venue not found" });
        }
        const uploadedPhotos = [];
        for (const file of files) {
            try {
                const result = await uploadToCloudinary(file.buffer);
                uploadedPhotos.push({ image: result.secure_url, imageId: result.public_id });
            } catch {}
        }
        if (uploadedPhotos.length === 0) {
            return res.status(500).json({ success: false, message: "Failed to upload any photos" });
        }
        venue.photos.push(...uploadedPhotos);
        await venue.save();
        return res.status(200).json({
            success: true,
            message: `${uploadedPhotos.length} photos added successfully`,
            venue,
            addedPhotos: uploadedPhotos
        });
    } catch {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.getAllVenues = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const sortField = req.query.sortField || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const serviceFilter = req.query.service;
        const filter = {};
        if (serviceFilter) {
            filter.services = { $in: [serviceFilter] };
        }
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
        }
        if (req.query.location) {
            filter.location = { $regex: req.query.location, $options: 'i' };
        }
        if (req.query.capacity) {
            filter.capacity = { $regex: req.query.capacity, $options: 'i' };
        }
        const venues = await Venue.find(filter)
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean();
        const totalVenues = await Venue.countDocuments(filter);
        if (!venues || venues.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No venues found",
                data: {
                    venues: [],
                    pagination: {
                        totalVenues: 0,
                        currentPage: page,
                        totalPages: 0,
                        limit
                    }
                }
            });
        }
        return res.status(200).json({
            success: true,
            message: "Venues retrieved successfully",
            data: {
                venues,
                pagination: {
                    totalVenues,
                    currentPage: page,
                    totalPages: Math.ceil(totalVenues / limit),
                    limit,
                    hasNextPage: page < Math.ceil(totalVenues / limit),
                    hasPrevPage: page > 1
                }
            }
        });
    } catch {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.getVenuesById = async (req, res) => {
    const venueId = req.params.venueId;
    try {
        const venue = await Venue.findById(venueId).lean();
        if (!venue) {
            return res.status(404).json({ success: false, message: 'Venue not found' });
        }
        const orders = await Order.find({
            'items.itemId': venueId,
            'items.itemType': 'venue',
            'items.bookingStatus': 'confirmed',
            status: { $in: ['confirmed', 'processing', 'completed'] }
        }).select('items status');
        const bookedDates = [];
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.itemId.toString() === venueId &&
                    item.itemType === 'venue' &&
                    item.bookingStatus === 'confirmed') {
                    bookedDates.push({
                        bookedFrom: item.bookedFrom,
                        bookedTill: item.bookedTill,
                        orderId: order._id
                    });
                }
            });
        });
        return res.status(200).json({
            success: true,
            message: 'Venue fetched successfully',
            data: {
                venue,
                bookedDates,
                totalBookings: bookedDates.length
            }
        });
    } catch {
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.updateVenue = async (req, res) => {
    try {
        const { venueId } = req.params;
        const { name, location, description, capacity, price } = req.body;
        const venue = await Venue.findById(venueId);
        if (!venue) {
            return res.status(404).json({ success: false, message: "Venue not found" });
        }
        let imageUrl = venue.venueImage;
        let imageId = venue.venueImageId;
        if (req.file) {
            if (venue.venueImageId) {
                await deleteFromCloudinary(venue.venueImageId);
            }
            const result = await uploadToCloudinary(req.file.buffer);
            imageUrl = result.secure_url;
            imageId = result.public_id;
        }
        const updatedVenue = await Venue.findByIdAndUpdate(
            venueId,
            {
                name: name || venue.name,
                location: location || venue.location,
                description: description || venue.description,
                capacity: capacity || venue.capacity,
                price: price || venue.price,
                venueImage: imageUrl,
                venueImageId: imageId
            },
            { new: true }
        );
        return res.status(200).json({ success: true, message: "Venue updated successfully", venue: updatedVenue });
    } catch {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.deleteVenue = async (req, res) => {
    const { venueId } = req.params;
    try {
        if (!venueId) {
            return res.status(400).json({ success: false, message: "Venue Id is required" });
        }
        const venue = await Venue.findById(venueId);
        if (!venue) {
            return res.status(404).json({ success: false, message: "Venue not found" });
        }
        if (venue.venueImageId) {
            try { await deleteFromCloudinary(venue.venueImageId); } catch {}
        }
        if (venue.photos && venue.photos.length > 0) {
            for (const photo of venue.photos) {
                if (photo.imageId) {
                    try { await deleteFromCloudinary(photo.imageId); } catch {}
                }
            }
        }
        await Venue.findByIdAndDelete(venueId);
        return res.status(200).json({ success: true, message: "Venue and all associated images deleted successfully" });
    } catch {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.searchVenues = async (req, res) => {
    try {
        const { q, services, minPrice, maxPrice, location, capacity } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        let filter = {};
        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }
        if (services) {
            const serviceArray = services.split(',');
            filter.services = { $in: serviceArray };
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }
        if (location) {
            filter.location = { $regex: location, $options: 'i' };
        }
        if (capacity) {
            filter.capacity = { $regex: capacity, $options: 'i' };
        }
        const venues = await Venue.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const totalVenues = await Venue.countDocuments(filter);
        return res.status(200).json({
            success: true,
            message: "Search completed successfully",
            data: {
                venues,
                pagination: {
                    totalVenues,
                    currentPage: page,
                    totalPages: Math.ceil(totalVenues / limit),
                    limit
                },
                searchQuery: { q, services, minPrice, maxPrice, location, capacity }
            }
        });
    } catch {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.deleteVenuePhoto = async (req, res) => {
    try {
        const { venueId, photoId } = req.params;
        const venue = await Venue.findById(venueId);
        if (!venue) {
            return res.status(404).json({ success: false, message: "Venue not found" });
        }
        const photoIndex = venue.photos.findIndex(photo => photo._id.toString() === photoId);
        if (photoIndex === -1) {
            return res.status(404).json({ success: false, message: "Photo Not Found" });
        }
        const photo = venue.photos[photoIndex];
        if (photo.imageId) {
            try { await deleteFromCloudinary(photo.imageId); } catch {}
        }
        venue.photos.splice(photoIndex, 1);
        await venue.save();
        return res.status(200).json({ success: true, message: "Photo deleted successfully", venue });
    } catch {
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.rateVenue = async (req, res) => {
    try {
        const { venueId } = req.params;
        const { rating } = req.body;
        const userId = req.user?.id;

        // Validation
        if (!userId) {
            return res.status(401).json({ success: false, message: "User authentication required" });
        }

        if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
            return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5" });
        }

        if (!mongoose.Types.ObjectId.isValid(venueId)) {
            return res.status(400).json({ success: false, message: "Invalid venue ID" });
        }

        // Find venue
        const venue = await Venue.findById(venueId);
        if (!venue) {
            return res.status(404).json({ success: false, message: "Venue not found" });
        }

        // Check if user has already rated this venue
        const existingRatingIndex = venue.ratings.findIndex(r => r.userId.toString() === userId);
        let oldRating = null;
        let isUpdate = false;

        if (existingRatingIndex !== -1) {
            // Update existing rating
            oldRating = venue.ratings[existingRatingIndex].rating;
            venue.ratings[existingRatingIndex].rating = rating;
            venue.ratings[existingRatingIndex].ratedAt = new Date();
            isUpdate = true;
        } else {
            // Add new rating
            venue.ratings.push({
                userId: new mongoose.Types.ObjectId(userId),
                rating: rating,
                ratedAt: new Date()
            });
        }

        // Recalculate venue average rating and total
        const totalRating = venue.ratings.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = venue.ratings.length > 0 ? totalRating / venue.ratings.length : 0;
        venue.rating = Math.round(averageRating * 10) / 10;
        venue.totalRatings = venue.ratings.length;

        // Save venue
        await venue.save();

        return res.status(200).json({
            success: true,
            message: isUpdate ? "Rating updated successfully" : "Rating added successfully",
            data: {
                venueId: venue._id,
                userRating: rating,
                oldRating,
                averageRating: venue.rating,
                totalRatings: venue.totalRatings,
                isUpdate
            }
        });

    } catch (error) {
        console.error("Rating error:", error);

        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "You have already rated this venue. Rating conflict detected."
            });
        }

        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Add a helper function to get user's rating for a venue
exports.getUserRatingForVenue = async (req, res) => {
    try {
        const { venueId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User authentication required" });
        }

        const venue = await Venue.findById(venueId).lean();
        if (!venue) {
            return res.status(404).json({ success: false, message: "Venue not found" });
        }

        const userRating = venue.ratings.find(r => r.userId.toString() === userId);

        return res.status(200).json({
            success: true,
            data: {
                hasRated: !!userRating,
                rating: userRating ? userRating.rating : null,
                ratedAt: userRating ? userRating.ratedAt : null
            }
        });

    } catch (error) {
        console.error("Get user rating error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



