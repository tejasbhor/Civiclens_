# Quick Setup for Expo Go Testing

## Step 1: Find Your IP Address

```bash
npm run find-ip
```

This will show your computer's IP address (e.g., 192.168.1.100)

## Step 2: Update Configuration

Edit `src/shared/config/env.ts`:

```typescript
const COMPUTER_IP = '192.168.1.100'; // Use YOUR IP from step 1
```

## Step 3: Start Backend

```bash
cd ../civiclens-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

IMPORTANT: Must use `--host 0.0.0.0` to allow connections from your phone

## Step 4: Test Backend from Phone

Open browser on your phone and visit:
```
http://YOUR_IP:8000/docs
```

If you see FastAPI docs, you're ready!

## Step 5: Start Mobile App

```bash
npm start
```

Scan QR code with Expo Go app

## Step 6: Test Login

### Citizen Login
- Select "I am a Citizen"
- Tap "Login with Password"
- Phone: 9876543210
- Password: password123

### Officer Login
- Select "Nodal Officer"
- Phone: 9876543210
- Password: officer123

## Troubleshooting

### Can't connect?

1. Both devices on same WiFi?
2. Backend using `--host 0.0.0.0`?
3. Firewall allowing port 8000?
4. Correct IP in env.ts?
5. Restarted app after changing env.ts?

### Test connection from phone browser:
```
http://YOUR_IP:8000/health
```

## Success

After login, you'll see:
- "Login Successful" message
- User details
- Logout button

Ready to develop!
