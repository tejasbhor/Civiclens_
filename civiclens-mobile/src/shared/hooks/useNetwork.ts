/**
 * useNetwork Hook
 * React hook for monitoring network connectivity status
 */

import { useState, useEffect } from 'react';
import { networkService, NetworkStatus } from '@shared/services/network/networkService';

export const useNetwork = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(networkService.getStatus());

  useEffect(() => {
    // Initialize network service
    networkService.initialize();

    // Subscribe to network changes
    const unsubscribe = networkService.addListener((status) => {
      setNetworkStatus(status);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isOnline: networkStatus.isConnected && networkStatus.isInternetReachable !== false,
    isConnected: networkStatus.isConnected,
    isInternetReachable: networkStatus.isInternetReachable,
    connectionType: networkStatus.type,
    refresh: () => networkService.refresh(),
  };
};
