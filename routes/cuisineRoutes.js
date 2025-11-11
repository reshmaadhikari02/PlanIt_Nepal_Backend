const express = require('express');
const cuisineController = require('../controllers/cuisineController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const upload = require('../middleware/multer');

const router = express.Router();

// CREATE ROUTES
router.post('/categories/:category/dishes', authMiddleware, authorizeRoles("admin"), upload.single('image'), cuisineController.uploadDish);

// READ ROUTES (Specific routes first, then parameter routes)
router.get('/', cuisineController.getAllCuisines);
router.get('/categories/:category/dishes', cuisineController.getDishesForACategory);
router.get('/dishes/:dishId', cuisineController.getDishbyId);
router.get('/search', cuisineController.searchCuisines);

// DISH RATING ROUTES
router.post('/dishes/:dishId/rate', authMiddleware, authorizeRoles("customer"), cuisineController.rateDish);

// UPDATE ROUTES
router.patch('/:categoryId/dishes/:dishId', authMiddleware, authorizeRoles("admin"), upload.single('image'), cuisineController.updateCuisine);

// DELETE ROUTES (More specific routes first)
router.delete('/:categoryId/dishes/:dishId', authMiddleware, authorizeRoles("admin"), cuisineController.deleteDish);
router.delete('/:categoryId', authMiddleware, authorizeRoles("admin"), cuisineController.deleteCategory);

module.exports = router;