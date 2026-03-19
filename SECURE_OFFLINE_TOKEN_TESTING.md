# Secure Offline Token Matched Payment System - Testing Guide

## Overview
This document outlines comprehensive testing procedures for the secure offline token payment system with token-matched validation, blockchain confirmation, and comprehensive error handling.

---

## System Architecture

### Backend Components
- **tokenController.js**: Enhanced redeemToken with 13-step validation flow
- **OfflineToken Model**: TTL indexes, unique token constraint, status tracking
- **Transaction Model**: New `mode` field for audit trail (DIRECT, OFFLINE_TOKEN, QR, BANK_TRANSFER)
- **AuthContext**: Balance synchronization on successful token match

### Frontend Components
- **OfflineToken.tsx**: Token generation, redemption, and error handling
- **OfflinePaymentSuccessModal.tsx**: Enhanced success display with "Token matched successfully!" message
- **Error handling matrix**: 9 distinct error types with user-friendly messages

---

## Test Scenarios

### 1. Successful Token Matching & Redemption

**Test Case 1.1: Happy Path - Complete Token Redemption**
- **Setup**: 
  - User A has balance ≥ 1000 INR
  - User B (receiver) has account
  - Token is newly generated (not expired, not used)
  - Both users online
- **Steps**:
  1. User A generates offline token for User B (amount: 1000 INR)
  2. Token is displayed with 5-minute countdown
  3. Token is encoded in QR code
  4. User B enters token code manually or scans QR
  5. Backend validates token match (Step 2-3 in redeemToken)
  6. Balance verification passes (Step 8)
  7. Payment processed: User A -1000, User B +1000
  8. Blockchain hash generated
  9. Token marked COMPLETED with isUsed=true
  10. Transaction created with mode="OFFLINE_TOKEN"
- **Expected Results**:
  - ✅ Response: `{ success: true, tokenMatched: true, message: "Token matched successfully!" }`
  - ✅ AuthContext updates receiverBalance for User B
  - ✅ Modal shows "✨ Token Matched Successfully!" title
  - ✅ Toast: "Token matched successfully! Payment secured on blockchain 🎉"
  - ✅ Blockchain hash displayed in modal
  - ✅ Transaction created with correct mode and blockchain hash
  - ✅ Both balances returned in response

**Test Case 1.2: Verify Balance Update in UI**
- **Expected**:
  - After modal dismissal, User B's wallet balance reflects +1000
  - Dashboard shows updated balance without page reload
  - Transaction history includes new OFFLINE_TOKEN mode transaction

---

### 2. Token Matching Failure - Invalid Token

**Test Case 2.1: Token Not Found (Completely Invalid Code)**
- **Setup**: User enters random 6-digit code that doesn't exist
- **Expected Results**:
  - ❌ Response status: 404
  - ❌ Response: `{ success: false, errorType: "TOKEN_MISMATCH", message: "Token not found - Invalid token code provided" }`
  - ❌ Frontend toast: "❌ Token not found - Check the code and try again"
  - ❌ Modal not shown
  - ❌ Balance unchanged
  - ❌ Backend logs: "[Offline Token] Token matched successfully: [NOT FOUND]" ✗

**Test Case 2.2: Typo in Token Code**
- **Setup**: User enters token with 1-2 digit errors
- **Expected Results**:
  - ❌ Same as 2.1 (no partial matching)
  - ❌ Clear error guiding user to verify code

**Test Case 2.3: Token Case Sensitivity**
- **Setup**: 
  - Generated token: "ABC123"
  - User enters: "abc123"
- **Expected Results**:
  - ✅ Input is converted to uppercase (`manualToken.toUpperCase()`)
  - ✅ Match succeeds
  - ❌ Alternative: If backend is case-sensitive, error type "TOKEN_MISMATCH" shown

---

### 3. Token Expiry Validation

