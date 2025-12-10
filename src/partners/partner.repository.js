const prisma = require("../db");

const findPartner = async () => {
  const partners = await prisma.partner.findMany({
    include: {
      products: {
        include: {
          inventory: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
  return partners;
};

const findPartnerById = async (partnerId) => {
  const partner = await prisma.partner.findUnique({
    where: {
      id: parseInt(partnerId),
    },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
          image: true,
          inventory: {
            select: {
              stock: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
  return partner;
};

// const findPartnerByUserId = async (userId) => {
//   const partner = await prisma.partner.findUnique({
//     where: {
//       user_id: parseInt(userId),
//     },
//     include: {
//       products: {
//         select: {
//           id: true,
//           name: true,
//           price: true,
//           description: true,
//           image: true,
//           sold: true,
//           inventory: {
//             select: {
//               stock: true,
//             },
//           },
//         },
//       },
//     },
//   });
//   return partner;
// };

const insertNewPartner = async (newPartnerData) => {
  const partner = await prisma.partner.create({
    data: {
      name: newPartnerData.name,
      owner_name: newPartnerData.owner_name,
      phone_number: newPartnerData.phone_number,
      user_id: newPartnerData.user_id || null,
    },
  });

  return partner;
};

const editPartner = async (id, editedPartnerData) => {
  const partner = await prisma.partner.update({
    where: {
      id: parseInt(id),
    },
    data: editedPartnerData,
  });
  return partner;
};

const deletePartner = async (id) => {
  const partner = await prisma.partner.delete({
    where: {
      id: parseInt(id),
    },
  });
  return partner;
};

module.exports = {
  findPartner,
  findPartnerById,
  // findPartnerByUserId,
  insertNewPartner,
  deletePartner,
  editPartner,
};