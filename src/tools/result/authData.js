// auth data management module - now support persistent storage
import { authStore } from '../../store/index.js';

// in-memory auth data cache
let authData = {
    isLoggedIn: false,
    cookies: [],
    token: null,
    userData: null
};

/**
 * Get current auth data from storage
 * @returns {Object} Current auth data
 */
export async function getAuthData() {
    try {
        // Load from persistent storage first
        const storedData = await authStore.loadAuthData();
        
        if (storedData) {
            authData = { ...authData, ...storedData };
            console.log("💾 using auth data from persistent storage");
        }
        
        return { ...authData };
    } catch (error) {
        console.error("Error loading auth data:", error);
        return { ...authData };
    }
}

/**
 * Set auth data and save to storage
 * @param {Object} newData - New auth data to set
 */
export async function setAuthData(newData) {
    try {
        authData = { ...authData, ...newData };
        
        // Save to persistent storage
        await authStore.saveAuthData(authData);
        console.log("💾 auth data saved to storage");
        
        return { ...authData };
    } catch (error) {
        console.error("Error saving auth data:", error);
        return { ...authData };
    }
}

/**
 * Clear auth data and remove from storage
 */
export async function clearAuthData() {
    try {
        authData = {
            isLoggedIn: false,
            cookies: [],
            token: null,
            userData: null
        };
        
        // Clear from persistent storage
        await authStore.clearAuthData();
        console.log("🗑️ auth data cleared from storage");
        
        return { ...authData };
    } catch (error) {
        console.error("Error clearing auth data:", error);
        return { ...authData };
    }
}

/**
 * Update specific fields in auth data
 * @param {Object} updates - Fields to update
 */
export async function updateAuthData(updates) {
    return await setAuthData(updates);
}

/**
 * Check if user is currently logged in
 * @returns {boolean} Login status
 */
export async function isLoggedIn() {
    const currentData = await getAuthData();
    return currentData.isLoggedIn && (currentData.token || currentData.cookies.length > 0);
}

/**
 * Get auth status summary
 * @returns {string} Formatted auth status
 */
export async function getAuthStatus() {
    const data = await getAuthData();
    return `🔐 Auth status: ${data.isLoggedIn ? '✅ Logged in' : '❌ Not logged in'} | Cookies: ${data.cookies.length} | Token: ${data.token ? 'yes' : 'no'}${data.lastLoginTime ? ' | Last login: ' + new Date(data.lastLoginTime).toLocaleString() : ''}`;
} 