**Test Case 3.1: Expired Token Attempt**
- **Setup**: 
  - Token generated at T=0
  - Current time: T > 5 minutes
  - Token expiry: TTL index should mark as EXPIRED
- **Expected Results**:
  - ❌ Response status: 400
  - ❌ Response: `{ success: false, errorType: "TOKEN_EXPIRED", message: "Token has expired - Please generate a new offline token", expiry: [timestamp] }`
  - ❌ Frontend toast: "⏰ Token has expired - Please generate a new one"
  - ❌ Backend updates token.status = "EXPIRED"
  - ❌ Backend logs expiry event

**Test Case 3.2: Countdown Timer Accuracy**
- **Setup**: Token with known 5-minute expiry
- **Expected Results**:
  - ✅ Countdown displays: 4:59, 4:58, ... 0:00
  - ✅ Badge color progression: Green (>2:30) → Yellow (1:25-2:30) → Red (<1:25)
  - ✅ When expired: Modal shows "Token has expired. Generate a new one."
  - ✅ Redeem button disabled when `countdown.isExpired === true`

**Test Case 3.3: Token Auto-Cleanup (TTL Index)**
- **Setup**: Allow 6+ hours to pass
- **Expected Results**:
  - ✅ MongoDB TTL index auto-deletes expired tokens
  - ✅ Token documents removed from DB
  - ❌ Subsequent lookup returns 404 (not just expiry check)

---

### 4. Double-Spend Prevention

**Test Case 4.1: Token Already Used**
- **Setup**:
  - Token successfully redeemed once (isUsed=true, status=COMPLETED)
  - Same token used again
- **Expected Results**:
  - ❌ Response status: 400
  - ❌ Response: `{ success: false, errorType: "TOKEN_ALREADY_USED", message: "Token already redeemed - Cannot use the same token twice", redeemedAt: [timestamp] }`
  - ❌ Frontend toast: "🔄 Token already redeemed - Cannot use twice"
  - ❌ No duplicate balance update
  - ❌ No duplicate transaction created
  - ❌ Backend idempotency check: `offlineToken.status === "COMPLETED" || offlineToken.isUsed`

**Test Case 4.2: Concurrent Redemption Attempts**
- **Setup**: Two users simultaneously attempt to redeem same token
- **Expected Results**:
  - ✅ First request succeeds (token marked isUsed=true)
  - ❌ Second request fails with TOKEN_ALREADY_USED
  - ❌ Blockchain atomic transaction prevents race condition
  - ❌ Only first balance update persists

---

### 5. Authorization & Receiver Validation

**Test Case 5.1: Wrong Receiver Attempt**
- **Setup**:
  - Token created for User B (receiver)
  - User C attempts to redeem
- **Expected Results**:
  - ❌ Response status: 403
  - ❌ Response: `{ success: false, errorType: "UNAUTHORIZED_RECEIVER", message: "You are not the intended receiver of this token" }`
  - ❌ Frontend toast: "🚫 You are not the intended receiver of this token"
  - ❌ No balance update for User C
  - ❌ Backend verification: `receiver._id.toString() !== userId`

**Test Case 5.2: Receiver Account Deleted**
- **Setup**: 
  - User B created token targeting User C
  - User C account deleted
  - Token redemption attempted
- **Expected Results**:
  - ❌ Response status: 404
  - ❌ Response: `{ success: false, errorType: "USER_NOT_FOUND", message: "Sender or receiver not found" }`
  - ❌ Frontend toast: "👤 User account not found"

---

### 6. Balance Validation

**Test Case 6.1: Insufficient Sender Balance at Redemption**
- **Setup**:
  - User A generates token: 1000 INR (has 1000 balance)
  - Before redemption: User A's balance drops to 500 INR (other transaction)
  - Redemption attempted
