const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'hotspot-secret-key-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 3600000, // 1 hour
        httpOnly: true
    }
}));

// Routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

// Redirect unknown routes to login (captive portal default behavior)
app.get('*', (req, res) => {
    res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Hotspot Portal running on port ${PORT}`);
    console.log(`📡 Access locally at http://localhost:${PORT}`);
});
