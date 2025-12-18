const ApiError = require("../utils/apiError");

const {
    findPartner,
    findPartnerById,
    findPartnerByUserId,
    insertNewPartner,
    deletePartner,
    editPartner
} = require("./partner.repository");

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

    // Validasi akses: admin bisa update semua, UMKM hanya bisa update miliknya sendiri
    if (!isAdmin && existingPartner.user_id !== userId) {
        throw new ApiError(403, 'Akses ditolak! Anda tidak memiliki izin untuk mengupdate partner ini.');
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
    removePartner 
};