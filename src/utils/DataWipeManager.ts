/**
 * DataWipeManager - Comprehensive data deletion utility
 * Handles both local (IndexedDB, localStorage, caches) and remote (Supabase) data wipe
 * for the signed-in user.
 */

import { supabase } from '@/integrations/supabase/client';
import { EncryptedKV } from '@/crypto/kv';

export interface WipeResult {
  success: boolean;
  localCleared: number;
  remoteDeleted: number;
  errors: string[];
  details: {
    localStorage: boolean;
    indexedDB: boolean;
    cacheStorage: boolean;
    learnedItems: number;
    userSettings: number;
    journeyTraces: number;
    performanceMetrics: number;
    emergencyContacts: number;
    emergencyRecordings: number;
  };
}

export class DataWipeManager {
  private static readonly TIMEOUT_MS = 10000; // 10s per operation
  
  /**
   * Get count of remote rows that will be deleted for the current user
   */
  static async getRemoteRowCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      let totalCount = 0;

      // Count learned items
      const { count: learnedItemsCount } = await supabase
        .from('learned_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      totalCount += learnedItemsCount || 0;

      // Count user settings
      const { count: settingsCount } = await supabase
        .from('user_settings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      totalCount += settingsCount || 0;

      // Count journey traces
      const { count: journeyCount } = await supabase
        .from('journey_traces')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      totalCount += journeyCount || 0;

      // Count performance metrics
      const { count: metricsCount } = await supabase
        .from('performance_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      totalCount += metricsCount || 0;

      // Count emergency contacts
      const { count: contactsCount } = await supabase
        .from('emergency_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      totalCount += contactsCount || 0;

      // Count emergency recordings
      const { count: recordingsCount } = await supabase
        .from('emergency_recordings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      totalCount += recordingsCount || 0;

      return totalCount;
    } catch (error) {
      console.error('Failed to count remote rows:', error);
      return 0;
    }
  }

  /**
   * Clear all local storage data
   */
  private static async clearLocalStorage(): Promise<boolean> {
    try {
      // Get all keys that belong to the app
      const appKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('sb-')) { // Keep Supabase auth keys
          appKeys.push(key);
        }
      }

      // Remove app-specific keys
      appKeys.forEach(key => localStorage.removeItem(key));
      
      return true;
    } catch (error) {
      console.error('localStorage clear failed:', error);
      return false;
    }
  }

  /**
   * Clear all IndexedDB databases except service worker cache
   */
  private static async clearIndexedDB(): Promise<boolean> {
    try {
      // Clear encrypted KV store
      await EncryptedKV.deleteAll();

      // Get all databases
      const databases = await indexedDB.databases();
      
      for (const db of databases) {
        if (db.name && !db.name.includes('workbox')) { // Keep SW cache
          indexedDB.deleteDatabase(db.name);
        }
      }
      
      return true;
    } catch (error) {
      console.error('IndexedDB clear failed:', error);
      return false;
    }
  }

  /**
   * Clear application caches (but keep SW app-shell)
   */
  private static async clearCacheStorage(): Promise<boolean> {
    try {
      if (!('caches' in window)) return true;

      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        // Keep service worker precache and runtime caches
        if (!cacheName.includes('workbox') && !cacheName.includes('precache')) {
          await caches.delete(cacheName);
        }
      }
      
      return true;
    } catch (error) {
      console.error('CacheStorage clear failed:', error);
      return false;
    }
  }

