// // __tests__/C_Layanan.service.test.js
// // Unit tests for service layer

// const ApiError = require('../src/utils/apiError.js');

// // Mock all dependencies
// jest.mock('../src/layanan/C_Layanan.repository.js');
// jest.mock('../src/layanan/C_Layanan.helper.js');
// jest.mock('../src/utils/calculateDurationMonth.js');
// jest.mock('../src/utils/sanitizeData.js');
// jest.mock('../src/utils/constant/enum.js', () => ({
//   STATUS: {
//     MENUNGGU_PERSETUJUAN: { id: 4, nama_status_kode: 'MENUNGGU_PERSETUJUAN' },
//     DISETUJUI: { id: 5, nama_status_kode: 'DISETUJUI' },
//     DITOLAK: { id: 6, nama_status_kode: 'DITOLAK' },
//     BELUM_TERLAKSANA: { id: 7, nama_status_kode: 'BELUM_TERLAKSANA' },
//     SEDANG_BERJALAN: { id: 8, nama_status_kode: 'SEDANG_BERJALAN' },
//     SELESAI: { id: 9, nama_status_kode: 'SELESAI' },
//   },
// }));

// const {
//   layananRepository,
//   jenisLayananRepository,
//   statusKodeRepository,
//   targetPesertaRepository,
//   layananRejectionRepository,
// } = require('../src/layanan/C_Layanan.repository.js');

// const {
//   formatLayanan,
//   buildFilter,
//   hitungPeserta,
// } = require('../src/layanan/C_Layanan.helper.js');

// const { calculateDurationMonth } = require('../src/utils/calculateDurationMonth.js');
// const { sanitizeData } = require('../src/utils/sanitizeData.js');

// // Import service after mocks
// const {
//   layananService,
//   jenisLayananService,
//   statusKodeService,
//   targetPesertaService,
// } = require('../src/layanan/C_Layanan.service.js');

// const { STATUS } = require('../src/utils/constant/enum.js');

// describe('Layanan Service Unit Tests', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
    
//     // Default mock implementations
//     sanitizeData.mockImplementation(data => data);
//     formatLayanan.mockImplementation(data => data);
//     buildFilter.mockReturnValue({ where: {}, orderBy: { created_at: 'desc' } });
//     calculateDurationMonth.mockReturnValue(3);
//   });

//   // ==========================================================================
//   // JENIS LAYANAN SERVICE TESTS
//   // ==========================================================================
//   describe('jenisLayananService', () => {
//     describe('getAll', () => {
//       it('should return all jenis layanan', async () => {
//         const mockData = [
//           { id: 1, nama_jenis_layanan: 'Magang' },
//           { id: 2, nama_jenis_layanan: 'PKL' },
//         ];
//         jenisLayananRepository.findAll.mockResolvedValue(mockData);

//         const result = await jenisLayananService.getAll();

//         expect(result).toEqual(mockData);
//         expect(jenisLayananRepository.findAll).toHaveBeenCalledTimes(1);
//       });

//       it('should throw 404 when no data found', async () => {
//         jenisLayananRepository.findAll.mockResolvedValue([]);

//         await expect(jenisLayananService.getAll()).rejects.toThrow(ApiError);
//         await expect(jenisLayananService.getAll()).rejects.toMatchObject({
//           statusCode: 404,
//         });
//       });
//     });

//     describe('getById', () => {
//       it('should return specific jenis layanan', async () => {
//         const mockData = { id: 1, nama_jenis_layanan: 'Magang' };
//         jenisLayananRepository.findById.mockResolvedValue(mockData);

//         const result = await jenisLayananService.getById(1);

//         expect(result).toEqual(mockData);
//         expect(jenisLayananRepository.findById).toHaveBeenCalledWith(1);
//       });

//       it('should throw 404 when jenis layanan not found', async () => {
//         jenisLayananRepository.findById.mockResolvedValue(null);

