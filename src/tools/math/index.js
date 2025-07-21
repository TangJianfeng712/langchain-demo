// Math calculation tools exports
export { 
    calculatorTool, 
    statisticsTool, 
    unitConverterTool 
} from './calculatorTool.js';

// Math tools array for easy import
import { 
    calculatorTool, 
    statisticsTool, 
    unitConverterTool 
} from './calculatorTool.js';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export const mathTools = [
    calculatorTool,
    statisticsTool,
    unitConverterTool
];

// Math tools for Node.js environments
export const mathToolsNode = new ToolNode(mathTools);

export const mathModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
}).bindTools(mathTools); 