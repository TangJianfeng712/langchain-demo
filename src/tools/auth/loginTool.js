import axios from 'axios';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { setAuthData, clearAuthData } from '../result/authData.js';

// create login tool
export const loginTool = tool(async (input) => {
    try {
        const response = await axios.post('http://localhost:5001/api/v1/auth/login/funder', {
            email: input.email,
            password: input.password
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true  // support HttpOnly cookie
        });

        // check if login is successful (usually status code 200/201 means success)
        const isSuccess = response.status >= 200 && response.status < 300;

        if (isSuccess) {
            // extract cookies
            const cookies = response.headers['set-cookie'] || [];

            // extract token (if in response body)
            const token = response.data?.token || response.data?.accessToken || response.data?.access_token;

            // update global auth data (now async)
            await setAuthData({
                isLoggedIn: true,
                cookies: cookies,
                token: token,
                userData: response.data
            });

            // build success info (without exposing sensitive data)
            let result = `✅ login successful!\n`;
            result += `status code: ${response.status}\n`;

            // only show basic user info if available
            if (response.data?.user) {
                result += `user: ${response.data.user.email || response.data.user.username || 'N/A'}\n`;
            }

            result += `📋 auth data saved to persistent storage, can be used for subsequent requests`;

            return result;
        } else {
            await setAuthData({ isLoggedIn: false });
            return `⚠️ login status unclear, status code: ${response.status}`;
        }

    } catch (error) {
        // login failed, clear auth data (now async)
        await clearAuthData();

        if (error.response) {
            return `❌ login failed!\nstatus code: ${error.response.status}\nerror message: ${JSON.stringify(error.response.data, null, 2)}`;
        } else if (error.request) {
            return `❌ login failed! network error: cannot connect to server (${error.code || 'NETWORK_ERROR'})`;
        } else {
            return `❌ login failed! request config error: ${error.message}`;
        }
    }
}, {
    name: "login_funder",
    description: "login funder account with email and password, support receiving HttpOnly token, and save auth data to persistent storage",
    schema: z.object({
        email: z.string().describe("login email address"),
        password: z.string().describe("login password"),
    }),
}); 