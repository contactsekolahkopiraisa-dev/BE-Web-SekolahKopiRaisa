const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Mengarahkan imports ke file mock modular
jest.mock('../src/middleware/middleware', () => require('../__mocks__/middleware.mock'));
jest.mock('../src/middleware/validate.joi', () => require('../__mocks__/validate.joi.mock'));
jest.mock('../src/middleware/multer.js', () => require('../__mocks__/multer.mock'));

// Mock Layer Service
jest.mock('../src/layanan/C_Layanan.service', () => ({
    layananService: { getAll: jest.fn(), getById: jest.fn(), create: jest.fn(), updateStatus: jest.fn(), uploadLogbook: jest.fn(), setAsOpened: jest.fn() },
    jenisLayananService: { getAll: jest.fn(), getById: jest.fn(), update: jest.fn() },
    statusKodeService: { getAll: jest.fn(), getById: jest.fn() },
    targetPesertaService: { getAll: jest.fn(), getById: jest.fn() },
}));

const { layananService, jenisLayananService, statusKodeService, targetPesertaService } = require('../src/layanan/C_Layanan.service');
const { layananRoutes, jenisLayananRoutes, statusKodeRoutes, targetPesertaRoutes } = require('../src/layanan/C_Layanan.routes');

// Setup App
const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use('/api/v1/jenis-layanan', jenisLayananRoutes);
app.use('/api/v1/layanan', layananRoutes);
app.use('/api/v1/status-kode', statusKodeRoutes);
app.use('/api/v1/target-peserta', targetPesertaRoutes);

// Mock Data
const mockLayanan = { id: 1, instansi_asal: "Kampus A", id_user: 2 };
const mockJenisLayanan = { id: 1, nama_jenis_layanan: 'Magang', is_active: true };

