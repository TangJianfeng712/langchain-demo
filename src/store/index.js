// Storage system exports
export { default as PersistentStorage } from './persistentStorage.js';
export { default as authStore } from './authStore.js';
export { default as conversationStore } from './conversationStore.js';
export * from './messageUtils.js';

/**
 * Initialize all stores
 */
export async function initializeStores() {
    try {
        // Add any store initialization logic here if needed
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize stores:', error.message);
        return false;
    }
}

/**
 * Clear all stored data
 */
export async function clearAllData() {
    const { authStore, conversationStore } = await import('./index.js');

    await authStore.clearAuthData();
    await conversationStore.clearAllConversations();

    console.log('✅ All data cleared');
} 