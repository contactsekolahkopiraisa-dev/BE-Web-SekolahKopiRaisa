// mock printilan
jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => require('../__mocks__/cloudinaryUpload.mock.js'));
jest.mock('../src/services/cloudinaryDelete.service.js', () => require('../__mocks__/cloudinaryDelete.mock.js'));
jest.mock('../src/utils/sanitizeData.js');
const { sanitizeData } = require('../src/utils/sanitizeData.js');
jest.mock('../src/utils/constant/enum.js', () => require('../__mocks__/enum.mock.js'));
const { STATUS } = require('../src/utils/constant/enum.js');

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
const mockMou = { id: 1, id_layanan: 1, file_mou: 'http://cloudinary.com/mou_a.pdf', id_status_pengajuan: STATUS.MENUNGGU_PERSETUJUAN.id };
const { uploadToCloudinary: mockUpload } = require('../__mocks__/cloudinaryUpload.mock.js');


describe('MOU SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // make sure sanitizeData mengembalikan objek copy
        sanitizeData.mockImplementation(data => data ? { ...data } : {});
        global.now = jest.fn(() => new Date());

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
        mockMouRepository.update.mockResolvedValue({});
        mockLayananRepository.update.mockResolvedValue({});
        mockMouRejectionRepository.create.mockResolvedValue({});

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
                }
            });
        });
    });

    it('create should successfully create MOU and upload file', async () => {
        const result = await mouService.create({ id_layanan: 1 }, mockFile);

        expect(mockUpload).toHaveBeenCalledWith(
            mockFile.buffer, 
            mockFile.originalname,
            expect.objectContaining({ 
                folder: "mou", 
                mimetype: mockFile.mimetype 
            }) 
        );
        expect(mockMouRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                id_status_pengajuan: STATUS.MENUNGGU_PERSETUJUAN.id,
                file_mou: 'http://mock-cloudinary.com/uploaded-file.pdf'
            })
        );
        expect(result.id_layanan).toBe(1);
    });

    it('updateStatus (Accept) should call repository to update Layanan status', async () => {
        await mouService.updateStatus({ id: 1 }, {}, STATUS.DISETUJUI.id);

        // Assert Layanan update ke SEDANG_BERJALAN (4)
        expect(mockLayananRepository.update).toHaveBeenCalledWith(
            1, 
            { id_status_pelaksanaan: STATUS.SEDANG_BERJALAN.id }, 
            expect.anything()
        );
        expect(mockMouRepository.update).toHaveBeenCalled();
    });

    it('updateStatus (Reject) should create rejection record', async () => {
        await mouService.updateStatus({ id: 1 }, { alasan: 'Alasan Tolak' }, STATUS.DITOLAK.id);

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