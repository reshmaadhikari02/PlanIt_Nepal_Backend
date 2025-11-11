const Cuisine = require('../models/Cuisine');
const { deleteFromCloudinary, uploadToCloudinary } = require('../config/cloudinaryConfig');

exports.uploadDish = async (req, res) => {
  const { name, price, description } = req.body;
  let category = req.params.category;
  try {
    if (!category || !name || !price || !description || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category, dish name, and image'
      });
    }
    category = category.toLowerCase();
    const result = await uploadToCloudinary(req.file.buffer);
    const newDish = {
      name,
      price,
      description,
      image: result.secure_url,
      imageId: result.public_id
    };
    const updatedCategory = await Cuisine.findOneAndUpdate(
      { category },
      { $push: { dishes: newDish } },
      { new: true, upsert: true }
    );
    return res.status(201).json({
      success: true,
      message: 'Dish added successfully',
      data: {
        dish: newDish,
        category: updatedCategory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.getDishbyId = async (req, res) => {
  const { dishId } = req.params;
  try {
    const cuisine = await Cuisine.findOne({ 'dishes._id': dishId }).lean();
    if (!cuisine) {
      return res.status(404).json({
        success: false,
        message: "Dish not found"
      });
    }
    const dish = cuisine.dishes.find(d => d._id.toString() === dishId);
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Dish not found in the cuisine category"
      });
    }
    res.status(200).json({
      success: true,
      message: "Dish found successfully",
      data: {
        dish,
        cuisineId: cuisine._id,
        cuisineCategory: cuisine.category
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.getDishesForACategory = async (req, res) => {
  let { category } = req.params;
  try {
    category = category.toLowerCase();
    const foundCategory = await Cuisine.findOne({ category }).lean();
    if (!foundCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    res.status(200).json({
      success: true,
      message: `Dishes found for the category: ${category}`,
      data: {
        category: foundCategory.category,
        dishes: foundCategory.dishes,
        totalDishes: foundCategory.dishes.length
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.getAllCuisines = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortField = req.query.sortField || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const cuisines = await Cuisine.find().lean();
    if (cuisines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No categories found",
        data: {
          cuisines: [],
          pagination: {
            totalDishes: 0,
            currentPage: page,
            totalPages: 0,
            limit
          }
        }
      });
    }
    const processedCuisines = cuisines.map(cuisine => {
      let dishes = [...cuisine.dishes];
      if (req.query.minPrice || req.query.maxPrice) {
        dishes = dishes.filter(dish => {
          if (req.query.minPrice && dish.price < parseFloat(req.query.minPrice)) return false;
          if (req.query.maxPrice && dish.price > parseFloat(req.query.maxPrice)) return false;
          return true;
        });
      }
      if (req.query.dishName) {
        dishes = dishes.filter(dish =>
          dish.name.toLowerCase().includes(req.query.dishName.toLowerCase())
        );
      }
      dishes.sort((a, b) => {
        if (sortField === 'price') {
          return sortOrder === 1 ? a.price - b.price : b.price - a.price;
        } else if (sortField === 'name') {
          return sortOrder === 1 ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        return 0;
      });
      const totalDishes = dishes.length;
      const paginatedDishes = dishes.slice(skip, skip + limit);
      return {
        ...cuisine,
        dishes: paginatedDishes,
        dishesMetadata: {
          totalDishes,
          currentPage: page,
          totalPages: Math.ceil(totalDishes / limit),
          limit,
          hasNextPage: page < Math.ceil(totalDishes / limit),
          hasPrevPage: page > 1
        }
      };
    });
    const totalDishesAcrossAllCuisines = cuisines.reduce((total, cuisine) => {
      let dishes = [...cuisine.dishes];
      if (req.query.minPrice || req.query.maxPrice) {
        dishes = dishes.filter(dish => {
          if (req.query.minPrice && dish.price < parseFloat(req.query.minPrice)) return false;
          if (req.query.maxPrice && dish.price > parseFloat(req.query.maxPrice)) return false;
          return true;
        });
      }
      if (req.query.dishName) {
        dishes = dishes.filter(dish =>
          dish.name.toLowerCase().includes(req.query.dishName.toLowerCase())
        );
      }
      return total + dishes.length;
    }, 0);
    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: {
        cuisines: processedCuisines,
        overallPagination: {
          totalDishesAcrossAllCuisines,
          currentPage: page,
          totalPages: Math.ceil(totalDishesAcrossAllCuisines / limit),
          limit,
          hasNextPage: page < Math.ceil(totalDishesAcrossAllCuisines / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.updateCuisine = async (req, res) => {
  const { categoryId, dishId } = req.params;
  const { name, price, description } = req.body;
  try {
    const cuisine = await Cuisine.findById(categoryId);
    if (!cuisine) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    const dish = cuisine.dishes.id(dishId);
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Dish not found"
      });
    }
    if (req.file && dish.imageId) {
      await deleteFromCloudinary(dish.imageId);
    }
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      dish.image = result.secure_url;
      dish.imageId = result.public_id;
    }
    if (name) dish.name = name;
    if (price) dish.price = price;
    if (description) dish.description = description;
    await cuisine.save();
    res.status(200).json({
      success: true,
      message: "Dish updated successfully",
      data: {
        updatedDish: dish,
        category: cuisine.category
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.deleteDish = async (req, res) => {
  const { categoryId, dishId } = req.params;
  try {
    const cuisine = await Cuisine.findById(categoryId);
    if (!cuisine) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    const dish = cuisine.dishes.id(dishId);
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Dish not found"
      });
    }
    const dishImageId = dish.imageId;
    const dishName = dish.name;
    const categoryName = cuisine.category;
    const isLastDish = cuisine.dishes.length === 1;
    if (dishImageId) {
      try {
        await deleteFromCloudinary(dishImageId);
      } catch (cloudinaryError) {}
    }
    if (isLastDish) {
      await Cuisine.findByIdAndDelete(categoryId);
      return res.status(200).json({
        success: true,
        message: "Last dish deleted. Category automatically removed.",
        data: {
          deletedDishId: dishId,
          deletedDishName: dishName,
          deletedCategoryId: categoryId,
          deletedCategoryName: categoryName,
          action: "category_deleted",
          reason: "Last dish in category was deleted"
        }
      });
    } else {
      dish.deleteOne();
      await cuisine.save();
      return res.status(200).json({
        success: true,
        message: "Dish deleted successfully",
        data: {
          deletedDishId: dishId,
          deletedDishName: dishName,
          categoryId: categoryId,
          categoryName: categoryName,
          remainingDishes: cuisine.dishes.length,
          action: "dish_deleted",
          updatedCategory: {
            _id: cuisine._id,
            category: cuisine.category,
            dishes: cuisine.dishes,
            totalDishes: cuisine.dishes.length
          }
        }
      });
    }
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID or dish ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.deleteCategory = async (req, res) => {
  const { categoryId } = req.params;
  try {
    const cuisine = await Cuisine.findById(categoryId);
    if (!cuisine) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    for (const dish of cuisine.dishes) {
      if (dish.imageId) {
        await deleteFromCloudinary(dish.imageId);
      }
    }
    await Cuisine.findByIdAndDelete(categoryId);
    res.status(200).json({
      success: true,
      message: "Category and all its dishes deleted successfully",
      data: {
        deletedCategoryId: categoryId,
        deletedCategory: cuisine.category
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.searchCuisines = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Please provide a search term"
      });
    }
    const searchTerm = new RegExp(query.trim(), 'i');
    const results = await Cuisine.find({
      $or: [
        { category: searchTerm },
        { 'dishes.name': searchTerm }
      ]
    }).lean();
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No results found for "${query}"`,
        data: {
          results: [],
          searchQuery: query,
          totalResults: 0
        }
      });
    }
    res.status(200).json({
      success: true,
      message: `Found ${results.length} results for "${query}"`,
      data: {
        results,
        searchQuery: query,
        totalResults: results.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.rateDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5"
      });
    }
    const cuisine = await Cuisine.findOne({ 'dishes._id': dishId });
    if (!cuisine) {
      return res.status(404).json({
        success: false,
        message: "Dish not found"
      });
    }
    const dish = cuisine.dishes.id(dishId);
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Dish not found"
      });
    }
    const existingRatingIndex = dish.ratings.findIndex(
      r => r.userId.toString() === userId
    );
    let oldRating = null;
    let isUpdate = false;
    if (existingRatingIndex !== -1) {
      oldRating = dish.ratings[existingRatingIndex].rating;
      dish.ratings[existingRatingIndex].rating = rating;
      dish.ratings[existingRatingIndex].ratedAt = new Date();
      isUpdate = true;
    } else {
      dish.ratings.push({
        userId: userId,
        rating: rating,
        ratedAt: new Date()
      });
      dish.totalRatings += 1;
    }
    const totalRating = dish.ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / dish.ratings.length;
    dish.rating = Math.round(averageRating * 10) / 10;
    await cuisine.save();
    return res.status(200).json({
      success: true,
      message: isUpdate ? "Rating updated successfully" : "Rating added successfully",
      data: {
        dishId: dish._id,
        dishName: dish.name,
        userRating: rating,
        oldRating: oldRating,
        averageRating: dish.rating,
        totalRatings: dish.totalRatings,
        isUpdate: isUpdate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};




