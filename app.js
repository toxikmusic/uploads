const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();

// Create uploads folder if it doesn't exist
const UPLOADS_FOLDER = path.join(__dirname, '/uploads');
if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER);
}

// Set up storage for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Serve static HTML
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '/index.html'));
});

// Handle file uploads
app.post('https://3a06d651436a9ee739480875effc1a2f.r2.cloudflarestorage.com/uploads', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.status(200).send('File uploaded successfully!');
});

// Serve uploaded files sorted by upload date (newest first)
app.get('https://3a06d651436a9ee739480875effc1a2f.r2.cloudflarestorage.com/uploads', (req, res) => {
    fs.readdir(UPLOADS_FOLDER, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to list files.');
        }

        files = files
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(UPLOADS_FOLDER, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time)
            .map(file => file.name);

        let fileLinks = files.map(file => `<li><a href="https://3a06d651436a9ee739480875effc1a2f.r2.cloudflarestorage.com/uploads/${file}" target="_blank">${file}</a></li>`).join('');

        res.send(`
            <h1>Uploaded Files</h1>
            <ul>${fileLinks}</ul>
        `);
    });
});

// Serve uploaded files directly
app.use('/uploads', express.static(UPLOADS_FOLDER));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
