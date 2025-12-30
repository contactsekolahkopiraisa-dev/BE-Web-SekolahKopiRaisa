// mock printilan
jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => require('../__mocks__/cloudinaryUpload.mock.js'));
jest.mock('../src/services/cloudinaryDelete.service.js', () => require('../__mocks__/cloudinaryDelete.mock.js'));
jest.mock('../src/utils/sanitizeData.js');
const { sanitizeData } = require('../src/utils/sanitizeData.js');

jest.mock('../src/services/fiturLayananEmailSender.service.js', () => ({
    sendEmailLayananNotif: jest.fn().mockResolvedValue(true)
}));

// Mock Repository Layer
jest.mock('../src/sertifikat/C_Sertifikat.repository.js');
const { sertifikatRepository } = require('../src/sertifikat/C_Sertifikat.repository.js');
// Mock Layanan Service
jest.mock('../src/layanan/C_Layanan.service.js');
const { layananService } = require('../src/layanan/C_Layanan.service.js');

// Import Target
const { sertifikatService } = require('../src/sertifikat/C_Sertifikat.service.js');
const { STATUS, STATEMENT_LAYANAN } = require('../src/utils/constant/enum.js');

describe('SERTIFIKAT SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // pastikan sanitizeData mengembalikan input sebagai copy objek
        sanitizeData.mockImplementation(data => data ? { ...data } : {});
        require('../src/services/cloudinaryUpload.service.js').uploadToCloudinary.mockResolvedValue({
            url: 'http://cloudinary.com/sertifikat.pdf'
        });
    });

    const mockFile = { buffer: Buffer.from('file'), originalname: 'sertif.pdf' };
    const mockUserAdmin = { id: 1, role: 'admin' };
    const mockUserCustomer = { id: 2, role: 'customer' };
    const mockData = { id_layanan: 1, link_sertifikat: 'drive.com/link' };

    const mockLayananApproved = {
        id: 1, pemohon: { id: 2 },
        user: { name: 'jon do', email: 'customer@test.com', phone_number: '01234' },
        laporan: {
            statusPelaporan: { id: 5, nama_status_kode: STATUS.DISETUJUI.nama_status_kode }
        }
    };

    const mockSertifikatData = {
        id: 1,
        layanan: { id_user: 2, konfigurasiLayanan: { detailKonfigurasis: [] }, user: { email: 'test@test.com' } }
    };

    // TEST UNTUK FUNGSI getById (Menyelesaikan Coverage Funcs & Lines 11-25)
    describe('getById', () => {
        it('should return certificate if found and user is admin', async () => {
            sertifikatRepository.getById.mockResolvedValue(mockSertifikatData);
            
            const result = await sertifikatService.getById(1, mockUserAdmin);
            
            expect(result).toEqual(mockSertifikatData);
            expect(sertifikatRepository.getById).toHaveBeenCalledWith(1);
        });

        it('should return certificate if user is the owner', async () => {
            sertifikatRepository.getById.mockResolvedValue(mockSertifikatData);
            
            const result = await sertifikatService.getById(1, mockUserCustomer);
            
            expect(result).toEqual(mockSertifikatData);
        });

        it('should throw 404 if certificate not found', async () => {
            sertifikatRepository.getById.mockResolvedValue(null);

            await expect(sertifikatService.getById(99, mockUserAdmin)).rejects.toMatchObject({
                statusCode: 404,
                message: "Sertifikat tidak ditemukan !"
            });
        });

        it('should throw 403 if user is not admin and not the owner', async () => {
            const strangerUser = { id: 99, role: 'customer' };
            sertifikatRepository.getById.mockResolvedValue(mockSertifikatData);

            await expect(sertifikatService.getById(1, strangerUser)).rejects.toMatchObject({
                statusCode: 403,
                message: "Hanya user yang bersangkutan yang dapat mengakses sertifikat !"
            });
        });
    });

    // TEST UNTUK FUNGSI create
    describe('create', () => {
        const mockCreatedResponse = {
            id: 1,
            layanan: {
                jenis_layanan: { nama_jenis_layanan: 'Magang' },
                konfigurasiLayanan: { detailKonfigurasis: [] },
                peserta: [{ nama_peserta: 'jon do', nim: '3232' }],
                user: { email: 'customer@test.com' }
            }
        };

        it('should create certificate and upload file if report status is valid', async () => {
            layananService.getById.mockResolvedValue(mockLayananApproved);
            sertifikatRepository.create.mockResolvedValue(mockCreatedResponse);

            await sertifikatService.create(STATEMENT_LAYANAN.SERTIFIKAT_DIKIRIM, mockData, mockFile, mockUserAdmin);

            expect(sertifikatRepository.create).toHaveBeenCalled();
        });

        it('should throw 409 if related report is not filled (BELUM_TERSEDIA)', async () => {
            const mockLayananNoReport = {
                id: 1,
                laporan: { nama_status_kode: STATUS.BELUM_TERSEDIA.nama_status_kode }
            };
            layananService.getById.mockResolvedValue(mockLayananNoReport);

            await expect(sertifikatService.create(STATEMENT_LAYANAN.SERTIFIKAT_DIKIRIM, mockData, mockFile, mockUserAdmin)).rejects.toMatchObject({
                statusCode: 409,
                message: expect.stringContaining('Hanya bisa upload sertifikat setelah laporan diisi'),
            });
        });

        it('should create certificate without file upload if file is not provided', async () => {
            layananService.getById.mockResolvedValue(mockLayananApproved);
            sertifikatRepository.create.mockResolvedValue(mockCreatedResponse);

            await sertifikatService.create(STATEMENT_LAYANAN.SERTIFIKAT_DIKIRIM, mockData, null, mockUserAdmin);

            expect(sertifikatRepository.create).toHaveBeenCalled();
        });
    });
});