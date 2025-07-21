// auth tools index file
export { loginTool } from './loginTool.js';
export { checkAuthTool } from './checkAuthTool.js';
export { getAuthDataTool } from './getAuthDataTool.js';
export { authenticatedRequestTool } from './authenticatedRequestTool.js';

// export auth tools array
import { loginTool } from './loginTool.js';
import { checkAuthTool } from './checkAuthTool.js';
import { getAuthDataTool } from './getAuthDataTool.js';
import { authenticatedRequestTool } from './authenticatedRequestTool.js';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export const authTools = [
    loginTool,
    checkAuthTool,
    getAuthDataTool,
    authenticatedRequestTool
];

export const authToolsNode = new ToolNode(authTools, {
    name: "auth_tools_node",
    tags: ["authentication", "auth", "login", "security", "user_management"],
    handleToolErrors: true
});

export const authModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
}).bindTools(authTools);