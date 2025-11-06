const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data lengkap Tapal Kuda dari file SQL
const tapalKudaData = {
  'Kabupaten Lumajang': {
    code: 3508,
    kecamatans: [
      { code: 350810, name: 'Lumajang', villages: ['Citrodiwangsan', 'Ditotrunan', 'Jogotrunan', 'Jogoyudan', 'Rogotrunan', 'Tompokersan', 'Kepuharjo', 'Banjarwaru', 'Labruk Lor', 'Denok', 'Blukon', 'Boreng'] },
      { code: 350811, name: 'Pasrujambe', villages: ['Pasrujambe', 'Jambekumbu', 'Sukorejo', 'Jambearum', 'Kertosari', 'Pagowan', 'Karanganom'] },
      { code: 350812, name: 'Senduro', villages: ['Purworejo', 'Sarikemuning', 'Pandansari', 'Senduro', 'Burno', 'Kandangtepus', 'Kandangan', 'Bedayu', 'Bedayutalang', 'Wonocepokoayu', 'Argosari', 'Ranupani'] },
      { code: 350813, name: 'Gucialit', villages: ['Wonokerto', 'Pakel', 'Kenongo', 'Gucialit', 'Dadapan', 'Kertowono', 'Tunjung', 'Jeruk', 'Sombo'] },
      { code: 350814, name: 'Padang', villages: ['Barat', 'Babakan', 'Mojo', 'Bodang', 'Kedawung', 'Padang', 'Kalisemut', 'Merakan', 'Tanggung'] },
      { code: 350815, name: 'Sukodono', villages: ['Klanting', 'Kebonagung', 'Karangsari', 'Dawuhan Lor', 'Kutorenon', 'Selokbesuki', 'Sumberejo', 'Uranggantung', 'Selokgondang', 'Bondoyudo'] },
      { code: 350816, name: 'Kedungjajang', villages: ['Pandansari', 'Krasak', 'Kedungjajang', 'Wonorejo', 'Umbul', 'Curahpetung', 'Grobogan', 'Bence', 'Jatisari', 'Tempursari', 'Bandaran', 'Sawaran Kulon'] },
      { code: 350817, name: 'Jatiroto', villages: ['Banyuputih Kidul', 'Rojopolo', 'Kaliboto Kidul', 'Kaliboto Lor', 'Sukosari', 'Jatiroto'] },
      { code: 350818, name: 'Randuagung', villages: ['Banyuputih Lor', 'Kalidilem', 'Tunjung', 'Gedangmas', 'Kalipenggung', 'Ranulogong', 'Randuagung', 'Ledoktempuro', 'Pajarakan', 'Buwek', 'Ranuwurung', 'Salak'] },
      { code: 350819, name: 'Klakah', villages: ['Kebonan', 'Kudus', 'Duren', 'Sumberwringin', 'Papringan', 'Ranupakis', 'Tegalrandu', 'Klakah', 'Mlawang', 'Sruni', 'Tegalciut', 'Sawaran Lor'] },
      { code: 350820, name: 'Ranuyoso', villages: ['Jenggrong', 'Meninjo', 'Tegalbangsri', 'Sumberpetung', 'Alun-Alun', 'Ranubedali', 'Ranuyoso', 'Wonoayu', 'Penawungan', 'Wates Kulon', 'Wates Wetan'] },
      { code: 350821, name: 'Sumbersuko', villages: ['Sumbersuko', 'Kebonsari', 'Grati', 'Labruk Kidul', 'Mojosari', 'Sentul', 'Purwosono', 'Petahunan'] }
    ]
  },
  'Kabupaten Jember': {
    code: 3509,
    kecamatans: [
      { code: 350901, name: 'Jombang', villages: ['Padomasan', 'Keting', 'Jombang', 'Ngampelrejo', 'Wringinagung', 'Sarimulyo'] },
      { code: 350902, name: 'Kencong', villages: ['Cakru', 'Paseban', 'Kraton', 'Kencong', 'Wonorejo'] },
      { code: 350903, name: 'Sumberbaru', villages: ['Jamintoro', 'Jatiroto', 'Kaliglagah', 'Jambesari', 'Yosorati', 'Sumberagung', 'Gelang', 'Rowotengah', 'Pringgowirawan', 'Karangbayat'] },
      { code: 350904, name: 'Gumukmas', villages: ['Kepanjen', 'Mayangan', 'Gumukmas', 'Menampu', 'Tembokrejo', 'Purwoasri', 'Bagorejo', 'Karangrejo'] },
      { code: 350905, name: 'Umbulsari', villages: ['Sukoreno', 'Sidorejo', 'Gunungsari', 'Gadingrejo', 'Umbulrejo', 'Umbulsari', 'Tanjungsari', 'Tegalwangi', 'Paleran', 'Mundurejo'] },
      { code: 350906, name: 'Tanggul', villages: ['Tanggulkulon', 'Tanggulwetan', 'Patemon', 'Darungan', 'Manggisan', 'Selodakon', 'Kramat Sukoharjo', 'Klatakan'] },
      { code: 350907, name: 'Semboro', villages: ['Pondokjoyo', 'Pondokdalem', 'Rejoagung', 'Semboro', 'Sidomekar', 'Sidomulyo'] },
      { code: 350908, name: 'Puger', villages: ['Mlokorejo', 'Mojomulyo', 'Mojosari', 'Pugerkulon', 'Wringintelu', 'Kasiyan', 'Bagon', 'Kasiyan Timur', 'Wonosari', 'Jambearum', 'Grenden', 'Pugerwetan'] },
      { code: 350909, name: 'Bangsalsari', villages: ['Curahkalong', 'Gambirono', 'Bangsalsari', 'Tugusari', 'Karangsono', 'Sukorejo', 'Langkap', 'Tisnogambar', 'Petung', 'Banjarsari', 'Badean'] },
      { code: 350910, name: 'Balung', villages: ['Karangduren', 'Karang Semanding', 'Tutul', 'Balungkulon', 'Balunglor', 'Balungkidul', 'Curahlele', 'Gumelar'] },
      { code: 350911, name: 'Wuluhan', villages: ['Lojejer', 'Ampel', 'Tamansari', 'Dukuhdempok', 'Glundengan', 'Tanjungrejo', 'Kesilir'] },
      { code: 350912, name: 'Ambulu', villages: ['Tegalsari', 'Sabrang', 'Sumberejo', 'Ambulu', 'Karanganyar', 'Andongsari', 'Pontang'] },
      { code: 350913, name: 'Rambipuji', villages: ['Nogosari', 'Curahmalang', 'Rowotamtu', 'Kaliwining', 'Pecoro', 'Rambipuji', 'Gugut', 'Rambigundam'] },
      { code: 350914, name: 'Panti', villages: ['Pakis', 'Kemuning Sari Lor', 'Panti', 'Glagahwero', 'Suci', 'Kemiri', 'Serut'] },
      { code: 350915, name: 'Sukorambi', villages: ['Jubung', 'Dukuhmencek', 'Sukorambi', 'Karangpring', 'Klungkung'] },
      { code: 350916, name: 'Jenggawah', villages: ['Kemuningsarikidul', 'Wonojati', 'Jenggawah', 'Kertonegoro', 'Sruni', 'Jatisari', 'Jatimulyo', 'Cangkring'] },
      { code: 350917, name: 'Ajung', villages: ['Sukamakmur', 'Mangaran', 'Pancakarya', 'Ajung', 'Klompangan', 'Wirowongso', 'Rowoindah'] },
      { code: 350918, name: 'Tempurejo', villages: ['Sidodadi', 'Tempurejo', 'Andongrejo', 'Pondokrejo', 'Wonoasri', 'Curahnongko', 'Curahtakir', 'Sanenrejo'] },
      { code: 350919, name: 'Kaliwates', villages: ['Mangli', 'Sempusari', 'Kebonagung', 'Kaliwates', 'Jemberkidul', 'Kepatihan', 'Tegalbesar'] },
      { code: 350920, name: 'Patrang', villages: ['Banjarsengon', 'Jumerto', 'Gebang', 'Slawu', 'Bintoro', 'Jemberlor', 'Patrang', 'Baratan'] },
      { code: 350921, name: 'Sumbersari', villages: ['Kebonsari', 'Sumbersari', 'Kranjingan', 'Karangrejo', 'Tegalgede', 'Wirolegi', 'Antirogo'] },
      { code: 350922, name: 'Arjasa', villages: ['Kemuninglor', 'Darsono', 'Arjasa', 'Candijati', 'Biting', 'Kamal'] },
      { code: 350923, name: 'Mumbulsari', villages: ['Lengkong', 'Kawangrejo', 'Tamansari', 'Mumbulsari', 'Suco', 'Lampeji', 'Karang Kedawung'] },
      { code: 350924, name: 'Pakusari', villages: ['Patemon', 'Bedadung', 'Sumberpinang', 'Subo', 'Kertosari', 'Jatian', 'Pakusari'] },
      { code: 350925, name: 'Jelbuk', villages: ['Sucopangepok', 'Panduman', 'Sukojember', 'Jelbuk', 'Sukowiryo', 'Sugerkidul'] },
      { code: 350926, name: 'Mayang', villages: ['Mrawan', 'Mayang', 'Seputih', 'Tegalwaru', 'Tegalrejo', 'Sumberkejayan', 'Sidomukti'] },
      { code: 350927, name: 'Kalisat', villages: ['Gumuksari', 'Sukoreno', 'Patempuran', 'Sumberkalong', 'Sumberjeruk', 'Glagahwero', 'Kalisat', 'Ajung', 'Plalangan', 'Gambiran', 'Sumberketempa', 'Sebanen'] },
      { code: 350928, name: 'Ledokombo', villages: ['Lembengan', 'Suren', 'Karangpaiton', 'Sumberanget', 'Sukogidri', 'Ledokombo', 'Sumberlesung', 'Sumbersalak', 'Slateng', 'Sumberbulus'] },
      { code: 350929, name: 'Sukowono', villages: ['Sumberwringin', 'Sukokerto', 'Sumberwaru', 'Sukowono', 'Baletbaru', 'Sukorejo', 'Sukosari', 'Arjasa', 'Sumberdanti', 'Pocangan', 'Dawuhanmangli', 'Mojogemi'] },
      { code: 350930, name: 'Silo', villages: ['Sempolan', 'Harjomulyo', 'Karangharjo', 'Silo', 'Pace', 'Mulyorejo', 'Sumberjati', 'Garahan', 'Sidomulyo'] },
      { code: 350931, name: 'Sumberjambe', villages: ['Plerean', 'Sumberpakem', 'Pringgondani', 'Randuagung', 'Cumedak', 'Sumberjambe', 'Gunungmalang', 'Jambearum', 'Rowosari'] }
    ]
  },
  'Kabupaten Banyuwangi': {
    code: 3510,
    kecamatans: [
      { code: 351001, name: 'Pesanggaran', villages: ['Sarongan', 'Pesanggaran', 'Sumberagung', 'Kandangan', 'Sumbermulyo'] },
      { code: 351002, name: 'Bangorejo', villages: ['Sukorejo', 'Sambirejo', 'Temurejo', 'Bangorejo', 'Kebondalem', 'Sambimulyo', 'Ringintelu'] },
      { code: 351003, name: 'Purwoharjo', villages: ['Grajagan', 'Sumberasri', 'Glagahagung', 'Sidorejo', 'Purwoharjo', 'Bulurejo', 'Kradenan', 'Karetan'] },
      { code: 351004, name: 'Tegaldlimo', villages: ['Purwoasri', 'Kendalrejo', 'Kedungasri', 'Kedungwungu', 'Tegaldlimo', 'Wringinpitu', 'Kedunggebang', 'Purwoagung', 'Kalipait'] },
      { code: 351005, name: 'Muncar', villages: ['Sumberberas', 'Kedungrejo', 'Tembokrejo', 'Sumbersewu', 'Blambangan', 'Tapanrejo', 'Wringinputih', 'Tambakrejo', 'Kedungringin', 'Kumendung'] },
      { code: 351006, name: 'Cluring', villages: ['Plampangrejo', 'Tampo', 'Sembulung', 'Cluring', 'Benculuk', 'Sraten', 'Tamanagung', 'Sarimulyo', 'Kaliploso'] },
      { code: 351007, name: 'Gambiran', villages: ['Purwodadi', 'Jajag', 'Gambiran', 'Yosomulyo', 'Wringinrejo', 'Wringinagung'] },
      { code: 351008, name: 'Srono', villages: ['Bagorejo', 'Wonosobo', 'Sukonatar', 'Kebaman', 'Sumbersari', 'Parijatah Wetan', 'Parijatah Kulon', 'Rejoagung', 'Kepundungan', 'Sukomaju'] },
      { code: 351009, name: 'Genteng', villages: ['Kembiritan', 'Genteng Wetan', 'Genteng Kulon', 'Setail', 'Kaligondo'] },
      { code: 351010, name: 'Glenmore', villages: ['Tegalharjo', 'Sepanjang', 'Karangharjo', 'Tulungrejo', 'Sumbergondo', 'Bumiharjo', 'Margomulyo'] },
      { code: 351011, name: 'Kalibaru', villages: ['Kalibarukulon', 'Kalibarumanis', 'Kalibaruwetan', 'Kajarharjo', 'Banyuanyar', 'Kebonrejo'] },
      { code: 351012, name: 'Singojuruh', villages: ['Gambor', 'Alasmalang', 'Benelan Kidul', 'Lemahbangkulon', 'Singojuruh', 'Gumirih', 'Cantuk', 'Padang', 'Singolatren', 'Kemiri', 'Sumberbaru'] },
      { code: 351013, name: 'Rogojampi', villages: ['Aliyan', 'Mangir', 'Gladag', 'Bubuk', 'Lemahbangdewo', 'Gitik', 'Karangbendo', 'Rogojampi', 'Pengatigan', 'Kedaleman'] },
      { code: 351014, name: 'Kabat', villages: ['Bareng', 'Bunder', 'Gombolirang', 'Benelan Lor', 'Labanasem', 'Pakistaji', 'Pondoknongko', 'Dadapan', 'Kedayunan', 'Kabat', 'Macan Putih', 'Tambong', 'Pendarungan', 'Kalirejo'] },
      { code: 351015, name: 'Glagah', villages: ['Bakungan', 'Banjarsari', 'Rejosari', 'Kemiren', 'Olehsari', 'Glagah', 'Paspan', 'Tamansuruh', 'Kenjo', 'Kampunganyar'] },
      { code: 351016, name: 'Banyuwangi', villages: ['Pakis', 'Sobo', 'Kebalenan', 'Penganjuran', 'Tukangkayu', 'Kertosari', 'Karangrejo', 'Kepatihan', 'Panderejo', 'Singonegaran', 'Temenggungan', 'Kampungmelayu', 'Kampungmandar', 'Lateng', 'Singotrunan', 'Pengantigan', 'Tamanbaru', 'Sumberrejo'] },
      { code: 351017, name: 'Giri', villages: ['Boyolangu', 'Mojopanggung', 'Penataban', 'Giri', 'Jambesari', 'Grogol'] },
      { code: 351018, name: 'Wongsorejo', villages: ['Bangsring', 'Bengkak', 'Alasbuluh', 'Wongsorejo', 'Sumberkencono', 'Sidodadi', 'Bajulmati', 'Watukebo', 'Alasrejo', 'Sidowangi', 'Sumberanyar', 'Bimorejo'] },
      { code: 351019, name: 'Songgon', villages: ['Songgon', 'Balak', 'Sragi', 'Parangharjo', 'Bedewang', 'Bayu', 'Sumberarum', 'Sumberbulu', 'Bangunsari'] },
      { code: 351020, name: 'Sempu', villages: ['Sempu', 'Jambewangi', 'Karangsari', 'Temuguruh', 'Gendoh', 'Temuasri', 'Tegalarum'] },
      { code: 351021, name: 'Kalipuro', villages: ['Kalipuro', 'Klatak', 'Gombengsari', 'Bulusan', 'Ketapang', 'Pesucen', 'Kelir', 'Telemung', 'Bulusari'] },
      { code: 351022, name: 'Siliragung', villages: ['Buluagung', 'Siliragung', 'Kesilir', 'Seneporejo', 'Barurejo'] },
      { code: 351023, name: 'Tegalsari', villages: ['Tegalsari', 'Karangdoro', 'Tamansari', 'Dasri', 'Karangmulyo', 'Tegalrejo'] },
      { code: 351024, name: 'Licin', villages: ['Gumuk', 'Jelun', 'Licin', 'Banjar', 'Segobang', 'Pakel', 'Kluncing', 'Tamansari'] },
      { code: 351025, name: 'Blimbingsari', villages: ['Blimbingsari', 'Kaotan', 'Watukebo', 'Gintangan', 'Bomo', 'Patoman', 'Kaligung', 'Karangrejo', 'Badean', 'Sukojati'] }
    ]
  },
  'Kabupaten Bondowoso': {
    code: 3511,
    kecamatans: [
      { code: 351101, name: 'Maesan', villages: ['Sucolor', 'Pujer Baru', 'Tanahwulan', 'Maesan', 'Gambangan', 'Suger Lor', 'Sumber Pakem', 'Sumbersari', 'Sumber Anyar', 'Penanggungan', 'Pakuniran', 'Gunungsari'] },
      { code: 351102, name: 'Tamanan', villages: ['Sukosari', 'Karang Melok', 'Mengen', 'Kemirian', 'Tamanan', 'Wonosuko', 'Kalianyar', 'Sumber Kemuning', 'Sumber Anom'] },
      { code: 351103, name: 'Tlogosari', villages: ['Kembang', 'Gunosari', 'Trotosari', 'Jebung Kidul', 'Sulek', 'Tlogosari', 'Pakisan', 'Patemon', 'Jebung Lor', 'Brambang Darussalam'] },
      { code: 351104, name: 'Sukosari', villages: ['Sukosari Lor', 'Nogosari', 'Pecalongan', 'Kerang'] },
      { code: 351105, name: 'Pujer', villages: ['Alas Sumur', 'Kejayan', 'Mangli', 'Maskuning Kulon', 'Maskuning Wetan', 'Mengok', 'Padasan', 'Randu Cangkring', 'Suko Kerto', 'Sukowono', 'Sukodono'] },
      { code: 351106, name: 'Grujugan', villages: ['Tegal Mijin', 'Pekauman', 'Sumber Pandan', 'Wanisodo', 'Kabuaran', 'Wonosari', 'Dadapan', 'Dawuhan', 'Taman', 'Grujugan Kidul', 'Kejawan'] },
      { code: 351107, name: 'Curahdami', villages: ['Curahdami', 'Jetis', 'Pakuwesi', 'Kupang', 'Petung', 'Panambangan', 'Curahpoh', 'Poncogati', 'Sumber Suko', 'Selolembu', 'Locare', 'Sumber Salak'] },
      { code: 351108, name: 'Tenggarang', villages: ['Tenggarang', 'Kesemek', 'Lojajar', 'Pekalangan', 'Kajar', 'Sumber Salam', 'Koncer Kidul', 'Bataan', 'Gebang', 'Dawuhan', 'Tangsil Kulon', 'Koncer Darul Aman'] },
      { code: 351109, name: 'Wonosari', villages: ['Lombok Kulon', 'Lombok Wetan', 'Tumpeng', 'Jumpong', 'Tangsil Wetan', 'Pasarejo', 'Bendoarum', 'Kapuran', 'Sumberkalong', 'Traktakan', 'Wonosari', 'Pelalangan'] },
      { code: 351110, name: 'Tapen', villages: ['Wonokusumo', 'Mangli Wetan', 'Taal', 'Mrawan', 'Gunung Anyar', 'Jurang Sapi', 'Cindogo', 'Kalitapen', 'Tapen'] },
      { code: 351111, name: 'Bondowoso', villages: ['Nangkaan', 'Tamansari', 'Kademangan', 'Dabasah', 'Badean', 'Kotakulon', 'Blindungan', 'Pancoran', 'Sukowiryo', 'Kembang', 'Pejaten'] },
      { code: 351112, name: 'Wringin', villages: ['Ambulu', 'Bukor', 'Sumbermalang', 'Jambewungu', 'Gubrih', 'Ampelan', 'Jatitamban', 'Banyuwulu', 'Jatisari', 'Glingseran', 'Banyuputih', 'Wringin', 'Sumbercanting'] },
      { code: 351113, name: 'Tegalampel', villages: ['Sekarputih', 'Klabang', 'Mandiro', 'Tanggulangin', 'Karanganyar', 'Tegalampel', 'Klabang Agung', 'Purnama'] },
      { code: 351114, name: 'Klabang', villages: ['Karang Anyar', 'Blimbing', 'Karang Sengon', 'Wonokerto', 'Klabang', 'Klampokan', 'Sumber Suko', 'Besuk', 'Pandak', 'Leprak', 'Wonoboyo'] },
      { code: 351115, name: 'Cermee', villages: ['Solor', 'Kladi', 'Bercak', 'Suling Wetan', 'Suling Kulon', 'Cermee', 'Ramban Wetan', 'Grujugan', 'Ramban Kulon', 'Bajuran', 'Jirek Mas', 'Batu Salang', 'Palalangan', 'Batu Ampar', 'Bercak Asri'] },
      { code: 351116, name: 'Prajekan', villages: ['Bandilan', 'Sempol', 'Tarum', 'Prajekan Lor', 'Prajekan Kidul', 'Cangkring', 'Walidono'] },
      { code: 351117, name: 'Pakem', villages: ['Andungsari', 'Ardisaeng', 'Kupang', 'Gadingsari', 'Pakem', 'Sumberdumpyong', 'Patemon', 'Petung'] },
      { code: 351118, name: 'Sumberwringin', villages: ['Sukorejo', 'Sumber Gading', 'Sukosari Kidul', 'Tegaljati', 'Rejo Agung', 'Sumberwringin'] },
      { code: 351119, name: 'Sempol', villages: ['Sempol', 'Kalianyar', 'Jampit', 'Kalisat', 'Kali Gedang', 'Sumber Rejo'] },
      { code: 351120, name: 'Binakal', villages: ['Gadingsari', 'Sumber Waru', 'Kembangan', 'Baratan', 'Binakal', 'Jeruksoksok', 'Sumber Tengah', 'Bendelan'] },
      { code: 351121, name: 'Taman Krocok', villages: ['Taman', 'Gentong', 'Kemuningan', 'Trebungan', 'Sumberkokap', 'Paguan', 'Kretek'] },
      { code: 351122, name: 'Botolinggo', villages: ['Lumutan', 'Botolinggo', 'Lanas', 'Penang', 'Gayam', 'Klekehan', 'Sumber Canting', 'Gayam Lor'] },
      { code: 351123, name: 'Jambesari Darus Sholah', villages: ['Jambesari', 'Jambeanom', 'Pucanganom', 'Sumberjeruk', 'Tegalpasir', 'Pengarang', 'Grujugan Lor', 'Pejagan', 'Sumber Anyar'] }
    ]
  },
  'Kabupaten Situbondo': {
    code: 3512,
    kecamatans: [
      { code: 351201, name: 'Jatibanteng', villages: ['Pategalan', 'Semambung', 'Sumberanyar', 'Jatibanteng', 'Curahsuri', 'Wringinanom', 'Kembangsari', 'Patemon'] },
      { code: 351202, name: 'Besuki', villages: ['Widoropayung', 'Sumberejo', 'Jetis', 'Blimbing', 'Langkap', 'Bloro', 'Pesisir', 'Kalimas', 'Besuki', 'Demung'] },
      { code: 351203, name: 'Suboh', villages: ['Cemara', 'Mojodungkol', 'Gunung Malang', 'Gunung Putri', 'Suboh', 'Dawuan', 'Buduan', 'Ketah'] },
      { code: 351204, name: 'Mlandingan', villages: ['Alas Bayur', 'Sumberanyar', 'Campoan', 'Trebungan', 'Sumber Pinang', 'Selomukti', 'Mlandingan Kulon'] },
      { code: 351205, name: 'Kendit', villages: ['Bugeman', 'Kendit', 'Balung', 'Tambak Ukir', 'Rajekwesi', 'Kukusan', 'Klatakan'] },
      { code: 351206, name: 'Panarukan', villages: ['Paowan', 'Sumberkolak', 'Wringinanom', 'Kilensari', 'Peleyan', 'Alasmalang', 'Duwet', 'Gelung'] },
      { code: 351207, name: 'Situbondo', villages: ['Patokan', 'Dawuhan', 'Kalibagor', 'Kotakan', 'Talkandang', 'Olean'] },
      { code: 351208, name: 'Panji', villages: ['Ardirejo', 'Mimbaan', 'Sliwung', 'Battal', 'Klampokan', 'Juglangan', 'Panji Kidul', 'Panji Lor', 'Tokelan', 'Curah Jeru', 'Tenggir', 'Kayu Putih'] },
      { code: 351209, name: 'Mangaran', villages: ['Tanjung Glugur', 'Mangaran', 'Tanjung Kamal', 'Semiring', 'Tanjung Pecinan', 'Trebungan'] },
      { code: 351210, name: 'Kapongan', villages: ['Kandang', 'Curah Cottok', 'Peleyan', 'Wonokoyo', 'Seletreng', 'Landangan', 'Kapongan', 'Kesambirampak', 'Gebangan', 'Pokaan'] },
      { code: 351211, name: 'Arjasa', villages: ['Kayumas', 'Bayeman', 'Ketowan', 'Kedungdowo', 'Jatisari', 'Curah Tatal', 'Arjasa', 'Lamongan'] },
      { code: 351212, name: 'Jangkar', villages: ['Sopet', 'Curah Kalak', 'Palangan', 'Jangkar', 'Gadingan', 'Kumbangsari', 'Pesanggrahan', 'Agel'] },
      { code: 351213, name: 'Asembagus', villages: ['Kedunglo', 'Bantal', 'Awar-awar', 'Perante', 'Trigonco', 'Kertosari', 'Mojosari', 'Asembagus', 'Gudang', 'Wringin Anom'] },
      { code: 351214, name: 'Banyuputih', villages: ['Wonorejo', 'Sumberanyar', 'Sumberejo', 'Banyuputih', 'Sumberwaru'] },
      { code: 351215, name: 'Sumbermalang', villages: ['Tamankursi', 'Sumberargo', 'Tamansari', 'Kalirejo', 'Baderan', 'Alastengah', 'Taman', 'Tlogosari', 'Plalangan'] },
      { code: 351216, name: 'Banyuglugur', villages: ['Lubawang', 'Kalisari', 'Tepos', 'Selobanteng', 'Banyuglugur', 'Telempong', 'Kalianget'] },
      { code: 351217, name: 'Bungatan', villages: ['Patemon', 'Sumbertengah', 'Selowogo', 'Mlandingan Wetan', 'Bungatan', 'Bletok', 'Pasir Putih'] }
    ]
  },
  'Kabupaten Probolinggo': {
    code: 3513,
    kecamatans: [
      { code: 351301, name: 'Sukapura', villages: ['Ngadisari', 'Wonotoro', 'Jetak', 'Ngadas', 'Ngadirejo', 'Sariwani', 'Wonokerto', 'Sapikerep', 'Sukapura', 'Pakel', 'Kedasih', 'Ngepung'] },
      { code: 351302, name: 'Sumber', villages: ['Ledokombo', 'Pandansari', 'Sumber', 'Wonokerso', 'Gemito', 'Tukul', 'Sumberanom', 'Cepoko', 'Remba\'an'] },
      { code: 351303, name: 'Kuripan', villages: ['Wonoasri', 'Jatisari', 'Kedawung', 'Karangrejo', 'Resongo', 'Menyono', 'Wringinanom'] },
      { code: 351304, name: 'Bantaran', villages: ['Gunungtugel', 'Kedungrejo', 'Patokan', 'Bantaran', 'Legundi', 'Tempuran', 'Kropak', 'Besuk', 'Kramatagung', 'Karanganyar'] },
      { code: 351305, name: 'Leces', villages: ['Malasankulon', 'Tigasan Wetan', 'Tigasan Kulon', 'Pondok Wuluh', 'Leces', 'Sumberkedawung', 'Kerpangan', 'Clarak', 'Jorongan', 'Warujinggo'] },
      { code: 351306, name: 'Banyuanyar', villages: ['Sentulan', 'Gadingkulon', 'Klenangkidul', 'Klenanglor', 'Alassapi', 'Pendil', 'Tarokan', 'Liprak Wetan', 'Liprak Kidul', 'Liprak Kulon', 'Banyuanyar Tengah', 'Banyuanyar Kidul', 'Gununggeni', 'Blado Wetan'] },
      { code: 351307, name: 'Tiris', villages: ['Andungbiru', 'Tlogoargo', 'Andungsari', 'Tlogosari', 'Ranugedang', 'Tiris', 'Segaran', 'Ranuagung', 'Jangkang', 'Wedusan', 'Racek', 'Pesawahan', 'Pedagangan', 'Rejing', 'Tegalwatu', 'Tuluparari'] },
      { code: 351308, name: 'Krucil', villages: ['Sumberduren', 'Roto', 'Kertosuko', 'Tambelang', 'Betek', 'Krucil', 'Guyangan', 'Watupanjang', 'Bermi', 'Kalianan', 'Plaosan', 'Pandanaras', 'Seneng', 'Krobungan'] },
      { code: 351309, name: 'Gading', villages: ['Batur', 'Betek Taman', 'Sentul', 'Dandang', 'Kertosono', 'Prasi', 'Duren', 'Renteng', 'Bulupadak', 'Keben', 'Gadingwetan', 'Wangkal', 'Nogosaren', 'Mojolegi', 'Sumbersecang', 'Condong', 'Jurangjero', 'Kaliancar', 'Ranuwurung'] },
      { code: 351310, name: 'Pakuniran', villages: ['Ranon', 'Kedungsumur', 'Gunggungan Kidul', 'Gunggungan Lor', 'Petemon Kulon', 'Pakuniran', 'Alaspandan', 'Sumberkembar', 'Sogaan', 'Glagah', 'Bucor Kulon', 'Bucor Wetan', 'Bimo', 'Kertonegoro', 'Gondosuli', 'Kalidandan', 'Blimbing'] },
      { code: 351311, name: 'Kotaanyar', villages: ['Sumber Centeng', 'Sambirampak Kidul', 'Sidomulyo', 'Tambakukir', 'Curahtemu', 'Sidorejo', 'Sambirampak Lor', 'Kedungrejoso', 'Talkandang', 'Triwungan', 'Sukorejo', 'Pasembon', 'Kotaanyar'] },
      { code: 351312, name: 'Paiton', villages: ['Jabungsisir', 'Jabungcandi', 'Jabung Wetan', 'Kalikajar Kulon', 'Kalikajar Wetan', 'Pandean', 'Alastengah', 'Sidodadi', 'Randumerak', 'Randutatah', 'Karanganyar', 'Plampang', 'Petunjungan', 'Taman', 'Paiton', 'Sukodadi', 'Podokkelor', 'Sumberanyar', 'Sumberejo', 'Bhinor'] },
      { code: 351313, name: 'Besuk', villages: ['Bago', 'Kecik', 'Alasnyiur', 'Sindetlami', 'Jambangan', 'Klampokan', 'Matekan', 'Krampilan', 'Besukagung', 'Besukkidul', 'Sumurdalam', 'Sindetanyar', 'Randujalak', 'Alastengah', 'Alaskandang', 'Alassumurlor', 'Sumberan'] },
      { code: 351314, name: 'Kraksaan', villages: ['Semampir', 'Sidomukti', 'Kraksaan Wetan', 'Kandangjati Kulon', 'Patokan', 'Kregenan', 'Rondokuning', 'Bulu', 'Rangkang', 'Kandang Jati Wetan', 'Alassumur Kulon', 'Sumberlele', 'Tamansari', 'Asembakor', 'Kebonagung', 'Sidopekso', 'Kalibuntu', 'Asembagus'] },
      { code: 351315, name: 'Krejengan', villages: ['Temenggungan', 'Patemon', 'Jatiurip', 'Opo Opo', 'Kamalkuning', 'Tanjungsari', 'Krejengan', 'Sentong', 'Sumberkatimoho', 'Karangren', 'Rawan', 'Seboro', 'Kedungcaluk', 'Widoro', 'Gebangan', 'Duwuhan', 'Soka\'an'] },
      { code: 351316, name: 'Pajarakan', villages: ['Selogudig Kulon', 'Selogudig Wetan', 'Ketompen', 'Karangbong', 'Karangpranti', 'Gejugan', 'Karanggeger', 'Tanjung', 'Pejarakan Kulon', 'Sukokerto', 'Sukomulyo', 'Penambangan'] },
      { code: 351317, name: 'Maron', villages: ['Brabe', 'Gerongan', 'Maron Kidul', 'Sumberdawe', 'Sumberpoh', 'Kedungsari', 'Maron Kulon', 'Maron Wetan', 'Brani Kulon', 'Satreyan', 'Brani Wetan', 'Puspan', 'Wonorejo', 'Brumbungan Kidul', 'Pegalangan Kidul', 'Suko', 'Ganting Kulon', 'Ganting Wetan'] },
      { code: 351318, name: 'Gending', villages: ['Brumbungan Lor', 'Jatiadi', 'Klaseman', 'Pesisir', 'Bulang', 'Randupitu', 'Pikatan', 'Sebaung', 'Sumberkerang', 'Banyuanyar Lor', 'Curahsawo', 'Pajurangan', 'Gending'] },
      { code: 351319, name: 'Dringu', villages: ['Watuwungkuk', 'Sumbersuko', 'Sumberagung', 'Ngepoh', 'Mrangonlawang', 'Sekarkare', 'Tamansari', 'Tegalrejo', 'Kalirejo', 'Kedungdalem', 'Kalisalam', 'Randuputih', 'Dringu', 'Pabean'] },
      { code: 351320, name: 'Tegalsiwalan', villages: ['Malesanwetan', 'Gunungbekel', 'Tegalsono', 'Bulujarankidul', 'Bulujaranlor', 'Paras', 'Tegalsiwalan', 'Banjarsawah', 'Sumberbulu', 'Sumberkledung', 'Bladokulon', 'Tegalmojo'] },
      { code: 351321, name: 'Sumberasih', villages: ['Sumberbendo', 'Jangur', 'Muneng', 'Muneng Kidul', 'Pohsangit Leres', 'Laweyan', 'Sumurmati', 'Mentor', 'Ambulu', 'Banjarsari', 'Lemah Kembar', 'Pesisir', 'Gili Ketapang'] },
      { code: 351322, name: 'Wonomerto', villages: ['Sumberkare', 'Patalan', 'Jrebeng', 'Wonorejo', 'Tunggak Ceme', 'Pohsangit Tengah', 'Pohsangit Lor', 'Pohsangit Ngisor', 'Sepuhgembol', 'Kareng Kidul', 'Kedungsupit'] },
      { code: 351323, name: 'Tongas', villages: ['Sumberrejo', 'Sumendi', 'Bayeman', 'Dungun', 'Curahdringu', 'Wringinanom', 'Sumberkramat', 'Tongas Wetan', 'Pamatan', 'Klampok', 'Tongas Kulon', 'Curahtulis', 'Tambakrejo', 'Tanjungrejo'] },
      { code: 351324, name: 'Lumbang', villages: ['Sapih', 'Negororejo', 'Branggah', 'Lambangkuning', 'Wonogoro', 'Palangbesi', 'Boto', 'Lumbang', 'Tandonsentul', 'Purut'] }
    ]
  },
  'Kabupaten Pasuruan': {
    code: 3514,
    kecamatans: [
      { code: 351401, name: 'Purwodadi', villages: ['Gerbo', 'Dawuhansengon', 'Lebakrejo', 'Cowek', 'Purwodadi', 'Parerejo', 'Gajahrejo', 'Sentul', 'Jatisari', 'Tambaksari', 'Pucangsari', 'Semut', 'Capang'] },
      { code: 351402, name: 'Tutur', villages: ['Ngadirejo', 'Blarang', 'Kayukebek', 'Andonosari', 'Wonosari', 'Gendro', 'Tlogosari', 'Tutur', 'Pungging', 'Kalipucang', 'Sumberpitu', 'Ngembal'] },
      { code: 351403, name: 'Puspo', villages: ['Kemiri', 'Janjangwulung', 'Palangsari', 'Puspo', 'Jimbaran', 'Pusungmalang', 'Keduwung'] },
      { code: 351404, name: 'Lumbang', villages: ['Wonorejo', 'Banjarimbo', 'Welulang', 'Watulumbung', 'Panditan', 'Bulukandang', 'Lumbang', 'Pancur', 'Kronto', 'Karangasem', 'Cukurguling', 'Karangjati'] },
      { code: 351405, name: 'Pasrepan', villages: ['Ngantungan', 'Galih', 'Petung', 'Klakah', 'Sibon', 'Mangguan', 'Ampelsari', 'Tempuran', 'Sapulante', 'Pohgedang', 'Pasrepan', 'Rejosalam', 'Cengkrong', 'Lemahbang', 'Tambakrejo', 'Pohgading', 'Jogorepuh'] },
      { code: 351406, name: 'Kejayan', villages: ['Kejayan', 'Oro-Oro Pule', 'Kedung Pengaron', 'Benerwojo', 'Cobanjoyo', 'Kepuh', 'Lorokan', 'Klangrong', 'Linggo', 'Ambal-Ambil', 'Kedemungan', 'Wrati', 'Pacarkeling', 'Luwuk', 'Sumbersuko', 'Sumber Banteng', 'Kurung', 'Tanggulangin', 'Randugong', 'Wangkal Wetan', 'Klinter', 'Tundosoro', 'Ketangirejo', 'Patebon', 'Sladi'] },
      { code: 351407, name: 'Wonorejo', villages: ['Karangmenggah', 'Karang Jatianyar', 'Pakijangan', 'Cobanblimbing', 'Wonorejo', 'Wonosari', 'Tamansari', 'Jatigunting', 'Rebono', 'Karangsono', 'Kendangdukuh', 'Karangasem', 'Kluwut', 'Sambisirah', 'Lebaksari'] },
      { code: 351408, name: 'Purwosari', villages: ['Purwosari', 'Sumberrejo', 'Sekarmojo', 'Tejowangi', 'Kertosari', 'Martopuro', 'Sengonagung', 'Pager', 'Cendono', 'Karangrejo', 'Sumbersuko', 'Pucangsari', 'Kayoman', 'Sukodermo', 'Bakalan'] },
      { code: 351409, name: 'Sukorejo', villages: ['Gunting', 'Pakukerto', 'Glagahsari', 'Sukorejo', 'Karangsono', 'Sebandung', 'Dukuhsari', 'Lecari', 'Lemahbang', 'Ngadimulyo', 'Tanjungarum', 'Suwayuwo', 'Mojotengah', 'Kalirejo', 'Candibinangun', 'Kenduruan', 'Sukorame', 'Curahrejo', 'Wonokerto'] },
      { code: 351410, name: 'Prigen', villages: ['Ledug', 'Pecalukan', 'Prigen', 'Jatiarjo', 'Watuagung', 'Dayurejo', 'Bulukandang', 'Ketanireng', 'Sukolelo', 'Lumbangrejo', 'Sukoreno', 'Sekarjoho', 'Gambiran', 'Candiwates'] },
      { code: 351411, name: 'Pandaan', villages: ['Kutorejo', 'Jogosari', 'Petungasri', 'Pandaan', 'Plintahan', 'Durensewu', 'Karangjati', 'Wedoro', 'Tunggulwulung', 'Sumbergedang', 'Tawangrejo', 'Nogosari', 'Kebonwaris', 'Sebani', 'Banjarsari', 'Banjarkejen', 'Kemirisewu', 'Sumberrejo'] },
      { code: 351412, name: 'Gempol', villages: ['Wonosunyo', 'Sumbersuko', 'Wonosari', 'Kepulungan', 'Randupitu', 'Ngerong', 'Karangrejo', 'Bulusari', 'Jeruk Purut', 'Watukosek', 'Carat', 'Kejapanan', 'Winong', 'Legok', 'Gempol'] },
      { code: 351413, name: 'Beji', villages: ['Glanggang', 'Pagak', 'Baujeng', 'Ngembe', 'Kenep', 'Sidowayah', 'Gajahbendo', 'Gununggangsir', 'Wonokoyo', 'Gunungsari', 'Cangkringmalang', 'Kedungringin', 'Kedungboto', 'Beji'] },
      { code: 351414, name: 'Bangil', villages: ['Kolursari', 'Kiduldalem', 'Pogar', 'Kauman', 'Bendomungal', 'Kersikan', 'Gempeng', 'Dermo', 'Latek', 'Kalianyar', 'Kalirejo', 'Masangan', 'Raci', 'Manaruwi', 'Tambakan'] },
      { code: 351415, name: 'Rembang', villages: ['Kalisat', 'Tampung', 'Pajaran', 'Siyar', 'Genengwaru', 'Kanigoro', 'Sumberglagah', 'Krengih', 'Rembang', 'Orobulu', 'Kedungbanteng', 'Oro-Oro Ombowetan', 'Oro-Oro Ombokulon', 'Pekoren', 'Pejangkungan', 'Pandean', 'Mojoparon'] },
      { code: 351416, name: 'Kraton', villages: ['Pukul', 'Gambirkuning', 'Mulyorejo', 'Kebotohan', 'Ngabar', 'Slambrit', 'Jeruk', 'Klampisrejo', 'Plinggisan', 'Tambaksari', 'Dhompo', 'Ngempit', 'Sidogiri', 'Karanganyar', 'Selotambak', 'Curahdukuh', 'Rejosari', 'Asemkandang', 'Tambakrejo', 'Kalirejo', 'Semare', 'Kraton', 'Pulokerto', 'Bendungan', 'Gerongan'] },
      { code: 351417, name: 'Pohjentrek', villages: ['Susukanrejo', 'Warungdowo', 'Pleret', 'Parasrejo', 'Logowok', 'Tidu', 'Sungiwetan', 'Sungikulon', 'Sukorejo'] },
      { code: 351418, name: 'Gondangwetan', villages: ['Gondang Wetan', 'Tebas', 'Brambang', 'Bayeman', 'Keboncandi', 'Tenggilisrejo', 'Wonojati', 'Wonosari', 'Kersikan', 'Karangsentul', 'Gayam', 'Lajuk', 'Kalirejo', 'Pateguhan', 'Grogol', 'Pekangkungan', 'Ranggeh', 'Sekarputih', 'Bajangan', 'Gondangrejo'] },
      { code: 351419, name: 'Winongan', villages: ['Minggir', 'Karangtengah', 'Kedungrejo', 'Umbulan', 'Sidepan', 'Sruwi', 'Jeladri', 'Sumberrejo', 'Prodo', 'Lebak', 'Menyarik', 'Kandung', 'Mendalan', 'Penataan', 'Winongan Kidul', 'Bandaran', 'Winongan Lor', 'Gading'] },
      { code: 351420, name: 'Grati', villages: ['Gratitunon', 'Kebonrejo', 'Karanglo', 'Rebalas', 'Plososari', 'Kalipang', 'Trewung', 'Kambinganrejo', 'Karangkliwon', 'Kedawungkulon', 'Kedawungwetan', 'Sumberagung', 'Ranuklindungan', 'Sumberdawesari', 'Cukurgondang'] },
      { code: 351421, name: 'Nguling', villages: ['Sanganom', 'Sebalong', 'Wotgalih', 'Watestani', 'Nguling', 'Sedarum', 'Dandanggendis', 'Sumberanyar', 'Sudimulyo', 'Penunggul', 'Mlaten', 'Kedawang', 'Randuati', 'Kapasan', 'Watuprapat'] },
      { code: 351422, name: 'Lekok', villages: ['Rowogempol', 'Gejugjati', 'Alastlogo', 'Balonganyar', 'Branang', 'Tampung', 'Tambaklekok', 'Jatirejo', 'Pasinan', 'Wates', 'Semedusari'] },
      { code: 351423, name: 'Rejoso', villages: ['Sadengrejo', 'Pandanrejo', 'Ketegan', 'Toyaning', 'Arjosari', 'Kawisrejo', 'Rejoso Kidul', 'Manikrejo', 'Karangpandan', 'Sambirejo', 'Kedungbako', 'Rejosolor', 'Patuguran', 'Kemantrenrejo', 'Segoropuro', 'Jarangan'] },
      { code: 351424, name: 'Tosari', villages: ['Mororejo', 'Podokoyo', 'Ngadiwono', 'Tosari', 'Wonokitri', 'Baledono', 'Sedaeng', 'Kandangan'] }
    ]
  }
};

