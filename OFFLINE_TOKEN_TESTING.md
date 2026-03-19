# Quick Testing Guide - ViswaPay Offline Payment Tokens

## Server Setup

```bash
# 1. Backend
cd backend
npm install  # if needed
npm start

# Expected output:
# Server running on port 5000
# [TokenCleaner] Starting offline token expiry cleaner...
# [TokenCleaner] Service started successfully

# 2. Frontend (new terminal)
cd frontend
npm run dev

# Expected output:
# VITE v5.4.19 ready in 500ms
# ➜  Local:   http://localhost:5173/
```

---

## Test Scenarios

### Test 1: Generate Offline Token

1. Open app, navigate to "Offline Token" page
2. Fill in:
   - Receiver email: `user2@example.com`
   - Amount: `5000`
   - Currency: `USD`
   - Bank: `HDFC`
3. Click "Generate Offline Token"
4. ✅ Verify:
   - 6-digit token appears
   - QR code displays
   - Countdown timer shows mm:ss (5:00 initially)
   - Both "Copy Code" and "QR Data" buttons work
   - Security badges visible ("Encrypted", "Secured")

### Test 2: Redeem Token (Online)

1. From generated token screen
2. Token code should be in "Manual Token Entry" field
3. Click "Redeem Token"
4. ✅ Verify:
   - Success modal appears
   - Shows amount, receiver name
   - Displays blockchain hash (64-char hex)
   - "Copy" buttons work
   - Shows "Encrypted" + "Verified" badges
   - Click "Done" closes modal

### Test 3: Countdown Timer

1. Generate token
2. Watch countdown badge (bottom-right of QR code)
3. ✅ Verify:
   - Updates in real-time (mm:ss)
   - Color: Green (>1 min) → Amber (1 min) → Red (expires)
   - When expired, "Redeem Token" button disables
   - Token can't be redeemed after expiry

### Test 4: Offline Detection

1. Generate token
2. Open DevTools (F12) → Network tab
3. Check "Offline" checkbox
4. ✅ Verify:
   - Red status bar appears: "You are offline..."
   - Try to redeem token
   - Toast: "You are offline. Payment queued for later."
   - Payment saved to localStorage
5. Uncheck "Offline"
6. ✅ Verify:
   - Amber bar: "X pending payment(s) syncing..."
   - Auto-retries payment
   - Success modal should appear
   - Green bar: "You are back online!"

### Test 5: Expiry Warning

1. Generate token
2. Wait ~5 minutes (or edit token expiry in DevTools Console)
3. ✅ Verify:
   - After 4:45, countdown badge turns amber
   - After 4:50, red box appears: "Token expires soon!"
   - After 5:00, red box: "Token has expired"
   - "Redeem Token" button disabled

### Test 6: Copy Functionality

1. Generate token
2. Click "Copy Code"
3. ✅ Toast: "Token copied!"
4. Paste somewhere (CMD+V or CTRL+V)
5. ✅ Verify: Token appears correctly (6 digits)

### Test 7: New Token Generation

1. From token screen, click "Generate New Token"
2. ✅ Verify:
   - Form clears
   - Token display disappears
   - Countdown badge gone
   - Ready to generate new token

### Test 8: Offline Queue (Advanced)

1. Generate token
2. Go offline (DevTools → Network → Offline)
3. Try to redeem (payment queues)
4. Try to redeem another token (queries)
5. Open DevTools → Console → Storage
6. LocalStorage key: `pendingRedeems`
7. ✅ Verify: Array of pending tokens with timestamps
8. Go online
9. ✅ Verify: Auto-retry executes, localStorage clears

### Test 9: Backend Cleaner Job

1. Start backend
2. Watch console output every 60 seconds
3. ✅ Expected:
   ```
   [TokenCleaner] Marked X token(s) as EXPIRED
   [TokenCleaner] Deleted X old token(s)
   [TokenCleaner] Stats - Pending: 2, Completed: 5, Expired: 1
   ```

### Test 10: API Direct Test (Postman/cURL)

```bash
# 1. Generate Token
curl -X POST http://localhost:5000/api/token/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverEmail": "user2@example.com",
    "amount": 5000,
    "currency": "USD",
    "bankName": "HDFC"
  }'

# Expected response:
{
  "success": true,
  "message": "Offline token generated successfully",
  "data": {
    "token": "123456",
    "expiry": "2026-03-19T10:05:00.000Z",
    "expirySeconds": 300,
    "qrPayload": "{...}",
    "amount": 5000,
    "currency": "USD",
    "receiver": "user2@example.com"
  }
}

# 2. Redeem Token
curl -X POST http://localhost:5000/api/token/redeem \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "123456"}'

# Expected response:
{
  "success": true,
  "message": "Payment completed successfully",
  "data": {
    "transactionId": "ID",
    "blockchainHash": "sha256hash",
    "amount": 5000,
    "currency": "USD",
    "receiver": "user2",
    "status": "SUCCESS"
  }
}

# 3. Check Status (No Auth)
curl -X GET http://localhost:5000/api/token/status/123456

# Expected response:
{
  "success": true,
  "data": {
    "token": "123456",
    "status": "PENDING",
    "isValid": true,
    "timeRemaining": 240000,
    "timeRemainingSeconds": 240
  }
}
```

---

## Expected Behavior

| Scenario | Expected Behavior |
|----------|-------------------|
| Generate token | 6-digit code, QR, 5:00 countdown |
| Redeem online | Success modal with hash |
| Redeem offline | Queue to localStorage |
| Offline + come online | Auto-retry, success |
| Token expired | Disabled button, red warning |
| Copy token | Toast + clipboard |
| Multiple pending | Amber sync bar appears |
| Cleaner job | Marks EXPIRED, deletes old |

---

## Troubleshooting

**Token not generating?**
- Check JWT token is valid in localStorage
- Verify receiver email exists in database
- Check sender balance >= amount

**Redeem fails?**
- Token might be expired (check mm:ss timer)
- Token might already be used
- Receiver might not exist
- Sender might have insufficient balance

**Offline queue not working?**
- Check localStorage is enabled
- Open DevTools → Application → Storage → LocalStorage
- Key should be "pendingRedeems"

**Success modal not showing?**
- Check browser console for errors
- Verify blockchainHash is returned from API
- Try refreshing page and redeeming again

---

## Performance Notes

- Token generation: <100ms
- Redemption: <200ms (includes blockchain hash)
- Cleaner job: Runs every 60 seconds, non-blocking
- QR code: Generated via external API (qrserver.com)
- Countdown: Updates every 100ms, smooth animation

---

## Hackathon Demo Tips

1. **Impress judges with offline flow:**
   ```
   Generate token → Go offline → Redeem → Come online → Show success
   ```

2. **Highlight security:**
   - Show blockchain hash (explain immutability)
   - Mention SHA256 encryption
   - Explain why offline transactions matter

3. **Show innovation:**
   - Auto-retry when online
   - No data loss (localStorage backup)
   - Automatic expiry cleanup
   - Beautiful animations and UX

4. **Technical depth:**
   - Show TTL index in MongoDB
   - Explain cleaner job
   - Demo API endpoints
   - Show network detection in DevTools

---
