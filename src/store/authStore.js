import PersistentStorage from './persistentStorage.js';

// Authentication store
class AuthStore {
    constructor() {
        this.storage = new PersistentStorage('auth.json');
        this.defaultAuthData = {
            isLoggedIn: false,
            cookies: [],
            token: null,
            userData: null,
            lastLoginTime: null
        };
    }

    // Load auth data
    async loadAuthData() {
        const data = await this.storage.load(this.defaultAuthData);

        // Check if auth is expired (24 hours)
        if (data.lastLoginTime) {
            const lastLogin = new Date(data.lastLoginTime);
            const now = new Date();
            const hoursAgo = (now - lastLogin) / (1000 * 60 * 60);

            if (hoursAgo > 24) {
                // Auth expired, return default data
                return this.defaultAuthData;
            }
        }

        return data;
    }

    // Save auth data
    async saveAuthData(authData) {
        const dataToSave = {
            ...authData,
            lastLoginTime: new Date().toISOString()
        };

        return await this.storage.save(dataToSave);
    }

    // Clear auth data
    async clearAuthData() {
        await this.storage.save(this.defaultAuthData);
        return this.defaultAuthData;
    }

    // Check if auth is valid
    async hasValidAuth() {
        const data = await this.loadAuthData();
        return data.isLoggedIn && (data.token || data.cookies.length > 0);
    }

    // Get auth summary
    async getAuthSummary() {
        const data = await this.loadAuthData();
        if (!data.isLoggedIn) {
            return '❌ Not logged in';
        }

        return `✅ Logged in | Cookies: ${data.cookies.length} | Token: ${data.token ? 'yes' : 'no'} | Last login: ${data.lastLoginTime ? new Date(data.lastLoginTime).toLocaleString() : 'unknown'}`;
    }
}

// Create global instance
const authStore = new AuthStore();

export default authStore; 