const express = require("express");
const { upload } = require("../middleware/multer.js");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/middleware.js");
const { validate } = require("../middleware/validate.joi.js");
const laporanLayananRoutes = express.Router();
const { laporanLayananController } = require("./C_LaporanLayanan.js");
const { createSchema } = require("./C_LaporanLayanan.validate.js");

// Handle preflight OPTIONS request
laporanLayananRoutes.options("/", (req, res) => {
  res.sendStatus(200);
});

// LAPORAN LAYANAN ROUTES
laporanLayananRoutes.post(
  "/",
  authMiddleware,
  roleMiddleware("customer"),
  upload.single("foto_kegiatan"),
  validate(createSchema),
  laporanLayananController.create
);
laporanLayananRoutes.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "customer"),
  laporanLayananController.getById
);

module.exports = {
  laporanLayananRoutes,
};
