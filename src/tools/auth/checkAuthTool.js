import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAuthData } from '../result/authData.js';

// check auth status tool
export const checkAuthTool = tool(async () => {
    const authData = await getAuthData();

    if (authData.isLoggedIn) {
        let result = `✅ current logged in\n`;
        result += `📊 auth data overview:\n`;
        result += `  - login status: ${authData.isLoggedIn ? 'logged in' : 'not logged in'}\n`;
        result += `  - cookies count: ${authData.cookies.length}\n`;
        result += `  - token: ${authData.token ? 'got' : 'none'}\n`;

        if (authData.userData) {
            result += `  - user data: saved\n`;
            // only show basic user info if available
            if (authData.userData.user) {
                result += `  - user: ${authData.userData.user.email || authData.userData.user.username || 'N/A'}`;
            }
        }

        // add persistent storage info
        if (authData.lastLoginTime) {
            result += `\n  - last login: ${new Date(authData.lastLoginTime).toLocaleString()}`;
        }
        result += `\n💾 auth data saved to persistent storage, still valid after restart`;

        return result;
    } else {
        return `❌ not logged in\nplease login first`;
    }
}, {
    name: "check_auth_status",
    description: "check current login status and auth data, including persistent storage status",
    schema: z.object({}),
}); 