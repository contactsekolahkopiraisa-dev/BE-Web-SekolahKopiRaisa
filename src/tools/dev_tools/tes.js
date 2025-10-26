const { cloudinary } = require('../../utils/cloudinary.js');


const url = cloudinary.url('konten-kopiraisa/modul/1761477569600_cba7534b226ab0798207.pdf', {
  resource_type: 'raw',
  type: 'upload',
  secure: true,
  sign_url: true, // <--- tambahkan ini
});
console.log(url);


// (async () => {
//   try {
//     const res = await cloudinary.api.ping();
//     console.log('✅ Cloudinary Auth OK:', res);
//   } catch (err) {
//     console.error('❌ Cloudinary Auth Error:', err.message);
//   }
// })();
