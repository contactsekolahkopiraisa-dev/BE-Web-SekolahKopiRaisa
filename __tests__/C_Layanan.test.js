const request = require("supertest");
const express = require("express");
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');


jest.mock('../src/layanan/C_Layanan.service', () => ({
    layananService: {
        getAll: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        updateStatus: jest.fn(),
        uploadLogbook: jest.fn(),
    },
    jenisLayananService: {
        getAll: jest.fn(),
        getById: jest.fn(),
        update: jest.fn(),
    },
    pesertaService: {
        create: jest.fn(),
    },
    konfigurasiLayananService: {
        getByHashAndJenis: jest.fn(),
        generateKonfigurasiHash: jest.fn(),
        resolveKegiatanDenganSub: jest.fn(),
        create: jest.fn(),
    },
    targetPesertaService: {
        getAll: jest.fn(),
        getById: jest.fn(),
    },
    statusKodeService: {
        getAll: jest.fn(),
        getById: jest.fn(),
    },
}))

const { layananService, jenisLayananService, statusKodeService } = require('../src/layanan/C_Layanan.service');

jest.mock('../src/middleware/middleware', () => ({
    authMiddleware: (req, res, next) => {
        const role = req.headers['x-user-role'];
        if (!role) {
            return res.status(401).json({ message: 'unauthorized' });
        }

        if (role === 'admin') {
            req.user = { id: 1, role: 'admin' };
        } else if (role === 'customer') {
            req.user = { id: 2, role: 'customer' };
        } else {
            req.user = { id: 3, role };
        }
        next();
    },
    roleMiddleware: (...allowedRoles) => (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole) {
            return res.status(401).json({ message: 'unauthorized' });
        }

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: 'akses ditolak' });
        }

        next();
    },
    multerErrorHandler: (err, req, res, next) => next(),
}));

jest.mock('../src/middleware/validate.joi', () => ({
    validate: (schema) => (req, res, next) => {
        if (req.method === 'POST' || req.method === 'PUT') {
            req.body = req.body || {};
        }
        next();
    },
}));

const app = express();
app.use(cookieParser());
app.use(bodyParser.json());

const { layananRoutes, jenisLayananRoutes, statusKodeRoutes, targetPesertaRoutes, } = require('../src/layanan/C_Layanan.routes');
app.use('/api/v1/layanan', layananRoutes);
app.use('/api/v1/jenis-layanan', jenisLayananRoutes);
app.use('/api/v1/status-kode', statusKodeRoutes);
app.use('/api/v1/target-peserta', targetPesertaRoutes);

const mockLayanan = { id: 1, nama_kegiatan: "PKL Kopi", pemohon: { id: 2, name: "Customer" } };

describe('LAYANAN Controller (/api/v1/layanan)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // GET ALL LAYANAN (Admin/Customer)
    describe('GET /api/v1/layanan', () => {
        it('should return 200 and all layanan for admin', async () => {
            layananService.getAll.mockResolvedValue([mockLayanan]);
            const res = await request(app)
                .get('/api/v1/layanan')
                .set('x-user-role', 'admin');
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBeGreaterThan(0);
        });
        it('should return 200 and his layanan for customer', async () => {
            layananService.getAll.mockResolvedValue([mockLayanan]);
            const res = await request(app)
                .get('/api/v1/layanan')
                .set('x-user-role', 'customer');
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBeGreaterThan(0);
        });
        it('should return 403 for forbidden role', async () => {
            layananService.getAll.mockResolvedValue([mockLayanan]);
            const res = await request(app)
                .get('/api/v1/layanan')
                .set('x-user-role', 'umkm');
            expect(res.statusCode).toEqual(403);
        });
    });

    // // POST LAYANAN (Customer Only)
    // describe('POST /api/v1/layanan', () => {
    //     it('should allow customer to create layanan and return 201', async () => {
    //         layananService.create.mockResolvedValue(mockLayanan);
    //         const res = await request(app).post('/api/v1/layanan').set('X-User-Role', 'customer').send({});
    //         expect(res.statusCode).toEqual(201);
    //         expect(layananService.create).toHaveBeenCalledTimes(1);
    //     });

    //     it('should return 403 if admin tries to create (Blocked by C_Layanan.js controller logic)', async () => {
    //         // C_Layanan.js punya cek khusus: if (req.user.role !== 'customer')
    //         const res = await request(app).post('/api/v1/layanan').set('X-User-Role', 'admin').send({});
    //         expect(res.statusCode).toEqual(403);
    //     });
    // });

    // // PUT ACCEPT (Admin Only)
    // describe('PUT /api/v1/layanan/:id/accept-pengajuan', () => {
    //     it('should allow admin to accept pengajuan and return 200', async () => {
    //         layananService.updateStatus.mockResolvedValue(mockLayanan);
    //         const res = await request(app).put('/api/v1/layanan/1/accept-pengajuan').set('X-User-Role', 'admin');
    //         expect(res.statusCode).toEqual(200);
    //         expect(layananService.updateStatus).toHaveBeenCalledWith("1", expect.any(Object), 5); // 5 for DISETUJUI
    //     });
    // });

    // // PUT REJECT (Admin Only)
    // describe('PUT /api/v1/layanan/:id/reject-pengajuan', () => {
    //     it('should allow admin to reject pengajuan and return 200', async () => {
    //         layananService.updateStatus.mockResolvedValue(mockLayanan);
    //         const res = await request(app).put('/api/v1/layanan/1/reject-pengajuan').set('X-User-Role', 'admin').send({ alasan: 'tes' });
    //         expect(res.statusCode).toEqual(200);
    //         expect(layananService.updateStatus).toHaveBeenCalledWith("1", expect.any(Object), 6, "tes"); // 6 for DITOLAK
    //     });
    // });

    // // PUT LOGBOOK (Customer Only)
    // describe('PUT /api/v1/layanan/:id/logbook', () => {
    //     it('should allow customer to upload logbook and return 200', async () => {
    //         layananService.uploadLogbook.mockResolvedValue(mockLayanan);
    //         const res = await request(app).put('/api/v1/layanan/1/logbook').set('X-User-Role', 'customer').send({ link_logbook: 'link.com' });
    //         expect(res.statusCode).toEqual(200);
    //         expect(layananService.uploadLogbook).toHaveBeenCalledTimes(1);
    //     });
    // });
});