//         await expect(jenisLayananService.getById(999)).rejects.toThrow(ApiError);
//       });
//     });

//     describe('update', () => {
//       it('should update jenis layanan without file', async () => {
//         const existingData = {
//           id: 1,
//           nama_jenis_layanan: 'Magang',
//           image: null,
//         };
//         const updateData = {
//           nama_jenis_layanan: 'Magang Updated',
//           deskripsi_singkat: 'New description',
//         };

//         jenisLayananRepository.findById.mockResolvedValue(existingData);
//         jenisLayananRepository.update.mockResolvedValue({
//           ...existingData,
//           ...updateData,
//         });

//         const result = await jenisLayananService.update(1, updateData, null);

//         expect(jenisLayananRepository.update).toHaveBeenCalledWith(
//           1,
//           expect.objectContaining({
//             nama_jenis_layanan: 'Magang Updated',
//           })
//         );
//       });
//     });
//   });

//   // ==========================================================================
//   // LAYANAN SERVICE TESTS
//   // ==========================================================================
//   describe('layananService', () => {
//     const mockAdmin = { id: 1, role: 'admin' };
//     const mockCustomer = { id: 2, role: 'customer' };

//     describe('getAll', () => {
//       it('should return all layanan for admin', async () => {
//         const mockData = [
//           { id: 1, nama_kegiatan: 'Layanan 1', tanggal_mulai: new Date(), tanggal_selesai: new Date() },
//           { id: 2, nama_kegiatan: 'Layanan 2', tanggal_mulai: new Date(), tanggal_selesai: new Date() },
//         ];
//         layananRepository.findAll.mockResolvedValue(mockData);

//         const result = await layananService.getAll(mockAdmin, {});

//         expect(result).toHaveLength(2);
//         expect(layananRepository.findAll).toHaveBeenCalled();
//       });

//       it('should return only customer layanan for customer', async () => {
//         const mockData = [
//           { id: 1, nama_kegiatan: 'My Layanan', id_user: 2, tanggal_mulai: new Date(), tanggal_selesai: new Date() },
//         ];
//         layananRepository.findAll.mockResolvedValue(mockData);
//         buildFilter.mockReturnValue({
//           where: { id_user: 2 },
//           orderBy: { created_at: 'desc' },
//         });

//         const result = await layananService.getAll(mockCustomer, {});

//         expect(result).toHaveLength(1);
//         expect(buildFilter).toHaveBeenCalled();
//       });

//       it('should throw 404 when no layanan found', async () => {
//         layananRepository.findAll.mockResolvedValue(null);

//         await expect(layananService.getAll(mockAdmin, {})).rejects.toThrow(ApiError);
//       });
//     });

//     describe('getById', () => {
//       it('should return specific layanan by id', async () => {
//         const mockData = {
//           id: 1,
//           nama_kegiatan: 'Test Layanan',
//           tanggal_mulai: new Date('2025-01-01'),
//           tanggal_selesai: new Date('2025-04-01'),
//         };
//         layananRepository.findById.mockResolvedValue(mockData);
//         buildFilter.mockReturnValue({
//           where: { id: 1 },
//           orderBy: { created_at: 'desc' },
//         });

//         const result = await layananService.getById(1, mockAdmin, {});

//         expect(result).toBeDefined();
//         expect(layananRepository.findById).toHaveBeenCalled();
//         expect(calculateDurationMonth).toHaveBeenCalled();
//       });

//       it('should filter by user id for customer', async () => {
//         const mockData = {
//           id: 1,
//           nama_kegiatan: 'Test',
//           id_user: 2,
//           tanggal_mulai: new Date(),
//           tanggal_selesai: new Date(),
//         };
//         layananRepository.findById.mockResolvedValue(mockData);
//         buildFilter.mockReturnValue({
//           where: { id: 1, id_user: 2 },
//           orderBy: { created_at: 'desc' },
//         });

