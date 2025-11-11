const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");
const orderController = require('../controllers/orderController');

const router = express.Router();

// CREATE ROUTES (Customer)
router.post('/', authMiddleware, authorizeRoles("customer"), orderController.addOrder);

// READ ROUTES (Specific routes first)
router.get('/me', authMiddleware, authorizeRoles("customer"), orderController.userOrder);
router.get('/:orderId', authMiddleware, authorizeRoles("customer"), orderController.getOrderById);
router.get('/', authMiddleware, authorizeRoles("admin"), orderController.getAllOrder);

// UPDATE ROUTES (Admin)
router.patch('/:orderId/status', authMiddleware, authorizeRoles("admin"), orderController.updateStatus);

// DELETE ROUTES (Specific routes first, then parameter routes)
router.delete('/user/:userId', authMiddleware, authorizeRoles("admin"), orderController.deleteAllUserOrders);
router.delete('/:orderId', authMiddleware, authorizeRoles("admin"), orderController.deleteOrder);

module.exports = router;