jest.mock('../src/utils/apiError.js', () => require('../__mocks__/apiError.mock.js'));
jest.mock('../src/services/cloudinaryUpload.service.js', () => require('../__mocks__/cloudinaryUpload.mock.js'));
jest.mock('../src/services/cloudinaryDelete.service.js', () => require('../__mocks__/cloudinaryDelete.mock.js'));
jest.mock('../src/utils/email.js', () => ({ sendEmail: jest.fn() }));
jest.mock('../src/utils/sanitizeData.js', () => ({ sanitizeData: jest.fn(data => data) }));
jest.mock('../src/utils/calculateDurationMonth.js', () => ({ calculateDurationMonth: jest.fn(() => 3) }));

// Mock layanan
jest.mock('../src/layanan/C_Layanan.repository.js');
const { layananRepository, jenisLayananRepository, statusKodeRepository, layananRejectionRepository } = require('../src/layanan/C_Layanan.repository.js');
jest.mock('../src/layanan/C_Layanan.helper.js');
const { buildFilter, hitungPeserta, sendNotifikasiAdminLayanan, sendNotifikasiPengusulLayanan } = require('../src/layanan/C_Layanan.helper.js');

// Mock User Repository
jest.mock('../src/auth/user.repository.js', () => ({
    findUserByRole: jest.fn().mockResolvedValue([{ email: 'admin@test.com' }])
}));
const { findUserByRole } = require('../src/auth/user.repository.js');

// Mock Prisma Transaction
jest.mock('../src/db/index.js', () => ({
    $transaction: jest.fn(async (callback) => await callback({})),
}));

// Impor Target
const { layananService, jenisLayananService } = require('../src/layanan/C_Layanan.service.js');
const ApiError = require('../src/utils/apiError.js');
const { STATUS, STATEMENT_LAYANAN } = require('../src/utils/constant/enum.js');


describe('LAYANAN SERVICE UNIT TESTS', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default helper behavior
        buildFilter.mockReturnValue({ where: {}, orderBy: { created_at: 'desc' } });
    });


    describe('jenisLayananService', () => {
        const mockJenisLayanan = { id: 1, nama_jenis_layanan: 'Pelatihan', is_active: true };

        it('getAll should return all items', async () => {
            jenisLayananRepository.findAll.mockResolvedValue([mockJenisLayanan]);
            await expect(jenisLayananService.getAll()).resolves.toEqual([mockJenisLayanan]);
            expect(jenisLayananRepository.findAll).toHaveBeenCalledTimes(1);
        });

        it('getById should throw 404 if not found', async () => {
            jenisLayananRepository.findById.mockResolvedValue(null);
            await expect(jenisLayananService.getById(999)).rejects.toThrow(ApiError);
        });
    });


    describe('layananService.updateStatus', () => {
        const mockAdmin = { id: 1, admin: true, role: 'admin', email: 'testAdm@example.com' };
        const mockCustomer = { id: 2, role: 'customer', email: 'customer@test.com' };
        const mockLayananPending = {
            id: 1, pemohon: { id: 2 },
            pengajuan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
            pelaksanaan: { id: STATUS.MENUNGGU_PERSETUJUAN.id },
            layananRejection: [],
            jenis_layanan: { nama_jenis_layanan: 'Magang' },
            konfigurasiLayanan: {
                detailKonfigurasis: [
                    {
                        kegiatan: { nama_kegiatan: 'Kegiatan Test' },
                        subKegiatan: { nama_sub_kegiatan: 'Sub Test' },
                        urutan_ke: 1
                    }
                ]
            },
            pesertas: [{nama_peserta: 'jon do', nim: '3232'}]
        };

        it('should update status to DISETUJUI and BELUM_TERLAKSANA when accepted by admin', async () => {
            layananService.getById = jest.fn().mockResolvedValue(mockLayananPending);
            statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DISETUJUI.id });
            layananRepository.update.mockResolvedValue({
                id: 1,
                user: { email: 'customer@test.com' },
                pengajuan: { id: STATUS.DISETUJUI.id, nama_status_kode: STATUS.DISETUJUI.nama_status_kode },
                pelaksanaan: { id: STATUS.BELUM_TERLAKSANA.id, nama_status_kode: STATUS.BELUM_TERLAKSANA.nama_status_kode },
                jenisLayanan: { nama_jenis_layanan: 'Magang' },
                konfigurasiLayanan: {
                    detailKonfigurasis: [
                        {
                            kegiatan: { nama_kegiatan: 'Kegiatan Test' },
                            subKegiatan: { nama_sub_kegiatan: 'Sub Test' },
                            urutan_ke: 1
                        }
                    ]
                },
                pesertas: [{nama_peserta: 'jon do', nim: '3232'}]
            });

            await layananService.updateStatus(STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DISETUJUI, 1, mockAdmin, STATUS.DISETUJUI.id);

            expect(layananRepository.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    id_status_pengajuan: STATUS.DISETUJUI.id,
                    id_status_pelaksanaan: STATUS.BELUM_TERLAKSANA.id,
                })
            );
        });

        it('should throw 400 ApiError if admin rejects without a reason', async () => {
            layananService.getById = jest.fn().mockResolvedValue(mockLayananPending);
            statusKodeRepository.findById.mockResolvedValue({ id: STATUS.DITOLAK.id });

            await expect(
                layananService.updateStatus(STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DITOLAK, 1, mockAdmin, STATUS.DITOLAK.id, null) // alasan: null
            ).rejects.toMatchObject({
                statusCode: 400,
                message: 'Alasan Penolakan harus disertakan!',
            });
        });

        it('should allow customer owner to finish service from SEDANG_BERJALAN to SELESAI', async () => {
            findUserByRole.mockResolvedValue([{ email: 'admin@test.com' }]);
            const mockLayananBerjalan = {
                ...mockLayananPending,
                pelaksanaan: { id: STATUS.SEDANG_BERJALAN.id },
            };
            layananService.getById = jest.fn().mockResolvedValue(mockLayananBerjalan);
            statusKodeRepository.findById.mockResolvedValue({ id: STATUS.SELESAI.id });
            layananRepository.update.mockResolvedValue({
                id: 1,
                user: { email: 'customer@test.com' },
                pelaksanaan: { id: STATUS.SELESAI.id },
                jenisLayanan: { nama_jenis_layanan: 'Magang' },
                konfigurasiLayanan: {
                    detailKonfigurasis: [
                        {
                            kegiatan: { nama_kegiatan: 'Kegiatan Test' },
                            subKegiatan: { nama_sub_kegiatan: 'Sub Test' },
                            urutan_ke: 1
                        }
                    ]
                },
                pesertas: [{nama_peserta: 'jon do', nim: '3232'}]
            });

            await layananService.updateStatus(STATEMENT_LAYANAN.PELAKSANAAN_SELESAI, 1, mockCustomer, STATUS.SELESAI.id);

            expect(layananRepository.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ id_status_pelaksanaan: STATUS.SELESAI.id })
            );
        });
    });
});