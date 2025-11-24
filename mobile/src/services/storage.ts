import { Preferences } from "@capacitor/preferences";

class StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key });
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Storage] Error reading ${key}:`, error);
      // Return null on error so we don't crash the app
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      await Preferences.set({ key, value: stringValue });
      // Verify immediately for debugging
      console.log(`[Storage] Saved ${key} successfully`);
    } catch (error) {
      console.error(`[Storage] Error writing ${key}:`, error);
      throw error; // Re-throw so the Login screen knows it failed
    }
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  async clear(): Promise<void> {
    await Preferences.clear();
  }
}

export const storageService = new StorageService();