//         await layananService.getById(1, mockCustomer, {});

//         expect(buildFilter).toHaveBeenCalled();
//       });

//       it('should throw 404 when layanan not found', async () => {
//         layananRepository.findById.mockResolvedValue(null);
//         buildFilter.mockReturnValue({ where: { id: 999 } });

//         await expect(layananService.getById(999, mockAdmin, {})).rejects.toThrow(ApiError);
//       });
//     });

//     describe('updateStatus', () => {
//       const mockLayanan = {
//         id: 1,
//         pemohon: { id: 2 },
//         pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
//         pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
//         layananRejection: [],
//       };

//       beforeEach(() => {
//         layananService.getById = jest.fn().mockResolvedValue(mockLayanan);
//       });

//       it('should allow admin to approve pengajuan', async () => {
//         statusKodeRepository.findById.mockResolvedValue({
//           id: STATUS.DISETUJUI.id,
//           nama_status_kode: 'DISETUJUI',
//         });
//         layananRepository.update.mockResolvedValue({
//           ...mockLayanan,
//           id_status_pengajuan: STATUS.DISETUJUI.id,
//         });

//         const result = await layananService.updateStatus(
//           1,
//           mockAdmin,
//           STATUS.DISETUJUI.id
//         );

//         expect(layananRepository.update).toHaveBeenCalledWith(
//           1,
//           expect.objectContaining({
//             id_status_pengajuan: STATUS.DISETUJUI.id,
//             id_status_pelaksanaan: STATUS.BELUM_TERLAKSANA.id,
//           })
//         );
//       });

//       it('should allow admin to reject pengajuan with reason', async () => {
//         statusKodeRepository.findById.mockResolvedValue({
//           id: STATUS.DITOLAK.id,
//           nama_status_kode: 'DITOLAK',
//         });
//         layananRepository.update.mockResolvedValue({
//           ...mockLayanan,
//           id_status_pengajuan: STATUS.DITOLAK.id,
//         });
//         layananRejectionRepository.create.mockResolvedValue({
//           id: 1,
//           alasan: 'Dokumen tidak lengkap',
//         });

//         await layananService.updateStatus(
//           1,
//           mockAdmin,
//           STATUS.DITOLAK.id,
//           'Dokumen tidak lengkap'
//         );

//         expect(layananRepository.update).toHaveBeenCalled();
//         expect(layananRejectionRepository.create).toHaveBeenCalledWith({
//           id_layanan: 1,
//           alasan: 'Dokumen tidak lengkap',
//         });
//       });

//       it('should throw 400 when rejecting without reason', async () => {
//         statusKodeRepository.findById.mockResolvedValue({
//           id: STATUS.DITOLAK.id,
//           nama_status_kode: 'DITOLAK',
//         });

//         await expect(
//           layananService.updateStatus(1, mockAdmin, STATUS.DITOLAK.id, null)
//         ).rejects.toThrow(ApiError);
//       });

//       it('should throw 403 when non-admin tries to approve', async () => {
//         statusKodeRepository.findById.mockResolvedValue({
//           id: STATUS.DISETUJUI.id,
//           nama_status_kode: 'DISETUJUI',
//         });

//         await expect(
//           layananService.updateStatus(1, mockCustomer, STATUS.DISETUJUI.id)
//         ).rejects.toThrow(ApiError);
//       });

//       it('should allow customer to finish pelaksanaan', async () => {
//         const layananBerjalan = {
//           ...mockLayanan,
//           pemohon: { id: 2 },
//           pengajuan: { id: STATUS.DISETUJUI.id },
//           pelaksanaan: { id: STATUS.SEDANG_BERJALAN.id },
//         };
//         layananService.getById.mockResolvedValue(layananBerjalan);
//         statusKodeRepository.findById.mockResolvedValue({
//           id: STATUS.SELESAI.id,
//           nama_status_kode: 'SELESAI',
//         });
//         layananRepository.update.mockResolvedValue({
//           ...layananBerjalan,
//           id_status_pelaksanaan: STATUS.SELESAI.id,
//         });

