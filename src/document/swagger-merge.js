const fs = require('fs');
const path = require('path');

const baseFile = path.join(__dirname, 'swagger.json');
const base = JSON.parse(fs.readFileSync(baseFile));
const extraDocs = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.swagger.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(__dirname, f))));

for (const doc of extraDocs) {
  if (doc.paths) {
    for (const [pathKey, value] of Object.entries(doc.paths)) {
      // otomatis tambahkan prefix /api/v1 jika belum ada
      const newKey = pathKey.startsWith('/api/v1')
        ? pathKey
        : pathKey.replace(/^\/api/, '/api/v1');
      base.paths[newKey] = value;
    }
  }

  if (doc.tags) {
    base.tags = [...(base.tags || []), ...doc.tags];
  }
}

// tambahkan server default kalau belum ada
if (!base.servers || base.servers.length === 0) {
  base.servers = [
    { url: 'http://localhost:3000/api/v1', description: 'Local server' }
  ];
}

const output = path.join(__dirname, 'swagger-final.json');
fs.writeFileSync(output, JSON.stringify(base, null, 2));

console.log('✅ Swagger documentation merged successfully → document/swagger-final.json');
