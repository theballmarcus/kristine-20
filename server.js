const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const {
    writeFile
} = require('fs/promises');
const DATA_FILE = './data/messages.json';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const saveMessages = async (messages) => {
    try {
        await writeFile(DATA_FILE, JSON.stringify(messages, null, 2));
    } catch (error) {
        console.error('Error saving messages:', error);
    }
};

const loadMessages = () => {
    if (fs.existsSync(DATA_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE));
        } catch (error) {
            console.error('Error loading messages:', error);
            return [];
        }
    }
    return [];
};

const checkAdmin = (req, res, next) => {
    if (req.cookies.admin === ADMIN_PASSWORD) {
        req.isAdmin = true;
    } else {
        req.isAdmin = false;
    }
    next();
};

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage
});

app.use(cookieParser());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());

app.get('/', checkAdmin, async (req, res) => {
    console.log('GET /');
    if (req.isAdmin) {
        return res.redirect('/admin');
    }
    const messages = loadMessages();
    let html = fs.readFileSync(path.join(__dirname, 'assets', 'index.html'), 'utf-8');
    let messagesHtml = '';
    messages.forEach(msg => {
        if ("images" in msg) {
            msg.public_images = msg.images;
            delete msg.images;
        }
    });
    messages.filter((msg) => msg.show != false).forEach(msg => {
        messagesHtml += `<div class="message-card">
        <h2>${msg.name}</h2>
        <div class="pictures">`;
        console.log(msg);
        if (msg.publicImages) {
            msg.publicImages.forEach(img => {
                messagesHtml += `<img src="/${img.path}" style="max-width:200px; margin:5px;">`;
            });
        }
        messagesHtml += `</div><p>${msg.message}</p>
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
        msg.public_images.forEach(img => {
            messagesHtml += `<img src="/uploads/${img}" style="max-width:200px; margin:5px;">`;
        });
        messagesHtml += `
        </div>
        <p>${msg.message}</p>
        <div class="edit-remove">
            <button onclick="editMessage(\`${msg.name}\`, \`${msg.message}\`)">✏️ Edit</button>
            <button onclick="removeMessage(\`${msg.name}\`)">❌ Remove</button>
        </div>
        </div>`;
    });
    html = html.replace('<!-- MESSAGES -->', messagesHtml);
    res.send(html);
});

app.get('/admin', checkAdmin, (req, res) => {
    console.log('GET /admin');
    if (!req.isAdmin) {
        return res.status(403).send('Access Denied');
    }
    const messages = loadMessages();
    let html = fs.readFileSync(path.join(__dirname, 'assets', 'index.html'), 'utf-8');
    let messagesHtml = '';
    messages.forEach(msg => {
        messagesHtml += `<div class="message-card">
        <h2>${msg.name}</h2>
        <div class="pictures">`;
        if (msg.publicImages) {
            msg.publicImages.forEach(img => {
                messagesHtml += `<img src="/uploads/${img.filename}" style="max-width:200px; margin:5px;">`;
            });
        }
        if (msg.privateImages) {
            msg.privateImages.forEach(img => {
                messagesHtml += `<img src="/uploads/${img.filename}" style="max-width:200px; margin:5px;">`;
            });
        }
        messagesHtml += `
        </div>
        <p>${msg.message}</p>
        <div class="edit-remove">
            <button onclick="editMessage(\`${msg.name}\`, \`${msg.message}\`)">✏️ Edit</button>
            <button onclick="removeMessage(\`${msg.name}\`)">❌ Remove</button>
        </div>
        </div>`;
    });
    html = html.replace('<!-- MESSAGES -->', messagesHtml);
    res.send(html);
});

app.post('/admin/login', (req, res) => {
    const {
        password
    } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.cookie('admin', ADMIN_PASSWORD, {
            httpOnly: true,
            secure: true
        });
        res.redirect('/admin');
    } else {
        res.status(401).send('Invalid password');
    }
});

app.get('/add', (req, res) => {
    res.sendFile(path.join(__dirname, 'assets', 'add.html'));
});

app.post('/add', upload.fields([{
    name: 'public_images',
    maxCount: 10
}, {
    name: 'private_images',
    maxCount: 10
}]), (req, res) => {
    const {
        name,
        message
    } = req.body;
    const publicImages = req.files['public_images'] || [];
    const privateImages = req.files['private_images'] || [];
    const messages = loadMessages();

    const existingMessageIndex = messages.findIndex(msg => msg.name === name);

    if (existingMessageIndex !== -1) {
        messages[existingMessageIndex] = {
            name,
            message,
            publicImages,
            privateImages,
            "show": true
        };
    } else {
        messages.push({
            name,
            message,
            publicImages,
            privateImages,
            "show": true
        });
    }

    saveMessages(messages);
    res.redirect('/');
});

app.post('/remove', (req, res) => {
    console.log('POST /remove');
    const {
        name
    } = req.body;
    const messages = loadMessages();

    const updatedMessages = messages.map(msg => {
        if (msg.name === name) {

            return {
                ...msg,
                "show": false
            };
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