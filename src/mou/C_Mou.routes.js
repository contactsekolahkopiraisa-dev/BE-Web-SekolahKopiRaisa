const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/middleware');
const { uploadFile } = require('../middleware/multer.js');
const mouRoutes = express.Router();

const { mouController } = require('./C_Mou.js');

// MOU ROUTES
mouRoutes.get('/:id',authMiddleware, roleMiddleware('admin','customer'), mouController.getById);
mouRoutes.post('/', authMiddleware, roleMiddleware('customer'), uploadFile.single('file_mou'), mouController.create);
mouRoutes.put('/:id', authMiddleware, roleMiddleware('customer'), uploadFile.single('file_mou'), mouController.update);
mouRoutes.put('/accept/:id', authMiddleware, roleMiddleware('admin'), mouController.accept)
mouRoutes.put('/reject/:id', authMiddleware, roleMiddleware('admin'), mouController.reject)


module.exports = {
  mouRoutes,
};