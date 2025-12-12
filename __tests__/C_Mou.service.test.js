// mock printilan
jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => require('../__mocks__/cloudinaryUpload.mock.js'));
jest.mock('../src/services/cloudinaryDelete.service.js', () => require('../__mocks__/cloudinaryDelete.mock.js'));
jest.mock('../src/utils/sanitizeData.js');
const { sanitizeData } = require('../src/utils/sanitizeData.js');
jest.mock('../src/utils/constant/enum.js', () => require('../__mocks__/enum.mock.js'));
const { STATUS } = require('../src/utils/constant/enum.js');

// Mock Repository Layer
jest.mock('../src/mou/C_Mou.repository.js');
jest.mock('../src/layanan/C_Layanan.repository.js');
const { mouRepository: mockMouRepository, mouRejectionRepository: mockMouRejectionRepository } = require('../src/mou/C_Mou.repository.js');
const { layananRepository: mockLayananRepository } = require('../src/layanan/C_Layanan.repository.js');

// Mock Prisma Transaction
jest.mock('../src/db/index.js', () => ({
    $transaction: jest.fn(async (callback) => {
        await callback({
            // add create method ke mock Mou
            Mou: { findById: mockMouRepository.findById, update: mockMouRepository.update, create: mockMouRepository.create },
            MouRejection: { create: mockMouRejectionRepository.create },
            Layanan: { update: mockLayananRepository.update }
        });
    }),
}));

// Import Target
const { mouService } = require('../src/mou/C_Mou.service.js');


describe('MOU SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // make sure sanitizeData mengembalikan objek copy
        sanitizeData.mockImplementation(data => data ? { ...data } : {});
        global.now = jest.fn(() => new Date());

        // Mock default behavior for repositories
        mouService.getById = jest.fn().mockResolvedValue(mockMou);
        mockMouRepository.findById.mockResolvedValue(mockMou);
        mockMouRepository.create.mockResolvedValue(mockMou);
        mockMouRepository.update.mockResolvedValue({});
        mockLayananRepository.update.mockResolvedValue({});
        mockMouRejectionRepository.create.mockResolvedValue({});
    });

    const mockFile = { buffer: Buffer.from('file'), originalname: 'mou.pdf', options: { folder: "mou", mimetype: 'raw' } };
    const mockMou = { id: 1, id_layanan: 1, file_mou: 'http://cloudinary.com/mou_a.pdf', id_status_pengajuan: STATUS.MENUNGGU_PERSETUJUAN.id };
    const { uploadToCloudinary: mockUpload } = require('../__mocks__/cloudinaryUpload.mock.js');

    it('create should successfully create MOU and upload file', async () => {
        const result = await mouService.create({ id_layanan: 1 }, mockFile);

        // Assert CREATE dipanggil dengan ID yang benar
        expect(mockUpload).toHaveBeenCalledWith(mockFile)
        expect(mockMouRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                id_status_pengajuan: STATUS.MENUNGGU_PERSETUJUAN.id,
                // Assert bahwa file_mou menggunakan url yang di-mock:
                file_mou: 'http://mock-cloudinary.com/uploaded-file.pdf'
            })
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