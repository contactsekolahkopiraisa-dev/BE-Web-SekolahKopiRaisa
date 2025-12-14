const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Mengarahkan imports ke file mock modular
jest.mock('../src/middleware/middleware', () => require('../__mocks__/middleware.mock'));
jest.mock('../src/middleware/validate.joi', () => require('../__mocks__/validate.joi.mock'));
jest.mock('../src/middleware/multer.js', () => require('../__mocks__/multer.mock'));

// Mock Layer Service (Laporan Layanan)
jest.mock('../src/laporan_layanan/C_LaporanLayanan.service', () => ({
  laporanLayananService: {
    getById: jest.fn(),
    create: jest.fn(),
  },
}));
const { laporanLayananService } = require('../src/laporan_layanan/C_LaporanLayanan.service');
const { laporanLayananRoutes } = require('../src/laporan_layanan/C_LaporanLayanan.routes');

// Setup App
const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use('/api/v1/laporan-layanan', laporanLayananRoutes);

const mockLaporan = { id: 1, nama_p4s: "Laporan Kegiatan" };

describe('LAPORAN LAYANAN CONTROLLER: /api/v1/laporan-layanan', () => {
    beforeEach(() => jest.clearAllMocks());

    it('GET /:id should return 200 and data on GET by id (Admin/Customer)', async () => {
        laporanLayananService.getById.mockResolvedValue(mockLaporan);
        const res = await request(app).get('/api/v1/laporan-layanan/1').set('x-user-role', 'customer');
        expect(res.statusCode).toBe(200);
        expect(laporanLayananService.getById).toHaveBeenCalled();
    });

    it('POST / should allow customer to create laporan and return 201', async () => {
        laporanLayananService.create.mockResolvedValue(mockLaporan);
        const res = await request(app).post('/api/v1/laporan-layanan').set('x-user-role', 'customer').send({ nama_p4s: 'P4S', asal_kab_kota: 'Jember', id_layanan: 1 });
        expect(res.statusCode).toBe(201);
        expect(laporanLayananService.create).toHaveBeenCalled();
    });

    it('POST / should return 403 if admin tries to create (diblock di controller)', async () => {
        const res = await request(app).post('/api/v1/laporan-layanan').set('x-user-role', 'admin').send({});
        expect(res.statusCode).toBe(403);
    });
});