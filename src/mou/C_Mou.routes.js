const express = require('express');
const mouRoutes = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/middleware');
const { uploadFile } = require('../middleware/multer.js');
const { createSchema, rejectSchema } = require('./C_Mou.validate.js');
const { mouController } = require('./C_Mou.js');
const { validate } = require('../middleware/validate.joi.js');


// MOU ROUTES
mouRoutes.get('/:id',authMiddleware, roleMiddleware('admin','customer'), mouController.getById);
mouRoutes.post('/', authMiddleware, roleMiddleware('customer'), uploadFile.single('file_mou'), validate(createSchema), mouController.create);
mouRoutes.put('/:id', authMiddleware, roleMiddleware('customer'), uploadFile.single('file_mou'), mouController.update);
mouRoutes.put('/:id/accept', authMiddleware, roleMiddleware('admin'), mouController.accept)
mouRoutes.put('/:id/reject', authMiddleware, roleMiddleware('admin'), validate(rejectSchema), mouController.reject)


module.exports = {
  mouRoutes,
};