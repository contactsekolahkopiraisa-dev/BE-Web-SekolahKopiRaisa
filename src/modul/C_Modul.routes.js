const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/middleware');
const { validate } = require('../middleware/validate.joi.js');
const { uploadFileMix } = require('../middleware/multer.js');
const modulRoutes = express.Router();
const { modulController } = require('./C_Modul.js');
const { createSchema, updateSchema } = require('./C_Modul.validate.js');


// MODUL ROUTES
const uploadFields = uploadFileMix.fields([
  { name: 'file_modul', maxCount: 1 },
  { name: 'foto_sampul', maxCount: 1 }
]);
// modulRoutes.post('/', authMiddleware, roleMiddleware('admin'), upload.single('foto_sampul'), uploadFile.single('file_modul'), validate(createSchema), modulController.create);
// modulRoutes.put('/:id', authMiddleware, roleMiddleware('admin'), upload.single('foto_sampul'), uploadFile.single('file_modul'), validate(updateSchema), modulController.update);
modulRoutes.get('/', modulController.getAll);
modulRoutes.get('/:id', modulController.getById);
modulRoutes.post('/', authMiddleware, roleMiddleware('admin'), uploadFields, validate(createSchema), modulController.create);
modulRoutes.put('/:id', authMiddleware, roleMiddleware('admin'), uploadFields, validate(updateSchema), modulController.update);
modulRoutes.delete('/:id', authMiddleware,roleMiddleware('admin'), modulController.delete);

module.exports = {
  modulRoutes,
};


// bisa ditambah middleware untuk role managenet yang lebih baik, misal pakai RPAC