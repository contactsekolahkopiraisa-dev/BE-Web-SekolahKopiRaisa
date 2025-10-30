const express = require('express');
const { authMiddleware } = require('../middleware/middleware');
const { uploadFile } = require('../middleware/multer.js');
const modulRoutes = express.Router();

const { modulController } = require('./C_Modul.js');

// MODUL ROUTES
modulRoutes.get('/', modulController.getAll);
modulRoutes.get('/:id', modulController.getById);
modulRoutes.post('/', authMiddleware, uploadFile.single('file_modul'), modulController.create);
modulRoutes.put('/:id', authMiddleware, uploadFile.single('file_modul'), modulController.update);
modulRoutes.delete('/:id', authMiddleware, modulController.delete);

module.exports = {
  modulRoutes,
};
