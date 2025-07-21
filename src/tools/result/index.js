// result tools index file
export { concludeTool } from './concludeTool.js';
export { submitRatingTool, feedbackTool, collectUserRatingTool } from './feedbackTool.js';
export * from './authData.js';

// export result tools array
import { concludeTool } from './concludeTool.js';
import { submitRatingTool, feedbackTool, collectUserRatingTool } from './feedbackTool.js';
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export const resultTools = [
    concludeTool,
    submitRatingTool,
    feedbackTool,
    collectUserRatingTool
];

export const resultToolsNode = new ToolNode(resultTools, {
    name: "result_tools_node",
    tags: ["conclusion", "feedback", "rating", "evaluation", "user_input", "quality_assessment", "summarization"],
    handleToolErrors: true
});

export const resultModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
}).bindTools(resultTools); 