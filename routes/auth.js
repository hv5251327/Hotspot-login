const express = require('express');
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Firewall helpers for Linux captive portal (iptables)
function grantAccess(clientIP) {
    if (process.platform === 'linux' && clientIP && clientIP !== '127.0.0.1' && clientIP !== '::1') {
        exec(`sudo iptables -I FORWARD -s ${clientIP} -j ACCEPT`, (err) => {
            if (err) console.error('Failed to grant firewall access:', err.message);
            else console.log(`✅ Internet access granted to ${clientIP}`);
        });
    } else {
        console.log(`ℹ️ [Dev/Non-Linux] Simulated firewall access granted to ${clientIP}`);
    }
}

function revokeAccess(clientIP) {
    if (process.platform === 'linux' && clientIP && clientIP !== '127.0.0.1' && clientIP !== '::1') {
        exec(`sudo iptables -D FORWARD -s ${clientIP} -j ACCEPT`, (err) => {
            if (err) console.error('Failed to revoke firewall access:', err.message);
            else console.log(`❌ Internet access revoked from ${clientIP}`);
        });
    } else {
        console.log(`ℹ️ [Dev/Non-Linux] Simulated firewall access revoked from ${clientIP}`);
    }
}

// ============ LOGIN PAGE ============
router.get('/login', (req, res) => {
    res.render('login', { error: null, success: null });
});

// ============ HANDLE LOGIN ============
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Find user in Supabase
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${username},email.eq.${username}`)
            .limit(1);

        if (error) throw error;

        if (!users || users.length === 0) {
            return res.render('login', { 
                error: 'User not found. Please register first.', 
                success: null 
            });
        }

        const user = users[0];

        // 2. Check if account is active
        if (!user.is_active) {
            return res.render('login', { 
                error: 'Account is deactivated. Contact admin.', 
                success: null 
            });
        }

        // 3. Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.render('login', { 
                error: 'Incorrect password.', 
                success: null 
            });
        }

        // 4. Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isAuthenticated = true;

        // 5. Log the login session in Supabase
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        const macAddress = req.headers['x-mac-address'] || 'unknown';

        await supabase
            .from('login_sessions')
            .insert([{
                user_id: user.id,
                mac_address: macAddress,
                ip_address: clientIP,
                is_active: true
            }]);

        // 6. Grant firewall access
        grantAccess(clientIP);

        // 7. Redirect to success page
        res.redirect('/success');

    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { 
            error: 'Server error. Please verify database connection.', 
            success: null 
        });
    }
});

// ============ REGISTER PAGE ============
router.get('/register', (req, res) => {
    res.render('register', { error: null });
});

// ============ HANDLE REGISTRATION ============
router.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword, phone } = req.body;

    try {
        // Validation
        if (!username || !email || !password) {
            return res.render('register', { 
                error: 'All fields are required.' 
            });
        }

        if (password !== confirmPassword) {
            return res.render('register', { 
                error: 'Passwords do not match.' 
            });
        }

        if (password.length < 6) {
            return res.render('register', { 
                error: 'Password must be at least 6 characters.' 
            });
        }

        // Check if user already exists in Supabase
        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id')
            .or(`username.eq.${username},email.eq.${email}`);

        if (checkError) throw checkError;

        if (existing && existing.length > 0) {
            return res.render('register', { 
                error: 'Username or email already exists.' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert into Supabase
        const { error: insertError } = await supabase
            .from('users')
            .insert([{
                username,
                email,
                password: hashedPassword,
                phone: phone || null,
                is_active: true
            }]);

        if (insertError) throw insertError;

        res.render('login', { 
            error: null, 
            success: 'Registration successful! Please login.' 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', { 
            error: 'Server error during registration. Please try again.' 
        });
    }
});

// ============ VOUCHER LOGIN ============
router.post('/voucher-login', async (req, res) => {
    const { code } = req.body;

    try {
        const cleanCode = (code || '').trim().toUpperCase();

        const { data: vouchers, error } = await supabase
            .from('vouchers')
            .select('*')
            .eq('code', cleanCode)
            .eq('is_used', false)
            .limit(1);

        if (error) throw error;

        if (!vouchers || vouchers.length === 0) {
            return res.render('login', { 
                error: 'Invalid or already used voucher code.', 
                success: null 
            });
        }

        const voucher = vouchers[0];

        // Mark voucher as used in Supabase
        await supabase
            .from('vouchers')
            .update({ 
                is_used: true, 
                used_at: new Date().toISOString() 
            })
            .eq('id', voucher.id);

        req.session.isAuthenticated = true;
        req.session.username = `Voucher-${voucher.code}`;
        req.session.voucherDuration = voucher.duration_minutes;

        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
        grantAccess(clientIP);

        res.redirect('/success');

    } catch (error) {
        console.error('Voucher error:', error);
        res.render('login', { 
            error: 'Server error processing voucher.', 
            success: null 
        });
    }
});

// ============ SUCCESS PAGE ============
router.get('/success', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/login');
    }
    res.render('success', { username: req.session.username });
});

// ============ LOGOUT ============
router.get('/logout', async (req, res) => {
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    if (req.session.userId) {
        try {
            await supabase
                .from('login_sessions')
                .update({ 
                    logout_time: new Date().toISOString(), 
                    is_active: false 
                })
                .eq('user_id', req.session.userId)
                .eq('is_active', true);
        } catch (err) {
            console.error('Error logging out session:', err);
        }
    }

    revokeAccess(clientIP);
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;
