const {
    layananService,
    statusKodeService,
    jenisLayananService,
    targetPesertaService,
} = require('../src/layanan/C_Layanan.service.js');

const {
    layananRepository,
    jenisLayananRepository,
    statusKodeRepository,
    targetPesertaRepository,
    konfigurasiLayananRepository,
    subKegiatanRepository,
    pesertaRepository,
    layananRejectionRepository
} = require('../src/layanan/C_Layanan.repository.js');

const { STATUS, STATEMENT_LAYANAN } = require('../src/utils/constant/enum.js');
const ApiError = require('../src/utils/apiError.js');
const { uploadToCloudinary } = require('../src/services/cloudinaryUpload.service.js');
const { findUserByRole } = require('../src/auth/user.repository.js');
const { sanitizeData } = require('../src/utils/sanitizeData.js');
const { buildFilter } = require('../src/layanan/C_Layanan.helper.js');

// --- Mocking Dependencies ---
jest.mock('../src/layanan/C_Layanan.repository.js');
jest.mock('../src/services/cloudinaryDelete.service.js');
jest.mock('../src/services/cloudinaryUpload.service.js');
jest.mock('../src/utils/sanitizeData.js');
jest.mock('../src/layanan/C_Layanan.validate.js');
jest.mock('../src/layanan/C_Layanan.helper.js');
jest.mock('../src/utils/calculateDurationMonth.js');
jest.mock('../src/auth/user.repository.js');
jest.mock('../src/services/fiturLayananEmailSender.service.js');

const { deleteFromCloudinaryByUrl } = require('../src/services/cloudinaryDelete.service.js');
const { validateData, JENIS_SCHEMA } = require('../src/layanan/C_Layanan.validate.js');
const { uploadFilesBySchema, formatLayanan, hitungPeserta } = require('../src/layanan/C_Layanan.helper.js');
const { calculateDurationMonth } = require('../src/utils/calculateDurationMonth.js');
const { sendEmailLayananNotif } = require('../src/services/fiturLayananEmailSender.service.js');

