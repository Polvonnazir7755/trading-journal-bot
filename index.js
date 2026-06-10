const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const DB_FILE = path.join(__dirname, 'licenses.json');

// Load/save licenses
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return { licenses: {} };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Generate unique license key
function generateKey(type) {
  const prefix = type === 'pro' ? 'TJ-PRO' : 'TJ-STD';
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${year}-${random}`;
}

// Admin secret (o'zgartiring!)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your-secret-here';

// ✅ Create new license key
app.post('/api/create-key', (req, res) => {
  const { secret, type, telegramId, buyerName } = req.body;
  
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const db = loadDB();
  const key = generateKey(type || 'standard');
  
  db.licenses[key] = {
    type: type || 'standard',
    telegramId: telegramId || null,
    buyerName: buyerName || 'Unknown',
    createdAt: new Date().toISOString(),
    activatedAt: null,
    machineId: null,
    active: true,
    usageCount: 0
  };
  
  saveDB(db);
  
  res.json({ success: true, key, type });
});

// ✅ Verify license key
app.post('/api/verify-key', (req, res) => {
  const { key, machineId } = req.body;
  
  if (!key || !machineId) {
    return res.status(400).json({ success: false, error: 'Key va machineId kerak' });
  }

  const db = loadDB();
  const license = db.licenses[key];

  if (!license) {
    return res.json({ success: false, error: 'Kalit topilmadi' });
  }

  if (!license.active) {
    return res.json({ success: false, error: 'Kalit bloklangan' });
  }

  // Birinchi marta aktivatsiya
  if (!license.machineId) {
    license.machineId = machineId;
    license.activatedAt = new Date().toISOString();
    license.usageCount = 1;
    saveDB(db);
    return res.json({ 
      success: true, 
      type: license.type,
      message: 'Kalit muvaffaqiyatli aktivlashtirildi!'
    });
  }

  // Xuddi shu qurilma
  if (license.machineId === machineId) {
    license.usageCount++;
    saveDB(db);
    return res.json({ 
      success: true, 
      type: license.type,
      message: 'Xush kelibsiz!'
    });
  }

  // Boshqa qurilma
  return res.json({ 
    success: false, 
    error: 'Bu kalit boshqa qurilmada aktivlashtirilgan. Yordam uchun @sizning_username ga yozing.'
  });
});

// ✅ List all licenses (admin)
app.get('/api/licenses', (req, res) => {
  const { secret } = req.query;
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const db = loadDB();
  res.json({ success: true, licenses: db.licenses });
});

// ✅ Block license (admin)
app.post('/api/block-key', (req, res) => {
  const { secret, key } = req.body;
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const db = loadDB();
  if (!db.licenses[key]) {
    return res.json({ success: false, error: 'Kalit topilmadi' });
  }
  db.licenses[key].active = false;
  saveDB(db);
  res.json({ success: true, message: 'Kalit bloklandi' });
});

// ✅ Health check
app.get('/', (req, res) => {
  res.json({ status: 'Trading Journal License Server ishlayapti ✅' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server port ${PORT} da ishlayapti`);
});
