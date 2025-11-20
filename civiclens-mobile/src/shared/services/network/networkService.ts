/**
 * Network Service
 * Monitors network connectivity status using @react-native-community/netinfo
 */

import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

class NetworkService {
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private unsubscribe: NetInfoSubscription | null = null;
  private currentStatus: NetworkStatus = {
    isConnected: false,
    isInternetReachable: null,
    type: null,
  };

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<void> {
    // Get initial network state
    const state = await NetInfo.fetch();
    this.updateStatus(state);

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener((state) => {
      this.updateStatus(state);
    });
  }

  /**
   * Update network status and notify listeners
   */
  private updateStatus(state: NetInfoState): void {
    const newStatus: NetworkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    };

    // Only notify if status changed
    const statusChanged =
      this.currentStatus.isConnected !== newStatus.isConnected ||
      this.currentStatus.isInternetReachable !== newStatus.isInternetReachable;

    this.currentStatus = newStatus;

    if (statusChanged) {
      console.log('📡 Network status changed:', newStatus);
      this.notifyListeners(newStatus);
    }
  }

  /**
   * Notify all registered listeners
   */
  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Add a listener for network status changes
   */
  addListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Check if device is online (connected and internet reachable)
   */
  isOnline(): boolean {
    return this.currentStatus.isConnected && this.currentStatus.isInternetReachable !== false;
  }

  /**
   * Refresh network status
   */
  async refresh(): Promise<NetworkStatus> {
    const state = await NetInfo.fetch();
    this.updateStatus(state);
    return this.getStatus();
  }

  /**
   * Clean up network monitoring
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const networkService = new NetworkService();
