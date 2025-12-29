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
        user: { name: 'jon do', email: 'customer@test.com', phone_number: '01234' },
        laporan: {
            statusPelaporan: { id: 5, nama_status_kode: STATUS.DISETUJUI.nama_status_kode }
        }
    };
    const mockCreatedResponse = {
        id: 1,
        layanan: {
            jenisLayanan: { nama_jenis_layanan: 'Magang' },
            konfigurasiLayanan: {
                detailKonfigurasis: [
                    {
                        kegiatan: { nama_kegiatan: 'Kegiatan Test' },
                        subKegiatan: { nama_sub_kegiatan: 'Sub Test' },
                        urutan_ke: 1
                    }
                ]
            },
            pesertas: [{ nama_peserta: 'jon do', nim: '3232' }],
            user: { name: 'jon do', email: 'customer@test.com', phone_number: '01234' }
        }
    };

    it('create should create certificate and upload file if report status is DISETUJUI', async () => {
        layananService.getById.mockResolvedValue(mockLayananApproved);
        sertifikatRepository.create.mockResolvedValue(mockCreatedResponse)

        await sertifikatService.create(STATEMENT_LAYANAN.SERTIFIKAT_DIKIRIM, mockData, mockFile, mockUserAdmin);

        expect(sertifikatRepository.create).toHaveBeenCalled();
    });

    it('create should throw 409 if related report is not approved (Prasyarat Status)', async () => {
        const mockLayananNoReport = {
            id: 1,
            pemohon: { id: 1 },
            user: { name: 'jon do', email: 'customer@test.com', phone_number: '01234' },
            laporan: {
                nama_status_kode: STATUS.BELUM_TERSEDIA.nama_status_kode
            }
        };
        layananService.getById.mockResolvedValue(mockLayananNoReport);
        sertifikatRepository.create.mockResolvedValue(mockCreatedResponse)

        await expect(sertifikatService.create(STATEMENT_LAYANAN.SERTIFIKAT_DIKIRIM, mockData, mockFile, mockUserAdmin)).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('Hanya bisa upload sertifikat setelah laporan diisi'),
        });
    });
});