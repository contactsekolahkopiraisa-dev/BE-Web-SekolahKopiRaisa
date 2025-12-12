// __tests__/C_Mou.service.test.js (FINAL FIX)

// Mock Utilities
jest.mock('../src/utils/apiError.js', () => {
    return class ApiError extends Error {
        constructor(statusCode, message) { super(message); this.statusCode = statusCode; }
    };
});
jest.mock('../src/services/cloudinaryUpload.service.js', () => ({ 
    uploadToCloudinary: jest.fn().mockResolvedValue({ url: 'http://cloudinary.com/mou.pdf' }) 
}));
// PENTING: Import sanitizeData explicitly
jest.mock('../src/utils/sanitizeData.js');
const { sanitizeData } = require('../src/utils/sanitizeData.js');

// Mock Repository Layer (Gunakan alias mock)
jest.mock('../src/mou/C_Mou.repository.js');
jest.mock('../src/layanan/C_Layanan.repository.js');
const { mouRepository: mockMouRepository, mouRejectionRepository: mockMouRejectionRepository } = require('../src/mou/C_Mou.repository.js');
const { layananRepository: mockLayananRepository } = require('../src/layanan/C_Layanan.repository.js');

// Mock Prisma Transaction
jest.mock('../src/db/index.js', () => ({ 
    $transaction: jest.fn(async (callback) => {
        await callback({
            // Tambahkan create method ke mock Mou
            Mou: { findById: mockMouRepository.findById, update: mockMouRepository.update, create: mockMouRepository.create }, 
            MouRejection: { create: mockMouRejectionRepository.create },
            Layanan: { update: mockLayananRepository.update }
        });
    }), 
}));

// FIX KRUSIAL: Mock ENUM secara eksplisit di awal
const MOCK_STATUS = {
    MENUNGGU_PERSETUJUAN: { id: 1, nama_status_kode: 'Menunggu Persetujuan' },
    BELUM_TERLAKSANA: { id: 3, nama_status_kode: 'Belum Terlaksana' },
    SEDANG_BERJALAN: { id: 4, nama_status_kode: 'Sedang Berjalan' },
    DISETUJUI: { id: 5, nama_status_kode: 'Disetujui' },
    DITOLAK: { id: 6, nama_status_kode: 'Ditolak' },
};
jest.mock('../src/utils/constant/enum.js', () => ({
    STATUS: MOCK_STATUS,
}));
const { STATUS } = require('../src/utils/constant/enum.js');


// Import Target
const { mouService } = require('../src/mou/C_Mou.service.js');


describe('MOU SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // FIX: Pastikan sanitizeData mengembalikan objek copy
        sanitizeData.mockImplementation(data => data ? { ...data } : {}); 
        global.now = jest.fn(() => new Date());
        
        // Mock default behavior for repositories
        mouService.getById = jest.fn().mockResolvedValue(mockMou);
        mockMouRepository.findById.mockResolvedValue(mockMou);
        mockMouRepository.update.mockResolvedValue({});
        mockLayananRepository.update.mockResolvedValue({});
        mockMouRejectionRepository.create.mockResolvedValue({});
        
        // FIX: Tambahkan mock untuk create method
        mockMouRepository.create.mockResolvedValue(mockMou); 
    });
    
    const mockFile = { buffer: Buffer.from('file'), originalname: 'mou.pdf' };
    const mockMou = { id: 1, id_layanan: 1, file_mou: 'http://cloudinary.com/mou_a.pdf', id_status_pengajuan: STATUS.MENUNGGU_PERSETUJUAN.id };

    it('create should successfully create MOU and upload file', async () => {
        const result = await mouService.create({ id_layanan: 1 }, mockFile);

        // Assert CREATE dipanggil dengan ID yang benar
        expect(mockMouRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ id_status_pengajuan: STATUS.MENUNGGU_PERSETUJUAN.id })
        );
        expect(result.id_layanan).toBe(1);
    });

    it('updateStatus (Accept) should call repository to update Layanan status', async () => {
        await mouService.updateStatus({ id: 1 }, {}, STATUS.DISETUJUI.id);

        // Assert Layanan update ke SEDANG_BERJALAN (4)
        expect(mockLayananRepository.update).toHaveBeenCalledWith(1, { id_status_pelaksanaan: STATUS.SEDANG_BERJALAN.id });
        expect(mockMouRepository.update).toHaveBeenCalled();
    });

    it('updateStatus (Reject) should create rejection record', async () => {
        await mouService.updateStatus({ id: 1 }, { alasan: 'Alasan Tolak' }, STATUS.DITOLAK.id);

        // Assert Rejection Repository dipanggil
        expect(mockMouRejectionRepository.create).toHaveBeenCalled();
        expect(mockMouRepository.update).toHaveBeenCalled();
    });
});