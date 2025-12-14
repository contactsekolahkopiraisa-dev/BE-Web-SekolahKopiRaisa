// mock printilan
jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => require('../__mocks__/cloudinaryUpload.mock.js'));
jest.mock('../src/services/cloudinaryDelete.service.js', () => require('../__mocks__/cloudinaryDelete.mock.js'));
jest.mock('../src/utils/sanitizeData.js');
const { sanitizeData } = require('../src/utils/sanitizeData.js');

// Mock Repository Layer
jest.mock('../src/sertifikat/C_Sertifikat.repository.js');
const { sertifikatRepository } = require('../src/sertifikat/C_Sertifikat.repository.js');
// Mock Layanan Service
jest.mock('../src/layanan/C_Layanan.service.js');
const { layananService } = require('../src/layanan/C_Layanan.service.js');

// Import Target
const { sertifikatService } = require('../src/sertifikat/C_Sertifikat.service.js');
const { STATUS } = require('../src/utils/constant/enum.js');


describe('SERTIFIKAT SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // make sure sanitizeData mengembalikan input sebagai copy objek untuk keamanan
        sanitizeData.mockImplementation(data => data ? { ...data } : {}); 
        // setup mock return value for upload
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