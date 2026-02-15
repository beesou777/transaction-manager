# Demo Mode Instructions

## How to Enable/Disable Demo Mode

Demo mode is controlled by a single flag in `src/constants/demoMode.ts`.

### To Enable Demo Mode (for recording):
1. Open `src/constants/demoMode.ts`
2. Set `DEMO_MODE = true`
3. Restart the app

### To Disable Demo Mode (revert to real data):
1. Open `src/constants/demoMode.ts`
2. Set `DEMO_MODE = false`
3. Restart the app

## What Demo Mode Does

When enabled, demo mode provides:

- **1 Demo Business**: "Shrestha Trading Company"
- **3 Demo Bank Accounts**: NIC ASIA Bank, Laxmi Sunrise Bank, Nabil Bank
- **3 Demo SMS Senders**: NICAS, LaxmiAlert, NABIL
- **50+ Demo Transactions**: Spread across the last 4 months with realistic income/expense data
- **Demo SMS Messages**: Fake SMS messages matching the transaction patterns

## Important Notes

- **Demo data is NOT saved to AsyncStorage** - it's only in memory
- **Real data is NOT affected** - your actual data remains untouched
- **Changes in demo mode are temporary** - they won't persist after disabling demo mode
- **SMS reading is mocked** - no actual SMS permissions needed in demo mode

## Files Modified for Demo Mode

- `src/constants/demoMode.ts` - Demo mode flag
- `src/utils/demoData.ts` - Demo data generator
- `src/storage/asyncStorage.ts` - Modified to return demo data when enabled
- `src/store/smsStore.ts` - Modified to return demo SMS messages when enabled

## Reverting Changes

To completely remove demo mode functionality:

1. Set `DEMO_MODE = false` in `src/constants/demoMode.ts`
2. Remove demo mode checks from:
   - `src/storage/asyncStorage.ts` (remove DEMO_MODE imports and conditionals)
   - `src/store/smsStore.ts` (remove DEMO_MODE imports and conditionals)
3. Optionally delete:
   - `src/constants/demoMode.ts`
   - `src/utils/demoData.ts`
   - `DEMO_MODE_INSTRUCTIONS.md` (this file)

However, the demo mode code is designed to be non-intrusive - when `DEMO_MODE = false`, it behaves exactly as before, so you can keep it for future demos.