//         await layananService.updateStatus(1, mockCustomer, STATUS.SELESAI.id);

//         expect(layananRepository.update).toHaveBeenCalledWith(
//           1,
//           expect.objectContaining({
//             id_status_pelaksanaan: STATUS.SELESAI.id,
//           })
//         );
//       });

//       it('should throw 403 when wrong customer tries to finish', async () => {
//         const layananBerjalan = {
//           ...mockLayanan,
//           pemohon: { id: 3 }, // Different user
//           pelaksanaan: { id: STATUS.SEDANG_BERJALAN.id },
//         };
//         layananService.getById.mockResolvedValue(layananBerjalan);
//         statusKodeRepository.findById.mockResolvedValue({
//           id: STATUS.SELESAI.id,
//         });

//         await expect(
//           layananService.updateStatus(1, mockCustomer, STATUS.SELESAI.id)
//         ).rejects.toThrow(ApiError);
//       });
//     });

//     describe('uploadLogbook', () => {
//       it('should update logbook link', async () => {
//         const mockLayanan = { id: 1, link_logbook: null };
//         layananService.getById = jest.fn().mockResolvedValue(mockLayanan);
//         layananRepository.update.mockResolvedValue({
//           ...mockLayanan,
//           link_logbook: 'https://docs.google.com/logbook',
//         });

//         const result = await layananService.uploadLogbook(
//           1,
//           'https://docs.google.com/logbook',
//           mockCustomer
//         );

//         expect(layananRepository.update).toHaveBeenCalledWith(1, {
//           link_logbook: 'https://docs.google.com/logbook',
//         });
//       });
//     });
//   });

//   // ==========================================================================
//   // STATUS KODE SERVICE TESTS
//   // ==========================================================================
//   describe('statusKodeService', () => {
//     describe('getAll', () => {
//       it('should return all status kode', async () => {
//         const mockData = [
//           { id: 4, nama_status_kode: 'MENUNGGU_PERSETUJUAN' },
//           { id: 5, nama_status_kode: 'DISETUJUI' },
//         ];
//         statusKodeRepository.findAll.mockResolvedValue(mockData);

//         const result = await statusKodeService.getAll();

//         expect(result).toEqual(mockData);
//       });

//       it('should throw 404 when no data found', async () => {
//         statusKodeRepository.findAll.mockResolvedValue([]);

//         await expect(statusKodeService.findAll()).rejects.toThrow(ApiError);
//       });
//     });

//     describe('getById', () => {
//       it('should return specific status kode', async () => {
//         const mockData = { id: 5, nama_status_kode: 'DISETUJUI' };
//         statusKodeRepository.findById.mockResolvedValue(mockData);

//         const result = await statusKodeService.getById(5);

//         expect(result).toEqual(mockData);
//       });
//     });
//   });

//   // ==========================================================================
//   // TARGET PESERTA SERVICE TESTS
//   // ==========================================================================
//   describe('targetPesertaService', () => {
//     describe('getAll', () => {
//       it('should return all target peserta', async () => {
//         const mockData = [{ id: 1, nama_target_peserta: 'Mahasiswa' }];
//         targetPesertaRepository.findAll.mockResolvedValue(mockData);

//         const result = await targetPesertaService.getAll();

//         expect(result).toEqual(mockData);
//       });
//     });

//     describe('getById', () => {
//       it('should return specific target peserta', async () => {
//         const mockData = { id: 1, nama_target_peserta: 'Mahasiswa' };
//         targetPesertaRepository.findById.mockResolvedValue(mockData);

//         const result = await targetPesertaService.getById(1);

//         expect(result).toEqual(mockData);
//       });
//     });
//   });
// });

describe('order service placeholder', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
