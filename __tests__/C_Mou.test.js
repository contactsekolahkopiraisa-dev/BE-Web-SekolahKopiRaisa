const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Mengarahkan imports ke file mock modular
jest.mock('../src/middleware/middleware', () => require('../__mocks__/middleware.mock'));
jest.mock('../src/middleware/validate.joi', () => require('../__mocks__/validate.joi.mock'));
jest.mock('../src/middleware/multer.js', () => require('../__mocks__/multer.mock'));

// Mock Layer Service (MoU)
jest.mock('../src/mou/C_Mou.service', () => ({
    mouService: {
        getById: jest.fn(), create: jest.fn(), update: jest.fn(), updateStatus: jest.fn()
    }
}));
const { mouService } = require('../src/mou/C_Mou.service');
const { mouRoutes } = require('../src/mou/C_Mou.routes');

// Setup App
const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use('/api/v1/mou', mouRoutes);

const mockMou = { id: 1, id_layanan: 1, file_mou: 'http://link.mou' };

describe('MOU CONTROLLER: /api/v1/mou', () => {
    beforeEach(() => jest.clearAllMocks());

    it('GET / should allow customer to get MoU', async () => {
        mouService.getById.mockResolvedValue(mockMou);
        const res = await request(app).get('/api/v1/mou/1').set('x-user-role', 'customer'); 
        expect(res.statusCode).toBe(200);
        expect(mouService.getById).toHaveBeenCalled();
    });
    it('GET / should return error when data not found', async () => {
        mouService.getById.mockRejectedValue(new Error("Data not found"));
        const res = await request(app).get('/api/v1/mou/99').set('x-user-role', 'customer'); 
        expect(res.statusCode).not.toBe(200);
    });

    it('POST / should allow customer to submit MOU and return 201', async () => {
        mouService.create.mockResolvedValue(mockMou);
        const res = await request(app).post('/api/v1/mou').set('x-user-role', 'customer').send({ id_layanan: 1 }); 
        expect(res.statusCode).toBe(201);
        expect(mouService.create).toHaveBeenCalled();
    });
    it('POST / should return 403 when accessed by non-customer', async () => {
        mouService.create.mockResolvedValue(mockMou);
        const res = await request(app).post('/api/v1/mou').set('x-user-role', 'admin').send({ id_layanan: 1 }); 
        expect(res.statusCode).toBe(403);
    });
    it('POST / should return 500 when service failed', async () => {
        mouService.create.mockRejectedValue(new Error("Service fail"));
        const res = await request(app).post('/api/v1/mou').set('x-user-role', 'customer').send({ id_layanan: 1 }); 
        expect(res.statusCode).not.toBe(201);
    });

    it('PUT /:id/accept should allow admin to accept MOU and return 200', async () => {
        mouService.updateStatus.mockResolvedValue(mockMou);
        const res = await request(app).put('/api/v1/mou/1/accept').set('x-user-role', 'admin');
        expect(res.statusCode).toBe(200);
        expect(mouService.updateStatus).toHaveBeenCalled();
    });
    it('PUT /:id/accept should prohibit non-admin to accept MoU', async () => {
        mouService.updateStatus.mockResolvedValue(mockMou);
        const res = await request(app).put('/api/v1/mou/1/accept').set('x-user-role', 'customer');
        expect(res.statusCode).toBe(403);
    });
    it('PUT /:id/accept should return 500 when service failed', async () => {
        mouService.updateStatus.mockRejectedValue(new Error("Service fail"));
        const res = await request(app).put('/api/v1/mou/1/accept').set('x-user-role', 'admin');
        expect(res.statusCode).not.toBe(200);
    });
    
    it('PUT /:id/reject should allow admin to reject MOU and return 200', async () => {
        mouService.updateStatus.mockResolvedValue(mockMou);
        const res = await request(app).put('/api/v1/mou/1/reject').set('x-user-role', 'admin').send({ alasan: 'Gagal' });
        expect(res.statusCode).toBe(200);
    });
    it('PUT /:id/reject should prohibit non-admin to reject MoU', async () => {
        mouService.updateStatus.mockResolvedValue(mockMou);
        const res = await request(app).put('/api/v1/mou/1/reject').set('x-user-role', 'customer').send({ alasan: 'Gagal' });
        expect(res.statusCode).toBe(403);
    });
        it('PUT /:id/reject should return 500 when service failed', async () => {
        mouService.updateStatus.mockRejectedValue(new Error("Service fail"));
        const res = await request(app).put('/api/v1/mou/1/reject').set('x-user-role', 'admin');
        expect(res.statusCode).not.toBe(200);
    });

    it('PUT /:id should allow customer to submit revised MOU and return 200', async () => {
        mouService.update.mockResolvedValue(mockMou);
        const res = await request(app).put('/api/v1/mou/1').set('x-user-role', 'customer').send({});
        expect(res.statusCode).toBe(200);
        expect(mouService.update).toHaveBeenCalled();
    });
    it('PUT /:id should prohibit non-customer to submit revised MoU', async () => {
        mouService.update.mockResolvedValue(mockMou);
        const res = await request(app).put('/api/v1/mou/1').set('x-user-role', 'admin').send({});
        expect(res.statusCode).toBe(403);
    });
    it('PUT /:id should return 500 when service failed', async () => {
        mouService.update.mockRejectedValue(new Error("Service fail"));
        const res = await request(app).put('/api/v1/mou/1').set('x-user-role', 'customer').send({});
        expect(res.statusCode).not.toBe(200);
        expect(mouService.update).toHaveBeenCalled();
    });
});