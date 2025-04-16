const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const requestIp = require('request-ip'); // Import request-ip middleware
const app = express();

// Create uploads folder if it doesn't exist
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER);
}

// Create beats folder if it doesn't exist
const BEATS_FOLDER = path.join(UPLOADS_FOLDER, 'new_beats');
if (!fs.existsSync(BEATS_FOLDER)) {
    fs.mkdirSync(BEATS_FOLDER);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let targetFolder = UPLOADS_FOLDER; // default
        if (req.body.folder === 'beats') {
            targetFolder = BEATS_FOLDER;
        }
        cb(null, targetFolder);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Middleware to get client IP address
app.use(requestIp.mw());

// Serve static HTML
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
});

// Handle file uploads and save description with IP address
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const description = req.body.description || 'No description provided';
    const fileName = req.file.filename;
    const clientIp = req.clientIp;

    // Determine which folder to save JSON metadata in
    const targetFolder = req.body.folder === 'beats' ? BEATS_FOLDER : UPLOADS_FOLDER;
    const descriptionFilePath = path.join(targetFolder, `${fileName}.json`);

    const fileData = { description, ip: clientIp };
    fs.writeFileSync(descriptionFilePath, JSON.stringify(fileData));

    res.status(200).send('File uploaded successfully!');
});
// Function to generate file list HTML
function generateFileListHTML(folder) {
    const files = fs.readdirSync(folder).filter(file => !file.endsWith('.json'));

    // Sort files by upload date (newest first)
    files.sort((a, b) => {
        return fs.statSync(path.join(folder, b)).mtime.getTime() -
               fs.statSync(path.join(folder, a)).mtime.getTime();
    });

    return files.map(file => {
        const descriptionFile = `${folder}/${file}.json`;
        const fileData = fs.existsSync(descriptionFile)
            ? JSON.parse(fs.readFileSync(descriptionFile))
            : { description: 'No description provided', ip: 'Unknown' };
        return `<li>
                    <a href="/uploads/${file}" class="file-link" data-description="${fileData.description}" data-ip="${fileData.ip}" data-file="${file}">${file}</a>
                    <button class="file-button" data-description="${fileData.description}" data-ip="${fileData.ip}" data-file="${file}">View Description</button>
                </li>`;
    }).join('');
}

// Serve uploaded files with descriptions
app.get('/uploads', (req, res) => {
    const fileLinks = generateFileListHTML(UPLOADS_FOLDER);
    res.send(renderHTML(fileLinks));
});

app.get('/uploads/new_beats', (req, res) => {
    const fileLinks = generateFileListHTML(BEATS_FOLDER);
    res.send(renderHTML(fileLinks));
});

function renderHTML(fileLinks) {
    return `
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
        .audio-player { margin-top: 20px; }
    </style>
</head>
<body>
<a href="http://vault.toxikmusic.com">Back</a>
    <h1>Uploaded Files</h1>
<div style="height:420px;width:500px;overflow:scroll;border:3px solid white;padding:2%">
    <ul>${fileLinks}</ul>
</div>
    <textarea id="descriptionBox" class="description-box" rows="4" cols="50" readonly></textarea>
    <div class="audio-player">
        <audio id="audioPlayer" controls style="width: 100%;">
            <source id="audioSource" src="" type="audio/mpeg">
            Your browser does not support the audio element.
        </audio>
    </div>
    <script>
        // Hover effect to display description
        const links = document.querySelectorAll('.file-link');
        const buttons = document.querySelectorAll('.file-button');
        const descriptionBox = document.getElementById('descriptionBox');
        const audioPlayer = document.getElementById('audioPlayer');
        const audioSource = document.getElementById('audioSource');

        links.forEach(link => {
            link.addEventListener('mouseenter', () => {
                descriptionBox.value = \`Description: \${link.getAttribute('data-description')}\nIP: \${link.getAttribute('data-ip')}\`;
            });
            link.addEventListener('mouseleave', () => {
                descriptionBox.value = '';
            });
            link.addEventListener('click', (e) => {
                const filePath = link.getAttribute('data-file');
                if (filePath.endsWith('.mp3') || filePath.endsWith('.wav') || filePath.endsWith('.ogg')) {
                    e.preventDefault();
                    audioSource.src = \`/uploads/\${filePath}\`;
                    audioPlayer.load();
                    audioPlayer.play();
                }
            });
        });

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                descriptionBox.value = \`Description: \${button.getAttribute('data-description')}\nIP: \${button.getAttribute('data-ip')}\`;
            });
        });

    </script>
</body>
<footer>
Â© 2024 <a href="http://landing.toxikmusic.com">@Toxikmusicâ¢</a>
</footer>
</html>
    `;
}

// Serve uploaded files directly
app.use('/uploads', express.static(UPLOADS_FOLDER));
app.use('/uploads/new_beats', express.static(BEATS_FOLDER));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
