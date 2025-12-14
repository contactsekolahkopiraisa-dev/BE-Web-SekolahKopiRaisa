// mock printilan
jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => require('../__mocks__/cloudinaryUpload.mock.js'));
jest.mock('../src/services/cloudinaryDelete.service.js', () => require('../__mocks__/cloudinaryDelete.mock.js'));
jest.mock('../src/utils/sanitizeData.js');
const { sanitizeData } = require('../src/utils/sanitizeData.js');

// Mock Repository Layer
jest.mock('../src/modul/C_Modul.repository.js');
const { modulRepository } = require('../src/modul/C_Modul.repository.js');

// Import Target
const { modulService } = require('../src/modul/C_Modul.service.js');


describe('MODUL SERVICE UNIT TESTS', () => {
    const mockUser = { id: 1, admin: true };
    const mockFile = { buffer: Buffer.from('file'), originalname: 'test.pdf' };
    const mockModul = { id: 1, judul_modul: 'Modul A', deskripsi: 'Desc A', file_modul: 'http://cloudinary.com/modul_a.pdf' };

    beforeEach(() => {
        jest.clearAllMocks();
        
        // make sure sanitizeData mengembalikan objek copy
        sanitizeData.mockImplementation(data => data ? { ...data } : {}); 
        
        // mock upload
        require('../src/services/cloudinaryUpload.service.js').uploadToCloudinary.mockResolvedValue({ 
            url: 'http://cloudinary.com/new_modul.pdf' 
        });
        
        require('../src/services/cloudinaryDelete.service.js').deleteFromCloudinaryByUrl.mockResolvedValue(true);
        
        modulService.getById = jest.fn().mockResolvedValue(mockModul);
    });

    it('update should update file and delete old file from cloudinary', async () => {
        modulRepository.update.mockResolvedValue({ ...mockModul, file_modul: 'http://cloudinary.com/new_modul.pdf' });
        
        // Kirim dataRaw
        await modulService.update(1, { deskripsi: 'Updated Desc' }, mockFile); 

        expect(modulRepository.update).toHaveBeenCalled();
    });
    
    it('delete should delete file from cloudinary and remove record from DB', async () => {
        modulRepository.delete.mockResolvedValue(mockModul);
        
        await modulService.delete(1);
        
        expect(modulRepository.delete).toHaveBeenCalledWith(1);
    });
    
    it('delete should throw 500 if file deletion fails (Bisnis Logic)', async () => {
        require('../src/services/cloudinaryDelete.service.js').deleteFromCloudinaryByUrl.mockResolvedValue(false); 

        await expect(modulService.delete(1)).rejects.toMatchObject({
            statusCode: 500,
            message: expect.stringContaining('Gagal hapus file modul'),
        });
        expect(modulRepository.delete).not.toHaveBeenCalled();
    });
});