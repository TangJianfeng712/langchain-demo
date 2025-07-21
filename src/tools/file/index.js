// File operation tools exports
export { 
    readFileTool, 
    writeFileTool, 
    listDirectoryTool, 
    deleteFileTool 
} from './fileOperationTool.js';

// File tools array for easy import
import { 
    readFileTool, 
    writeFileTool, 
    listDirectoryTool, 
    deleteFileTool 
} from './fileOperationTool.js';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export const fileTools = [
    readFileTool,
    writeFileTool,
    listDirectoryTool,
    deleteFileTool
];

// File tools for Node.js environments
export const fileToolsNode = new ToolNode(fileTools);

export const fileModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
}).bindTools(fileTools); 