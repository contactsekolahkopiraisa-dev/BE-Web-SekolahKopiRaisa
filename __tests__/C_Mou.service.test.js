// mock printilan
jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => require('../__mocks__/cloudinaryUpload.mock.js'));
jest.mock('../src/services/cloudinaryDelete.service.js', () => require('../__mocks__/cloudinaryDelete.mock.js'));
jest.mock('../src/utils/sanitizeData.js');
jest.mock('../src/utils/email.js', () => ({ sendEmail: jest.fn() }));
const { sanitizeData } = require('../src/utils/sanitizeData.js');
jest.mock('../src/utils/constant/enum.js', () => require('../__mocks__/enum.mock.js'));
const { STATUS, STATEMENT_LAYANAN } = require('../src/utils/constant/enum.js');
const mockFindUserByRole = jest.fn().mockResolvedValue([{ email: 'admin@test.com' }]);
jest.mock('../src/auth/user.repository.js', () => ({
    findUserByRole: mockFindUserByRole
}));

// Mocking Repository Mou 
jest.mock('../src/mou/C_Mou.repository.js', () => {
    return {
        mouRepository: {
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            getById: jest.fn(),
        },
        mouRejectionRepository: {
            findById: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            getById: jest.fn(),
        }
    }
});

// Mocking Repository Layanan 
jest.mock('../src/layanan/C_Layanan.repository.js', () => {
    return {
        layananRepository: {
            update: jest.fn(),
        }
    };
});

// Import Layer setelah mocking
const { mouRepository: mockMouRepository, mouRejectionRepository: mockMouRejectionRepository } = require('../src/mou/C_Mou.repository.js');
const { layananRepository: mockLayananRepository } = require('../src/layanan/C_Layanan.repository.js');

// Mock Prisma Transaction secara terpisah untuk mengatasi Scoping/Hoisting 
const mockPrismaTransaction = jest.fn();
jest.mock('../src/db/index.js', () => ({
    $transaction: mockPrismaTransaction,
}));

// Import Target
const { mouService } = require('../src/mou/C_Mou.service.js');

const mockFile = { buffer: Buffer.from('file'), originalname: 'mou.pdf', mimetype: 'raw' };
const mockMou = { 
    id: 1, 
    id_layanan: 1, 
    file_mou: 'http://cloudinary.com/mou_a.pdf', 
    id_status_pengajuan: STATUS.MENUNGGU_PERSETUJUAN.id,
    layanan: {
        id: 1,
        jenisLayanan: { nama_jenis_layanan: 'Magang' },
        konfigurasiLayanan: {
            detailKonfigurasis: [
                {
                    kegiatan: { nama_kegiatan: 'Kegiatan A' },
                    subKegiatan: { nama_sub_kegiatan: 'Sub A' }
                }
            ]
        },
        user: { email: 'customer@test.com' },
        pesertas: [ 
            { nama_peserta: 'Peserta 1', nim: '12345' }
        ]
    }
};
const { uploadToCloudinary: mockUpload } = require('../__mocks__/cloudinaryUpload.mock.js');


describe('MOU SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // make sure sanitizeData mengembalikan objek copy
        sanitizeData.mockImplementation(data => data ? { ...data } : {});
        global.now = jest.fn(() => new Date());

        mockFindUserByRole.mockResolvedValue([{ email: 'admin@test.com' }]); // Pastikan selalu array

        // Mock resolved value untuk uploadToCloudinary
        mockUpload.mockResolvedValue({
            url: 'http://mock-cloudinary.com/uploaded-file.pdf',
            public_id: 'mock-public-id',
            resource_type: 'raw'
        });

        // Mock default behavior for all necessary repository functions
        mouService.getById = jest.fn().mockResolvedValue(mockMou);

        // Pastikan findById dan getById (dipanggil dalam transaksi) mengembalikan nilai truthy
        mockMouRepository.findById.mockResolvedValue(mockMou);
        mockMouRepository.getById.mockResolvedValue(mockMou);

        // Mocking repo updates
        mockMouRepository.create.mockResolvedValue(mockMou);
        mockMouRepository.update.mockResolvedValue(mockMou);
        mockLayananRepository.update.mockResolvedValue(mockMou.layanan);
        mockMouRejectionRepository.create.mockResolvedValue({ id: 1, alasan: 'Tolak' });

        // Atur implementasi $transaction di beforeEach 
        mockPrismaTransaction.mockImplementation(async (callback) => {
            await callback({
                // Gunakan referensi mock yang sudah diinisialisasi
                Mou: {
                    findById: mockMouRepository.findById,
                    update: mockMouRepository.update,
                    create: mockMouRepository.create
                },
                MouRejection: {
                    create: mockMouRejectionRepository.create
                },
                Layanan: {
                    update: mockLayananRepository.update
                },
                layanan: {
                    findUnique: jest.fn().mockResolvedValue(mockMou.layanan)
                }
            });
        });
    });

    it('create should successfully create MOU and upload file', async () => {
        const result = await mouService.create(
            STATEMENT_LAYANAN.MOU_DIAJUKAN,
            { email: 'user@test.com' },
            { id_layanan: 1 },
            mockFile
        );
        expect(mockUpload).toHaveBeenCalled();
        expect(mockMouRepository.create).toHaveBeenCalled();
        expect(result.id_layanan).toBe(1);
    });

    it('updateStatus (Accept) should call repository to update Layanan status', async () => {
        await mouService.updateStatus(
            STATEMENT_LAYANAN.PENGAJUAN_MOU_DISETUJUI,
            { email: 'admin@test.com' },
            { id: 1 },
            {},
            STATUS.DISETUJUI.id
        );

        // Assert Layanan update ke SEDANG_BERJALAN (4)
        expect(mockLayananRepository.update).toHaveBeenCalledWith(
            1,
            { id_status_pelaksanaan: STATUS.SEDANG_BERJALAN.id },
            expect.anything()
        );
        expect(mockMouRepository.update).toHaveBeenCalled();
    });

    it('updateStatus (Reject) should create rejection record', async () => {
        await mouService.updateStatus(
            STATEMENT_LAYANAN.PENGAJUAN_MOU_DITOLAK, 
            { email: 'admin@test.com' }, 
            { id: 1 }, 
            { alasan: 'Alasan Tolak' }, 
            STATUS.DITOLAK.id
        );

        // Assert Rejection Repository dipanggil
        expect(mockMouRejectionRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                id_mou: 1,
                alasan: 'Alasan Tolak'
            }),
            expect.anything()
        );
        expect(mockMouRepository.update).toHaveBeenCalled();
    });
});