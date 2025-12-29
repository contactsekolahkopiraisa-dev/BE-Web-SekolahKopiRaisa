const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Mengarahkan imports ke file mock modular
jest.mock('../src/middleware/middleware', () => require('../__mocks__/middleware.mock'));
jest.mock('../src/middleware/validate.joi', () => require('../__mocks__/validate.joi.mock'));
jest.mock('../src/middleware/multer.js', () => require('../__mocks__/multer.mock'));

// Mock Layer Service (Sertifikat)
jest.mock('../src/sertifikat/C_Sertifikat.service', () => ({
    sertifikatService: {
        getById: jest.fn(), create: jest.fn()
    }
}));
const { sertifikatService } = require('../src/sertifikat/C_Sertifikat.service');
const { sertifikatRoutes } = require('../src/sertifikat/C_Sertifikat.routes');

// Setup App
const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use('/api/v1/sertifikat', sertifikatRoutes);

const mockSertifikat = { id: 1, link_sertifikat: 'http://link.sertif' };

describe('SERTIFIKAT CONTROLLER: /api/v1/sertifikat', () => {
    beforeEach(() => jest.clearAllMocks());

    it('GET /:id should return 200 and certificate data (Admin/Customer)', async () => {
        sertifikatService.getById.mockResolvedValue(mockSertifikat);
        const res = await request(app).get('/api/v1/sertifikat/1').set('x-user-role', 'customer');
        expect(res.statusCode).toBe(200);
    });

    it('POST / should allow admin to submit certificate and return 201', async () => {
        sertifikatService.create.mockResolvedValue(mockSertifikat);
        const res = await request(app).post('/api/v1/sertifikat').set('x-user-role', 'admin').send({ id_layanan: 1, link_sertifikat: 'link.com' });
        expect(res.statusCode).toBe(201);
        expect(sertifikatService.create).toHaveBeenCalled();
    });

    it('POST / should return 403 if customer tries to create', async () => {
        const res = await request(app).post('/api/v1/sertifikat').set('x-user-role', 'customer').send({});
        expect(res.statusCode).toBe(403);
    });

    it('GET /:id should return error status when service fails (Coverage for getById catch)', async () => {
        sertifikatService.getById.mockRejectedValue(new Error("Database Error"));

        const res = await request(app)
            .get('/api/v1/sertifikat/1')
            .set('x-user-role', 'admin');
        expect(res.statusCode).not.toBe(200);
    });

    it('POST / should return error status when service fails (Coverage for create catch)', async () => {
        sertifikatService.create.mockRejectedValue(new Error("Service Failure"));

        const res = await request(app)
            .post('/api/v1/sertifikat')
            .set('x-user-role', 'admin')
            .send({ id_layanan: 1 });
        expect(res.statusCode).not.toBe(201);
    });
});