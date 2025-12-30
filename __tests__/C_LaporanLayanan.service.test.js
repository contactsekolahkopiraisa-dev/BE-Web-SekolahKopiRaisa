// mock variabel eksplisit
const mockFindUserByRole = jest.fn();
const mockSanitizeData = jest.fn();

// Mock Utilities & Services
jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => ({
    uploadToCloudinary: jest.fn()
}));
jest.mock('../src/utils/sanitizeData.js', () => ({
    sanitizeData: mockSanitizeData
}));
jest.mock('../src/services/fiturLayananEmailSender.service.js', () => ({
    sendEmailLayananNotif: jest.fn().mockResolvedValue(true)
}));

// Mock Repository Layer
jest.mock('../src/laporan_layanan/C_LaporanLayanan.repository.js', () => ({
    laporanLayananRepository: {
        findById: jest.fn(),
        create: jest.fn()
    }
}));

// Mock Layanan Service
jest.mock('../src/layanan/C_Layanan.service.js', () => ({
    layananService: {
        getById: jest.fn()
    }
}));

// Mock Auth Repository
jest.mock('../src/auth/user.repository.js', () => ({
    findUserByRole: mockFindUserByRole
}));

// Import Target
const { laporanLayananService } = require('../src/laporan_layanan/C_LaporanLayanan.service.js');
const { laporanLayananRepository } = require('../src/laporan_layanan/C_LaporanLayanan.repository.js');
const { layananService } = require('../src/layanan/C_Layanan.service.js');
const { STATUS } = require('../src/utils/constant/enum.js');
const ApiError = require('../src/utils/apiError.js');
const { uploadToCloudinary } = require('../src/services/cloudinaryUpload.service.js');

