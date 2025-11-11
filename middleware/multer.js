const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const isExtValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isMimeValid = allowedTypes.test(file.mimetype);
    if (isExtValid && isMimeValid) {
        return cb(null, true);
    }
    cb(new Error('Only images are allowed'));
};

const upload = multer({ storage, fileFilter });

module.exports = upload;