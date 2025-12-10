const express = require("express");
const prisma = require("../db");
const ApiError = require("../utils/apiError");
const { upload } = require("../middleware/multer");

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  removeProductById,
  getProductsByPartner,
} = require("./product.service");
const {
  authMiddleware,
  multerErrorHandler,
  validateProductMedia,
  validateProductUpdate,
} = require("../middleware/middleware");
const { productValidator } = require("../validation/validation");
const { validationResult } = require("express-validator");
const handleValidationResult = require("../middleware/handleValidationResult");
const handleValidationResultFinal = require("../middleware/handleValidationResultFinal");

const router = express.Router();

// Middleware untuk cek akses Admin atau UMKM
const checkAdminOrUMKMAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized! Silakan login terlebih dahulu.",
    });
  }
  
  if (!req.user.admin && req.user.role !== 'UMKM') {
    return res.status(403).json({
      message: "Akses ditolak! Hanya admin dan UMKM yang bisa mengakses.",
    });
  }
  
  next();
};

// GET all products - Public access atau filtered untuk UMKM
router.get("/", async (req, res) => {
  try {
    let products;
    
    // Jika user adalah UMKM, hanya tampilkan produk mereka
    if (req.user && req.user.role === 'UMKM' && !req.user.admin) {
      products = await getProductsByPartner(req.user.id);
    } else {
      // Admin atau public bisa lihat semua produk
      products = await getAllProducts();
    }

    const formatedProducts = products.map((product) => ({
      idProduct: product.id,
      nameProduct: product.name,
      priceProduct: product.price,
      descriptionProduct: product.description,
      stockProduct: product.inventory?.stock || 0,
      soldProduct: product.sold,
      imageProduct: product.image,

      partner: {
        idPartner: product.partner.id,
        namePartner: product.partner.name,
        ownerPartner: product.partner.owner_name,
        phoneNumberPartner: product.partner.phone_number,
        addressPartner: product.partner.address,
      },
    }));
    
    console.log("data :", products);
    res.status(200).json({
      message: "Data produk berhasil didapatkan!",
      data: products,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("ApiError:", error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Error getting products:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan di server!",
      error: error.message,
    });
  }
});

// GET product by ID - dengan validasi ownership untuk UMKM
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await getProductById(id, req.user?.id, req.user?.admin);

    const formatedProductId = {
      idProduct: product.id,
      nameProduct: product.name,
      priceProduct: product.price,
      descriptionProduct: product.description,
      stockProduct: product.inventory.stock,
      soldProduct: product.sold,
      imageProduct: product.image,

      partner: {
        idPartner: product.partner.id,
        namePartner: product.partner.name,
        ownerPartner: product.partner.owner_name,
        phoneNumberPartner: product.partner.phone_number,
      },
    };

    console.log("data:", product);
    res.status(200).json({
      message: "Data produk berhasil didapatkan!",
      data: product,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("ApiError:", error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Error getting product:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan di server!",
      error: error.message,
    });
  }
});

// POST - Create product
router.post(
  "/",
  authMiddleware,
  checkAdminOrUMKMAccess,
  upload.single("productFile"),
  multerErrorHandler,
  validateProductMedia,
  productValidator,
  handleValidationResult,
  handleValidationResultFinal,
  async (req, res) => {
    try {
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
      
      if (
        req.mediaValidationErrors &&
        Object.keys(req.mediaValidationErrors).length > 0
      ) {
        return res.status(400).json({
          message: "Validasi gagal!",
          errors: req.mediaValidationErrors,
        });
      }

      const { name, weight, price, stock, description, partner_id } = req.body;
      const file = req.file;

      // Sanitize HTML untuk disimpan (jika menggunakan DOMPurify)
      // const cleanHtml = DOMPurify.sanitize(description || "");

      // Bersihkan konten dari tag HTML
      const plainDescription = description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!plainDescription) {
        return res.status(400).json({
          message: "Validasi gagal!",
          errors: { description: "*Deskripsi Tidak Boleh Kosong" },
        });
      }

      const product = await createProduct({
        name,
        price,
        weight: parseInt(weight),
        stock,
        description: description, // atau cleanHtml jika pakai DOMPurify
        partner_id,
        image: file,
        user_id: req.user.id,
        is_admin: req.user.admin,
      });

      console.log("data product:", product);
      res.status(201).json({
        message: "Produk berhasil ditambahkan!",
        data: product,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          message: error.message,
        });
      }
      console.error("Error creating product:", error);
      return res.status(500).json({
        message: "Terjadi kesalahan di server!",
        error: error.message,
      });
    }
  }
);

// PUT - Update product
router.put(
  "/:id",
  authMiddleware,
  checkAdminOrUMKMAccess,
  upload.single("productFile"),
  multerErrorHandler,
  productValidator,
  validateProductUpdate({ skipIfNoFile: true }),
  handleValidationResult,
  handleValidationResultFinal,
  async (req, res) => {
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);
    try {
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
      const dataProduct = req.body;

      const editedProductData = {
        ...dataProduct,
        productFile: req.file || null,
      };

      console.log("editedProductData:", editedProductData);
      const product = await updateProduct(
        parseInt(id),
        editedProductData,
        req.user.id,
        req.user.admin
      );

      console.log(product);
      res.status(200).json({
        message: "Data produk berhasil diubah!",
        data: product,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        console.error("ApiError:", error);
        return res.status(error.statusCode).json({
          message: error.message,
        });
      }

      console.error("Error updating product:", error);
      return res.status(500).json({
        message: "Terjadi kesalahan di server!",
        error: error.message,
      });
    }
  }
);

// DELETE product
router.delete("/:idProduct", authMiddleware, checkAdminOrUMKMAccess, async (req, res) => {
  try {
    const { idProduct } = req.params;

    const product = await removeProductById(
      idProduct,
      req.user.id,
      req.user.admin
    );

    console.log(product);
    res.status(200).json({
      message: "Data produk berhasil dihapus!",
      data: product,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("ApiError:", error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Error deleting product:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan di server!",
      error: error.message,
    });
  }
});

module.exports = router;