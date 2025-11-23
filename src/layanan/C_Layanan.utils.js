// const buildFilter = (query) => {
//     const filterOptions = {
//         where: {}
//     };

//     // Example filtering
//     if (query.status) {
//         filterOptions.where.status = query.status;
//     }

//     if (query.ongoing === 'true') {
//         filterOptions.where.tanggal_selesai = { gte: new Date() };
//     }

//     // Sorting
//     const allowedSortFields = ['nama', 'created_at', 'tanggal_mulai', 'tanggal_selesai'];
//     if (query.sort_by && allowedSortFields.includes(query.sort_by)) {
//         filterOptions.orderBy = {
//             [query.sort_by]: query.order === 'asc' ? 'asc' : 'desc'
//         };
//     } else {
//         filterOptions.orderBy = { created_at: 'desc' }; // default
//     }

//     return filterOptions;
// };

// const injectStatus = (relationData, defaultStatus) => { 
    
//     if (!relationData) {
//         return { nama_status_kode: defaultStatus };
//     }
    
//     return {
//         ...relationData,
//         nama_status_kode: relationData.status || defaultStatus
//     };
// };


// module.exports = {
//     buildFilter,
//     injectStatus
// };
