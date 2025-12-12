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

    it('GET / should return 200 and all modules (Public)', async () => {
        modulService.getAll.mockResolvedValue([mockModul]);
        const res = await request(app).get('/api/v1/modul');
        expect(res.statusCode).toBe(200);
    });
    
    it('POST / should allow admin to create module and return 201', async () => {
        modulService.create.mockResolvedValue(mockModul);
        const res = await request(app).post('/api/v1/modul').set('x-user-role', 'admin').send({ judul_modul: 'Modul Baru' });
        expect(res.statusCode).toBe(201);
        expect(modulService.create).toHaveBeenCalled();
    });
    
    it('PUT /:id should allow admin to update module and return 200', async () => {
        modulService.update.mockResolvedValue({ ...mockModul, judul_modul: 'Updated' });
        modulService.getById.mockResolvedValue(mockModul); 
        const res = await request(app).put('/api/v1/modul/1').set('x-user-role', 'admin').send({ judul_modul: 'Updated' });
        expect(res.statusCode).toBe(200);
    });
    
    it('DELETE /:id should allow admin to delete module and return 200', async () => {
        modulService.delete.mockResolvedValue(mockModul);
        const res = await request(app).delete('/api/v1/modul/1').set('x-user-role', 'admin');
        expect(res.statusCode).toBe(200);
        expect(modulService.delete).toHaveBeenCalled();
    });
});