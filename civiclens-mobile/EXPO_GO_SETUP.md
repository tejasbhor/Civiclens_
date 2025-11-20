# Expo Go Setup Guide for Physical Device

## Prerequisites

1. Install Expo Go app on your mobile device:
   - Android: Google Play Store
   - iOS: App Store

2. Ensure your mobile device and computer are on the SAME WiFi network

## Step 1: Find Your Computer's IP Address

### Windows
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter (e.g., 192.168.1.100)

### Mac
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
Or go to System Preferences > Network

### Linux
```bash
ip addr show
```
Or
```bash
hostname -I
```

Example IP: `192.168.1.100`

## Step 2: Configure API URL

Edit `civiclens-mobile/src/shared/config/env.ts`:

```typescript
const COMPUTER_IP = '192.168.1.100'; // Replace with YOUR IP
```

## Step 3: Start Backend Server

The backend MUST listen on all interfaces (0.0.0.0), not just localhost:

```bash
cd civiclens-backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Important: `--host 0.0.0.0` allows connections from other devices on your network

## Step 4: Configure Firewall

### Windows Firewall
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Allow Python (or uvicorn) on Private networks

### Mac Firewall
1. System Preferences > Security & Privacy > Firewall
2. Click "Firewall Options"
3. Allow incoming connections for Python

### Linux (ufw)
```bash
sudo ufw allow 8000/tcp
```

## Step 5: Start Mobile App

```bash
cd civiclens-mobile
npm start
```

## Step 6: Connect with Expo Go

1. Open Expo Go app on your phone
2. Scan the QR code from terminal
3. Wait for app to load

## Step 7: Test Backend Connection

The app will try to connect to: `http://YOUR_IP:8000/api/v1`

### Test from browser on phone:
Open browser on your phone and visit:
```
http://YOUR_IP:8000/docs
```

If you see the FastAPI docs, the connection works!

## Troubleshooting

### Cannot connect to backend

1. **Check same WiFi**: Both devices must be on same network
2. **Check IP address**: Verify it's correct in env.ts
3. **Check firewall**: Ensure port 8000 is allowed
4. **Check backend**: Must use `--host 0.0.0.0`
5. **Restart app**: After changing env.ts, restart Expo

### Backend starts but app can't connect

Test connection from phone browser:
```
http://YOUR_IP:8000/health
```

If this works but app doesn't, check:
- env.ts has correct IP
- App was restarted after changing env.ts
- No typos in IP address

### "Network request failed"

- Backend not running
- Wrong IP address
- Firewall blocking
- Not on same WiFi network

## Testing Login

Once connected:

### Citizen Login
1. Select "I am a Citizen"
2. Tap "Login with Password"
3. Phone: 9876543210
4. Password: password123
5. Tap "Login"

### Officer Login
1. Select "Nodal Officer"
2. Phone: 9876543210
3. Password: officer123
4. Tap "Sign In"

## Success Indicators

After successful login, you should see:
- "Login Successful" message
- User details displayed
- Logout button

## Network Configuration Summary

```
Mobile Device (Expo Go)
    |
    | WiFi Network
    |
    v
Computer (YOUR_IP:8000)
    |
    v
Backend Server (FastAPI)
    |
    v
Database (PostgreSQL)
```

## Quick Checklist

- [ ] Found computer's IP address
- [ ] Updated env.ts with IP
- [ ] Backend running with --host 0.0.0.0
- [ ] Firewall allows port 8000
- [ ] Both devices on same WiFi
- [ ] Can access http://YOUR_IP:8000/docs from phone browser
- [ ] Expo Go app installed
- [ ] Scanned QR code
- [ ] App loaded successfully

## Example Configuration

If your computer's IP is `192.168.1.100`:

**env.ts:**
```typescript
const COMPUTER_IP = '192.168.1.100';
```

**Backend command:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Test URL from phone:**
```
http://192.168.1.100:8000/docs
```

## Common IP Ranges

- Home WiFi: 192.168.x.x or 10.0.x.x
- Office WiFi: May vary
- Mobile Hotspot: 192.168.43.x

## Need Help?

1. Check backend logs for incoming requests
2. Check Expo logs for network errors
3. Verify IP with: `ping YOUR_IP` from phone (if possible)
4. Try accessing backend from phone browser first
