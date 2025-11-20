# 🔔 Push Notifications - Android Implementation Guide

## 📋 Overview

Implement Firebase Cloud Messaging (FCM) push notifications for CivicLens with **Android-first focus**.

**Features:**
- 📬 Report status updates
- 👮 Officer assignment notifications
- 💬 Comments and updates
- 🎯 Targeted notifications by role
- 📱 Rich notifications with actions

---

## 🚀 Quick Start (60 minutes total)

### **Phase 1: Firebase Setup** (15 mins)

#### **Step 1.1: Create Firebase Project**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "CivicLens" (or similar)
4. Disable Google Analytics (optional)
5. Click "Create project"

#### **Step 1.2: Add Android App**

1. Click "Add app" → Android icon
2. **Android package name:** `com.civiclens.mobile` (check your `app.json`)
3. **App nickname:** CivicLens Mobile
4. Download `google-services.json`
5. Place in `civiclens-mobile/` root directory

#### **Step 1.3: Get Server Key**

1. In Firebase Console → Project Settings
2. Go to "Cloud Messaging" tab
3. Copy "Server key" → Save for backend

---

### **Phase 2: Install Dependencies** (5 mins)

```bash
# In civiclens-mobile directory
npx expo install expo-notifications expo-device expo-constants

# For Firebase
npm install @react-native-firebase/app @react-native-firebase/messaging

# Or with yarn
yarn add @react-native-firebase/app @react-native-firebase/messaging
```

---

### **Phase 3: Configure App** (10 mins)

**File:** `app.json`

```json
{
  "expo": {
    "name": "CivicLens",
    "slug": "civiclens-mobile",
    "android": {
      "package": "com.civiclens.mobile",
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "USE_FULL_SCREEN_INTENT"
      ]
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#2196F3",
          "sounds": ["./assets/notification.wav"],
          "mode": "production"
        }
      ]
    ]
  }
}
```

---

### **Phase 4: Notification Service** (20 mins)

**File:** `src/shared/services/notifications/NotificationService.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export interface NotificationData {
  type: 'report_update' | 'comment' | 'assignment' | 'system';
  reportId?: number;
  taskId?: number;
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any;
  private responseListener: any;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    // Get push token
    this.expoPushToken = await this.registerForPushNotifications();
    
    if (this.expoPushToken) {
      console.log('📬 Push token:', this.expoPushToken);
      
      // Send token to backend
      await this.sendTokenToBackend(this.expoPushToken);
    }

    // Listen for notifications
    this.setupListeners();

    // Create notification channels (Android)
    if (Platform.OS === 'android') {
      await this.createNotificationChannels();
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission denied');
        return null;
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      return token.data;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Send token to backend
   */
  async sendTokenToBackend(token: string): Promise<void> {
    try {
      const { apiClient } = await import('@shared/services/api/apiClient');
      
      await apiClient.post('/users/push-token', {
        token,
        platform: Platform.OS,
        device_info: {
          brand: Device.brand,
          model: Device.modelName,
          os_version: Device.osVersion,
        },
      });
      
      console.log('✅ Push token registered with backend');
    } catch (error) {
      console.error('Failed to send push token to backend:', error);
    }
  }

  /**
   * Create notification channels (Android 8.0+)
   */
  async createNotificationChannels(): Promise<void> {
    // High priority channel for urgent updates
    await Notifications.setNotificationChannelAsync('urgent', {
      name: 'Urgent Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'notification.wav',
      enableVibrate: true,
      showBadge: true,
    });

    // Default channel for regular updates
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'notification.wav',
    });

    // Low priority channel for informational updates
    await Notifications.setNotificationChannelAsync('info', {
      name: 'Information',
      importance: Notifications.AndroidImportance.LOW,
      showBadge: false,
    });
  }

  /**
   * Setup notification listeners
   */
  setupListeners(): void {
    // Handle notification received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Notification received:', notification);
        // You can show custom in-app notification here
      }
    );

    // Handle notification response (user tapped notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped:', response);
        this.handleNotificationTap(response.notification);
      }
    );
  }

  /**
   * Handle notification tap - navigate to relevant screen
   */
  handleNotificationTap(notification: Notifications.Notification): void {
    const data = notification.request.content.data;
    
    // Navigate based on notification type
    switch (data.type) {
      case 'report_update':
        // Navigate to report detail
        if (data.reportId) {
          // Use your navigation service
          console.log('Navigate to report:', data.reportId);
        }
        break;
      
      case 'assignment':
        // Navigate to task detail
        if (data.taskId) {
          console.log('Navigate to task:', data.taskId);
        }
        break;
      
      case 'comment':
        // Navigate to comments
        if (data.reportId) {
          console.log('Navigate to comments:', data.reportId);
        }
        break;
      
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  /**
   * Send local notification (for testing)
   */
  async sendLocalNotification(data: NotificationData): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title,
        body: data.body,
        data: data.data || {},
        sound: 'notification.wav',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });
  }

  /**
   * Get notification permissions status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export const notificationService = new NotificationService();
```

