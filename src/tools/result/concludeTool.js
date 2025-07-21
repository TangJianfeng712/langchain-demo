import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";

/**
 * Intelligent Conclude tool that analyzes conversation context and generates comprehensive summaries
 * This tool uses AI to understand the conversation flow and provide relevant conclusions
 */
export const concludeTool = tool(async (input) => {
    try {
        const { userQuestion, toolOutputs, conversationContext, hasHistoryContext, totalMessages, userMessageCount, threadId } = input;

        // Initialize AI model for intelligent analysis
        const model = new ChatOpenAI({
            model: "gpt-4o-mini",
            temperature: 0.1,
        });

        // Prepare the analysis prompt
        const analysisPrompt = `You are an intelligent assistant that analyzes conversation context and generates comprehensive summaries.

**Current User Question:** ${userQuestion}

**Conversation Context:**
${conversationContext || "No conversation context available"}

**Tool Outputs:**
${toolOutputs ? toolOutputs.map(output => `- ${output.toolName}: ${output.result}`).join('\n') : "No tool outputs available"}

**Context Information:**
- Has History Context: ${hasHistoryContext || false}
- Total Messages: ${totalMessages || 0}
- User Message Count: ${userMessageCount || 0}
- Thread ID: ${threadId || "N/A"}

**Instructions:**
1. Analyze the conversation context and tool outputs
2. Identify the main task or request
3. Extract key information and results
4. Provide a comprehensive summary that directly addresses the user's question
5. Organize the information in a clear, structured format
6. Focus on the most relevant and actionable information
7. If there are search results, business information, or data, present them clearly
8. Keep the summary concise but informative

**Format your response as:**
## Task Summary

**Current Request:** [Brief restatement of the user's question]

**Key Findings:** [Main results and information discovered]

**Details:** [Detailed information organized in a clear structure]

**Rate this response (1-5 stars):**
Type "5" for excellent, "4" for good, "3" for average, etc.
Example: "5 stars - very helpful!"

Please provide a comprehensive, well-structured summary that directly answers the user's question.`;

        // Generate intelligent summary using AI
        const response = await model.invoke([{ role: "user", content: analysisPrompt }]);
        
        return response.content;

    } catch (error) {
        console.error("Conclude tool error:", error);
        
        // Fallback to simple summary if AI analysis fails
        let fallbackConclusion = `## Task Completed\n\n`;
        
        if (input.userQuestion) {
            fallbackConclusion += `**Current Request:** ${input.userQuestion}\n\n`;
        }
        
        if (input.toolOutputs && input.toolOutputs.length > 0) {
            fallbackConclusion += `**Results:**\n`;
            input.toolOutputs.forEach((output, index) => {
                fallbackConclusion += `${index + 1}. ${output.toolName}: ${output.result.substring(0, 200)}...\n\n`;
            });
        }
        
        fallbackConclusion += `**Rate this response (1-5 stars):**\n`;
        fallbackConclusion += `Type "5" for excellent, "4" for good, "3" for average, etc.\n`;
        fallbackConclusion += `Example: "5 stars - very helpful!"`;
        
        return fallbackConclusion;
    }
}, {
    name: "conclude_results",
    description: "Intelligently analyze conversation context and tool outputs to generate comprehensive summaries that directly address user questions.",
    schema: z.object({
        userQuestion: z.string().describe("The current user question or request"),
        toolOutputs: z.array(z.object({
            toolName: z.string().describe("Name of the tool that was executed"),
            result: z.string().describe("Output/result from the tool execution")
        })).optional().describe("Array of tool execution results"),
        conversationContext: z.string().optional().describe("Recent conversation context and messages"),
        hasHistoryContext: z.boolean().optional().describe("Whether this conversation has historical context"),
        totalMessages: z.number().optional().describe("Total number of messages in the conversation"),
        userMessageCount: z.number().optional().describe("Number of user messages in the conversation"),
        threadId: z.string().nullable().optional().describe("Thread ID for the conversation")
    }),
}); 