// Text processing tools exports
export { 
    analyzeTextTool, 
    transformTextTool, 
    replaceTextTool, 
    extractInfoTool 
} from './textProcessingTool.js';

// Text tools array for easy import
import { 
    analyzeTextTool, 
    transformTextTool, 
    replaceTextTool, 
    extractInfoTool 
} from './textProcessingTool.js';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export const textTools = [
    analyzeTextTool,
    transformTextTool,
    replaceTextTool,
    extractInfoTool
];

// Text tools for Node.js environments
export const textToolsNode = new ToolNode(textTools);

export const textModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
}).bindTools(textTools); 