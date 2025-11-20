import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { database } from './src/shared/database';
import { FileStorage } from './src/shared/services/storage';
import { cacheService } from './src/shared/services/cache/CacheService';
import { useAuthStore } from './src/store/authStore';
import { AppNavigator } from './src/navigation/AppNavigator';
import { networkService } from './src/shared/services/network/networkService';
import { syncManager } from './src/shared/services/sync/syncManager';
import { submissionQueue } from './src/shared/services/queue/submissionQueue';
import { createLogger } from './src/shared/utils/logger';
import { SplashScreen } from '@/features/auth/screens/SplashScreen';
import { BiometricLockScreen } from '@/features/auth/screens/BiometricLockScreen';
import { AuthErrorBoundary } from './src/shared/components/AuthErrorBoundary';

const log = createLogger('App');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBiometricEnabled = useAuthStore((state) => state.isBiometricEnabled);

  useEffect(() => {
    async function initializeApp() {
      // Set minimum splash screen duration (matches animation duration)
      const MINIMUM_SPLASH_DURATION = 2200; // 2.2 seconds to match progress bar animation
      const startTime = Date.now();

      try {
        log.info('Initializing CivicLens Mobile');
        
        // Critical initialization (must complete)
        const criticalTasks = async () => {
          await cacheService.initialize();
          await FileStorage.init();
          await networkService.initialize();
          await useAuthStore.getState().initialize();
        };

        // Optional initialization (can fail without blocking app)
        const optionalTasks = async () => {
          // Initialize database (optional - for offline reports)
          try {
            await database.init();
            log.info('Database initialized successfully');
          } catch (dbError) {
            log.warn('Database initialization failed (offline features disabled)', dbError);
          }
          
          // Initialize sync manager (optional - only if database works)
          try {
            await syncManager.initialize();
            log.info('Sync manager initialized successfully');
          } catch (syncError) {
            log.warn('Sync manager initialization failed (sync disabled)', syncError);
          }
          
          // Initialize submission queue for offline-first reports
          try {
            await submissionQueue.initialize();
            log.info('Submission queue initialized successfully');
          } catch (queueError) {
            log.warn('Submission queue initialization failed (offline submission disabled)', queueError);
          }

          // Initialize data preloader for Instagram-like experience
          try {
            const { dataPreloader } = await import('./src/shared/services/preload/dataPreloader');
            await dataPreloader.initialize();
            log.info('Data preloader initialized successfully');
          } catch (preloadError) {
            log.warn('Data preloader initialization failed (reduced offline experience)', preloadError);
          }
        };

        // Run critical tasks first
        await criticalTasks();
        
        // Run optional tasks in background (don't wait for them)
        optionalTasks().catch(err => {
          log.warn('Some optional initialization tasks failed:', err);
        });
        
        // Ensure minimum splash duration for smooth UX
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MINIMUM_SPLASH_DURATION - elapsedTime);
        
        if (remainingTime > 0) {
          log.info(`Waiting ${remainingTime}ms to complete splash animation`);
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        log.info('App ready to launch');
        
        // Check if we need biometric unlock
        const authState = useAuthStore.getState();
        const needsUnlock = authState.isAuthenticated && authState.isBiometricEnabled;
        
        log.info(`Biometric unlock needed: ${needsUnlock}`);
        setIsUnlocked(!needsUnlock); // Auto-unlock if biometric not needed
        setIsReady(true);
      } catch (err) {
        log.error('Critical app initialization failed', err);
        
        // Even on critical failure, still respect minimum splash duration
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MINIMUM_SPLASH_DURATION - elapsedTime);
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    initializeApp();
  }, []);

  if (error) {
    return (
      <SafeAreaProvider>
        <SplashScreen
          statusHeading="Initialization Error"
          statusMessage={error || 'Something went wrong while starting CivicLens'}
          highlights={['Check your connection', 'Restart CivicLens', 'Contact support if persistent']}
          footerText="Something went wrong"
          footerSubtext="Tap to restart the app"
          isError
        />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <SplashScreen />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  // Show biometric lock screen if user is authenticated and biometric is enabled
  if (isAuthenticated && isBiometricEnabled && !isUnlocked) {
    return (
      <SafeAreaProvider>
        <BiometricLockScreen onUnlock={() => setIsUnlocked(true)} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppNavigator />
          <StatusBar style="auto" />
        </QueryClientProvider>
      </AuthErrorBoundary>
    </SafeAreaProvider>
  );
}