- **Expected Results**:
  - ❌ Response status: 403
  - ❌ Response: `{ success: false, errorType: "INSUFFICIENT_BALANCE", message: "Sender has insufficient balance - Cannot complete transaction", requiredAmount: 1000, availableBalance: 500 }`
  - ❌ Frontend toast: "💸 Sender has insufficient balance - Transaction cannot be completed"
  - ❌ No balance update
  - ❌ No transaction created
  - ❌ Token remains PENDING (not marked COMPLETED)

**Test Case 6.2: Exact Balance Match**
- **Setup**: Sender has exactly 1000 INR balance, token amount is 1000
- **Expected Results**:
  - ✅ Balance check: 1000 >= 1000 ✓
  - ✅ Payment succeeds
  - ✅ Sender balance becomes 0
  - ✅ No error

---

### 7. Offline Mode & Queue Management

**Test Case 7.1: Redemption While Offline**
- **Setup**: 
  - Network goes offline
  - User attempts token redemption
- **Expected Results**:
  - ⚠️ Network error caught
  - ⚠️ Payment queued: `savePendingRedeem(tokenToVerify)`
  - ⚠️ Toast: "You are offline. Payment queued for later."
  - ⚠️ Toast shows offline status bar at top
  - ⚠️ Pending queue stored in localStorage

**Test Case 7.2: Offline → Online Transition**
- **Setup**:
  - 2 pending redeems in queue
  - Network comes back online
- **Expected Results**:
  - ✅ Toast: "You are back online!"
  - ✅ Pending queue sync initiates: `retryPendingRedeems()`
  - ✅ Amber banner shows "2 pending payment(s) syncing..."
  - ✅ Both redeems processed with blockchain confirmation
  - ✅ Queue cleared on success

---

### 8. Blockchain & Immutability

**Test Case 8.1: Blockchain Hash Generation**
- **Setup**: Successful token redemption
- **Expected Results**:
  - ✅ Hash generated via `recordOnBlockchain(senderEmail, receiverEmail, amount, timestamp)`
  - ✅ Hash stored in OfflineToken.blockchainHash
  - ✅ Hash stored in Transaction.blockchainHash
  - ✅ Hash returned in response
  - ✅ Hash displayed in modal with copy button
  - ✅ Transaction marked with mode: "OFFLINE_TOKEN" for auditability

**Test Case 8.2: Hash Immutability**
- **Setup**: Blockchain hash generated and stored
- **Expected Results**:
  - ✅ Hash cannot be modified (read-only in UI)
  - ✅ Hash matches SHA256 format: 64 hex characters
  - ✅ Copy-to-clipboard works
  - ✅ Hash serves as cryptographic proof of transaction

---

### 9. User Interface & Animations

**Test Case 9.1: Success Modal Animations**
- **Expected Results**:
  - ✅ Green checkmark animates with spring effect (stiffness: 200, damping: 15)
  - ✅ Background circles pulse (2s cycle)
  - ✅ Content fades in with staggered delays (0.3-0.7s)
  - ✅ Modal springs in (scale from 0.8)
  - ✅ All animations smooth and not janky

**Test Case 9.2: "Token Matched Successfully" Emphasis**
- **Expected Results**:
  - ✅ Title: "✨ Token Matched Successfully!" (success color, green)
  - ✅ Subtitle: "Your offline payment has been processed and secured on the blockchain"
  - ✅ Amount prominently displayed with currency
  - ✅ Receiver name shown clearly

**Test Case 9.3: Error Toast Messages**
- **Expected Results**:
  - ✅ All 8 error types display unique emojis and messages
  - ✅ Messages are user-friendly (no technical jargon)
  - ✅ Toasts auto-dismiss after 4 seconds
  - ✅ Multiple errors don't stack (max 3 concurrent)

---

### 10. Data Integrity