---

### **Phase 5: Initialize in App** (5 mins)

**File:** `App.tsx`

```typescript
import { notificationService } from './src/shared/services/notifications/NotificationService';

useEffect(() => {
  async function initializeApp() {
    // ... existing initialization
    
    // Initialize notifications
    try {
      await notificationService.initialize();
      log.info('Notifications initialized successfully');
    } catch (notifError) {
      log.warn('Notifications initialization failed:', notifError);
    }
  }
  
  initializeApp();

  // Cleanup
  return () => {
    notificationService.cleanup();
  };
}, []);
```

---

### **Phase 6: Backend Integration** (20 mins)

#### **6.1: Install Python Dependencies**

```bash
cd civiclens-backend
pip install firebase-admin
```

#### **6.2: Firebase Admin Setup**

**File:** `app/services/firebase/firebase_service.py`

```python
import firebase_admin
from firebase_admin import credentials, messaging
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class FirebaseService:
    def __init__(self):
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate("path/to/serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized")

    def send_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        priority: str = "high"
    ) -> bool:
        """Send push notification to single device"""
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                token=token,
                android=messaging.AndroidConfig(
                    priority=priority,
                    notification=messaging.AndroidNotification(
                        channel_id='default',
                        sound='notification.wav',
                        color='#2196F3',
                        icon='notification_icon',
                    ),
                ),
            )

            response = messaging.send(message)
            logger.info(f"Notification sent successfully: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False

    def send_multicast(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None
    ) -> Dict[str, int]:
        """Send notification to multiple devices"""
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                tokens=tokens,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        channel_id='default',
                        sound='notification.wav',
                        color='#2196F3',
                    ),
                ),
            )

            response = messaging.send_multicast(message)
            logger.info(
                f"Sent {response.success_count} notifications successfully, "
                f"{response.failure_count} failed"
            )
            return {
                'success_count': response.success_count,
                'failure_count': response.failure_count,
            }
        except Exception as e:
            logger.error(f"Failed to send multicast notification: {e}")
            return {'success_count': 0, 'failure_count': len(tokens)}

firebase_service = FirebaseService()
```

#### **6.3: Database Model for Push Tokens**

**File:** `app/models/push_token.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base_class import Base

class PushToken(Base):
    __tablename__ = "push_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    platform = Column(String, nullable=False)  # 'android' or 'ios'
    device_info = Column(String)  # JSON string with device details
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

#### **6.4: API Endpoint**

**File:** `app/api/v1/users.py`

```python
from app.services.firebase.firebase_service import firebase_service

