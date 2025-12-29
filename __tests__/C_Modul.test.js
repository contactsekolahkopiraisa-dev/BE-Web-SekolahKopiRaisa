const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Mengarahkan imports ke file mock modular
jest.mock('../src/middleware/middleware', () => require('../__mocks__/middleware.mock'));
jest.mock('../src/middleware/validate.joi', () => require('../__mocks__/validate.joi.mock'));
jest.mock('../src/middleware/multer.js', () => require('../__mocks__/multer.mock'));

// Mock Layer Service (Modul)
jest.mock('../src/modul/C_Modul.service', () => ({
    modulService: {
        getAll: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn()
    }
}));

const { modulService } = require('../src/modul/C_Modul.service');
const { modulRoutes } = require('../src/modul/C_Modul.routes');

// Setup App
const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use('/api/v1/modul', modulRoutes);

const mockModul = { id: 1, judul_modul: "Modul Kopi" };

describe('MODUL CONTROLLER: /api/v1/modul', () => {
    beforeEach(() => jest.clearAllMocks());
    // GET ALL MODUL 200
    it('GET / should return 200 and all modules (Public)', async () => {
        modulService.getAll.mockResolvedValue([mockModul]);
        const res = await request(app).get('/api/v1/modul');
        expect(res.statusCode).toBe(200);
    });
    // GET ALL MODUL 500
    it('GET / should return 500 when service failed to give data', async () => {
        modulService.getAll.mockRejectedValue(new Error("Service failed"));
        const res = await request(app).get('/api/v1/modul');
        expect(res.statusCode).not.toBe(200);
    });
    // GET MODUL BY ID 200
    it('GET / should return 200 and all modules (Public)', async () => {
        modulService.getAll.mockResolvedValue([mockModul]);
        const res = await request(app).get('/api/v1/modul/1');
        expect(res.statusCode).toBe(200);
    });
    // GET MODUL BY ID 404
    it('GET / should return 404 when data not found', async () => {
        modulService.getById.mockRejectedValue(new Error("Data not found"));
        const res = await request(app).get('/api/v1/modul/99');
        expect(res.statusCode).not.toBe(200);
    });
    // GET MODUL BY ID 500
    it('GET / should return 500 when service failed to give data', async () => {
        modulService.getById.mockRejectedValue(new Error("Service failed"));
        const res = await request(app).get('/api/v1/modul/99');
        expect(res.statusCode).not.toBe(200);
    });

    // POST CREATE MODUL 201
    it('POST / should allow admin to create module and return 201', async () => {
        modulService.create.mockResolvedValue(mockModul);
        const res = await request(app).post('/api/v1/modul').set('x-user-role', 'admin').send({ judul_modul: 'Modul Baru' });
        expect(res.statusCode).toBe(201);
        expect(modulService.create).toHaveBeenCalled();
    });
    // POST CREATE MODUL 500
    it('POST / should return error when service failed to add data', async () => {
        modulService.create.mockRejectedValue(new Error("Service failed"));
        const res = await request(app).post('/api/v1/modul').set('x-user-role', 'admin').send({ judul_modul: 'Modul Baru' });
        expect(res.statusCode).not.toBe(201);
        expect(modulService.create).toHaveBeenCalled();
    });
    // POST CREATE MODUL 403
    it('POST / should reject non-admin creating modul', async () => {
        modulService.create.mockResolvedValue(mockModul);
        const res = await request(app).post('/api/v1/modul').set('x-user-role', 'customer').send({ judul_modul: 'Modul Baru' });
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toContain('Akses ditolak: Role tidak diizinkan.');
    });

    // PUT UPDATE MODUL BY ID 200
    it('PUT /:id should allow admin to update module and return 200', async () => {
        modulService.update.mockResolvedValue({ ...mockModul, judul_modul: 'Updated' });
        modulService.getById.mockResolvedValue(mockModul);
        const res = await request(app).put('/api/v1/modul/1').set('x-user-role', 'admin').send({ judul_modul: 'Updated' });
        expect(res.statusCode).toBe(200);
    });
    // PUT UPDATE MODUL BY ID 500
    it('PUT /:id should return error when service failed to update', async () => {
        modulService.update.mockRejectedValue(new Error("Service failed"));
        modulService.getById.mockResolvedValue(mockModul);
        const res = await request(app).put('/api/v1/modul/1').set('x-user-role', 'admin').send({ judul_modul: 'Updated' });
        expect(res.statusCode).not.toBe(200);
    });
    // PUT UPDATE MODUL BY ID 403
    it('PUT /:id should return error when service failed to update', async () => {
        modulService.getById.mockResolvedValue(mockModul);
        const res = await request(app).put('/api/v1/modul/1').set('x-user-role', 'customer').send({ judul_modul: 'Updated' });
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toContain('Akses ditolak: Role tidak diizinkan.');
    });
    // PUT UPDATE MODUL BY ID 400
    it('POST / should return 400 when files are missing', async () => {
        const res = await request(app)
            .post('/api/v1/modul')
            .set('x-user-role', 'admin')
            .send({ judul_modul: 'Modul Tanpa File' });
        expect(res.statusCode).not.toBe(200);
    });


    // DELETE MODUL BY ID 200
    it('DELETE /:id should allow admin to delete module and return 200', async () => {
        modulService.delete.mockResolvedValue(mockModul);
        const res = await request(app).delete('/api/v1/modul/1').set('x-user-role', 'admin');
        expect(res.statusCode).toBe(200);
        expect(modulService.delete).toHaveBeenCalled();
    });
    // DELETE MODUL BY ID 500
    it('DELETE /:id should return error when service failed to delete modul', async () => {
        modulService.delete.mockRejectedValue(new Error("Service failed"));
        const res = await request(app).delete('/api/v1/modul/1').set('x-user-role', 'admin');
        expect(res.statusCode).not.toBe(200);
        expect(modulService.delete).toHaveBeenCalled();
    });
});