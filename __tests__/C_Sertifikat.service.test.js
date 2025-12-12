// __tests__/C_Sertifikat.service.test.js (FINAL FIX)

// Mock Utilities
jest.mock('../src/utils/apiError.js', () => {
    return class ApiError extends Error {
        constructor(statusCode, message) { super(message); this.statusCode = statusCode; }
    };
});
jest.mock('../src/services/cloudinaryUpload.service.js', () => ({ 
    uploadToCloudinary: jest.fn() 
}));
// PENTING: Import sanitizeData explicitly
jest.mock('../src/utils/sanitizeData.js');
const { sanitizeData } = require('../src/utils/sanitizeData.js');

// Mock Repository Layer
jest.mock('../src/sertifikat/C_Sertifikat.repository.js');
const { sertifikatRepository } = require('../src/sertifikat/C_Sertifikat.repository.js');

// Mock Layanan Service (Circular Dependency)
jest.mock('../src/layanan/C_Layanan.service.js');
const { layananService } = require('../src/layanan/C_Layanan.service.js');


// Import Target
const { sertifikatService } = require('../src/sertifikat/C_Sertifikat.service.js');
const { STATUS } = require('../src/utils/constant/enum.js');


describe('SERTIFIKAT SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // FIX: Pastikan sanitizeData mengembalikan input sebagai copy objek untuk keamanan
        sanitizeData.mockImplementation(data => data ? { ...data } : {}); 
        
        // FIX: Setup mock return value for upload
        require('../src/services/cloudinaryUpload.service.js').uploadToCloudinary.mockResolvedValue({ 
            url: 'http://cloudinary.com/sertifikat.pdf' 
        });
    });
    
    const mockFile = { buffer: Buffer.from('file'), originalname: 'sertif.pdf' };
    const mockUserAdmin = { id: 1, role: 'admin' };
    const mockData = { id_layanan: 1, link_sertifikat: 'drive.com/link' };

    const mockLayananApproved = {
        id: 1, pemohon: { id: 1 },
        laporan: { 
            statusPelaporan: { id: 5, nama_status_kode: STATUS.DISETUJUI.nama_status_kode }
        }
    };

    it('create should create certificate and upload file if report status is DISETUJUI', async () => {
        layananService.getById.mockResolvedValue(mockLayananApproved);
        sertifikatRepository.create.mockResolvedValue({ id: 1 });

        await sertifikatService.create(mockData, mockFile, mockUserAdmin);

        expect(sertifikatRepository.create).toHaveBeenCalled();
    });

    it('create should throw 409 if related report is not approved (Prasyarat Status)', async () => {
         const mockLayananPending = {
            id: 1, pemohon: { id: 1 },
            laporan: { 
                statusPelaporan: { id: 1, nama_status_kode: STATUS.MENUNGGU_PERSETUJUAN.nama_status_kode }
            }
        };
         layananService.getById.mockResolvedValue(mockLayananPending);

        await expect(sertifikatService.create(mockData, mockFile, mockUserAdmin)).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('Hanya bisa upload sertifikat setelah laporan disetujui'),
        });
    });
});