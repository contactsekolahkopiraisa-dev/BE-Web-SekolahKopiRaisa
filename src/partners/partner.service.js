const ApiError = require("../utils/apiError");
const prisma = require("../db");

const {
    findPartner,
    findPartnerById,
    findPartnerByUserId,
    insertNewPartner,
    deletePartner,
    editPartner
} = require("./partner.repository");

// Helper function: Get atau create default admin partner
const getOrCreateDefaultAdminPartner = async () => {
    // Cek apakah sudah ada partner default admin
    let defaultPartner = await prisma.partner.findFirst({
        where: {
            name: 'Admin Sekolah Kopi Raisa',
            user_id: null
        }
    });

    // Jika belum ada, buat baru
    if (!defaultPartner) {
        defaultPartner = await prisma.partner.create({
            data: {
                name: 'Admin Sekolah Kopi Raisa',
                owner_name: 'Administrator',
                phone_number: '-', // Ganti dengan nomor admin yang sebenarnya
                address: 'Jl. Sekolah Kopi Raisa No. 1',
                user_id: null,
            }
        });
        console.log('✅ Partner default admin berhasil dibuat:', defaultPartner);
    }

    return defaultPartner;
};

const getAllPartners = async () => {
    const partners = await findPartner();
    if (!partners) {
        throw new ApiError(500,'Gagal mendapatkan data partner!');
    }
    return partners;
};

const getPartnerById = async (partnerId) => {
    const partner = await findPartnerById(partnerId);
    console.log('partner database:', partner);
    
    if (!partner) {
        throw new ApiError(404,'Partner tidak ditemukan!');
    }

    return partner;
};

const getMyPartnerProfile = async (userId) => {
    const partner = await findPartnerByUserId(userId);
    
    if (!partner) {
        throw new ApiError(404, 'Profil partner tidak ditemukan!');
    }

    return partner;
};

const createPartner = async (newPartnerData) => {
    const partnerNewData = await insertNewPartner(newPartnerData);

    return partnerNewData;
};

const updatePartner = async (id, editedPartnerData, userId, isAdmin) => {
    const existingPartner = await findPartnerById(id);
    
    if (!existingPartner) {
        throw new ApiError(404,'Partner tidak ditemukan!');
    }

    // Cek apakah ini partner default admin
    if (existingPartner.user_id === null && existingPartner.name === 'Admin Sekolah Kopi Raisa') {
        // Hanya admin yang bisa update partner default
        if (!isAdmin) {
            throw new ApiError(403, 'Akses ditolak! Hanya admin yang bisa mengupdate partner default.');
        }
    } else {
        // Validasi akses: admin bisa update semua, UMKM hanya bisa update miliknya sendiri
        if (!isAdmin && existingPartner.user_id !== userId) {
            throw new ApiError(403, 'Akses ditolak! Anda tidak memiliki izin untuk mengupdate partner ini.');
        }
    }

    console.log('data update:', editedPartnerData);

    const partnerData = await editPartner(id, editedPartnerData);

    return partnerData;
};

const removePartner = async (id) => {
    const existingPartner = await findPartnerById(id);
    
    if (!existingPartner) {
        throw new ApiError(404,'Partner tidak ditemukan!');
    }

    // Cek apakah ini partner default admin - tidak bisa dihapus
    if (existingPartner.user_id === null && existingPartner.name === 'Admin Sekolah Kopi Raisa') {
        throw new ApiError(403, 'Partner default admin tidak bisa dihapus!');
    }

    const partnerData = await deletePartner(id);
    
    if (!partnerData) {
        throw new ApiError(500,'Gagal menghapus partner!');
    }
    return partnerData;
};

module.exports = { 
    getAllPartners, 
    getPartnerById, 
    getMyPartnerProfile,
    createPartner, 
    updatePartner, 
    removePartner,
    getOrCreateDefaultAdminPartner
};