describe('C_Layanan Service Tests', () => {
    const mockUser = { id: 1, name: 'Test User', email: 'user@test.com', role: 'customer' };
    const mockAdmin = { id: 99, role: 'admin', email: 'admin@test.com' };

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup repository mocks
        layananRepository.findAll = jest.fn();
        layananRepository.findById = jest.fn();
        layananRepository.findOngoingByUserAndJenis = jest.fn();
        layananRepository.create = jest.fn();
        layananRepository.update = jest.fn();
        
        jenisLayananRepository.findAll = jest.fn();
        jenisLayananRepository.findById = jest.fn();
        jenisLayananRepository.update = jest.fn();
        
        statusKodeRepository.findAll = jest.fn();
        statusKodeRepository.findById = jest.fn();
        
        targetPesertaRepository.findAll = jest.fn();
        targetPesertaRepository.findById = jest.fn();
        
        konfigurasiLayananRepository.findByHashAndJenis = jest.fn();
        konfigurasiLayananRepository.create = jest.fn();
        
        subKegiatanRepository.findActiveSubKegiatanByJenisLayanan = jest.fn();
        
        pesertaRepository.create = jest.fn();
        pesertaRepository.createMany = jest.fn();
        
        layananRejectionRepository.create = jest.fn();
        layananRejectionRepository.update = jest.fn();
        
        // Setup default mocks
        sanitizeData.mockImplementation((data) => {
            if (!data) return {};
            return { ...data };
        });
        
        buildFilter.mockImplementation((query = {}) => {
            return { 
                where: {},
                include: query.include || [],
                ...query 
            };
        });
        
        uploadToCloudinary.mockResolvedValue({ url: 'https://example.com/uploaded.jpg' });
        deleteFromCloudinaryByUrl.mockResolvedValue(true);
        validateData.mockResolvedValue({ peserta: true });
        uploadFilesBySchema.mockResolvedValue({ proposal: 'url-prop', surat_permohonan: 'url-surat' });
        formatLayanan.mockImplementation(item => item);
        hitungPeserta.mockResolvedValue(5);
        calculateDurationMonth.mockReturnValue(2);
        findUserByRole.mockResolvedValue([{ email: 'admin@test.com' }]);
        sendEmailLayananNotif.mockResolvedValue(true);
        
        // Setup JENIS_SCHEMA
        JENIS_SCHEMA.Magang = { files: ['proposal'] };
        JENIS_SCHEMA.Kunjungan = { files: [] };
        JENIS_SCHEMA.Pelatihan = { files: [] };
        JENIS_SCHEMA['Praktek Kerja Lapangan (PKL)'] = { files: ['proposal'] };
        JENIS_SCHEMA['Undangan Narasumber'] = { files: [] };
    });

    // ========================================
    // STATUS KODE SERVICE TESTS
    // ========================================
    describe('statusKodeService', () => {
        describe('getAll', () => {
            it('should throw error when no data found (empty array)', async () => {
                statusKodeRepository.findAll.mockResolvedValue([]);
                await expect(statusKodeService.getAll()).rejects.toThrow('Data-data status tidak ditemukan!');
            });

            it('should return all status kode when data exists', async () => {
                const mockData = [
                    { id: 1, nama_status: 'Active' },
                    { id: 2, nama_status: 'Inactive' }
                ];
                statusKodeRepository.findAll.mockResolvedValue(mockData);
                const result = await statusKodeService.getAll();
                expect(result).toEqual(mockData);
                expect(result).toHaveLength(2);
            });
        });

        describe('getById', () => {
            it('should throw error when status not found', async () => {
                statusKodeRepository.findById.mockResolvedValue(null);
                await expect(statusKodeService.getById(1)).rejects.toThrow('Data status tidak ditemukan!');
            });

            it('should return status when found', async () => {
                const mockData = { id: 1, nama_status: 'Active' };
                statusKodeRepository.findById.mockResolvedValue(mockData);
                const result = await statusKodeService.getById(1);
                expect(result).toEqual(mockData);
            });
        });
    });

    // ========================================
    // JENIS LAYANAN SERVICE TESTS
    // ========================================
    describe('jenisLayananService', () => {
        describe('getAll', () => {
            it('should throw error when no data found', async () => {
                jenisLayananRepository.findAll.mockResolvedValue(null);
                await expect(jenisLayananService.getAll()).rejects.toThrow('Data jenis layanan tidak ditemukan!');
            });

            it('should throw error when empty array returned', async () => {
                jenisLayananRepository.findAll.mockResolvedValue([]);
                await expect(jenisLayananService.getAll()).rejects.toThrow('Data jenis layanan tidak ditemukan!');
            });

            it('should return all jenis layanan when data exists', async () => {
                const mockData = [
                    { id: 1, nama_jenis_layanan: 'Magang' },
                    { id: 2, nama_jenis_layanan: 'PKL' }
                ];
                jenisLayananRepository.findAll.mockResolvedValue(mockData);
                const result = await jenisLayananService.getAll();
                expect(result).toEqual(mockData);
                expect(result).toHaveLength(2);
            });
        });

        describe('getById', () => {
            it('should throw error when jenis layanan not found', async () => {
                jenisLayananRepository.findById.mockResolvedValue(null);
                await expect(jenisLayananService.getById(1)).rejects.toThrow('Data jenis layanan tidak ditemukan!');
            });

            it('should return jenis layanan when found', async () => {
                const mockData = { id: 1, nama_jenis_layanan: 'Magang', is_active: true };
                jenisLayananRepository.findById.mockResolvedValue(mockData);
                const result = await jenisLayananService.getById(1);
                expect(result).toEqual(mockData);
            });
        });

        describe('update', () => {
            it('should update with file upload and delete old image', async () => {
                const mockExt = { 
                    id: 1, 
                    image: 'old.jpg', 
                    nama_jenis_layanan: 'Test',
                    deskripsi_singkat: 'Old desc'
                };
                jenisLayananRepository.findById.mockResolvedValue(mockExt);
                targetPesertaRepository.findById.mockResolvedValue({ id: 1 });
                jenisLayananRepository.update.mockResolvedValue({ 
                    ...mockExt, 
                    image: 'https://example.com/uploaded.jpg',
                    nama_jenis_layanan: 'Test Updated'
                });

                const dataRaw = { 
                    id: 1,
                    id_target_peserta: 1, 
                    nama_jenis_layanan: 'Test Updated',
                    deskripsi_singkat: 'Short desc',
                    deskripsi_lengkap: 'Long desc',
                    estimasi_waktu: 30,
                    is_active: true
                };
                
                const result = await jenisLayananService.update(
                    1, 
                    dataRaw, 
                    { buffer: Buffer.from('test'), originalname: 'test.jpg' }
                );
                
                expect(jenisLayananRepository.update).toHaveBeenCalled();
                expect(uploadToCloudinary).toHaveBeenCalled();
                expect(deleteFromCloudinaryByUrl).toHaveBeenCalledWith('old.jpg', 'jenis-layanan');
            });

            it('should update without file upload', async () => {
                const mockExt = { 
                    id: 1, 
                    image: 'old.jpg', 
                    nama_jenis_layanan: 'Test',
                    deskripsi_singkat: 'Old desc'
                };
                jenisLayananRepository.findById.mockResolvedValue(mockExt);
                jenisLayananRepository.update.mockResolvedValue({
                    ...mockExt,
                    nama_jenis_layanan: 'Updated Name'
                });

                const dataRaw = { 
                    nama_jenis_layanan: 'Updated Name',
                    deskripsi_singkat: 'Updated desc'
                };

                const result = await jenisLayananService.update(1, dataRaw, null);
                
                expect(jenisLayananRepository.update).toHaveBeenCalled();
                expect(uploadToCloudinary).not.toHaveBeenCalled();
                expect(deleteFromCloudinaryByUrl).not.toHaveBeenCalled();
            });

            it('should validate and update with id_target_peserta', async () => {
                const mockExt = { 
                    id: 1, 
                    image: null,
                    nama_jenis_layanan: 'Test' 
                };
                jenisLayananRepository.findById.mockResolvedValue(mockExt);
                targetPesertaRepository.findById.mockResolvedValue({ id: 2 });
                jenisLayananRepository.update.mockResolvedValue({
                    ...mockExt,
                    id_target_peserta: 2
                });

                const dataRaw = { 
                    id_target_peserta: 2,
                    nama_jenis_layanan: 'Updated'
                };

                const result = await jenisLayananService.update(1, dataRaw, null);
                
                expect(targetPesertaRepository.findById).toHaveBeenCalledWith(2);
                expect(jenisLayananRepository.update).toHaveBeenCalled();
            });

            it('should update without validating id_target_peserta when not provided', async () => {
                const mockExt = { 
                    id: 1, 
                    image: null,
                    nama_jenis_layanan: 'Test' 
                };
                jenisLayananRepository.findById.mockResolvedValue(mockExt);
                jenisLayananRepository.update.mockResolvedValue(mockExt);

                const dataRaw = { 
                    nama_jenis_layanan: 'Updated',
                    deskripsi_singkat: 'New description'
                };

                const result = await jenisLayananService.update(1, dataRaw, null);
                
                expect(targetPesertaRepository.findById).not.toHaveBeenCalled();
                expect(jenisLayananRepository.update).toHaveBeenCalled();
            });
        });
    });

    // ========================================
    // TARGET PESERTA SERVICE TESTS
    // ========================================
    describe('targetPesertaService', () => {
        describe('getAll', () => {
            it('should throw error when no data found', async () => {
                targetPesertaRepository.findAll.mockResolvedValue([]);
                await expect(targetPesertaService.getAll()).rejects.toThrow('Data target peserta tidak ditemukan!');
            });

            it('should return all target peserta when data exists', async () => {
                const mockData = [
                    { id: 1, nama_target: 'Mahasiswa' },
                    { id: 2, nama_target: 'Siswa' }
                ];
                targetPesertaRepository.findAll.mockResolvedValue(mockData);
                const result = await targetPesertaService.getAll();
                expect(result).toEqual(mockData);
            });
        });

        describe('getById', () => {
            it('should throw error when target peserta not found', async () => {
                targetPesertaRepository.findById.mockResolvedValue(null);
                await expect(targetPesertaService.getById(1)).rejects.toThrow('Data target peserta tidak ditemukan!');
            });

            it('should return target peserta when found', async () => {
                const mockData = { id: 1, nama_target: 'Mahasiswa' };
                targetPesertaRepository.findById.mockResolvedValue(mockData);
                const result = await targetPesertaService.getById(1);
                expect(result).toEqual(mockData);
            });
        });
    });

    // ========================================
    // LAYANAN SERVICE TESTS
    // ========================================
    describe('layananService', () => {
        describe('getAll', () => {
            it('should throw error when no data found', async () => {
                layananRepository.findAll.mockResolvedValue([]);
                await expect(layananService.getAll(mockUser, {}))
                    .rejects
                    .toThrow('Data layanan yang dicari tidak ada!');
            });

            it('should filter by customer id and return formatted data', async () => {
                const mockData = [{
                    id: 1,
                    tanggal_mulai: new Date('2025-01-01'),
                    tanggal_selesai: new Date('2025-03-01'),
                    id_user: 1
                }];
                layananRepository.findAll.mockResolvedValue(mockData);
                
                const result = await layananService.getAll(mockUser, {});
                
                expect(result).toHaveLength(1);
                expect(calculateDurationMonth).toHaveBeenCalled();
            });

            it('should not filter by user id for admin role', async () => {
                const mockData = [
                    { id: 1, tanggal_mulai: new Date(), tanggal_selesai: new Date() },
                    { id: 2, tanggal_mulai: new Date(), tanggal_selesai: new Date() }
                ];
                layananRepository.findAll.mockResolvedValue(mockData);
                
                const result = await layananService.getAll(mockAdmin, {});
                
                expect(result).toHaveLength(2);
            });

            it('should handle layanan with null dates', async () => {
                const mockData = [{
                    id: 1,
                    tanggal_mulai: null,
                    tanggal_selesai: null
                }];
                layananRepository.findAll.mockResolvedValue(mockData);
                
                const result = await layananService.getAll(mockAdmin, {});
                
                expect(result[0].durasi_dalam_bulan).toBeNull();
            });
        });

        describe('getById', () => {
            it('should throw error when layanan not found', async () => {
                layananRepository.findById.mockResolvedValue([]);
                await expect(layananService.getById(1, mockUser))
                    .rejects
                    .toThrow('Data layanan tidak ada!');
            });

            it('should return formatted layanan data', async () => {
                const mockData = {
                    id: 1,
                    tanggal_mulai: new Date('2025-01-01'),
                    tanggal_selesai: new Date('2025-03-01')
                };
                layananRepository.findById.mockResolvedValue(mockData);
                
                const result = await layananService.getById(1, mockUser);
                
                expect(result).toBeDefined();
                expect(result.durasi_dalam_bulan).toBe(2);
            });

            it('should filter by user id for customer role', async () => {
                const mockData = {
                    id: 1,
                    tanggal_mulai: new Date('2025-01-01'),
                    tanggal_selesai: new Date('2025-03-01'),
                    id_user: 1
                };
                layananRepository.findById.mockResolvedValue(mockData);
                
                const result = await layananService.getById(1, mockUser);
                
                expect(buildFilter).toHaveBeenCalled();
                expect(result).toBeDefined();
            });
        });

        describe('create', () => {
            it('should throw error when jenis layanan is inactive', async () => {
                jenisLayananRepository.findById.mockResolvedValue({ 
                    id: 1, 
                    is_active: false 
                });
                
                const payloadRaw = {
                    id_jenis_layanan: 1,
                    isi_konfigurasi_layanan: JSON.stringify([{ id_kegiatan: [1] }])
                };
                
                await expect(layananService.create(payloadRaw, {}, mockUser))
                    .rejects
                    .toThrow('jenis layanan aktif tidak ditemukan!');
            });

            it('should throw error when jenis layanan not found', async () => {
                jenisLayananRepository.findById.mockResolvedValue(null);
                
                const payloadRaw = {
                    id_jenis_layanan: 999,
                    isi_konfigurasi_layanan: JSON.stringify([{ id_kegiatan: [1] }])
                };
                
                await expect(layananService.create(payloadRaw, {}, mockUser))
                    .rejects
                    .toThrow('jenis layanan aktif tidak ditemukan!');
            });

            it('should prevent duplicate Magang/PKL for same user', async () => {
                jenisLayananRepository.findById.mockResolvedValue({ 
                    id: 1, 
                    nama_jenis_layanan: 'Magang', 
                    is_active: true 
                });
                layananRepository.findOngoingByUserAndJenis.mockResolvedValue([{ id: 1 }]);
                
                const payloadRaw = {
                    id_jenis_layanan: 1,
                    isi_konfigurasi_layanan: JSON.stringify([{ id_kegiatan: [1] }])
                };
                
                await expect(layananService.create(payloadRaw, {}, mockUser))
                    .rejects
                    .toThrow('Masih ada magang/PKL yang sedang berlangsung');
            });

            it('should create layanan with new konfigurasi when hash not found', async () => {
                jenisLayananRepository.findById.mockResolvedValue({ 
                    id: 1, 
                    nama_jenis_layanan: 'Kunjungan', 
                    is_active: true 
                });
                layananRepository.findOngoingByUserAndJenis.mockResolvedValue([]);
                konfigurasiLayananRepository.findByHashAndJenis.mockResolvedValue(null);
                konfigurasiLayananRepository.create.mockResolvedValue({ id: 1 });
                subKegiatanRepository.findActiveSubKegiatanByJenisLayanan.mockResolvedValue([{ id: 1 }]);
                layananRepository.create.mockResolvedValue({ 
                    id: 100, 
                    user: mockUser,
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' }
                });

                const payloadRaw = { 
                    id_jenis_layanan: 1, 
                    isi_konfigurasi_layanan: JSON.stringify([{ id_kegiatan: [1] }]),
                    jumlah_peserta: '20',
                    nama_kegiatan: 'Kunjungan Industri',
                    instansi_asal: 'SMK Negeri 1',
                    tanggal_mulai: '2025-02-01',
                    tanggal_selesai: '2025-02-02',
                    tempat_kegiatan: 'Pabrik Kopi'
                };
                
                await layananService.create(payloadRaw, {}, mockUser);
                
                expect(konfigurasiLayananRepository.create).toHaveBeenCalled();
                expect(layananRepository.create).toHaveBeenCalled();
            });

            it('should reuse existing konfigurasi when hash matches', async () => {
                jenisLayananRepository.findById.mockResolvedValue({ 
                    id: 1, 
                    nama_jenis_layanan: 'Pelatihan', 
                    is_active: true 
                });
                layananRepository.findOngoingByUserAndJenis.mockResolvedValue([]);
                
                const existingKonfig = { id: 10, hash: 'existing-hash' };
                konfigurasiLayananRepository.findByHashAndJenis.mockResolvedValue(existingKonfig);
                
                subKegiatanRepository.findActiveSubKegiatanByJenisLayanan.mockResolvedValue([{ id: 1 }]);
                layananRepository.create.mockResolvedValue({ 
                    id: 100, 
                    user: mockUser,
                    jenis_layanan: { nama_jenis_layanan: 'Pelatihan' }
                });

                const payloadRaw = { 
                    id_jenis_layanan: 1, 
                    isi_konfigurasi_layanan: JSON.stringify([{ id_kegiatan: [1] }]),
                    jumlah_peserta: '15',
                    nama_kegiatan: 'Pelatihan Barista',
                    instansi_asal: 'Hotel',
                    tanggal_mulai: '2025-03-01',
                    tanggal_selesai: '2025-03-05',
                    tempat_kegiatan: 'Lab Kopi'
                };
                
                await layananService.create(payloadRaw, {}, mockUser);
                
                expect(konfigurasiLayananRepository.create).not.toHaveBeenCalled();
                expect(layananRepository.create).toHaveBeenCalledWith(
                    expect.objectContaining({ id_konfigurasi_layanan: 10 })
                );
            });

            it('should handle file uploads', async () => {
                jenisLayananRepository.findById.mockResolvedValue({ 
                    id: 1, 
                    nama_jenis_layanan: 'Magang', 
                    is_active: true 
                });
                layananRepository.findOngoingByUserAndJenis.mockResolvedValue([]);
                konfigurasiLayananRepository.findByHashAndJenis.mockResolvedValue(null);
                konfigurasiLayananRepository.create.mockResolvedValue({ id: 1 });
                subKegiatanRepository.findActiveSubKegiatanByJenisLayanan.mockResolvedValue([{ id: 1 }]);
                layananRepository.create.mockResolvedValue({ 
                    id: 100, 
                    user: mockUser,
                    jenis_layanan: { nama_jenis_layanan: 'Magang' }
                });
                
                uploadFilesBySchema.mockResolvedValue({
                    proposal: 'https://example.com/proposal.pdf',
                    surat_permohonan: 'https://example.com/surat.pdf'
                });

                const files = {
                    proposal: { buffer: Buffer.from('proposal'), originalname: 'proposal.pdf' },
                    surat_permohonan: { buffer: Buffer.from('surat'), originalname: 'surat.pdf' }
                };

                const payloadRaw = { 
                    id_jenis_layanan: 1, 
                    isi_konfigurasi_layanan: JSON.stringify([{ id_kegiatan: [1] }]),
                    nama_kegiatan: 'Magang',
                    instansi_asal: 'PT Test',
                    tanggal_mulai: '2025-01-01',
                    tanggal_selesai: '2025-03-31',
                    jumlah_peserta: '1'
                };
                
                await layananService.create(payloadRaw, files, mockUser);
                
                expect(uploadFilesBySchema).toHaveBeenCalled();
                expect(layananRepository.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        file_proposal: 'https://example.com/proposal.pdf',
                        file_surat_permohonan: 'https://example.com/surat.pdf'
                    })
                );
            });

            it('should send email notifications after creation', async () => {
                jenisLayananRepository.findById.mockResolvedValue({ 
                    id: 1, 
                    nama_jenis_layanan: 'Kunjungan', 
                    is_active: true 
                });
                layananRepository.findOngoingByUserAndJenis.mockResolvedValue([]);
                konfigurasiLayananRepository.findByHashAndJenis.mockResolvedValue(null);
                konfigurasiLayananRepository.create.mockResolvedValue({ id: 1 });
                subKegiatanRepository.findActiveSubKegiatanByJenisLayanan.mockResolvedValue([{ id: 1 }]);
                layananRepository.create.mockResolvedValue({ 
                    id: 100, 
                    user: mockUser,
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' }
                });

                const payloadRaw = { 
                    id_jenis_layanan: 1, 
                    isi_konfigurasi_layanan: JSON.stringify([{ id_kegiatan: [1] }]),
                    jumlah_peserta: '10',
                    nama_kegiatan: 'Test',
                    instansi_asal: 'Test',
                    tanggal_mulai: '2025-01-01',
                    tanggal_selesai: '2025-01-31',
                    tempat_kegiatan: 'Test'
                };
                
                await layananService.create(payloadRaw, {}, mockUser);
                
                expect(sendEmailLayananNotif).toHaveBeenCalled();
                expect(findUserByRole).toHaveBeenCalledWith('admin');
            });
        });

        describe('updateStatus', () => {
            it('should throw error when rejecting without reason', async () => {
                const baseLayanan = {
                    id: 1, 
                    pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                    pemohon: { id: 1 }, 
                    user: { email: 'c@t.com' },
                    layananRejection: []
                };

                jest.spyOn(layananService, 'getById').mockResolvedValue(baseLayanan);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DITOLAK.id });
                
                await expect(
                    layananService.updateStatus('S', 1, mockAdmin, STATUS.DITOLAK.id, null)
                ).rejects.toThrow('Alasan Penolakan harus disertakan!');
            });

            it('should throw error when trying to reject already rejected layanan', async () => {
                const alreadyRejected = {
                    id: 1, 
                    pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                    pemohon: { id: 1 }, 
                    user: { email: 'c@t.com' },
                    layananRejection: [{ id: 1, alasan: 'Already rejected' }]
                };
                
                jest.spyOn(layananService, 'getById').mockResolvedValue(alreadyRejected);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DITOLAK.id });
                
                await expect(
                    layananService.updateStatus('S', 1, mockAdmin, STATUS.DITOLAK.id, 'New reason')
                ).rejects.toThrow('Layanan sudah pernah ditolak!');
            });

            it('should create new rejection when rejecting for first time', async () => {
                const pendingLayanan = {
                    id: 1,
                    pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                    pemohon: { id: 1 },
                    user: { email: 'customer@test.com' },
                    layananRejection: []
                };
                
                jest.spyOn(layananService, 'getById').mockResolvedValue(pendingLayanan);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DITOLAK.id });
                layananRepository.update.mockResolvedValue({ 
                    ...pendingLayanan,
                    layananRejection: [],
                    user: { email: 'customer@test.com' } 
                });
                layananRejectionRepository.create.mockResolvedValue({
                    id: 1,
                    id_layanan: 1,
                    alasan: 'Dokumen tidak lengkap'
                });
                
                await layananService.updateStatus(
                    STATEMENT_LAYANAN.LAYANAN_DITOLAK,
                    1,
                    mockAdmin,
                    STATUS.DITOLAK.id,
                    'Dokumen tidak lengkap'
                );
                
                expect(layananRejectionRepository.create).toHaveBeenCalledWith({
                    id_layanan: 1,
                    alasan: 'Dokumen tidak lengkap'
                });
            });

            it('should throw error when non-admin tries to approve', async () => {
                const pendingLayanan = {
                    id: 1,
                    pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                    pemohon: { id: 1 },
                    user: { email: 'customer@test.com' },
                    layananRejection: []
                };
                
                jest.spyOn(layananService, 'getById').mockResolvedValue(pendingLayanan);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DISETUJUI.id });
                
                await expect(
                    layananService.updateStatus('S', 1, mockUser, STATUS.DISETUJUI.id)
                ).rejects.toThrow('Hanya admin yang boleh mengubah status pengajuan');
            });

            it('should throw error when non-admin tries to reject', async () => {
                const pendingLayanan = {
                    id: 1,
                    pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                    pemohon: { id: 1 },
                    user: { email: 'customer@test.com' },
                    layananRejection: []
                };
                
                jest.spyOn(layananService, 'getById').mockResolvedValue(pendingLayanan);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DITOLAK.id });
                
                await expect(
                    layananService.updateStatus('S', 1, mockUser, STATUS.DITOLAK.id, 'Some reason')
                ).rejects.toThrow('Hanya admin yang boleh mengubah status pengajuan');
            });

            it('should approve layanan that requires MOU (Magang/PKL/Pelatihan)', async () => {
                const pendingLayanan = {
                    id: 1,
                    pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Magang' },
                    pemohon: { id: 1 },
                    user: { email: 'customer@test.com' },
                    layananRejection: []
                };
                
                jest.spyOn(layananService, 'getById').mockResolvedValue(pendingLayanan);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DISETUJUI.id });
                layananRepository.update.mockResolvedValue({ 
                    ...pendingLayanan, 
                    user: { email: 'customer@test.com' } 
                });
                
                await layananService.updateStatus(
                    STATEMENT_LAYANAN.LAYANAN_DISETUJUI,
                    1,
                    mockAdmin,
                    STATUS.DISETUJUI.id
                );
                
                expect(layananRepository.update).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({ 
                        id_status_pengajuan: STATUS.DISETUJUI.id,
                        id_status_pelaksanaan: STATUS.BELUM_TERLAKSANA.id 
                    })
                );
            });

            it('should approve layanan that does not require MOU', async () => {
                const pendingLayanan = {
                    id: 1,
                    pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                    pemohon: { id: 1 },
                    user: { email: 'customer@test.com' },
                    layananRejection: []
                };
                
                jest.spyOn(layananService, 'getById').mockResolvedValue(pendingLayanan);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DISETUJUI.id });
                layananRepository.update.mockResolvedValue({ 
                    ...pendingLayanan, 
                    user: { email: 'customer@test.com' } 
                });
                
                await layananService.updateStatus(
                    STATEMENT_LAYANAN.LAYANAN_DISETUJUI,
                    1,
                    mockAdmin,
                    STATUS.DISETUJUI.id
                );
                
                expect(layananRepository.update).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({ 
                        id_status_pengajuan: STATUS.DISETUJUI.id,
                        id_status_pelaksanaan: STATUS.SEDANG_BERJALAN.id 
                    })
                );
            });

            it('should allow customer to finish their own service', async () => {
                const running = {
                    id: 1,
                    pengajuan: { id: STATUS.DISETUJUI.id },
                    pelaksanaan: { id: STATUS.SEDANG_BERJALAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                    pemohon: { id: 1 },
                    user: { email: 'user@test.com' }
                };
                
                jest.spyOn(layananService, 'getById').mockResolvedValue(running);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.SELESAI.id });
                layananRepository.update.mockResolvedValue({ ...running, user: mockUser });
                
                await layananService.updateStatus(
                    STATEMENT_LAYANAN.LAYANAN_DISELESAIKAN, 
                    1, 
                    mockUser, 
                    STATUS.SELESAI.id
                );
                
                expect(layananRepository.update).toHaveBeenCalledWith(
                    1,
                    expect.objectContaining({ id_status_pelaksanaan: STATUS.SELESAI.id })
                );
            });

            it('should throw error when non-owner tries to finish service', async () => {
                const running = {
                    id: 1,
                    pengajuan: { id: STATUS.DISETUJUI.id },
                    pelaksanaan: { id: STATUS.SEDANG_BERJALAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                    pemohon: { id: 999 },
                    user: { email: 'other@test.com' }
                };
                
                jest.spyOn(layananService, 'getById').mockResolvedValue(running);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.SELESAI.id });
                
                await expect(
                    layananService.updateStatus('S', 1, mockUser, STATUS.SELESAI.id)
                ).rejects.toThrow('Hanya user bersangkutan yang bisa menyelesaikan');
            });

            it('should send email to customer when admin updates status', async () => {
                const pendingLayanan = {
                    id: 1,
                    pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                    pemohon: { id: 1 },
                    user: { email: 'customer@test.com' },
                    layananRejection: []
                };
                
                jest.spyOn(layananService, 'getById').mockResolvedValue(pendingLayanan);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DISETUJUI.id });
                layananRepository.update.mockResolvedValue({ 
                    ...pendingLayanan,
                    user: { email: 'customer@test.com' }
                });
                
                await layananService.updateStatus(
                    STATEMENT_LAYANAN.LAYANAN_DISETUJUI,
                    1,
                    mockAdmin,
                    STATUS.DISETUJUI.id
                );
                
                expect(sendEmailLayananNotif).toHaveBeenCalled();
            });

            it('should send email to admins and customer when customer updates status', async () => {
                const running = {
                    id: 1,
                    pengajuan: { id: STATUS.DISETUJUI.id },
                    pelaksanaan: { id: STATUS.SEDANG_BERJALAN.id },
                    jenis_layanan: { nama_jenis_layanan: 'Kunjungan' },
                    pemohon: { id: 1 },
                    user: { email: 'user@test.com' }
                };
                
                jest.spyOn(layananService, 'getById').mockResolvedValue(running);
                statusKodeRepository.findById.mockResolvedValue({ id: STATUS.SELESAI.id });
                layananRepository.update.mockResolvedValue({ ...running, user: mockUser });
                
                await layananService.updateStatus(
                    STATEMENT_LAYANAN.LAYANAN_DISELESAIKAN,
                    1,
                    mockUser,
                    STATUS.SELESAI.id
                );
                
                expect(findUserByRole).toHaveBeenCalledWith('admin');
                expect(sendEmailLayananNotif).toHaveBeenCalled();
            });
        });

        describe('uploadLogbook', () => {
            it('should update logbook link', async () => {
                const mockLayanan = { id: 1, nama_kegiatan: 'Test' };
                jest.spyOn(layananService, 'getById').mockResolvedValue(mockLayanan);
                layananRepository.update.mockResolvedValue({ 
                    ...mockLayanan, 
                    link_logbook: 'https://docs.google.com/logbook' 
                });

                await layananService.uploadLogbook(1, 'https://docs.google.com/logbook', mockUser);
                
                expect(layananRepository.update).toHaveBeenCalledWith(
                    1, 
                    { link_logbook: 'https://docs.google.com/logbook' }
                );
            });
        });

        describe('setAsOpened', () => {
            it('should update opened_at timestamp', async () => {
                const mockLayanan = { id: 1, nama_kegiatan: 'Test' };
                jest.spyOn(layananService, 'getById').mockResolvedValue(mockLayanan);
                layananRepository.update.mockResolvedValue({ 
                    ...mockLayanan, 
                    opened_at: new Date() 
                });

                await layananService.setAsOpened(1, mockUser);
                
                expect(layananRepository.update).toHaveBeenCalledWith(
                    1, 
                    expect.objectContaining({ opened_at: expect.any(Date) })
                );
            });
        });
    });
});