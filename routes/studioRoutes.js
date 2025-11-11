const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");
const upload = require("../middleware/multer");

const studioController = require("../controllers/studioController");

const router = express.Router();


router.post('/', authMiddleware, authorizeRoles('admin'), upload.single('image'), studioController.uploadStudio);


router.get('/search', studioController.searchStudios);
router.get('/', studioController.getAllStudios);


router.patch('/:studioId', authMiddleware, authorizeRoles('admin'), upload.single('image'), studioController.updateStudio);


router.post('/:studioId/photos', authMiddleware, authorizeRoles('admin'), upload.array('photos', 10), studioController.addStudioPhotos);

router.delete('/:studioId/photos/:photoId', authMiddleware, authorizeRoles('admin'), studioController.deleteStudioPhoto);


router.get('/:studioId', studioController.getStudioById);


router.delete('/:studioId', authMiddleware, authorizeRoles('admin'), studioController.deleteStudio);

router.post('/:studioId/rate', authMiddleware, authorizeRoles('customer'), studioController.rateStudio);


module.exports = router;