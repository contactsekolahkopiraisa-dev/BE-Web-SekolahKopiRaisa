// Mock Utilities
jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => require('../__mocks__/cloudinaryUpload.mock.js'));
jest.mock('../src/services/cloudinaryDelete.service.js', () => require('../__mocks__/cloudinaryDelete.mock.js'));
jest.mock('../src/utils/sanitizeData.js');
const { sanitizeData } = require('../src/utils/sanitizeData.js');


// Mock Repository Layer
jest.mock('../src/laporan_layanan/C_LaporanLayanan.repository.js');
const { laporanLayananRepository } = require('../src/laporan_layanan/C_LaporanLayanan.repository.js');

// Mock Layanan Service (Circular Dependency)
jest.mock('../src/layanan/C_Layanan.service.js');
const { layananService } = require('../src/layanan/C_Layanan.service.js');


// Import Target
const { laporanLayananService } = require('../src/laporan_layanan/C_LaporanLayanan.service.js');
const { STATUS } = require('../src/utils/constant/enum.js');


describe('LAPORAN LAYANAN SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // make sure sanitizeData mengembalikan objek
        sanitizeData.mockImplementation(data => data ? { ...data } : {}); 
        // Mock Cloudinary untuk berhasil
        require('../src/services/cloudinaryUpload.service.js').uploadToCloudinary.mockResolvedValue({ url: 'http://cloudinary.com/laporan_foto.jpg' });
    });
    
    const mockFile = { buffer: Buffer.from('file'), originalname: 'foto.jpg' };
    const mockUser = { id: 2, role: 'customer' };
    const mockData = { id_layanan: 1, nama_p4s: 'P4S ABC' }; 
    const mockLayananSelesai = {
        id: 1, pemohon: { id: 2 },
        pelaksanaan: { id: STATUS.SELESAI.id, nama_status_kode: STATUS.SELESAI.nama_status_kode },
        laporan: { nama_status_kode: STATUS.BELUM_TERSEDIA.nama_status_kode }
    };

    it('create should successfully create a report if prerequisites are met', async () => {
        layananService.getById.mockResolvedValue(mockLayananSelesai);
        laporanLayananRepository.create.mockResolvedValue({ id: 1 });

        await laporanLayananService.create(mockData, mockFile, mockUser);

        expect(layananService.getById).toHaveBeenCalledWith(mockData.id_layanan, mockUser, expect.any(Object));
        expect(laporanLayananRepository.create).toHaveBeenCalled();
    });

    it('create should throw 409 if service execution is not finished', async () => {
        const mockLayananBelumSelesai = {
            ...mockLayananSelesai,
            pelaksanaan: { id: STATUS.SEDANG_BERJALAN.id, nama_status_kode: STATUS.SEDANG_BERJALAN.nama_status_kode },
        };
        layananService.getById.mockResolvedValue(mockLayananBelumSelesai);

        await expect(laporanLayananService.create(mockData, mockFile, mockUser)).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('Pelaksanaan layanan belum selesai'),
        });
    });
});