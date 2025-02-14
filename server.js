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
app.use(express.json());

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
    let html = fs.readFileSync(path.join(__dirname, 'assets', 'index.html'), 'utf-8');
    let messagesHtml = '';
    messages.filter((msg) => msg.show != false).forEach(msg => {
        messagesHtml += `<div class="message-card">
        <h2>${msg.name}</h2>
        <div class="pictures">`;
        msg.images.forEach(img => {
        messagesHtml += `<img src="/uploads/${img}" style="max-width:200px; margin:5px;">`;
        });
        messagesHtml += `<p>${msg.message}</p>
        </div>
        <div class="edit-remove">
            <button onclick="editMessage(\`${msg.name}\`, \`${msg.message}\`)">✏️ Edit</button>
            <button onclick="removeMessage(\`${msg.name}\`)">❌ Remove</button>
        </div>
        </div>`;
    });
    html = html.replace('<!-- MESSAGES -->', messagesHtml);
    res.send(html);
});

app.get('/removed_messages', (req, res) => {
    console.log('GET /removed_messages');
    const messages = loadMessages();
    let html = fs.readFileSync(path.join(__dirname, 'assets', 'index.html'), 'utf-8');
    let messagesHtml = '';
    messages.filter((msg) => msg.show == false).forEach(msg => {
        messagesHtml += `<div class="message-card">
        <h2>${msg.name}</h2>
        <div class="pictures">`;
        msg.images.forEach(img => {
        messagesHtml += `<img src="/uploads/${img}" style="max-width:200px; margin:5px;">`;
        });
        messagesHtml += `<p>${msg.message}</p>
        </div>
        <div class="edit-remove">
            <button onclick="editMessage(\`${msg.name}\`, \`${msg.message}\`)">✏️ Edit</button>
            <button onclick="removeMessage(\`${msg.name}\`)">❌ Remove</button>
        </div>
        </div>`;
    });
    html = html.replace('<!-- MESSAGES -->', messagesHtml);
    res.send(html);
});

app.get('/add', (req, res) => {
    res.sendFile(path.join(__dirname, 'assets', 'add.html'));
});

app.post('/add', upload.array('images', 10), (req, res) => {
    const { name, message } = req.body;
    const images = req.files.map(file => file.filename);
    const messages = loadMessages();

    const existingMessageIndex = messages.findIndex(msg => msg.name === name);

    if (existingMessageIndex !== -1) {
        messages[existingMessageIndex] = { name, message, images };
    } else {
        messages.push({ name, message, images, "show" : true });
    }

    saveMessages(messages);
    res.redirect('/');
});

app.post('/remove', (req, res) => {
    console.log('POST /remove');
    const { name } = req.body;
    const messages = loadMessages();

    const updatedMessages = messages.map(msg => {
        if (msg.name === name) {

            return { ...msg, "show": false };
        }
        return msg;
    });
    saveMessages(updatedMessages);
    // respond with success status
    res.status(200).send('OK');

});

if (!fs.existsSync('assets')) fs.mkdirSync('assets');
if (!fs.existsSync('public')) fs.mkdirSync('public');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('data')) fs.mkdirSync('data');

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});