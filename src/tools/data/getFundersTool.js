import axios from 'axios';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAuthData } from '../result/authData.js';

// get funders list tool
export const getFundersTool = tool(async (input) => {
    const authData = await getAuthData();

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
            params: {}
        };

        // add auth token
        if (authData.token) {
            config.headers['Authorization'] = `Bearer ${authData.token}`;
        }

        // handle query params
        if (input.page !== undefined) {
            config.params.page = input.page;
        }
        if (input.limit !== undefined) {
            config.params.limit = input.limit;
        }
        if (input.search) {
            config.params.search = input.search;
        }
        if (input.include_inactive !== undefined) {
            config.params.include_inactive = input.include_inactive;
        }
        if (input.sort) {
            config.params.sort = input.sort;
        }

        // send request
        const response = await axios.get('http://localhost:5001/api/v1/funders', config);

        // build result
        let result = `✅ funders list get successful!\n`;
        result += `📊 request params: ${JSON.stringify(config.params, null, 2)}\n`;
        result += `📈 response status: ${response.status}\n`;

        // handle response data
        if (response.data) {
            const data = response.data;

            // if there is pagination info
            if (data.pagination) {
                result += `\n📄 pagination info:\n`;
                result += `  - current page: ${data.pagination.page || 'N/A'}\n`;
                result += `  - limit per page: ${data.pagination.limit || 'N/A'}\n`;
                result += `  - total count: ${data.pagination.total || 'N/A'}\n`;
                result += `  - total pages: ${data.pagination.pages || 'N/A'}\n`;
            }

            // if there is funders data
            if (data.data && Array.isArray(data.data)) {
                result += `\n🏢 funders list (total ${data.data.length} funders):\n`;
                data.data.forEach((funder, index) => {
                    result += `\n${index + 1}. ${funder.name || 'unnamed'}\n`;
                    if (funder.id) result += `   ID: ${funder.id}\n`;
                    if (funder.description) result += `   description: ${funder.description}\n`;
                    if (funder.status !== undefined) result += `   status: ${funder.status ? 'active' : 'inactive'}\n`;
                    if (funder.created_at) result += `   created at: ${new Date(funder.created_at).toLocaleString()}\n`;
                });
            } else if (Array.isArray(data)) {
                // if directly return array
                result += `\n🏢 funders list (total ${data.length} funders):\n`;
                data.forEach((funder, index) => {
                    result += `\n${index + 1}. ${funder.name || 'unnamed'}\n`;
                    if (funder.id) result += `   ID: ${funder.id}\n`;
                    if (funder.description) result += `   description: ${funder.description}\n`;
                    if (funder.status !== undefined) result += `   status: ${funder.status ? 'active' : 'inactive'}\n`;
                    if (funder.created_at) result += `   created at: ${new Date(funder.created_at).toLocaleString()}\n`;
                });
            } else {
                result += `\n📋 raw response data:\n${JSON.stringify(data, null, 2)}`;
            }
        }

        result += `\n💾 using auth data from persistent storage`;

        return result;

    } catch (error) {
        let errorMessage = `❌ get funders list failed!\n`;

        if (error.response) {
            errorMessage += `status code: ${error.response.status}\n`;
            errorMessage += `error message: ${JSON.stringify(error.response.data, null, 2)}`;
        } else if (error.request) {
            errorMessage += `network error: cannot connect to server`;
        } else {
            errorMessage += `request error: ${error.message}`;
        }

        return errorMessage;
    }
}, {
    name: "get_funders_list",
    description: "get funders list, support pagination, search, sort, etc. need to login first to get auth data.",
    schema: z.object({
        page: z.number().optional().describe("page number, default is 1"),
        limit: z.number().optional().describe("limit per page, default is 10"),
        search: z.string().optional().describe("search keyword, used to search funder name"),
        include_inactive: z.boolean().optional().describe("whether to include inactive funders, default is true"),
        sort: z.string().optional().describe("sorting method, e.g. '-name' means sort by name in descending order, '+name' means sort by name in ascending order"),
    }),
}); 