@router.post("/push-token")
async def register_push_token(
    token_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register user's push notification token"""
    
    # Check if token already exists
    existing = db.query(PushToken).filter(
        PushToken.token == token_data['token']
    ).first()
    
    if existing:
        # Update user_id if changed
        existing.user_id = current_user.id
        existing.updated_at = func.now()
    else:
        # Create new token
        push_token = PushToken(
            user_id=current_user.id,
            token=token_data['token'],
            platform=token_data['platform'],
            device_info=json.dumps(token_data.get('device_info', {}))
        )
        db.add(push_token)
    
    db.commit()
    
    return {"message": "Push token registered successfully"}
```

#### **6.5: Send Notifications on Events**

**File:** `app/services/notification_sender.py`

```python
from app.services.firebase.firebase_service import firebase_service
from app.models.push_token import PushToken

class NotificationSender:
    async def notify_report_update(
        self,
        db: Session,
        user_id: int,
        report_id: int,
        new_status: str
    ):
        """Send notification when report status changes"""
        
        # Get user's push tokens
        tokens = db.query(PushToken).filter(
            PushToken.user_id == user_id
        ).all()
        
        if not tokens:
            return
        
        token_strings = [t.token for t in tokens]
        
        # Send notification
        firebase_service.send_multicast(
            tokens=token_strings,
            title="Report Update",
            body=f"Your report #{report_id} status changed to {new_status}",
            data={
                'type': 'report_update',
                'reportId': str(report_id),
                'status': new_status,
            }
        )

notification_sender = NotificationSender()
```

---

## 🎯 Notification Types

### **1. Report Status Update**

```python
# When report status changes
await notification_sender.notify_report_update(
    db=db,
    user_id=report.user_id,
    report_id=report.id,
    new_status="UNDER_REVIEW"
)
```

### **2. Officer Assignment**

```python
# When officer is assigned to task
firebase_service.send_notification(
    token=officer_token,
    title="New Task Assigned",
    body=f"You've been assigned to Report #{report.id}",
    data={
        'type': 'assignment',
        'taskId': str(task.id),
        'reportId': str(report.id),
    }
)
```

### **3. Comment on Report**

```python
# When someone comments
firebase_service.send_notification(
    token=user_token,
    title="New Comment",
    body=f"{commenter_name} commented on your report",
    data={
        'type': 'comment',
        'reportId': str(report.id),
        'commentId': str(comment.id),
    }
)
```

---

## 🧪 Testing

### **1. Test Local Notification**

```typescript
// In your app
import { notificationService } from '@shared/services/notifications/NotificationService';

// Send test notification
await notificationService.sendLocalNotification({
  type: 'report_update',
  reportId: 123,
  title: 'Test Notification',
  body: 'This is a test!',
});
```

### **2. Test from Backend**

```bash
# Install httpie
pip install httpie

# Send notification
http POST http://localhost:8000/api/v1/test/notification \
  token="ExponentPushToken[YOUR_TOKEN]" \
  title="Test from Backend" \
  body="Hello from FastAPI!"
```

### **3. Test Notification Channels (Android)**

```typescript
// Check channels
const channels = await Notifications.getNotificationChannelsAsync();
console.log('Channels:', channels);
```

---

## 📱 Rich Notifications

### **With Image:**

```python
firebase_service.send_notification(
    token=token,
    title="Report Resolved!",
    body="Your water supply issue has been fixed",
    data={
        'type': 'report_update',
        'reportId': '123',
        'image': 'https://example.com/resolved-image.jpg',
    }
)
```

### **With Action Buttons:**

```typescript
// Configure notification with actions
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Report Approved",
    body: "Your report has been approved for processing",
    data: { reportId: '123' },
  },
  trigger: null,
});
```

---

## ⚙️ Best Practices

1. **Always request permission gracefully**
2. **Don't spam notifications**
3. **Use appropriate channels**
4. **Clear old notifications**
5. **Handle token refresh**
6. **Test on real devices**

---

## 🚀 Deployment Checklist

- [ ] Firebase project created
- [ ] `google-services.json` added
- [ ] Dependencies installed
- [ ] Notification service implemented
- [ ] Backend endpoints created
- [ ] Database migrations run
- [ ] Tested on Android device
- [ ] Server key stored in backend env

---

**Total implementation time: ~60 minutes**  
**Ready to send push notifications!** 🔔
