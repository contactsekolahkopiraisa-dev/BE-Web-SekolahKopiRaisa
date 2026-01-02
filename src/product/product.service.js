const ApiError = require('../utils/apiError');

const { 
  findAllProducts, 
  createNewProduct, 
  createInventory, 
  findProductById, 
  updateDataProduct, 
  updateInventoryStock, 
  deleteProductById, 
  deleteInventoryByProductId,
  findProductsByPartnerId 
} = require('./product.repository');
const { findPartnerById } = require('../partners/partner.repository');
const { getOrCreateDefaultAdminPartner } = require('../partners/partner.service');
const { uploadToCloudinary } = require('../services/cloudinaryUpload.service');
const { deleteFromCloudinaryByUrl, extractPublicId } = require('../utils/cloudinary');
const prisma = require('../db');

// Helper function untuk ambil partner berdasarkan user_id
const getPartnerByUserId = async (userId) => {
  const partner = await prisma.partner.findUnique({
    where: { user_id: userId },
  });
  
  if (!partner) {
    throw new ApiError(404, "Partner UMKM tidak ditemukan! Pastikan UMKM sudah diverifikasi.");
  }
  
  return partner;
};

// Helper function untuk validasi ownership produk
const validateProductOwnership = async (productId, userId, isAdmin) => {
  const product = await findProductById(productId);
  
  if (!product) {
    throw new ApiError(404, "Produk tidak ditemukan!");
  }

  // Admin bisa akses semua produk
  if (isAdmin) {
    return product;
  }

  // UMKM hanya bisa akses produk sendiri
  const partner = await getPartnerByUserId(userId);
  
  if (product.partner_id !== partner.id) {
    throw new ApiError(403, "Akses ditolak! Produk ini bukan milik UMKM Anda.");
  }

  return product;
};

// Get all products (untuk admin atau public)
const getAllProducts = async () => {
    const products = await findAllProducts();
    // Kembalikan array kosong jika tidak ada produk, tidak perlu throw error
    return products || [];
}

// Get products by partner (untuk UMKM)
// const getProductsByPartner = async (userId) => {
//     const partner = await getPartnerByUserId(userId);
//     const products = await findProductsByPartnerId(partner.id);
    
//     // Return empty array jika belum ada produk
//     return products || [];
// }

// Get product by ID dengan validasi ownership untuk UMKM
const getProductById = async (productId, userId, isAdmin) => {
    const product = await findProductById(productId);
    
    if (!product || product === null) {
        throw new ApiError(404, 'Produk tidak ditemukan!');
    }
    
    // Jika ada userId dan bukan admin, validasi ownership
    if (userId && !isAdmin) {
        // cek kalau user punya partner atau ndak
        const partner = await prisma.partner.findUnique({
            where: { user_id: userId },
        });
        
        // validasi UMKM kalo punya partner
        if (partner && product.partner_id !== partner.id) {
            throw new ApiError(403, "Akses ditolak! Produk ini bukan milik UMKM Anda.");
        }
        // akses semua produk (customer)
    }
    
    return product;
}

// Remove product by ID
const removeProductById = async (idProduct, userId, isAdmin) => {
    const existingProduct = await validateProductOwnership(idProduct, userId, isAdmin);
    console.log("produk yang dicari: ", existingProduct)

    if (!existingProduct) {
        throw new ApiError(404, 'Produk tidak ditemukan!');
    }

    if (existingProduct.image) {
        try {
            await deleteFromCloudinaryByUrl(existingProduct.image);
        } catch (error) {
            console.error('Error deleting image from Cloudinary:', error);
            throw new ApiError(500, 'Gagal menghapus gambar produk dari Cloudinary!');
        }
    }

    const productData = await deleteProductById(idProduct);
    if (!productData) {
        throw new ApiError(500, 'Gagal menghapus produk!');
    }
    return productData;
}

