const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();

// Create uploads folder if it doesn't exist
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER);
}


// Create beats folder if it doesn't exist
const BEATS_FOLDER = path.join(__dirname, '/uploads/new_beats');
if (!fs.existsSync(BEATS_FOLDER)) {
    fs.mkdirSync(BEATS_FOLDER);
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

// Handle file uploads and save description
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const description = req.body.description || 'No description provided';
    const fileName = req.file.filename;

    // Save description in a JSON file
    const descriptionFilePath = path.join(UPLOADS_FOLDER, `${fileName}.json`);
    fs.writeFileSync(descriptionFilePath, JSON.stringify({ description }));

    res.status(200).send('File uploaded successfully!');
});
	
// Serve uploaded files with descriptions
app.get('/uploads', (req, res) => {
    fs.readdir(UPLOADS_FOLDER, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to list files.');
        }}
app.get('/uploads/new_beats', (req, res) => {
    fs.readdir(BEATS_FOLDER, (err, files) => {
        if (err) {
            return res.status(500).send('Unable to list files.');
        }}
        // Filter out .json files
        const fileList = files.filter(file => !file.endsWith('.json'));

        // Sort files by upload date (newest first)
        fileList.sort((a, b) => {
            return fs.statSync(path.join(UPLOADS_FOLDER, b)).mtime.getTime() -
                   fs.statSync(path.join(UPLOADS_FOLDER, a)).mtime.getTime();
        });

        // Create list of files with links
        const fileLinks = fileList.map(file => {
            const descriptionFile = `${UPLOADS_FOLDER}/${file}.json`;
            const description = fs.existsSync(descriptionFile)
                ? JSON.parse(fs.readFileSync(descriptionFile)).description
                : 'No description provided';
            return `<li>
                        <a href="/uploads/${file}" class="file-link" data-description="${description}">${file}</a>
                        <button class="file-button" data-description="${description}">View Description</button>
                    </li>`;
        }).join('');

        res.send(`
<!doctype html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
html { max-height: 100%; max-width: auto; }
        body { background-color: black; color: white; y-overflow: hidden; x-overflow: auto; }
        a { color: red; text-decoration: underline; }
        ul { line-height: 2; }
        h1 { color: red; border-bottom: 2px solid white; }
        .description-box { width: 100%; padding: 10px; margin-top: 20px; background-color: black; color: limegreen; }
        .file-button { margin-left: 10px; background-color: grey; color: white; border: none; padding: 5px; }
    </style>
</head>
<body>
<a href="http://vault.toxikmusic.com">Back</a>
    <h1>Uploaded Files</h1>
<div style="height:420px;width:500px;overflow:scroll;border:3px solid white;padding:2%">
    <ul>${fileLinks}</ul>
</div>
    <textarea id="descriptionBox" class="description-box" rows="4" cols="50" readonly></textarea>
    <script>
        // Hover effect to display description
        const links = document.querySelectorAll('.file-link');
        const buttons = document.querySelectorAll('.file-button');
        const descriptionBox = document.getElementById('descriptionBox');

        links.forEach(link => {
            link.addEventListener('mouseenter', () => {
                descriptionBox.value = link.getAttribute('data-description');
            });
            link.addEventListener('mouseleave', () => {
                descriptionBox.value = '';
            });
        });

        // Button click for mobile users to display description
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                descriptionBox.value = button.getAttribute('data-description');
            });
        });
    </script>
</body>
<footer>
© 2024 <a href="http://landing.toxikmusic.com">@Toxikmusic™</a>
</footer>
</html>
        `);
    });
});

// Serve uploaded files directly
app.use('/uploads', express.static(UPLOADS_FOLDER));
app.use('/uploads/new_beats', express.static(BEATS_FOLDER));
const PORT = process.env.PORT || 4040;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} https://localhost:${PORT}/`);
});
