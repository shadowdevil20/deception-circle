const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========== PASSWORD UTILITIES ==========
function getWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + 1) / 7);
}

function generateWeeklyPasswords() {
    const week = getWeekNumber();
    const year = new Date().getFullYear().toString().slice(-2);
    
    return {
        admin: process.env.ADMIN_PASSWORD_BASE + week + year,
        creator: process.env.CREATOR_PASSWORD_BASE + week + year,
        week: week,
        year: year,
        validUntil: getWeekEndDate()
    };
}

function getWeekEndDate() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + daysUntilSunday);
    endDate.setHours(23, 59, 59, 999);
    return endDate;
}

// ========== MIDDLEWARE ==========
const requireAdmin = (req, res, next) => {
    if (!req.session.admin) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

const requireCreator = (req, res, next) => {
    if (!req.session.creator) {
        return res.status(401).json({ error: 'Creator access required' });
    }
    next();
};

// ========== ROUTES ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== API ROUTES ==========
app.get('/api/admin/status', (req, res) => {
    res.json({
        admin: req.session.admin || false,
        creator: req.session.creator || false,
        username: req.session.username || null
    });
});

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const weeklyPasswords = generateWeeklyPasswords();
    
    if (password === weeklyPasswords.creator) {
        req.session.admin = true;
        req.session.creator = true;
        req.session.username = 'Creator';
        res.json({ 
            success: true, 
            level: 'creator',
            message: 'Creator access granted'
        });
    } else if (password === weeklyPasswords.admin) {
        req.session.admin = true;
        req.session.creator = false;
        req.session.username = 'Admin';
        res.json({ 
            success: true, 
            level: 'admin',
            message: 'Admin access granted'
        });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/admin/password-info', requireAdmin, (req, res) => {
    const weeklyPasswords = generateWeeklyPasswords();
    res.json({
        week: weeklyPasswords.week,
        year: weeklyPasswords.year,
        validUntil: weeklyPasswords.validUntil,
        adminPassword: req.session.creator ? weeklyPasswords.admin : null,
        creatorPassword: req.session.creator ? weeklyPasswords.creator : null
    });
});

// ========== GAME DATA STORAGE ==========
let customWords = [];
let customRoles = {};

app.get('/api/game/custom-words', requireAdmin, (req, res) => {
    res.json({ words: customWords });
});

app.post('/api/game/custom-words', requireAdmin, (req, res) => {
    const { word } = req.body;
    if (word && !customWords.includes(word)) {
        customWords.push(word);
        res.json({ success: true, words: customWords });
    } else {
        res.json({ success: false, error: 'Word already exists' });
    }
});

app.delete('/api/game/custom-words/:index', requireAdmin, (req, res) => {
    const index = parseInt(req.params.index);
    if (index >= 0 && index < customWords.length) {
        customWords.splice(index, 1);
        res.json({ success: true, words: customWords });
    } else {
        res.json({ success: false });
    }
});

app.get('/api/game/custom-roles', requireAdmin, (req, res) => {
    res.json({ roles: customRoles });
});

app.post('/api/game/custom-roles', requireCreator, (req, res) => {
    const role = req.body;
    const key = role.name.toLowerCase().replace(/\s+/g, '_');
    
    customRoles[key] = role;
    res.json({ success: true, roles: customRoles });
});

app.delete('/api/game/custom-roles/:key', requireCreator, (req, res) => {
    const key = req.params.key;
    delete customRoles[key];
    res.json({ success: true, roles: customRoles });
});

// ========== WEB ADMIN PANEL ==========
app.get('/admin', (req, res) => {
    if (req.session.admin) {
        const weeklyPasswords = generateWeeklyPasswords();
        res.render('admin', {
            admin: req.session.admin,
            creator: req.session.creator,
            username: req.session.username,
            weeklyPasswords: weeklyPasswords,
            process: { env: { ADMIN_PASSWORD_BASE: process.env.ADMIN_PASSWORD_BASE, CREATOR_PASSWORD_BASE: process.env.CREATOR_PASSWORD_BASE } }
        });
    } else {
        res.render('admin-login');
    }
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === process.env.ADMIN_USERNAME && 
        password === process.env.ADMIN_PASSWORD) {
        req.session.admin = true;
        req.session.creator = true;
        req.session.username = username;
        res.redirect('/admin');
    } else {
        res.render('admin-login', { error: 'Invalid credentials' });
    }
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin');
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Deception Circle server running on http://localhost:${PORT}`);
    console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
    
    const weekly = generateWeeklyPasswords();
    console.log(`\n🔐 Current Week: ${weekly.week}`);
    console.log(`🔑 Admin Password: ${weekly.admin}`);
    console.log(`👑 Creator Password: ${weekly.creator}`);
    console.log(`📅 Valid until: ${weekly.validUntil.toLocaleString()}`);
});