const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { supabase, storage } = require('../config/supabase');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

// Admin login page
router.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f0c29; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                .card { background: rgba(255,255,255,0.08); padding: 40px; border-radius: 16px; width: 320px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                h2 { margin-top: 0; text-align: center; color: #00d4ff; }
                input { width: 100%; box-sizing: border-box; padding: 12px; margin-bottom: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #fff; }
                button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #00d4ff; color: #000; font-weight: bold; cursor: pointer; }
                button:hover { background: #00b0d4; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Admin Login</h2>
                <form method="POST" action="/admin/login">
                    <input name="username" placeholder="Admin Username" required />
                    <input name="password" type="password" placeholder="Password" required />
                    <button type="submit">Sign In</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// Admin login handler
router.post('/login', (req, res) => {
    if (req.body.username === ADMIN_USER && req.body.password === ADMIN_PASS) {
        req.session.isAdmin = true;
        res.redirect('/admin/dashboard');
    } else {
        res.status(401).send(`
            <body style="background:#0f0c29;color:#ff6b6b;font-family:sans-serif;padding:40px;text-align:center;">
                <h2>Invalid admin credentials</h2>
                <a href="/admin/login" style="color:#00d4ff;">Try Again</a>
            </body>
        `);
    }
});

// Admin authorization middleware
function adminAuth(req, res, next) {
    if (!req.session.isAdmin) {
        return res.redirect('/admin/login');
    }
    next();
}

// Dashboard
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        // Fetch all users
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, username, email, phone, is_active, created_at')
            .order('created_at', { ascending: false });

        if (userError) throw userError;

        // Fetch active sessions with user username
        const { data: activeSessionsRaw, error: sessionError } = await supabase
            .from('login_sessions')
            .select(`
                id,
                mac_address,
                ip_address,
                login_time,
                users (
                    username
                )
            `)
            .eq('is_active', true);

        if (sessionError) throw sessionError;

        const activeSessions = (activeSessionsRaw || []).map(s => ({
            id: s.id,
            mac_address: s.mac_address,
            ip_address: s.ip_address,
            login_time: s.login_time,
            username: s.users?.username || 'Guest/Voucher'
        }));

        // Fetch vouchers
        const { data: vouchers } = await supabase
            .from('vouchers')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        // Calculate stats
        const todayStr = new Date().toISOString().split('T')[0];
        const totalUsers = users ? users.length : 0;
        const activeCount = activeSessions.length;
        const newToday = (users || []).filter(u => u.created_at && u.created_at.startsWith(todayStr)).length;

        res.render('admin/dashboard', { 
            users: users || [], 
            activeSessions: activeSessions || [], 
            vouchers: vouchers || [],
            stats: {
                total_users: totalUsers,
                active_sessions: activeCount,
                new_today: newToday
            }
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.status(500).send(`Error loading dashboard: ${error.message}`);
    }
});

// Generate vouchers
router.post('/generate-voucher', adminAuth, async (req, res) => {
    const duration = parseInt(req.body.duration, 10) || 60;
    const count = Math.min(parseInt(req.body.count, 10) || 1, 50);
    const newVouchers = [];

    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        newVouchers.push({
            code,
            duration_minutes: duration,
            is_used: false
        });
    }

    try {
        const { error } = await supabase
            .from('vouchers')
            .insert(newVouchers);

        if (error) throw error;

        // If AJAX request, return JSON, else redirect
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true, vouchers: newVouchers.map(v => v.code) });
        }
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Failed to generate vouchers:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Toggle user active status
router.post('/toggle-user/:id', adminAuth, async (req, res) => {
    try {
        const userId = req.params.id;

        const { data: user, error: findError } = await supabase
            .from('users')
            .select('is_active')
            .eq('id', userId)
            .single();

        if (findError) throw findError;

        const { error: updateError } = await supabase
            .from('users')
            .update({ is_active: !user.is_active })
            .eq('id', userId);

        if (updateError) throw updateError;

        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Failed to toggle user status:', err);
        res.redirect('/admin/dashboard');
    }
});

// Admin logout
router.get('/logout', (req, res) => {
    req.session.isAdmin = false;
    res.redirect('/admin/login');
});

module.exports = router;
