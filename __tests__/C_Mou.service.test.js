// mock printilan
jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => require('../__mocks__/cloudinaryUpload.mock.js'));
jest.mock('../src/services/cloudinaryDelete.service.js', () => require('../__mocks__/cloudinaryDelete.mock.js'));
jest.mock('../src/utils/sanitizeData.js');
jest.mock('../src/utils/email.js', () => ({ sendEmail: jest.fn() }));
const { sanitizeData } = require('../src/utils/sanitizeData.js');
jest.mock('../src/utils/constant/enum.js', () => require('../__mocks__/enum.mock.js'));
const { STATUS, STATEMENT_LAYANAN } = require('../src/utils/constant/enum.js');
const mockFindUserByRole = jest.fn();
jest.mock('../src/auth/user.repository.js', () => ({
    findUserByRole: mockFindUserByRole
}));
jest.mock('../src/services/fiturLayananEmailSender.service.js', () => ({
    sendEmailLayananNotif: jest.fn().mockResolvedValue(true)
}));

// Mocking Repository Mou 
jest.mock('../src/mou/C_Mou.repository.js', () => ({
    mouRepository: {
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    mouRejectionRepository: {
        findById: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
    }
}));

// Mocking Repository Layanan 
jest.mock('../src/layanan/C_Layanan.repository.js', () => ({
    layananRepository: {
        update: jest.fn(),
    }
}));

const { mouRepository: mockMouRepository, mouRejectionRepository: mockMouRejectionRepository } = require('../src/mou/C_Mou.repository.js');
const { layananRepository: mockLayananRepository } = require('../src/layanan/C_Layanan.repository.js');
const { uploadToCloudinary: mockUpload } = require('../__mocks__/cloudinaryUpload.mock.js');
const { deleteFromCloudinaryByUrl: mockDeleteCloudinary } = require('../__mocks__/cloudinaryDelete.mock.js');

// Mock Prisma
const mockPrismaTransaction = jest.fn();
jest.mock('../src/db/index.js', () => ({
    $transaction: mockPrismaTransaction,
}));

const { mouService } = require('../src/mou/C_Mou.service.js');
const ApiError = require('../src/utils/apiError.js');

const mockFile = { buffer: Buffer.from('file'), originalname: 'mou.pdf', mimetype: 'application/pdf' };
const mockMou = {
    id: 1, id_layanan: 1, file_mou: 'http://old-url.com/mou.pdf',
    layanan: { id: 1, user: { email: 'customer@test.com' } },
    mouRejection: { id: 10 }
};

describe('MOU SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sanitizeData.mockImplementation(data => data || {});
        mockFindUserByRole.mockResolvedValue([{ email: 'admin@test.com' }]);
        mockUpload.mockResolvedValue({ url: 'http://new-url.com/mou.pdf' });
    });

    describe('getById', () => {
        it('should return mou if found', async () => {
            mockMouRepository.findById.mockResolvedValue(mockMou);
            const result = await mouService.getById(1);
            expect(result).toEqual(mockMou);
        });

        it('should throw 404 if mou not found', async () => {
            mockMouRepository.findById.mockResolvedValue(null);
            await expect(mouService.getById(99)).rejects.toThrow(ApiError);
        });
    });

    describe('create', () => {
        it('should successfully create MOU', async () => {
            mockMouRepository.create.mockResolvedValue(mockMou);
            const result = await mouService.create('tahapan', { email: 'u@t.com' }, { id_layanan: 1 }, mockFile);
            expect(mockUpload).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw error if file is missing', async () => {
            await expect(mouService.create('tahapan', {}, {}, null)).rejects.toThrow('File tidak disertakan!');
        });
    });

    describe('update', () => {
        it('should successfully update MOU and delete old file', async () => {
            mockMouRepository.findById.mockResolvedValue(mockMou); // for existingMou
            mockMouRejectionRepository.findById.mockResolvedValue({ id: 10 }); // for rejection
            mockMouRepository.update.mockResolvedValue(mockMou);

            const result = await mouService.update('tahapan', { email: 'u@t.com' }, { id: 1 }, mockFile);

            expect(mockDeleteCloudinary).toHaveBeenCalled();
            expect(mockMouRejectionRepository.delete).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw error if update file is missing', async () => {
            mockMouRepository.findById.mockResolvedValue(mockMou);
            await expect(mouService.update('tahapan', {}, { id: 1 }, null)).rejects.toThrow('File tidak disertakan!');
        });
    });

    describe('updateStatus', () => {
        it('should handle Accept for Magang (update Layanan status)', async () => {
            const txMock = {
                layanan: { findUnique: jest.fn().mockResolvedValue({ jenisLayanan: { nama_jenis_layanan: 'Magang' } }) }
            };
            mockPrismaTransaction.mockImplementation(async (cb) => cb(txMock));
            mockMouRepository.findById.mockResolvedValue(mockMou);
            mockMouRepository.update.mockResolvedValue(mockMou);

            await mouService.updateStatus('tahapan', { email: 'a@t.com' }, { id: 1 }, {}, STATUS.DISETUJUI.id);

            expect(mockLayananRepository.update).toHaveBeenCalled();
        });

        it('should handle Reject and create rejection record', async () => {
            const txMock = {};
            mockPrismaTransaction.mockImplementation(async (cb) => cb(txMock));
            mockMouRepository.findById.mockResolvedValue(mockMou);
            mockMouRepository.update.mockResolvedValue(mockMou);
            mockMouRejectionRepository.findById.mockResolvedValue(mockMou); // mock for create check

            await mouService.updateStatus('tahapan', { email: 'a@t.com' }, { id: 1 }, { alasan: 'Buruk' }, STATUS.DITOLAK.id);

            expect(mockMouRejectionRepository.create).toHaveBeenCalled();
        });

        it('should throw error if MOU not found in transaction', async () => {
            mockPrismaTransaction.mockImplementation(async (cb) => cb({}));
            mockMouRepository.findById.mockResolvedValue(null);
            await expect(mouService.updateStatus('tahapan', {}, { id: 1 }, {}, 1)).rejects.toThrow(ApiError);
        });

        it('update should skip Cloudinary delete if file_mou is missing', async () => {
            const mouNoFile = { ...mockMou, file_mou: null };
            mockMouRepository.findById.mockResolvedValue(mouNoFile);
            mockMouRejectionRepository.findById.mockResolvedValue({id: 10});
            mockMouRepository.update.mockResolvedValue(mouNoFile);

            await mouService.update('tahapan', { email: 'u@t.com' }, { id: 1 }, mockFile);

            const { deleteFromCloudinaryByUrl } = require('../__mocks__/cloudinaryDelete.mock.js');
            expect(deleteFromCloudinaryByUrl).not.toHaveBeenCalled();
        });

        it('updateStatus (Accept) should skip Layanan update for non-training service', async () => {
            const txMock = {
                layanan: {
                    findUnique: jest.fn().mockResolvedValue({
                        jenisLayanan: { nama_jenis_layanan: 'Kunjungan Industri' }
                    })
                }
            };
            mockPrismaTransaction.mockImplementation(async (cb) => cb(txMock));
            mockMouRepository.findById.mockResolvedValue(mockMou);
            mockMouRepository.update.mockResolvedValue(mockMou);

            await mouService.updateStatus('tahapan', { email: 'a@t.com' }, { id: 1 }, {}, STATUS.DISETUJUI.id);

            expect(mockLayananRepository.update).not.toHaveBeenCalled();
        });
    })
    describe('mouRejection', () => {
        it('MouRejectionService.getById should throw error if not found', async () => {
            mockMouRejectionRepository.findById.mockResolvedValue(null);
            mockMouRepository.findById.mockResolvedValue(mockMou);

            await expect(mouService.update('tahapan', {}, { id: 1 }, mockFile))
                .rejects.toThrow('Data mou tidak ditemukan!');
        });

        it('MouRejectionService.create should throw if MOU not found', async () => {
            mockMouRepository.findById.mockResolvedValue(null);
            const txMock = {};
            mockPrismaTransaction.mockImplementation(async (cb) => cb(txMock));

            await expect(mouService.updateStatus('tahapan', {}, { id: 1 }, { alasan: 'x' }, STATUS.DITOLAK.id))
                .rejects.toThrow('Data mou tidak ditemukan!');
        });
    });
});