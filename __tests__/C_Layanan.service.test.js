// Mock 1: Utilities (ApiError, Cloudinary, Email, dll.)
jest.mock('../src/utils/apiError.js', () => {
    return class ApiError extends Error {
        constructor(statusCode, message) {
            super(message);
            this.statusCode = statusCode;
        }
    };
});
jest.mock('../src/services/cloudinaryUpload.service.js', () => ({ uploadToCloudinary: jest.fn() }));
jest.mock('../src/services/cloudinaryDelete.service.js', () => ({ deleteFromCloudinaryByUrl: jest.fn() }));
jest.mock('../src/utils/email.js', () => ({ sendEmail: jest.fn() }));
jest.mock('../src/utils/sanitizeData.js', () => ({ sanitizeData: jest.fn(data => data) }));
jest.mock('../src/utils/calculateDurationMonth.js', () => ({ calculateDurationMonth: jest.fn(() => 3) }));

// Mock 2: Repository Layer (Inti Isolasi)
jest.mock('../src/layanan/C_Layanan.repository.js');
const { layananRepository, jenisLayananRepository, statusKodeRepository, layananRejectionRepository } = require('../src/layanan/C_Layanan.repository.js');

// Mock 3: Helper Layer
jest.mock('../src/layanan/C_Layanan.helper.js');
const { buildFilter, hitungPeserta, sendNotifikasiAdminLayanan, sendNotifikasiPengusulLayanan } = require('../src/layanan/C_Layanan.helper.js');

// Mock 4: Prisma Transaction
jest.mock('../src/db/index.js', () => ({ 
    $transaction: jest.fn(async (callback) => await callback({})), 
}));

// Import Target
const { layananService, jenisLayananService } = require('../src/layanan/C_Layanan.service.js');
const ApiError = require('../src/utils/apiError.js');
const { STATUS } = require('../src/utils/constant/enum.js');


describe('LAYANAN SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default helper behavior
        buildFilter.mockReturnValue({ where: {}, orderBy: { created_at: 'desc' } });
    });

    // ------------------------------------------
    // JENIS LAYANAN SERVICE (Tests Sederhana)
    // ------------------------------------------
    describe('jenisLayananService', () => {
        const mockJenisLayanan = { id: 1, nama_jenis_layanan: 'Pelatihan', is_active: true };
        
        it('getAll should return all items', async () => {
            jenisLayananRepository.findAll.mockResolvedValue([mockJenisLayanan]);
            await expect(jenisLayananService.getAll()).resolves.toEqual([mockJenisLayanan]);
            expect(jenisLayananRepository.findAll).toHaveBeenCalledTimes(1);
        });

        it('getById should throw 404 if not found', async () => {
            jenisLayananRepository.findById.mockResolvedValue(null);
            await expect(jenisLayananService.getById(999)).rejects.toThrow(ApiError);
        });
    });

    // ------------------------------------------
    // LAYANAN SERVICE (Logika Bisnis Update Status)
    // ------------------------------------------
    describe('layananService.updateStatus', () => {
        const mockAdmin = { id: 1, admin: true, role: 'admin' };
        const mockCustomer = { id: 2, role: 'customer' };
        const mockLayananPending = {
            id: 1, pemohon: { id: 2 },
            pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
            pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
            layananRejection: [],
        };

        it('should update status to DISETUJUI and BELUM_TERLAKSANA when accepted by admin', async () => {
            layananService.getById = jest.fn().mockResolvedValue(mockLayananPending);
            statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DISETUJUI.id });
            layananRepository.update.mockResolvedValue({});

            await layananService.updateStatus(1, mockAdmin, STATUS.DISETUJUI.id);

            expect(layananRepository.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    id_status_pengajuan: STATUS.DISETUJUI.id,
                    id_status_pelaksanaan: STATUS.BELUM_TERLAKSANA.id,
                })
            );
        });

        it('should throw 400 ApiError if admin rejects without a reason', async () => {
            layananService.getById = jest.fn().mockResolvedValue(mockLayananPending);
            statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DITOLAK.id });

            await expect(
                layananService.updateStatus(1, mockAdmin, STATUS.DITOLAK.id, null) // alasan: null
            ).rejects.toMatchObject({
                statusCode: 400,
                message: 'Alasan Penolakan harus disertakan!',
            });
        });
        
        it('should allow customer owner to finish service from SEDANG_BERJALAN to SELESAI', async () => {
             const mockLayananBerjalan = {
                ...mockLayananPending,
                pelaksanaan: { id: STATUS.SEDANG_BERJALAN.id },
            };
            layananService.getById = jest.fn().mockResolvedValue(mockLayananBerjalan);
            statusKodeRepository.findById.mockResolvedValue({ id: STATUS.SELESAI.id });

            await layananService.updateStatus(1, mockCustomer, STATUS.SELESAI.id);

            expect(layananRepository.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ id_status_pelaksanaan: STATUS.SELESAI.id })
            );
        });
    });
});