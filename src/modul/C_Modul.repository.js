const prisma = require('../db/index.js');

const modulRepository = {
    findAll: () => prisma.Modul.findMany(),
    findById: (id) => prisma.Modul.findUnique({
        where: { id: parseInt(id) }
    }),
    create: (data) => prisma.Modul.create({
        data
    })
};


module.exports = {
    modulRepository
};