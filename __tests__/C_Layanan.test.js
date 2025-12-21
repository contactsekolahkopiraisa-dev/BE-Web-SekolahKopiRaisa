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
    layananService: { getAll: jest.fn(), getById: jest.fn(), create: jest.fn(), updateStatus: jest.fn(), uploadLogbook: jest.fn(), },
    jenisLayananService: { getAll: jest.fn(), getById: jest.fn(), update: jest.fn() },
    // ... exports lainnya
}));

const { layananService, jenisLayananService } = require('../src/layanan/C_Layanan.service');
const { layananRoutes, jenisLayananRoutes } = require('../src/layanan/C_Layanan.routes');

// Setup App
const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use('/api/v1/jenis-layanan', jenisLayananRoutes);
app.use('/api/v1/layanan', layananRoutes);

// Mock Data
const mockLayanan = { id: 1, instansi_asal: "Kampus A", id_user: 2 };
const mockJenisLayanan = { id: 1, nama_jenis_layanan: 'Magang', is_active: true };

describe('LAYANAN DAN JENIS LAYANAN CONTROLLER', () => {
    beforeEach(() => jest.clearAllMocks());

    // ------------------------------------------------------------------------
    // JENIS LAYANAN TESTS
    // ------------------------------------------------------------------------
    describe('JENIS LAYANAN: /api/v1/jenis-layanan', () => {
        it('GET / should return 200 and all jenis layanan', async () => {
            jenisLayananService.getAll.mockResolvedValue([mockJenisLayanan]);
            const res = await request(app).get('/api/v1/jenis-layanan');
            expect(res.statusCode).toBe(200);
        });

        it('PUT /:id should allow admin to update and return 200', async () => {
            jenisLayananService.update.mockResolvedValue({ ...mockJenisLayanan, nama_jenis_layanan: 'Updated' });
            const res = await request(app).put('/api/v1/jenis-layanan/1').set('x-user-role', 'admin').send({ nama_jenis_layanan: 'Updated' });
            expect(res.statusCode).toBe(200);
        });
    });

    // ------------------------------------------------------------------------
    // LAYANAN TESTS
    // ------------------------------------------------------------------------
    describe('LAYANAN: /api/v1/layanan', () => {
        it('POST / should allow customer to create layanan and return 201', async () => {
            layananService.create.mockResolvedValue(mockLayanan);
            const res = await request(app)
                .post('/api/v1/layanan')
                .set('x-user-role', 'customer')
                .send({ id_jenis_layanan: 1, instansi_asal: 'Test', tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-01-30' });
            expect(res.statusCode).toBe(201);
            expect(layananService.create).toHaveBeenCalled();
        });

        it('PUT /:id/logbook should allow customer to upload logbook and return 200', async () => {
            layananService.uploadLogbook.mockResolvedValue(mockLayanan);
            const res = await request(app).put('/api/v1/layanan/1/logbook').set('x-user-role', 'customer').send({ link_logbook: 'link.com' });
            expect(res.statusCode).toBe(200);
        });
    });
});