**Test Case 10.1: Transaction Audit Trail**
- **Query**: `db.transactions.findOne({ mode: "OFFLINE_TOKEN" })`
- **Expected Fields**:
  - ✅ mode: "OFFLINE_TOKEN"
  - ✅ blockchainHash: SHA256 hash
  - ✅ sender: ObjectId reference
  - ✅ receiver: ObjectId reference
  - ✅ status: "SUCCESS"
  - ✅ describtion: "Offline token payment from [sender] to [receiver]"

**Test Case 10.2: OfflineToken Status Lifecycle**
- **Steps**:
  1. Generate: status = "PENDING", isUsed = false
  2. Redeem: status = "COMPLETED", isUsed = true, redeemedAt = now, redeemedBy = receiverId
  3. Query after 6 hours: Document auto-deleted by TTL index
- **Expected Results**:
  - ✅ Status transitions correctly
  - ✅ Timestamps recorded accurately
  - ✅ References (sender, receiver) valid
  - ✅ TTL index respected

---

## Error Matrix Summary

| Error Type | HTTP Status | User Message | Cause |
|------------|-----------|--------------|-------|
| TOKEN_MISMATCH | 404 | ❌ Token not found - Check the code | Invalid/non-existent token |
| TOKEN_EXPIRED | 400 | ⏰ Token has expired - Generate new | Current time > token.expiry |
| TOKEN_ALREADY_USED | 400 | 🔄 Token already redeemed - Cannot use twice | isUsed=true \| status=COMPLETED |
| INSUFFICIENT_BALANCE | 403 | 💸 Sender insufficient balance | sender.balance < amount |
| UNAUTHORIZED_RECEIVER | 403 | 🚫 Not intended receiver | receiver._id ≠ userId |
| USER_NOT_FOUND | 404 | 👤 User account not found | Sender or receiver deleted |
| MISSING_TOKEN | 400 | 📝 Please enter token code | Empty/null token |
| SERVER_ERROR | 500 | ⚠️ Server error - Try again | Unexpected exception |

---

## Post-Deployment Checklist

- [ ] Backend tokenController.js has all 13 validation steps
- [ ] Frontend shows differentiated error messages for each error type
- [ ] OfflinePaymentSuccessModal displays "✨ Token Matched Successfully!"
- [ ] AuthContext balance updates after successful redemption
- [ ] Transaction.mode field populated with "OFFLINE_TOKEN"
- [ ] Blockchain hash generated and displayed correctly
- [ ] Countdown timer accuracy verified
- [ ] Offline queue management tested
- [ ] TTL indexes auto-delete expired tokens
- [ ] Double-spend prevention verified
- [ ] Authorization checks working for receiver validation
- [ ] No errors in console during full test flow

---

## Quick Test Commands

### Generate Test Token
```javascript
// Backend: Generate via API
POST /api/token/generate
Body: {
  receiverEmail: "test@example.com",
  amount: 500,
  currency: "INR",
  bankName: "HDFC"
}
```

### Test Token Redemption
```javascript
// Backend: Redeem via API
POST /api/token/redeem
Body: {
  token: "ABC123"
}
```

### Query Transaction Audit Trail
```javascript
// MongoDB
db.transactions.find({ mode: "OFFLINE_TOKEN" }).limit(5)
```

### Check OfflineToken Status
```javascript
// MongoDB
db.offlimetokens.find({ status: "COMPLETED" })
```

---

## Known Limitations & Future Enhancements

1. **Partial Token Matching**: Currently exact match only. Could implement fuzzy matching.
2. **Rate Limiting**: No rate limit on token generation. Could add 5 tokens/minute limit.
3. **Batch Redemption**: Single token per request. Could support bulk redemption.
4. **Geographic Validation**: No country-based restrictions. Could add sender/receiver location checks.
5. **Push Notifications**: No real-time notification when token is redeemed.

---

## Conclusion

This comprehensive test matrix ensures the secure offline token system is robust, user-friendly, and handles all edge cases correctly. All 13-step validation flow ensures cryptographic security with blockchain confirmation for every transaction.
