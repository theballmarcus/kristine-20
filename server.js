const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));

const DATA_FILE = './data/messages.json';

const loadMessages = () => {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE));
    }
    return [];
};

const saveMessages = (messages) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
};

app.get('/', (req, res) => {
    console.log('GET /');
    const messages = loadMessages();
    console.log(messages)
    let html = fs.readFileSync(path.join(__dirname, 'assets', 'index.html'), 'utf-8');
    let messagesHtml = '';
    messages.forEach(msg => {
        messagesHtml += `<div class="message-card">
        <h2>${msg.name}</h2>
        <div class="pictures">`;
        msg.images.forEach(img => {
        messagesHtml += `<img src="/uploads/${img}" style="max-width:200px; margin:5px;">`;
        });
        messagesHtml += `<p>${msg.message}</p>
        </div></div>`;
    });
    html = html.replace('<!-- MESSAGES -->', messagesHtml);
    res.send(html);
});

app.get('/add', (req, res) => {
    res.sendFile(path.join(__dirname, 'assets', 'add.html'));
});

app.post('/add', upload.array('images', 5), (req, res) => {
    const { name, message } = req.body;
    const images = req.files.map(file => file.filename);
    const messages = loadMessages();

    // Check if a message with the same name already exists
    const existingMessageIndex = messages.findIndex(msg => msg.name === name);

    if (existingMessageIndex !== -1) {
        // If the name exists, replace the message data
        messages[existingMessageIndex] = { name, message, images };
    } else {
        // If the name doesn't exist, add a new message
        messages.push({ name, message, images, "show" : true });
    }

    // Save the updated messages
    saveMessages(messages);
    res.redirect('/');
});

app.post('/delete', (req, res) => {
    const { name } = req.body;
    const messages = loadMessages();
    // Add a comment to ignore that message in the json file
    const updatedMessages = messages.map(msg => {
        if (msg.name === name) {
            return { ...msg, "show": false };
        }
        return msg;
    });
    saveMessages(updatedMessages);
    res.redirect('/');
});

if (!fs.existsSync('assets')) fs.mkdirSync('assets');
if (!fs.existsSync('public')) fs.mkdirSync('public');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('data')) fs.mkdirSync('data');

// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});