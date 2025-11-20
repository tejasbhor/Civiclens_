# Toast Notification System - Setup Guide

## ✅ Files Created

1. **Toast Component**
   - `src/shared/components/Toast.tsx`
   - `src/shared/components/index.ts` (exports)

2. **Toast Hook**
   - `src/shared/hooks/useToast.ts`
   - `src/shared/hooks/index.ts` (exports)

3. **Documentation**
   - `TOAST_NOTIFICATION_SYSTEM.md` - Full documentation
   - `TOAST_QUICK_REFERENCE.md` - Quick reference guide
   - `TOAST_SETUP_GUIDE.md` - This file

## 🔧 Setup Steps

### 1. Restart Metro Bundler

The bundler needs to be restarted to recognize new files:

```bash
# Stop the current bundler (Ctrl+C)
# Then restart:
npm start
# or
npx expo start --clear
```

### 2. Verify Imports

The toast system uses these imports:

```typescript
import { Toast } from '@shared/components/Toast';
import { useToast } from '@shared/hooks/useToast';
```

Alternative (using index exports):

```typescript
import { Toast } from '@shared/components';
import { useToast } from '@shared/hooks';
```

### 3. Updated Screens

These screens have been updated to use toasts:

- ✅ `CitizenLoginScreen.tsx`
- ✅ `OfficerLoginScreen.tsx`

## 📝 Implementation Checklist

### In Your Screen Component:

1. **Import the toast system:**
```typescript
import { Toast } from '@shared/components/Toast';
import { useToast } from '@shared/hooks/useToast';
```

2. **Initialize the hook:**
```typescript
const { toast, showSuccess, showError, showWarning, showInfo, hideToast } = useToast();
```

3. **Add Toast component to render:**
```typescript
return (
  <View>
    <Toast
      visible={toast.visible}
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      onHide={hideToast}
    />
    {/* Your screen content */}
  </View>
);
```

4. **Use toast methods:**
```typescript
showSuccess('Operation successful!');
showError('Something went wrong');
showWarning('Please check your input');
showInfo('New features available');
```

## 🐛 Troubleshooting

### Error: "Unable to resolve @shared/hooks/useToast"

**Solution:**
1. Restart Metro bundler: `npx expo start --clear`
2. Clear cache: `npm start -- --reset-cache`
3. Verify files exist in `src/shared/hooks/` and `src/shared/components/`

### Error: "Cannot find module '@expo/vector-icons'"

**Solution:**
```bash
npm install @expo/vector-icons
# or
npx expo install @expo/vector-icons
```

### Toast not appearing

**Checklist:**
- [ ] Toast component is rendered in your screen
- [ ] useToast hook is called
- [ ] showToast/showSuccess/etc is being called
- [ ] Message is not empty
- [ ] Check z-index conflicts

### Multiple toasts showing

**Note:** Only one toast shows at a time by design. The latest toast replaces the previous one.

## 🎨 Toast Types

| Method | Color | Icon | Use Case |
|--------|-------|------|----------|
| `showSuccess()` | Green | ✓ | Successful operations |
| `showError()` | Red | ✗ | Errors and failures |
| `showWarning()` | Orange | ⚠ | Warnings |
| `showInfo()` | Blue | ℹ | Information |

## 📱 Testing

### Manual Test Steps:

1. **Success Toast:**
   - Login with valid credentials
   - Should show green toast with checkmark

2. **Error Toast:**
   - Login with invalid credentials
   - Should show red toast with X icon

3. **Warning Toast:**
   - Submit form with missing fields
   - Should show orange toast with warning icon

4. **Info Toast:**
   - Request OTP
   - Should show blue toast with info icon

### Test Checklist:

- [ ] Toast appears from top
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Close button works
- [ ] Correct colors for each type
- [ ] Icons display correctly
- [ ] Message is readable
- [ ] Works on different screen sizes

## 🚀 Next Steps

1. **Restart your development server**
2. **Test the toast notifications**
3. **Replace remaining Alert.alert() calls**
4. **Customize duration as needed**

## 📚 Additional Resources

- **Full Documentation:** `TOAST_NOTIFICATION_SYSTEM.md`
- **Quick Reference:** `TOAST_QUICK_REFERENCE.md`
- **Demo Component:** `src/shared/components/ToastDemo.tsx`

## ✨ Features

- ✅ Animated slide-in/out
- ✅ Auto-dismiss
- ✅ Manual close button
- ✅ Four toast types
- ✅ Customizable duration
- ✅ Production-ready
- ✅ TypeScript support
- ✅ Consistent design
- ✅ Non-blocking UI

## 🎯 Migration Status

### Completed:
- ✅ Toast component created
- ✅ useToast hook created
- ✅ CitizenLoginScreen updated
- ✅ OfficerLoginScreen updated
- ✅ Documentation created

### Remaining:
- [ ] Update other auth screens (if any)
- [ ] Update feature screens
- [ ] Remove Alert imports where replaced

## 💡 Pro Tips

1. **Keep messages concise** - 1-2 lines max
2. **Use appropriate type** - Match severity
3. **Test on device** - Verify animations
4. **Consistent wording** - Use similar patterns
5. **Don't overuse** - Only for important feedback

## 🔗 Related Files

```
civiclens-mobile/
├── src/
│   └── shared/
│       ├── components/
│       │   ├── Toast.tsx          ← Toast component
│       │   ├── ToastDemo.tsx      ← Demo/test component
│       │   └── index.ts           ← Exports
│       └── hooks/
│           ├── useToast.ts        ← Toast hook
│           └── index.ts           ← Exports
└── docs/
    ├── TOAST_NOTIFICATION_SYSTEM.md
    ├── TOAST_QUICK_REFERENCE.md
    └── TOAST_SETUP_GUIDE.md
```

---

**Need Help?** Check the troubleshooting section or refer to the full documentation.