// Create new product
const createProduct = async (newProductData) => {
    try {
        const { image, stock, user_id, is_admin, ...rest } = newProductData

        let finalPartnerId;

        // Jika admin, gunakan partner default admin
        if (is_admin) {
            const defaultPartner = await getOrCreateDefaultAdminPartner();
            finalPartnerId = defaultPartner.id;
            console.log('🏢 Admin membuat produk menggunakan partner default:', defaultPartner.name);
        } else {
            // Jika UMKM, ambil partner mereka
            const partner = await getPartnerByUserId(user_id);
            finalPartnerId = partner.id;
            console.log('🏪 UMKM membuat produk menggunakan partner:', partner.name);
        }

        const cleanProductData = {
            ...rest,
            price: parseInt(rest.price),
            partner_id: finalPartnerId,
            weight: parseInt(rest.weight),
        };
        const stockProduct = parseInt(stock)

        let imageUrl = null;
        if (image) {
            try {
                imageUpload = await uploadToCloudinary(image.buffer, image.originalname, { folder: 'product' });
                imageUrl = imageUpload.url;
                console.log('Image URL:', imageUrl);
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
                throw new ApiError(500, 'Gagal mengunggah gambar produk!', " " + (error.message || error));

            }
        }

        const productNewData = await createNewProduct(
            {
                ...cleanProductData,
                image: imageUrl
            });
        if (!productNewData) {
            throw new ApiError(500, 'Gagal menambahkan produk!');
        }
        const inventoryData = {
            products_id: productNewData.id,
            stock: stockProduct
        };
        await createInventory(inventoryData);
        return productNewData;
    } catch (error) {
        console.error('Error in createProduct:', error);
        throw error instanceof ApiError ? error : new ApiError(500, (error.message || error));
    }
}

// Update product
const updateProduct = async (id, updatedProductData, userId, isAdmin) => {
    try {
        if (isNaN(parseInt(id))) {
            throw new ApiError(400, 'ID produk tidak valid!');
        }
        
        const product = await validateProductOwnership(id, userId, isAdmin);
        if (!product) {
            throw new ApiError(404, 'Produk tidak ditemukan!');
        }

        const { productFile, stock, ...rest } = updatedProductData
        console.log('productFile:', productFile);

        const cleanProductData = {
            ...rest,
            ...(rest.weight !== undefined && {weight: parseInt(rest.weight)}),
            ...(rest.price !== undefined && {price: parseInt(rest.price)}),
        };

        // UMKM tidak bisa mengubah partner_id (selalu milik mereka sendiri)
        // Admin juga tidak perlu mengubah partner_id
        delete cleanProductData.partner_id;

        if (productFile && productFile.buffer && productFile.originalname) {
            if (product.image) {
                try {
                    await deleteFromCloudinaryByUrl(product.image);
                } catch (error) {
                    console.error('Error deleting image from Cloudinary:', error);
                    throw new ApiError(500, 'Gagal menghapus gambar produk dari Cloudinary!', " " + (error.message || error));
                }
            }
            try {
                const imageUpload = await uploadToCloudinary(productFile.buffer, productFile.originalname);
                cleanProductData.image = imageUpload.url;
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
                throw new ApiError(500, 'Gagal mengunggah gambar produk!', " " + (error.message || error));

            }
        } else {
            cleanProductData.image = product.image;
        }

        const updatedProduct = await updateDataProduct(id, cleanProductData);

        if (stock !== undefined) {
            const parsedStock = parseInt(stock);
            await updateInventoryStock({
                products_id: updatedProduct.id,
                stock: parsedStock,
            });
        }

        return updatedProduct;
    } catch (error) {
        console.error('Error in updateProduct:', error);
        throw error instanceof ApiError ? error : new ApiError(500, 'Terjadi kesalahan saat memperbarui produk.' + (error.message || error));
    }
}

module.exports = { 
  getAllProducts, 
//   getProductsByPartner,
  createProduct, 
  updateProduct, 
  getProductById, 
  removeProductById 
};