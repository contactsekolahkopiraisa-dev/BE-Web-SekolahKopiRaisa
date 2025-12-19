const express = require("express");
const prisma = require("../db");

const {
  getAllPartners,
  getPartnerById,
  getMyPartnerProfile,
  createPartner,
  updatePartner,
  removePartner,
} = require("./partner.service");
const { authMiddleware } = require("../middleware/middleware");
const { partnerValidator } = require("../validation/validation");
const ApiError = require("../utils/apiError");
const { validationResult } = require("express-validator");

const router = express.Router();

// Get all partners - bisa diakses admin dan UMKM
router.get("/", authMiddleware, async (req, res) => {
  try {
    const partners = await getAllPartners();

    const formatedPartner = partners.map((partner) => ({
      idPartner: partner.id,
      namePartner: partner.name,
      ownerPartner: partner.owner_name,
      phoneNumberPartner: partner.phone_number,
      addressPartner: partner.address,
      products: partner.products.map((product) => ({
        idProduct: product.id,
        nameProduct: product.name,
        priceProduct: product.price,
        descriptionProduct: product.description,
        stockProduct: product.inventory?.stock ?? 0,
        soldProduct: product.sold,
        imageProduct: product.image,
      })),
    }));

    res.status(200).json({
      message: "Data partner berhasil didapatkan!",
      data: formatedPartner,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("ApiError:", error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Error getting partners:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan di server!",
      error: error.message,
    });
  }
});

// Get my partner profile - UMKM only
router.get("/my-profile", authMiddleware, async (req, res) => {
  try {
    if (req.user.admin) {
      return res
        .status(403)
        .json({ message: "Akses ditolak! Endpoint ini hanya untuk UMKM." });
    }

    const userId = req.user.id;
    const partnerProfile = await getMyPartnerProfile(userId);

    res.status(200).json({
      message: "Data profil partner berhasil didapatkan!",
      data: partnerProfile,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("ApiError:", error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Error getting partner profile:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan di server!",
      error: error.message,
    });
  }
});

// Get partner by ID - bisa diakses admin dan UMKM
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const partner = await getPartnerById(id);

    const formatedPartnerId = {
      idPartner: partner.id,
      namePartner: partner.name,
      ownerPartner: partner.owner_name,
      phoneNumberPartner: partner.phone_number,
      addressPartner: partner.address,
      products: partner.products.map((product) => ({
        idProduct: product.id,
        nameProduct: product.name,
        priceProduct: product.price,
        descriptionProduct: product.description,
        stockProduct: product.inventory?.stock ?? 0,
        soldProduct: product.sold,
        imageProduct: product.image,
      })),
    };

    console.log("data", partner);
    res.status(200).json({
      message: "Data partner berhasil didapatkan!",
      data: formatedPartnerId,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("ApiError:", error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Error getting partner:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan di server!",
      error: error.message,
    });
  }
});

// Create partner - admin only
router.post("/", authMiddleware, partnerValidator, async (req, res) => {
  try {
    console.log("BODY CLIENT:", req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorObject = errors.array().reduce((acc, curr) => {
        const key = curr.path && curr.path !== "" ? curr.path : "global";
        if (!acc[key]) {
          acc[key] = curr.msg;
        }
        return acc;
      }, {});

      return res.status(400).json({
        message: "Validasi gagal!",
        errors: errorObject,
      });
    }

    if (!req.user.admin) {
      return res
        .status(403)
        .json({ message: "Akses ditolak! Hanya admin yang bisa mengakses." });
    }
    const dataPartner = req.body;
    const newPartner = await createPartner(dataPartner);

    console.log("data", newPartner);
    res.status(201).json({
      message: "Partner berhasil ditambahkan!",
      data: newPartner,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("ApiError:", error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Error adding partner:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan di server!",
      error: error.message,
    });
  }
});

// Update partner - bisa diakses admin dan UMKM
router.put("/:id", authMiddleware, partnerValidator, async (req, res) => {
  try {
    console.log("BODY CLIENT:", req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorObject = errors.array().reduce((acc, curr) => {
        const key = curr.path && curr.path !== "" ? curr.path : "global";
        if (!acc[key]) {
          acc[key] = curr.msg;
        }
        return acc;
      }, {});

      return res.status(400).json({
        message: "Validasi gagal!",
        errors: errorObject,
      });
    }
    
    const { id } = req.params;
    const { name, owner_name, phone_number } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.admin;

    const updatedPartner = await updatePartner(
      id,
      {
        name,
        owner_name,
        phone_number,
      },
      userId,
      isAdmin
    );

    console.log("data", updatedPartner);
    res.status(200).json({
      message: "Partner berhasil diperbarui!",
      data: updatedPartner,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("ApiError:", error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Error updating partner:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan di server!",
      error: error.message,
    });
  }
});

// Delete partner - admin only
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user.admin) {
      return res
        .status(403)
        .json({ message: "Akses ditolak! Hanya admin yang bisa mengakses." });
    }

    const deletePartner = await removePartner(id);

    console.log("data", deletePartner);
    res.status(200).json({
      message: "Partner berhasil dihapus!",
      data: deletePartner,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("ApiError:", error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Error deleting partner:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan di server!",
      error: error.message,
    });
  }
});

module.exports = router;