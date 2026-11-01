# 📶 Hotspot Captive Portal (Supabase Edition)

A modern, responsive WiFi Captive Portal built with **Node.js**, **Express**, and **Supabase** (PostgreSQL Database & Cloud Storage). Features glassmorphism UI, user registration/login, voucher-based access codes, session tracking, an admin dashboard, and iptables firewall integration.

---

## 🚀 Features

- **Supabase Integration**: Cloud PostgreSQL for `users`, `login_sessions`, and `vouchers`, plus Supabase Storage support for portal assets.
- **Glassmorphism UI**: Beautiful, mobile-friendly landing pages for WiFi Login, User Registration, and Connection Status.
- **Voucher System**: Generate custom duration voucher codes (e.g., 60-minute access) with one-click activation.
- **Session Tracking**: Real-time timer, client MAC and IP address tracking, login/logout timestamps.
- **Admin Dashboard**: Live overview of active connected users, total registrations, block/unblock controls, and voucher code generation.
- **Captive Portal Engine**: Ready-to-use Linux `iptables` scripts and NoDogSplash configuration for routing unauthenticated clients.

---

## 🗄️ Supabase Setup

### 1. Create a Supabase Project
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Open `supabase_schema.sql` from this repository, paste the entire SQL content into the editor, and click **Run**.
4. This creates:
   - `public.users`: Registered users with hashed passwords (`bcrypt`).
   - `public.login_sessions`: Client IP, MAC address, connection timestamps, and active state.
   - `public.vouchers`: Access vouchers with expiration and usage flags.
   - `portal-assets`: A public Supabase Storage bucket for portal images/logos.

### 2. Get API Credentials
1. In Supabase, go to **Project Settings** -> **API**.
2. Copy your **Project URL** (`SUPABASE_URL`).
3. Copy your **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`) — this gives your Node.js backend secure access.

---

## ⚙️ Installation & Configuration

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/hv5251327/Hotspot-login.git
cd Hotspot-login
npm install
```

### 2. Configure Environment Variables
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
SESSION_SECRET=your_super_secret_session_key_here

# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret

# Admin Dashboard
ADMIN_USER=admin
ADMIN_PASSWORD=admin123
```

---

## 🖥️ Running the Application

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

Open your browser:
- **Captive Portal Login**: [http://localhost:3000/login](http://localhost:3000/login)
- **User Registration**: [http://localhost:3000/register](http://localhost:3000/register)
- **Admin Dashboard**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login) (Default credentials: `admin` / `admin123`)

---

## 📡 Captive Portal Firewall Configuration (Linux / Raspberry Pi)

To redirect unauthorized WiFi clients to the login portal on Linux or a Raspberry Pi access point:

### Option A: Using `iptables` Script
1. Ensure your WiFi hotspot interface (e.g., `wlan0`) is configured with a static IP (e.g., `192.168.4.1`).
2. Make the script executable and run:
   ```bash
   chmod +x scripts/captive-portal-rules.sh
   sudo ./scripts/captive-portal-rules.sh
   ```
3. When a user logs in successfully, the backend automatically issues:
   ```bash
   sudo iptables -I FORWARD -s <CLIENT_IP> -j ACCEPT
   ```

### Option B: Using NoDogSplash
If you prefer a daemon like `nodogsplash`:
```bash
sudo apt install nodogsplash
```
Edit `/etc/nodogsplash/nodogsplash.conf`:
```conf
GatewayInterface wlan0
GatewayAddress 192.168.4.1
RedirectURL http://192.168.4.1:3000/login
```
Start nodogsplash:
```bash
sudo systemctl enable --now nodogsplash
```

---

## 📂 Project Structure

```
├── config/
│   └── supabase.js             # Supabase client & storage utilities
├── routes/
│   ├── auth.js                 # Login, register, voucher, and session routes
│   └── admin.js                # Admin dashboard, user toggles & voucher generator
├── views/
│   ├── login.ejs               # Glassmorphism login & voucher input
│   ├── register.ejs            # New account registration page
│   ├── success.ejs             # Connected status page with live timer
│   └── admin/
│       └── dashboard.ejs       # Admin metrics, user list & voucher generator
├── scripts/
│   └── captive-portal-rules.sh # iptables firewall rules
├── supabase_schema.sql         # PostgreSQL database & storage schema
├── server.js                   # Main Express application entrypoint
├── package.json
└── README.md
```

---

## 📄 License
ISC
