import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAuthData } from '../result/authData.js';

// get auth data tool
export const getAuthDataTool = tool(async () => {
    const authData = await getAuthData();

    if (!authData.isLoggedIn) {
        return `❌ not logged in, cannot get auth data`;
    }

    let result = `🔑 current auth data:\n`;
    result += `📋 data overview:\n`;
    result += `  - login status: ${authData.isLoggedIn ? 'logged in' : 'not logged in'}\n`;
    result += `  - cookies count: ${authData.cookies.length}\n`;
    result += `  - token: ${authData.token ? 'available' : 'none'}\n`;

    // only show basic user info if available
    if (authData.userData?.user) {
        result += `  - user: ${authData.userData.user.email || authData.userData.user.username || 'N/A'}\n`;
    }

    if (authData.lastLoginTime) {
        result += `\n⏰ last login time: ${new Date(authData.lastLoginTime).toLocaleString()}`;
    }

    result += `\n💾 data source: persistent storage`;

    return result;
}, {
    name: "get_auth_data",
    description: "get detailed auth data, including cookies, token and persistent storage status",
    schema: z.object({}),
}); 