// Search tools exports
export { webSearchTool, quickSearchTool } from './tavilySearchTool.js';

// Search tools array for easy import
import { webSearchTool, quickSearchTool } from './tavilySearchTool.js';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export const searchTools = [
    webSearchTool,
    quickSearchTool
];

// Search tools for Node.js environments
export const searchToolsNode = new ToolNode(searchTools);

export const searchModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
}).bindTools(searchTools); 