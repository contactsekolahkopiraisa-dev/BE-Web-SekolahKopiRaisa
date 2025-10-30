const prisma = require('../db/index.js');

const modulRepository = {
    findAll: () => prisma.Modul.findMany(),
    findById: (id) => prisma.Modul.findUnique({
        where: { id: parseInt(id) }
    }),
    create: (data) => prisma.Modul.create({
        data
    }),
    update: (id, data) => prisma.Modul.update({
        where: { id: parseInt(id)},
        data: data
    }),
    delete: (id) => prisma.Modul.delete({
        where: { id: parseInt(id)}
    })
};


module.exports = {
    modulRepository
};