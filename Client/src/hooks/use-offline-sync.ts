import { useState, useEffect, useCallback } from 'react';
import { createBillApi } from '@/services/api';
import { toast } from '@/hooks/use-toast';

const OFFLINE_QUEUE_KEY = 'swiftbill_offline_queue';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const getQueue = useCallback(() => {
    try {
      const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  }, []);

  const saveQueue = useCallback((queue: any[]) => {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    setPendingCount(queue.length);
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} offline bills...`);
    const successfulIds: string[] = [];

    for (const bill of queue) {
      try {
        // Remove the temporary local ID before sending to server
        const { localId, ...billData } = bill;
        await createBillApi(billData);
        successfulIds.push(localId);
      } catch (error) {
        console.error('Failed to sync bill:', error);
        // Stop syncing if we hit an error to preserve order/prevent duplicates if it's a server error
        break; 
      }
    }

    if (successfulIds.length > 0) {
      const remainingQueue = queue.filter((b: any) => !successfulIds.includes(b.localId));
      saveQueue(remainingQueue);
      
      toast({
        title: "Sync Complete",
        description: `Successfully uploaded ${successfulIds.length} offline bills.`,
      });
    }
  }, [getQueue, saveQueue]);

  const addToQueue = useCallback((billData: any) => {
    const queue = getQueue();
    const localId = `off-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newBill = { ...billData, localId, timestamp: new Date().toISOString() };
    
    saveQueue([...queue, newBill]);
    
    toast({
      title: "Saved Offline",
      description: "Bill saved locally and will sync when internet returns.",
      variant: "default",
    });
    
    return newBill;
  }, [getQueue, saveQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check and count
    setPendingCount(getQueue().length);
    if (navigator.onLine) {
      syncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue, getQueue]);

  return { isOnline, pendingCount, addToQueue, syncQueue };
}
