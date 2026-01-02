const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { initDb, getDb, saveDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure thumbnails directory exists
const thumbsDir = path.join(__dirname, 'uploads', 'thumbs');
if (!fs.existsSync(thumbsDir)) {
  fs.mkdirSync(thumbsDir, { recursive: true });
}

// Multer storage configuration with timestamped filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate timestamp prefix: YYYYMMDD_HHmmss
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    
    // Fix encoding for Chinese characters
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    // Get original extension
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    
    // Create unique filename: timestamp_originalname.ext
    const newFilename = `${timestamp}_${baseName}${ext}`;
    cb(null, newFilename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// ============ API Routes ============

// GET all photos (newest first)
app.get('/api/photos', (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM photos ORDER BY timestamp DESC');
    const photos = [];
    while (stmt.step()) {
      photos.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload new photo
app.post('/api/photos', upload.single('imageFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const db = getDb();
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const { title, desc, tags } = req.body;
    const filename = req.file.filename;
    const url = `/uploads/${filename}`;
    
    // Generate thumbnail
    let thumbnailUrl = null;
    try {
      const thumbFilename = path.basename(filename, path.extname(filename)) + '_thumb.webp';
      const thumbPath = path.join(thumbsDir, thumbFilename);
      
      await sharp(req.file.path)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(thumbPath);
      
      thumbnailUrl = `/uploads/thumbs/${thumbFilename}`;
    } catch (thumbErr) {
      console.error('Thumbnail generation failed:', thumbErr.message);
      // Continue without thumbnail
    }

    db.run(`
      INSERT INTO photos (id, timestamp, title, desc, tags, filename, url, thumbnail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, timestamp, title || '', desc || '', tags || '', filename, url, thumbnailUrl]);

    saveDb();
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update photo metadata
app.put('/api/photos/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { title, desc, tags } = req.body;

    db.run(`
      UPDATE photos SET title = ?, desc = ?, tags = ? WHERE id = ?
    `, [title || '', desc || '', tags || '', id]);

    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE photo
app.delete('/api/photos/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    // Get filename and thumbnail before deleting
    const stmt = db.prepare('SELECT filename, thumbnail FROM photos WHERE id = ?');
    stmt.bind([id]);
    
    let filename = null;
    let thumbnail = null;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      filename = row.filename;
      thumbnail = row.thumbnail;
    }
    stmt.free();

    if (!filename) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    // Delete from database
    db.run('DELETE FROM photos WHERE id = ?', [id]);
    saveDb();

    // Delete original file from disk
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete thumbnail if exists
    if (thumbnail) {
      const thumbPath = path.join(__dirname, thumbnail.replace(/^\//, ''));
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all unique tags for autocomplete
app.get('/api/tags', (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT tags FROM photos WHERE tags IS NOT NULL AND tags != ""');
    const allTags = new Set();
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (row.tags) {
        // Parse tags (format: #tag1 #tag2 #tag3)
        const tags = String(row.tags).split('#').map(t => t.trim()).filter(t => t);
        tags.forEach(t => allTags.add(t));
      }
    }
    stmt.free();
    
    // Return sorted unique tags
    res.json([...allTags].sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET export as CSV
app.get('/api/export/csv', (req, res) => {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM photos ORDER BY timestamp DESC');
    const photos = [];
    while (stmt.step()) {
      photos.push(stmt.getAsObject());
    }
    stmt.free();

    // CSV header
    const headers = ['id', 'timestamp', 'title', 'desc', 'tags', 'filename', 'url'];
    
    // Escape CSV field (handle commas, quotes, newlines)
    const escapeCSV = (field) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    // Build CSV content
    let csv = '\ufeff'; // UTF-8 BOM for Excel compatibility
    csv += headers.join(',') + '\n';
    
    photos.forEach(photo => {
      const row = headers.map(h => escapeCSV(photo[h]));
      csv += row.join(',') + '\n';
    });

    // Set headers for file download
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="promptnano_export_${timestamp}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server after DB is ready
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🍌 PromptNano server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
