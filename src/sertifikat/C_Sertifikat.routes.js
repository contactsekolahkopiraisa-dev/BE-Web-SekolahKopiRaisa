const express = require('express');
const sertifikatRoutes = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/middleware');
const { uploadFile } = require('../middleware/multer.js');
const { sertifikatController } = require('./C_Sertifikat.js');
const { validate } = require('../middleware/validate.joi.js');
const { createSchema } = require('./C_sertifikat.validate.js');


// SERTIFIKAT ROUTES
sertifikatRoutes.get('/:id', authMiddleware, roleMiddleware('admin', 'customer'), sertifikatController.getById);
sertifikatRoutes.post('/', authMiddleware, roleMiddleware('admin'), uploadFile.single('file_sertifikat'), validate(createSchema), sertifikatController.create);


module.exports = {
  mouRoutes,
};