async function seedTapalKuda() {
  console.log('🌱 Mulai seeding wilayah Tapal Kuda...');

  try {
    // Seed Provinsi Jawa Timur
    const jatim = await prisma.provinsi.upsert({
      where: { id_provinsi: 35 },
      update: {},
      create: {
        id_provinsi: 35,
        nama_provinsi: 'Jawa Timur'
      }
    });
    console.log('✅ Provinsi Jawa Timur');

    // Seed setiap kabupaten Tapal Kuda
    for (const [kabName, kabData] of Object.entries(tapalKudaData)) {
      const kabupaten = await prisma.kabupaten.upsert({
        where: { id_kabupaten: kabData.code },
        update: {},
        create: {
          id_kabupaten: kabData.code,
          id_provinsi: 35,
          nama_kabupaten: kabName
        }
      });
      console.log(`✅ ${kabName}`);

      // Seed kecamatan dan desa
      for (const kecData of kabData.kecamatans) {
        const kecamatan = await prisma.kecamatan.upsert({
          where: { id_kecamatan: kecData.code },
          update: {},
          create: {
            id_kecamatan: kecData.code,
            id_kabupaten: kabData.code,
            nama_kecamatan: kecData.name
          }
        });

        // Seed desa
        for (let i = 0; i < kecData.villages.length; i++) {
          const desaCode = kecData.code * 1000 + (i + 1); // Generate unique code
          await prisma.desa.upsert({
            where: { id_desa: desaCode },
            update: {},
            create: {
              id_desa: desaCode,
              id_kecamatan: kecData.code,
              nama_desa: kecData.villages[i]
            }
          });
        }
        console.log(`  ✅ Kecamatan ${kecData.name} (${kecData.villages.length} desa)`);
      }
    }

    console.log('🎉 Seeding selesai!');
  } catch (error) {
    console.error('❌ Error seeding:', error);
    throw error;
  }
}

seedTapalKuda()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });