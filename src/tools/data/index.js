// data tools index file
export { getFundersTool } from './getFundersTool.js';
export { interactiveFundersTool } from './interactiveFundersTool.js';

// export data tools array
import { getFundersTool } from './getFundersTool.js';
import { interactiveFundersTool } from './interactiveFundersTool.js';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export const dataTools = [
    getFundersTool,
    interactiveFundersTool
];

export const dataToolsNode = new ToolNode(dataTools);

export const dataModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
}).bindTools(dataTools);