// mock dependencies
jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => require('../__mocks__/cloudinaryUpload.mock.js'));
jest.mock('../src/services/cloudinaryDelete.service.js', () => require('../__mocks__/cloudinaryDelete.mock.js'));
jest.mock('../src/utils/sanitizeData.js');
const { sanitizeData } = require('../src/utils/sanitizeData.js');

// Mock Repository Layer
jest.mock('../src/modul/C_Modul.repository.js');
const { modulRepository } = require('../src/modul/C_Modul.repository.js');

// Import Target & Utilities
const { modulService } = require('../src/modul/C_Modul.service.js');
const { uploadToCloudinary } = require('../src/services/cloudinaryUpload.service.js');
const { deleteFromCloudinaryByUrl } = require('../src/services/cloudinaryDelete.service.js');
const ApiError = require('../src/utils/apiError.js');

describe('MODUL SERVICE UNIT TESTS', () => {
    const mockFile = { buffer: Buffer.from('file'), originalname: 'test.pdf', mimetype: 'application/pdf' };
    const mockImage = { buffer: Buffer.from('img'), originalname: 'img.png', mimetype: 'image/png' };
    
    const mockModul = { 
        id: 1, 
        judul_modul: 'Modul A', 
        deskripsi: 'Desc A', 
        file_modul: 'http://cloudinary.com/modul_a.pdf',
        foto_sampul: 'http://cloudinary.com/sampul.jpg'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Default implementation for sanitization
        sanitizeData.mockImplementation(data => data ? { ...data } : {});
        // Default Cloudinary behavior
        uploadToCloudinary.mockResolvedValue({ url: 'http://new-url.com/file.pdf' });
        deleteFromCloudinaryByUrl.mockResolvedValue(true);
    });

    describe('getAll', () => {
        it('should return all moduls', async () => {
            modulRepository.findAll.mockResolvedValue([mockModul]);
            const result = await modulService.getAll();
            expect(result).toHaveLength(1);
        });

        it('should throw 404 if no moduls found (empty array)', async () => {
            modulRepository.findAll.mockResolvedValue([]);
            await expect(modulService.getAll()).rejects.toThrow('Data modul tidak ditemukan!');
        });

        it('should throw 404 if no moduls found (null)', async () => {
            modulRepository.findAll.mockResolvedValue(null);
            await expect(modulService.getAll()).rejects.toThrow('Data modul tidak ditemukan!');
        });
    });

    describe('getById', () => {
        it('should return modul if found', async () => {
            modulRepository.findById.mockResolvedValue(mockModul);
            const result = await modulService.getById(1);
            expect(result.id).toBe(1);
        });

        it('should throw 404 if modul not found', async () => {
            modulRepository.findById.mockResolvedValue(null);
            await expect(modulService.getById(99)).rejects.toThrow('Data modul tidak ditemukan!');
        });
    });

    describe('create', () => {
        it('should throw 400 if file_modul is missing', async () => {
            await expect(modulService.create({}, {}, {})).rejects.toThrow('File modul tidak disertakan!');
        });

        it('should successfully create with file_modul and foto_sampul', async () => {
            const files = {
                file_modul: [mockFile],
                foto_sampul: [mockImage]
            };
            modulRepository.create.mockResolvedValue(mockModul);
            
            await modulService.create({ judul: 'Test' }, files, {});
            expect(uploadToCloudinary).toHaveBeenCalledTimes(2);
            expect(modulRepository.create).toHaveBeenCalled();
        });

        it('should successfully create without foto_sampul', async () => {
            const files = { file_modul: [mockFile] };
            modulRepository.create.mockResolvedValue(mockModul);
            
            await modulService.create({ judul: 'Test' }, files, {});
            expect(uploadToCloudinary).toHaveBeenCalledTimes(1);
        });
    });

    describe('update', () => {
        beforeEach(() => {
            modulRepository.findById.mockResolvedValue(mockModul);
        });

        it('should update everything including files and delete old ones', async () => {
            const files = {
                file_modul: [mockFile],
                foto_sampul: [mockImage]
            };
            modulRepository.update.mockResolvedValue(mockModul);

            await modulService.update(1, { judul: 'Update' }, files);
            
            expect(deleteFromCloudinaryByUrl).toHaveBeenCalledTimes(2);
            expect(uploadToCloudinary).toHaveBeenCalledTimes(2);
            expect(modulRepository.update).toHaveBeenCalled();
        });

        it('should update text fields only and keep old file links', async () => {
            modulRepository.update.mockResolvedValue(mockModul);
            await modulService.update(1, { judul: 'Update' }, {});
            
            expect(uploadToCloudinary).not.toHaveBeenCalled();
            expect(deleteFromCloudinaryByUrl).not.toHaveBeenCalled();
        });

        it('should throw 404 if data to update is not found', async () => {
            modulRepository.findById.mockResolvedValue(null);
            await expect(modulService.update(99, {}, {})).rejects.toThrow('Data modul tidak ditemukan!');
        });
    });

    describe('delete', () => {
        it('should delete record and files from Cloudinary', async () => {
            modulRepository.findById.mockResolvedValue(mockModul);
            modulRepository.delete.mockResolvedValue(mockModul);

            await modulService.delete(1);
            expect(deleteFromCloudinaryByUrl).toHaveBeenCalledTimes(2);
            expect(modulRepository.delete).toHaveBeenCalledWith(1);
        });

        it('should throw 500 if foto_sampul deletion fails', async () => {
            modulRepository.findById.mockResolvedValue(mockModul);
            deleteFromCloudinaryByUrl.mockResolvedValueOnce(false); // Fail sampul

            await expect(modulService.delete(1)).rejects.toMatchObject({
                statusCode: 500,
                message: expect.stringContaining('Gagal hapus foto sampul')
            });
        });

        it('should throw 500 if file_modul deletion fails', async () => {
            modulRepository.findById.mockResolvedValue(mockModul);
            deleteFromCloudinaryByUrl
                .mockResolvedValueOnce(true)  // Success sampul
                .mockResolvedValueOnce(false); // Fail file_modul

            await expect(modulService.delete(1)).rejects.toMatchObject({
                statusCode: 500,
                message: expect.stringContaining('Gagal hapus file modul')
            });
        });

        it('should skip sampul deletion if not present in record', async () => {
            modulRepository.findById.mockResolvedValue({ ...mockModul, foto_sampul: null });
            modulRepository.delete.mockResolvedValue(mockModul);

            await modulService.delete(1);
            expect(deleteFromCloudinaryByUrl).toHaveBeenCalledTimes(1); 
        });
    });
});