  /**
   * Delete remote Supabase data for the current user
   */
  private static async deleteRemoteData(userId: string): Promise<{
    success: boolean;
    deleted: {
      learnedItems: number;
      userSettings: number;
      journeyTraces: number;
      performanceMetrics: number;
      emergencyContacts: number;
      emergencyRecordings: number;
    };
    errors: string[];
  }> {
    const deleted = {
      learnedItems: 0,
      userSettings: 0,
      journeyTraces: 0,
      performanceMetrics: 0,
      emergencyContacts: 0,
      emergencyRecordings: 0,
    };
    const errors: string[] = [];

    try {
      // Delete learned items
      const learnedResult = await supabase
        .from('learned_items')
        .delete({ count: 'exact' })
        .eq('user_id', userId);
      
      if (learnedResult.error) errors.push(`Learned items: ${learnedResult.error.message}`);
      else deleted.learnedItems = learnedResult.count || 0;

      // Delete user settings
      const settingsResult = await supabase
        .from('user_settings')
        .delete({ count: 'exact' })
        .eq('user_id', userId);
      
      if (settingsResult.error) errors.push(`Settings: ${settingsResult.error.message}`);
      else deleted.userSettings = settingsResult.count || 0;

      // Delete journey traces
      const journeyResult = await supabase
        .from('journey_traces')
        .delete({ count: 'exact' })
        .eq('user_id', userId);
      
      if (journeyResult.error) errors.push(`Journey traces: ${journeyResult.error.message}`);
      else deleted.journeyTraces = journeyResult.count || 0;

      // Delete performance metrics
      const metricsResult = await supabase
        .from('performance_metrics')
        .delete({ count: 'exact' })
        .eq('user_id', userId);
      
      if (metricsResult.error) errors.push(`Metrics: ${metricsResult.error.message}`);
      else deleted.performanceMetrics = metricsResult.count || 0;

      // Delete emergency contacts
      const contactsResult = await supabase
        .from('emergency_contacts')
        .delete({ count: 'exact' })
        .eq('user_id', userId);
      
      if (contactsResult.error) errors.push(`Emergency contacts: ${contactsResult.error.message}`);
      else deleted.emergencyContacts = contactsResult.count || 0;

      // Delete emergency recordings
      const recordingsResult = await supabase
        .from('emergency_recordings')
        .delete({ count: 'exact' })
        .eq('user_id', userId);
      
      if (recordingsResult.error) errors.push(`Emergency recordings: ${recordingsResult.error.message}`);
      else deleted.emergencyRecordings = recordingsResult.count || 0;

    } catch (error) {
      errors.push(`Remote delete error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    const _totalDeleted = Object.values(deleted).reduce((sum, count) => sum + count, 0);

    return {
      success: errors.length === 0,
      deleted,
      errors,
    };
  }

  /**
   * Execute complete data wipe - local and remote
   */
  static async wipeAllData(): Promise<WipeResult> {
    const result: WipeResult = {
      success: false,
      localCleared: 0,
      remoteDeleted: 0,
      errors: [],
      details: {
        localStorage: false,
        indexedDB: false,
        cacheStorage: false,
        learnedItems: 0,
        userSettings: 0,
        journeyTraces: 0,
        performanceMetrics: 0,
        emergencyContacts: 0,
        emergencyRecordings: 0,
      },
    };

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        result.errors.push('No authenticated user found');
        return result;
      }

      // Clear local storage
      result.details.localStorage = await this.clearLocalStorage();
      if (result.details.localStorage) result.localCleared++;

      // Clear IndexedDB
      result.details.indexedDB = await this.clearIndexedDB();
      if (result.details.indexedDB) result.localCleared++;

      // Clear cache storage
      result.details.cacheStorage = await this.clearCacheStorage();
      if (result.details.cacheStorage) result.localCleared++;

      // Delete remote data
      const remoteResult = await this.deleteRemoteData(user.id);
      
      result.details.learnedItems = remoteResult.deleted.learnedItems;
      result.details.userSettings = remoteResult.deleted.userSettings;
      result.details.journeyTraces = remoteResult.deleted.journeyTraces;
      result.details.performanceMetrics = remoteResult.deleted.performanceMetrics;
      result.details.emergencyContacts = remoteResult.deleted.emergencyContacts;
      result.details.emergencyRecordings = remoteResult.deleted.emergencyRecordings;
      
      result.remoteDeleted = Object.values(remoteResult.deleted).reduce((sum, count) => sum + count, 0);
      result.errors.push(...remoteResult.errors);

      // Overall success if no critical errors
      result.success = result.errors.length === 0;

      return result;
    } catch (error) {
      result.errors.push(`Wipe failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }
}
