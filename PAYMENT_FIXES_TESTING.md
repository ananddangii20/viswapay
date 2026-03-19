# ViswaPay Payment Logic Fixes - Testing Guide

## Backend Changes Summary

### 1. Created Unified Payment Service (`backend/services/paymentService.js`)
- **Purpose**: Centralized payment processing with MongoDB atomic transactions
- **Key Features**:
  - Atomic wallet updates (both sender and receiver in single session)
  - Fraud score tracking
  - Blockchain recording
  - Transaction history creation
  - Returns `senderBalance` and `receiverBalance`
- **Function**: `processPayment(params)` where params include:
  - `senderId`: Sender User ID
  - `receiverEmail`: Receiver email
  - `amount`: Amount to send
  - `currency`: Currency code
  - `bankName`: Bank name (optional)
  - `mode`: Payment mode (DIRECT, QR, OFFLINE_TOKEN)
  - `description`: Transaction description
  - `fraudScore`: Fraud score (optional)

### 2. Updated Payment Controller (`backend/controllers/paymentController.js`)
- **sendPayment()**: Now uses `processPayment()` from unified service
  - Returns `senderBalance` in response
  - Properly handles fraud checks
  - Atomic transaction guaranteed
- **processQRPayment()**: Now uses `processPayment()` from unified service
  - Returns both `senderBalance` and `receiverBalance`
  - Validates receiver is authenticated user
  - QR payload verification
- **verifyToken()**: Now uses `processPayment()` from unified service
  - Handles offline token redemption
  - Returns both wallet balances
- **Helper endpoints**:
  - `fraudCheck()`: Uses `getFraudCheck()` from service
  - `convertCurrency()`: Uses `convertCurrencyAmount()` from service
  - `getBankRatesHandler()`: Uses `getBankRatesForAmount()` from service

### 3. Updated Token Controller (`backend/controllers/tokenController.js`)
- **redeemToken()**: Uses `processPayment()` from unified service
  - Validates token with explicit matching
  - Checks expiry and double-spend prevention
  - Proper error handling with rollback on failure
  - Returns `senderBalance` and `receiverBalance`
  - Returns `tokenMatched: true` for successful redemption

## Frontend Changes Summary

### 1. SendPayment.tsx
- Extracts `senderBalance` from response.data
- Updates AuthContext with updated balance
- Navigates to dashboard after payment

### 2. QRPayment.tsx
- **Sender Mode**: Generates QR code with payment payload
  - Validates receiver exists
  - Checks sender balance
  - Returns QR image (or falls back to payload JSON)
- **Receiver Mode**: Scans and processes QR payment
  - Scans QR code to get payment data
  - Calls `/payment/qr-pay` endpoint
  - Extracts `receiverBalance` from response
  - Updates AuthContext with new balance
  - Shows success modal and navigates to dashboard

### 3. OfflineToken.tsx
- **Sender Mode**: Generates offline token
  - Calls `/token/generate` endpoint
  - Gets token code and QR payload
  - Shows countdown timer (5 minutes expiry)
- **Receiver Mode**: Redeems token
  - Calls `/token/redeem` endpoint
  - Extracts `receiverBalance` from response
  - Updates AuthContext with new balance
  - Shows success modal and navigates to dashboard

### 4. Dashboard.tsx
- Transaction history already displays with proper styling:
  - ✅ Incoming transactions (green, with `+` sign)
  - ✅ Outgoing transactions (red/destructive, with `-` sign)
  - ✅ Correct direction badge (Sent/Received)
  - ✅ Displays blockchain hash if available

## Testing Checklist

### Direct Payment Flow
- [ ] Open SendPayment page
- [ ] Enter valid receiver email and amount
- [ ] View fraud risk assessment
- [ ] Compare bank rates
- [ ] Submit payment
- [ ] **CRITICAL**: Verify sender balance DECREASES in real-time
- [ ] Verify receiver balance INCREASES (check their dashboard)
- [ ] Check transaction appears in history with correct styling (red for sent)

### QR Payment Flow - Sender
- [ ] Open QRPayment page in "Sender" mode
- [ ] Enter receiver email and amount
- [ ] Generate QR code (should show image or payload)
- [ ] Share QR code with receiver

### QR Payment Flow - Receiver
- [ ] Open QRPayment page in "Receiver" mode
- [ ] Scan QR code (or copy/paste payload)
- [ ] Review payment details
- [ ] Confirm payment
- [ ] **CRITICAL**: Verify receiver balance INCREASES in real-time
- [ ] Verify sender balance DECREASED (check their dashboard)
- [ ] Check transaction appears in history with correct styling (green for received)

### Offline Token Flow - Sender
- [ ] Open OfflineToken page in "Sender" mode
- [ ] Enter receiver email and amount
- [ ] Generate offline token
- [ ] **See countdown timer** (5 minutes)
- [ ] Copy or share token code

### Offline Token Flow - Receiver (Online)
- [ ] Open OfflineToken page in "Receiver" mode
- [ ] Enter or paste token code
- [ ] Click "Verify Token"
- [ ] **CRITICAL**: Verify receiver balance INCREASES in real-time
- [ ] Verify sender balance DECREASED (check their dashboard)
- [ ] See "✅ Offline payment completed" message
- [ ] Check transaction appears in history

### Edge Cases
- [ ] Insufficient sender balance → Should fail with error
- [ ] Token expiry → Should reject expired tokens
- [ ] Double-spend prevention → Using same token twice should fail
- [ ] Send to non-existent receiver → Should fail with error
- [ ] Receiver verification → Wrong receiver trying to claim payment should fail
- [ ] Fraud detection → High-risk transactions should be blocked

## Key Improvements

### ✅ Atomic Transactions (ACID Guarantee)
- Both wallet updates happen in single MongoDB session
- On any error, both updates rollback automatically
- No partial updates possible

### ✅ Unified Payment Logic
- All three payment methods use same core logic
- Consistency across payment types
- Easier to maintain and debug
- Single source of truth

### ✅ Proper Balance Updates
- Backend returns updated balances in every response
- Frontend extracts balance and updates AuthContext
- User sees immediate balance change
- Dashboard reflects latest state

### ✅ Transaction History UI
- Already correctly shows in/out transactions
- Green for received (+ sign)
- Red for sent (- sign)
- Blockchain hash displayed when available

### ✅ Error Handling
- Comprehensive error messages
- Rollback on failure
- Proper HTTP status codes
- Helpful error types for frontend

## Deployment Checklist

- [ ] Delete/skip `paymentEngine` references (if any exist)
- [ ] Import from `paymentService` instead
- [ ] Verify all endpoints return correct balance fields
- [ ] Test QR code generation (ensure qrcode npm package is installed)
- [ ] Test offline token flow with 5-minute countdown
- [ ] Verify blockchain recording works
- [ ] Monitor fraud detection service
- [ ] Check server logs for any errors
- [ ] Verify database transactions are working correctly

## Rollback Plan

If issues occur:
1. Revert to previous payment controller
2. Check MongoDB session support (only works with replica sets)
3. Verify all imports point to correct service files
4. Check for any missing dependencies
5. Verify environment variables are set correctly
