import axios from 'axios';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAuthData } from '../result/authData.js';

// use auth data to send request
export const authenticatedRequestTool = tool(async (input) => {
    const authData = await getAuthData();

    if (!authData.isLoggedIn) {
        return `❌ not logged in, cannot send auth request. please login first.`;
    }

    try {
        const config = {
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true
        };

        // if token exists, add to request headers
        if (authData.token) {
            config.headers['Authorization'] = `Bearer ${authData.token}`;
        }

        const response = await axios.get(input.url, config);

        let result = `✅ auth request successful!\n`;
        result += `status code: ${response.status}\n`;
        result += `response size: ${JSON.stringify(response.data).length} characters\n`;
        result += `💾 using auth data from persistent storage`;

        return result;
    } catch (error) {
        if (error.response) {
            return `❌ auth request failed!\nstatus code: ${error.response.status}\nerror message: ${JSON.stringify(error.response.data, null, 2)}`;
        } else {
            return `❌ request failed: ${error.message}`;
        }
    }
}, {
    name: "authenticated_request",
    description: "use auth data to send GET request",
    schema: z.object({
        url: z.string().describe("the url to request"),
    }),
}); 