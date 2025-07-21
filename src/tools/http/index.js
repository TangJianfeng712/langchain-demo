// HTTP request tools exports
export { 
    httpGetTool, 
    httpPostTool, 
    urlAnalyzerTool, 
    pingTool 
} from './httpRequestTool.js';

// HTTP tools array for easy import
import { 
    httpGetTool, 
    httpPostTool, 
    urlAnalyzerTool, 
    pingTool 
} from './httpRequestTool.js';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export const httpTools = [
    httpGetTool,
    httpPostTool,
    urlAnalyzerTool,
    pingTool
];

// HTTP tools for Node.js environments
export const httpToolsNode = new ToolNode(httpTools);

export const httpModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
}).bindTools(httpTools); 