describe('LAPORAN LAYANAN SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSanitizeData.mockImplementation(data => data);
        // Default success mocks
        mockFindUserByRole.mockResolvedValue([{ email: 'admin@test.com' }]);
        uploadToCloudinary.mockResolvedValue({ url: 'http://cloudinary.com/foto.jpg' });
    });

    const mockFile = { buffer: Buffer.from('file'), originalname: 'foto.jpg', mimetype: 'image/jpeg' };
    const mockUser = { id: 2, role: 'customer', email: 'customer@test.com' };
    const mockData = { id_layanan: 1, nama_p4s: 'P4S ABC', asal_kab_kota: 'Jember' };

    const mockCreatedLaporan = {
        id: 1,
        layanan: {
            id: 1,
            user: { email: 'customer@test.com' },
            jenisLayanan: { nama_jenis_layanan: 'Magang' },
            konfigurasiLayanan: { detailKonfigurasis: [] },
            pesertas: []
        }
    };

    const mockLayananSelesai = {
        id: 1,
        pemohon: { id: 2 },
        instansi_asal: 'Universitas Jember',
        pelaksanaan: { id: STATUS.SELESAI.id },
        laporan: { nama_status_kode: STATUS.BELUM_TERSEDIA.nama_status_kode },
        jenis_layanan: { nama_jenis_layanan: 'Magang' },
        pengajuan: { nama_status_kode: 'DISETUJUI' },
        user: { name: 'jon do', email: 'customer@test.com' }
    };

    describe('getById', () => {
        it('should return formatted report data when found', async () => {
            laporanLayananRepository.findById.mockResolvedValue({
                id: 1,
                layanan: {
                    tanggal_mulai: '2024-01-01',
                    tanggal_selesai: '2024-02-01',
                    jenisLayanan: { nama_jenis_layanan: 'Magang' }
                }
            });
            const result = await laporanLayananService.getById(1);
            expect(result).toHaveProperty('lama_pelaksanaan');
            expect(result.id).toBe(1);
        });

        it('should return ApiError 404 when report not found', async () => {
            laporanLayananRepository.findById.mockResolvedValue(null);
            const result = await laporanLayananService.getById(99);
            expect(result).toBeInstanceOf(ApiError);
            expect(result.statusCode).toBe(404);
        });
    });

    describe('create', () => {
        it('should allow report for Kunjungan if approved (Simple Flow)', async () => {
            const mockSimple = {
                ...mockLayananSelesai,
                jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                pengajuan: { nama_status_kode: 'DISETUJUI' }
            };
            layananService.getById.mockResolvedValue(mockSimple);
            laporanLayananRepository.create.mockResolvedValue(mockCreatedLaporan);

            await laporanLayananService.create('Tahapan', mockData, mockFile, mockUser);
            expect(laporanLayananRepository.create).toHaveBeenCalled();
        });
        it('should allow report for Kunjungan if status is already "Selesai"', async () => {
            const mockSimpleSelesai = {
                ...mockLayananSelesai,
                jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                pengajuan: { nama_status_kode: 'Pelaksanaan Selesai' }
            };
            layananService.getById.mockResolvedValue(mockSimpleSelesai);
            laporanLayananRepository.create.mockResolvedValue(mockCreatedLaporan);

            const result = await laporanLayananService.create('Tahapan', mockData, mockFile, mockUser);
            expect(result).toBeDefined();
        });
        it('should throw 404 if file (foto kegiatan) is missing', async () => {
            await expect(laporanLayananService.create('Tahapan', mockData, null, mockUser))
                .rejects.toMatchObject({ statusCode: 404, message: /Foto kegiatan tidak disertakan/ });
        });

        it('should throw 403 if user is not the requester', async () => {
            // user id tidak sama
            layananService.getById.mockResolvedValue({ ...mockLayananSelesai, pemohon: { id: 99 } });

            await expect(laporanLayananService.create('Tahapan', mockData, mockFile, mockUser))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should throw 409 for simple flow if not approved', async () => {
            const mockSimpleFail = {
                ...mockLayananSelesai,
                jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                pengajuan: { nama_status_kode: 'MENUNGGU_PERSETUJUAN' }
            };
            layananService.getById.mockResolvedValue(mockSimpleFail);

            await expect(laporanLayananService.create('Tahapan', mockData, mockFile, mockUser))
                .rejects.toMatchObject({ statusCode: 409 });
        });
        it('should throw 409 if complex flow (Magang) is not finished', async () => {
            const mockMagangBelumSelesai = {
                ...mockLayananSelesai,
                jenis_layanan: { nama_jenis_layanan: 'Magang' },
                pelaksanaan: { id: 999 } // Bukan STATUS.SELESAI.id
            };
            layananService.getById.mockResolvedValue(mockMagangBelumSelesai);

            await expect(laporanLayananService.create('Tahapan', mockData, mockFile, mockUser))
                .rejects.toMatchObject({ statusCode: 409, message: /Pelaksanaan layanan belum selesai/ });
        });
        it('should throw 409 if report already submitted', async () => {
            const mockLayananAdaLaporan = {
                ...mockLayananSelesai,
                laporan: { nama_status_kode: 'DISETUJUI' } // Bukan STATUS.BELUM_TERSEDIA
            };
            layananService.getById.mockResolvedValue(mockLayananAdaLaporan);

            await expect(laporanLayananService.create('Tahapan', mockData, mockFile, mockUser))
                .rejects.toMatchObject({ statusCode: 409, message: /Laporan sudah pernah dikirim/ });
        });
        it('should successfully complete and send emails', async () => {
            layananService.getById.mockResolvedValue(mockLayananSelesai);
            laporanLayananRepository.create.mockResolvedValue(mockCreatedLaporan);

            const result = await laporanLayananService.create('Tahapan', mockData, mockFile, mockUser);
            expect(result).toBeDefined();
            expect(require('../src/services/fiturLayananEmailSender.service.js').sendEmailLayananNotif).toHaveBeenCalled();
        });

        it('should throw 500 if cloudinary upload fails', async () => {
            layananService.getById.mockResolvedValue(mockLayananSelesai);
            uploadToCloudinary.mockResolvedValue(null);

            await expect(laporanLayananService.create('Tahapan', mockData, mockFile, mockUser))
                .rejects.toMatchObject({ statusCode: 500 });
        });
    });
});