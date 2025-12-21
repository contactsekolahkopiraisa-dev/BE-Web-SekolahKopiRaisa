const prisma = require('../db');
const ApiError = require('../utils/apiError');

function normalizePhone(phone) {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('62')) return '0' + digits.slice(2);
    if (digits.startsWith('0')) return digits;
    return digits;
}

const insertUser = async (newUserData) => {
    // build payload secara eksplisit, hindari set default UMKM
    const data = {
        name: newUserData.name,
        email: newUserData.email,
        password: newUserData.password,
        image: newUserData.image || null,
        phone_number: newUserData.phone_number || null,
        admin: newUserData.admin || false,
        verified: newUserData.verified || false,
    };

    // hanya tambahkan role kalau memang diberikan secara eksplisit (mis. untuk test)
    if (newUserData.role) {
        data.role = newUserData.role;
    }

    const userData = await prisma.user.create({
        data
    });

    return userData;
};

const isEmailTaken = async (email) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });
    return !!user;
};

const isPhoneNumberTaken = async (phone_number) => {
    if (!phone_number) return false;
    const normalized = normalizePhone(phone_number);
    const user = await prisma.user.findUnique({
        where: { phone_number: normalized },
    });
    return !!user;
};

const findUserByIdentifier = async (emailOrPhone) => {
    if (!emailOrPhone) return null;
    const v = String(emailOrPhone).trim();
    const isEmail = v.includes('@');
    const email = isEmail ? v.toLowerCase() : null;
    const phone = normalizePhone(v);

    const user = await prisma.user.findFirst({
        where: {
            OR: [
                ...(email ? [{ email }] : []),
                ...(phone ? [{ phone_number: phone }] : [])
            ]
        }
    });
    return user;
};

const findUserByEmail = async (email) => {
    if (!email) return null;
    return prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
};

const updateByID = async ({ updateData, userId }) => {
    const user = await prisma.User.update({
        where: { id: Number(userId) },
        data: updateData,
    });
    return user;
};

const findUserByID = async (userId) => {
    return prisma.user.findUnique({ where: { id: Number(userId) } });
};

const updatePasswordByID = async ({ password, userId }) => {
    const user = await prisma.User.update({
        where: { id: userId },
        data: { password },
    });

    return user;
};

// g ada di aldi
const findUserNumber = async (phoneNumber, userIdToExclude) => {
    const user = await prisma.User.findFirst({
        where: {
            phone_number: phoneNumber,
            NOT: {
                id: userIdToExclude
            }
        }
    });

    return user;
}

const findUserByRole = async (role) => {
    if (role == "admin") {
        return prisma.User.findMany({
            where: {
                admin: true
            },
            select: {
                email: true
            }
        })
    } else if (role == "customer") {
        return prisma.User.findMany({
            where: {
                admin: false,
                role: null
            },
            select: {
                email: true
            }
        })
    } else if (role == "umkm") {
        return prisma.User.findMany({
            where: {
                admin: false,
                role: 'UMKM'
            },
            select: {
                email: true
            }
        })
    } else {
        throw ApiError(500, 'Role tidak ditemukan!')
    }
}

module.exports = { insertUser, isPhoneNumberTaken, isEmailTaken, findUserByIdentifier, updateByID, findUserByEmail, findUserByID, updatePasswordByID, findUserNumber, findUserByRole };