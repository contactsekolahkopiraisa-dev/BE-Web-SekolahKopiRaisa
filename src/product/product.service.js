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
// const { getOrCreateDefaultAdminPartner } = require('../partners/partner.service');
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
        const { image, stock, user_id, is_admin, ...rest } = newProductData;

        let finalPartnerId;

        const partner = await getPartnerByUserId(user_id);
        finalPartnerId = partner.id;
        console.log(`✅ User ID ${user_id} membuat produk dengan partner: ${partner.name}`);

        const cleanProductData = {
            ...rest,
            price: parseInt(rest.price),
            partner_id: finalPartnerId,
            weight: parseInt(rest.weight),
        };
        const stockProduct = parseInt(stock);

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

        // ✅ GUNAKAN TRANSACTION untuk atomic operation
        const productNewData = await prisma.$transaction(async (tx) => {
            // 1. Create product
            const newProduct = await tx.product.create({
                data: {
                    ...cleanProductData,
                    image: imageUrl
                }
            });

            // 2. Create inventory
            await tx.inventory.create({
                data: {
                    products_id: newProduct.id,
                    stock: stockProduct
                }
            });

            // 3. ✅ AUTO-CREATE entry di tabel Harga
            await tx.harga.create({
                data: {
                    id_product: newProduct.id,
                    harga: cleanProductData.price,
                    status: 'Aktif',
                    waktu_mulai: new Date(),
                }
            });

            console.log(`✅ Harga awal produk "${cleanProductData.name}" berhasil dicatat: Rp ${cleanProductData.price}`);

            return newProduct;
        });

        return productNewData;
    } catch (error) {
        console.error('Error in createProduct:', error);
        throw error instanceof ApiError ? error : new ApiError(500, (error.message || error));
    }
};

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

        const { productFile, stock, ...rest } = updatedProductData;
        console.log('productFile:', productFile);

        const cleanProductData = {
            ...rest,
            ...(rest.weight !== undefined && {weight: parseInt(rest.weight)}),
            ...(rest.price !== undefined && {price: parseInt(rest.price)}),
        };

        // UMKM tidak bisa mengubah partner_id
        delete cleanProductData.partner_id;

        // Handle image upload
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

        // ✅ GUNAKAN TRANSACTION untuk update product + harga
        const updatedProduct = await prisma.$transaction(async (tx) => {
            // 1. Update product
            const updated = await tx.product.update({
                where: { id: parseInt(id) },
                data: cleanProductData
            });

            // 2. Update inventory jika ada perubahan stock
            if (stock !== undefined) {
                await tx.inventory.upsert({
                    where: { products_id: parseInt(id) },
                    update: { stock: parseInt(stock) },
                    create: {
                        products_id: parseInt(id),
                        stock: parseInt(stock)
                    }
                });
            }

            // 3. ✅ Jika harga berubah, catat perubahan di tabel Harga
            if (cleanProductData.price && cleanProductData.price !== product.price) {
                // Set harga lama jadi nonaktif
                await tx.harga.updateMany({
                    where: {
                        id_product: parseInt(id),
                        status: 'Aktif',
                    },
                    data: {
                        status: 'Nonaktif',
                        waktu_berakhir: new Date(),
                    }
                });

                // Create harga baru
                await tx.harga.create({
                    data: {
                        id_product: parseInt(id),
                        harga: cleanProductData.price,
                        status: 'Aktif',
                        waktu_mulai: new Date(),
                    }
                });

                console.log(
                    `✅ Harga produk "${updated.name}" diupdate: Rp ${product.price} → Rp ${cleanProductData.price}`
                );
            }

            return updated;
        });

        return updatedProduct;
    } catch (error) {
        console.error('Error in updateProduct:', error);
        throw error instanceof ApiError ? error : new ApiError(500, 'Terjadi kesalahan saat memperbarui produk.' + (error.message || error));
    }
};

// ==================== FUNGSI HELPER UNTUK HARGA ====================

/**
 * Set promo harga untuk produk
 */
const setProductPromo = async (productId, { promoPrice, waktuMulai, waktuBerakhir }, userId, isAdmin) => {
    const product = await validateProductOwnership(productId, userId, isAdmin);
    
    if (!product) {
        throw new ApiError(404, 'Produk tidak ditemukan');
    }

    await prisma.harga.create({
        data: {
            id_product: parseInt(productId),
            harga: parseInt(promoPrice),
            status: 'Promo',
            waktu_mulai: waktuMulai ? new Date(waktuMulai) : new Date(),
            waktu_berakhir: waktuBerakhir ? new Date(waktuBerakhir) : null,
        }
    });

    console.log(`✅ Harga promo produk "${product.name}" diset: Rp ${promoPrice}`);
    
    return product;
};

/**
 * Get harga aktif produk (termasuk cek promo yang masih valid)
 */
const getActivePrice = async (productId) => {
    const now = new Date();

    // Cek apakah ada promo yang masih valid
    const activePromo = await prisma.harga.findFirst({
        where: {
            id_product: parseInt(productId),
            status: 'Promo',
            waktu_mulai: { lte: now },
            OR: [
                { waktu_berakhir: null },
                { waktu_berakhir: { gte: now } },
            ],
        },
        orderBy: { waktu_mulai: 'desc' },
    });

    if (activePromo) {
        return {
            harga: activePromo.harga,
            status: 'Promo',
            id_harga: activePromo.id_harga,
        };
    }

    // Jika tidak ada promo, ambil harga aktif normal
    const activePrice = await prisma.harga.findFirst({
        where: {
            id_product: parseInt(productId),
            status: 'Aktif',
        },
        orderBy: { waktu_mulai: 'desc' },
    });

    if (!activePrice) {
        throw new ApiError(404, 'Harga produk tidak ditemukan');
    }

    return {
        harga: activePrice.harga,
        status: 'Aktif',
        id_harga: activePrice.id_harga,
    };
};

/**
 * Get history harga produk
 */
const getPriceHistory = async (productId, userId, isAdmin) => {
    await validateProductOwnership(productId, userId, isAdmin);
    
    const history = await prisma.harga.findMany({
        where: {
            id_product: parseInt(productId),
        },
        orderBy: {
            waktu_mulai: 'desc',
        },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    return history;
};

module.exports = { 
  getAllProducts, 
//   getProductsByPartner,
  createProduct, 
  updateProduct, 
  getProductById, 
  removeProductById,
  setProductPromo,
  getActivePrice,
  getPriceHistory,
};