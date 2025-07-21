import { ChatOpenAI } from "@langchain/openai";

// create router model for intelligent tool selection
export const routerModel = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
}); 