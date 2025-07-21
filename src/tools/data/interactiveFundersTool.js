import axios from 'axios';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAuthData } from '../result/authData.js';

// interactive funders tool
export const interactiveFundersTool = tool(async (input) => {
    // Remove debug output
    // console.log("🔧 start executing getFunders tool...");
    // console.log("📋 input parameters:", JSON.stringify(input, null, 2));

    const authData = await getAuthData();
    // console.log("🔐 auth status:", authData.isLoggedIn ? "logged in" : "not logged in");

    if (!authData.isLoggedIn) {
        return `❌ not logged in, cannot get funders list. please login first.`;
    }

    try {
        // build request config
        const config = {
            headers: {
                'Content-Type': 'application/json'
            },
            withCredentials: true,
            params: {},
            timeout: 10000 // 10 seconds timeout
        };

        // add auth token
        if (authData.token) {
            config.headers['Authorization'] = `Bearer ${authData.token}`;
            // console.log("🔑 auth token added");
        }

        // smart parameter handling - set defaults
        config.params.page = input.page || 1;
        config.params.limit = input.limit || 2; // Default to 2 for latest funders
        config.params.include_inactive = input.include_inactive !== undefined ? input.include_inactive : true;
        
        if (input.search && input.search.trim()) {
            config.params.search = input.search.trim();
        }
        
        if (input.sort && input.sort.trim()) {
            config.params.sort = input.sort.trim();
        } else {
            config.params.sort = "-created_at"; // Default sort by newest
        }

        // Remove debug output
        // console.log("🌐 send request to:", 'http://localhost:5001/api/v1/funders');
        // console.log("📤 request config:", JSON.stringify(config, null, 2));

        // send request
        const response = await axios.get('http://localhost:5001/api/v1/funders', config);

        // Remove debug output
        // console.log("✅ request successful, status code:", response.status);
        // console.log("📦 response data size:", JSON.stringify(response.data).length, "characters");

        // build result - simplified
        let result = `✅ funders list get successful!\n`;
        result += `📈 response status: ${response.status}\n`;
        result += `📋 used query parameters:\n`;
        result += `  - page number: ${config.params.page}\n`;
        result += `  - limit per page: ${config.params.limit}\n`;
        if (config.params.search) {
            result += `  - search keyword: "${config.params.search}"\n`;
        }
        result += `  - include inactive: ${config.params.include_inactive ? 'yes' : 'no'}\n`;
        if (config.params.sort) {
            result += `  - sorting method: "${config.params.sort}"\n`;
        }

        // Include raw response data for conclude tool to process
        if (response.data) {
            result += `\n📋 raw response data:\n${JSON.stringify(response.data, null, 2)}`;
        }

        result += `\n💾 using auth data from persistent storage`;

        // Remove detailed tips to keep output clean
        // result += `\n\n💡 usage tips:`;
        // result += `\n  - search specific funder: set search parameter`;
        // result += `\n  - view next page: increase page parameter`;
        // result += `\n  - adjust limit per page: set limit parameter`;
        // result += `\n  - sort: use sort parameter (e.g. '-name', '+created_at')`;

        // console.log("✅ tool execution completed");
        return result;

    } catch (error) {
        // console.log("❌ tool execution failed:", error.message);

        let errorMessage = `❌ get funders list failed!\n`;

        if (error.response) {
            errorMessage += `status code: ${error.response.status}\n`;
            errorMessage += `error message: ${JSON.stringify(error.response.data, null, 2)}`;

            // add error handling suggestion
            if (error.response.status === 401) {
                errorMessage += `\n💡 suggestion: please login again to get valid auth information`;
            } else if (error.response.status === 403) {
                errorMessage += `\n💡 suggestion: current user may not have access to funders`;
            } else if (error.response.status === 404) {
                errorMessage += `\n💡 suggestion: check if the API endpoint is correct`;
            }
        } else if (error.request) {
            errorMessage += `network error: cannot connect to server`;
            errorMessage += `\n💡 suggestion: check if the server is running on http://localhost:5001`;
        } else if (error.code === 'ECONNABORTED') {
            errorMessage += `request timeout: server response time is too long`;
            errorMessage += `\n💡 suggestion: check server performance or increase timeout`;
        } else {
            errorMessage += `request error: ${error.message}`;
        }

        return errorMessage;
    }
}, {
    name: "interactive_get_funders",
    description: "smart get funders list, support interactive parameter setting. provide detailed query results and pagination suggestions. need to login first.",
    schema: z.object({
        page: z.number().optional().describe("page number, default is 1"),
        limit: z.number().optional().describe("limit per page, default is 10, recommended range is 1-100"),
        search: z.string().optional().describe("search keyword, used to search funder name or description"),
        include_inactive: z.boolean().optional().describe("whether to include inactive funders, default is true"),
        sort: z.string().optional().describe("sorting method, e.g. '-name' means sort by name in descending order, '+name' means sort by name in ascending order, '-created_at' means sort by created time in descending order"),
    }),
}); 