describe('LAYANAN DAN JENIS LAYANAN CONTROLLER', () => {
    beforeEach(() => jest.clearAllMocks());
    // ------------------------------------------------------------------------
    // STATUS KODE TESTS 
    // ------------------------------------------------------------------------
    describe('STATUS KODE: /api/v1/status-kode', () => {
        // GET ALL STATUS KODE 200
        it('GET / should return 200 and all status codes', async () => {
            statusKodeService.getAll.mockResolvedValue([{ id: 1, nama_status: 'Baru' }]);
            const res = await request(app).get('/api/v1/status-kode');
            expect(res.statusCode).toBe(200);
        });
        // GET STATUS KODE BY ID 200
        it('GET /:id should return 200 and data', async () => {
            statusKodeService.getById.mockResolvedValue({ id: 1 });
            const res = await request(app).get('/api/v1/status-kode/1');
            expect(res.statusCode).toBe(200);
        });
        // GET STATUS KODE BY ID 404
        it('GET / should return error data not found', async () => {
            statusKodeService.getById.mockRejectedValue(new Error("Data Tidak ditemukan"));
            const res = await request(app).get('/api/v1/status-kode/99');
            expect(res.statusCode).not.toBe(200);
        });
    });

    // ------------------------------------------------------------------------
    // TARGET PESERTA TESTS 
    // ------------------------------------------------------------------------
    describe('TARGET PESERTA: /api/v1/target-peserta', () => {
        // GET ALL TARGET PESERTA 200
        it('GET / should return 200 and all targets', async () => {
            targetPesertaService.getAll.mockResolvedValue([{ id: 1 }]);
            const res = await request(app).get('/api/v1/target-peserta');
            expect(res.statusCode).toBe(200);
        });
        // GET TARGET PESERTA BY ID 200
        it('GET /:id should return success and data', async () => {
            targetPesertaService.getById.mockResolvedValue([{ id: 1, nama: 'Mahasiswa' }]);
            const res = await request(app).get('/api/v1/target-peserta/1');
            expect(res.statusCode).toBe(200);
        });
        // GET TARGET PESERTA BY ID 404
        it('GET /:id should return error data not found', async () => {
            targetPesertaService.getById.mockRejectedValue(new Error("Data Tidak ditemukan"));
            const res = await request(app).get('/api/v1/target-peserta/99');
            expect(res.statusCode).not.toBe(200);
        });
    });
    // ------------------------------------------------------------------------
    // JENIS LAYANAN TESTS
    // ------------------------------------------------------------------------
    describe('JENIS LAYANAN: /api/v1/jenis-layanan', () => {
        // GET ALL JENIS LAYANAN 200
        it('GET / should return 200 and all jenis layanan', async () => {
            jenisLayananService.getAll.mockResolvedValue([mockJenisLayanan]);
            const res = await request(app).get('/api/v1/jenis-layanan');
            expect(res.statusCode).toBe(200);
        });

        // GET JENIS LAYANAN BY ID 200
        it('GET /:id should return 200 and data', async () => {
            jenisLayananService.getById.mockResolvedValue(mockJenisLayanan);
            const res = await request(app).get('/api/v1/jenis-layanan/1');
            expect(res.statusCode).toBe(200);
        });
        // GET JENIS LAYANAN BY ID 404
        it('GET /:id should return 200 and data', async () => {
            jenisLayananService.getById.mockRejectedValue(new Error("data not found"));
            const res = await request(app).get('/api/v1/jenis-layanan/1');
            expect(res.statusCode).not.toBe(200);
        });

        // PUT JENIS LAYANAN BY ID 200
        it('PUT /:id should allow admin to update and return 200', async () => {
            jenisLayananService.update.mockResolvedValue({ ...mockJenisLayanan, nama_jenis_layanan: 'Updated' });
            const res = await request(app).put('/api/v1/jenis-layanan/1').set('x-user-role', 'admin').send({ nama_jenis_layanan: 'Updated' });
            expect(res.statusCode).toBe(200);
        });
        // PUT JENIS LAYANAN BY ID 200
        it('PUT /:id should allow admin to update and return 200', async () => {
            jenisLayananService.update.mockResolvedValue({ ...mockJenisLayanan, nama_jenis_layanan: 'Updated', file: 'dfdf' });
            const res = await request(app).put('/api/v1/jenis-layanan/1').set('x-user-role', 'admin').send({ nama_jenis_layanan: 'Updated' });
            expect(res.statusCode).toBe(200);
        });
        // PUT JENIS LAYANAN BY ID 500
        it('PUT /:id should return error service when updated', async () => {
            jenisLayananService.update.mockRejectedValue(new Error("Update Failed"));
            const res = await request(app).put('/api/v1/jenis-layanan/1').set('x-user-role', 'admin').send({ nama_jenis_layanan: 'Updated' });
            expect(res.statusCode).not.toBe(200);
        });
    });
    // ------------------------------------------------------------------------
    // LAYANAN TESTS
    // ------------------------------------------------------------------------
    describe('LAYANAN: /api/v1/layanan', () => {
        // GET LAYANAN 200
        it('GET / should return 200 and data', async () => {
            layananService.getAll.mockResolvedValue(mockLayanan);
            const res = await request(app).get('/api/v1/layanan/').set('x-user-role', 'customer');
            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
        });
        // GET ALL LAYANAN 500
        it('GET / should return error status when service fails', async () => {
            layananService.getAll.mockRejectedValue(new Error("Service Error"));
            const res = await request(app).get('/api/v1/layanan').set('x-user-role', 'admin');
            expect(res.statusCode).not.toBe(200);
        });
        // GET LAYANAN BY ID 403
        it('GET / should return error forbidden when non-customer/admin try to accept', async () => {
            const res = await request(app).get('/api/v1/layanan').set('x-user-role', 'UMKM');
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toContain('Akses ditolak: Role tidak diizinkan.');
        });
        
        // GET LAYANAN BY ID 200
        it('GET /:id should return 200 and data', async () => {
            layananService.getById.mockResolvedValue(mockLayanan);
            const res = await request(app).get('/api/v1/layanan/1').set('x-user-role', 'customer');
            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
        });
        // GET LAYANAN BY ID 500
        it('GET /:id should return error status when service fails', async () => {
            layananService.getById.mockRejectedValue(new Error("Service Error"));
            const res = await request(app).get('/api/v1/layanan/1').set('x-user-role', 'customer');
            expect(res.statusCode).not.toBe(200);
        });
        // GET LAYANAN BY ID 403
        it('GET /:id should return error forbidden when non-customer/admin try to access', async () => {
            const res = await request(app).get('/api/v1/layanan/1').set('x-user-role', 'UMKM');
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toContain('Akses ditolak: Role tidak diizinkan.');
        });

        // POST LAYANAN 201
        it('POST / should allow customer to create layanan and return 201', async () => {
            layananService.create.mockResolvedValue(mockLayanan);
            const res = await request(app)
                .post('/api/v1/layanan')
                .set('x-user-role', 'customer')
                .send({ id_jenis_layanan: 1, instansi_asal: 'Test', tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-01-30' });
            expect(res.statusCode).toBe(201);
            expect(layananService.create).toHaveBeenCalled();
        });
        // POST LAYANAN 403
        it('POST / should return error forbidden when non-customer try to create', async () => {
            layananService.create.mockResolvedValue(mockLayanan);
            const res = await request(app)
                .post('/api/v1/layanan')
                .set('x-user-role', 'admin')
                .send({ id_jenis_layanan: 1, instansi_asal: 'Test', tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-01-30' });
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toContain('Akses ditolak: Role tidak diizinkan.');
        });
        // POST LAYANAN 500
        it('POST / should return error forbidden when non-customer try to create', async () => {
            layananService.create.mockRejectedValue(new Error("Service error"));
            const res = await request(app)
                .post('/api/v1/layanan')
                .set('x-user-role', 'customer')
                .send({ id_jenis_layanan: 1, instansi_asal: 'Test', tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-01-30' });
            expect(res.statusCode).not.toBe(201);
        });

        // PUT ACCEPT LAYANAN 200
        it('PUT /:id/accept-pengajuan should allow admin to accept and return 200', async () => {
            layananService.updateStatus.mockResolvedValue({ ...mockLayanan });
            const res = await request(app)
                .put('/api/v1/layanan/1/accept-pengajuan')
                .set('x-user-role', 'admin');
            expect(res.statusCode).toBe(200);
        });
        // PUT REJECT LAYANAN 200
        it('PUT /:id/reject-pengajuan should allow admin to reject and return 200', async () => {
            layananService.updateStatus.mockResolvedValue({ ...mockLayanan });
            const res = await request(app)
                .put('/api/v1/layanan/1/reject-pengajuan')
                .set('x-user-role', 'admin')
                .send({ alasan: 'Dokumen tidak lengkap' });
            expect(res.statusCode).toBe(200);
        });
        // PUT ACCEPT PENGAJUAN 500
        it('PUT /:id/accept-pengajuan should return error when data failed to be updated', async () => {
            layananService.updateStatus.mockRejectedValue(new Error("Database Fail"));
            const res = await request(app)
                .put('/api/v1/layanan/1/accept-pengajuan')
                .set('x-user-role', 'admin');
            expect(res.statusCode).not.toBe(200);
        });
        // PUT REJECT PENGAJUAN 500
        it('PUT /:id/reject-pengajuan should return error forbidden when data updated by non-admin', async () => {
            layananService.updateStatus.mockRejectedValue(new Error("Database Fail"));
            const res = await request(app)
                .put('/api/v1/layanan/1/reject-pengajuan')
                .set('x-user-role', 'customer');
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toContain('Akses ditolak: Role tidak diizinkan.');
        });

        // PUT LOGBOOK LAYANAN 200
        it('PUT /:id/logbook should allow customer to upload logbook and return 200', async () => {
            layananService.uploadLogbook.mockResolvedValue(mockLayanan);
            const res = await request(app).put('/api/v1/layanan/1/logbook').set('x-user-role', 'customer').send({ link_logbook: 'link.com' });
            expect(res.statusCode).toBe(200);
        });
        // PUT LOGBOOK LAYANAN 500
        it('PUT /:id/logbook should allow customer to upload logbook and return 200', async () => {
            layananService.uploadLogbook.mockRejectedValue(new Error("Service fail"));
            const res = await request(app).put('/api/v1/layanan/1/logbook').set('x-user-role', 'customer').send({ link_logbook: 'link.com' });
            expect(res.statusCode).not.toBe(200);
        });

        // PUT FINISH PELAKSANAAN LAYANAN 200
        it('PUT /:id/finish-pelaksanaan should allow pengguna to finish service', async () => {
            layananService.updateStatus.mockResolvedValue(mockLayanan);
            const res = await request(app)
                .put('/api/v1/layanan/1/finish-pelaksanaan')
                .set('x-user-role', 'customer');
            expect(res.statusCode).toBe(200);
        });
        // PUT FINISH PELAKSANAAN LAYANAN 500
        it('PUT /:id/finish-pelaksanaan should allow pengguna to finish service', async () => {
            layananService.updateStatus.mockRejectedValue(new Error("service fail"));
            const res = await request(app)
                .put('/api/v1/layanan/1/finish-pelaksanaan')
                .set('x-user-role', 'customer');
            expect(res.statusCode).not.toBe(200);
        });
        // PUT FINISH PELAKSANAAN LAYANAN 403
        it('PUT /:id/finish-pelaksanaan should allow pengguna to finish service', async () => {
            layananService.updateStatus.mockRejectedValue(new Error("service fail"));
            const res = await request(app)
                .put('/api/v1/layanan/1/finish-pelaksanaan')
                .set('x-user-role', 'admin');
            expect(res.statusCode).toBe(403);
        });

        // PUT SET AS OPENED LAYANAN 200
        it('PUT /:id/set-as-opened should allow user to set as opened', async () => {
            layananService.setAsOpened.mockResolvedValue(mockLayanan);
            const res = await request(app)
                .put('/api/v1/layanan/1/set-as-opened')
                .set('x-user-role', 'admin');
            expect(res.statusCode).toBe(200);
        });
        // PUT SET AS OPENED LAYANAN 403
        it('PUT /:id/set-as-opened should return 403 if non-admin tries to', async () => {
            const res = await request(app).put('/api/v1/layanan/1/set-as-opened').set('x-user-role', 'customer');
            expect(res.statusCode).toBe(403);
        });
    });
})