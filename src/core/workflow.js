import { StateGraph, MessagesAnnotation, Annotation } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// Define enhanced state annotation that includes additional context fields
const EnhancedStateAnnotation = Annotation.Root({
    ...MessagesAnnotation.spec,  // Include all message fields
    hasHistoryContext: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => false
    }),
    threadId: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null
    }),
    getChatHistory: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => false
    }),
    conclusionGenerated: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => false
    }),
    feedbackRequested: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => false
    }),
    feedbackSubmitted: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => false
    }),
    feedbackContext: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null
    }),
    feedbackResult: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null
    }),
    latestQuestion: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => ""
    }),
    currentUserQuestion: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => ""
    }),
    toolOutputs: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => []
    }),
    config: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null
    })
});
import { authToolsNode } from '../tools/auth/index.js';
import { dataToolsNode } from '../tools/data/index.js';
import { searchToolsNode } from '../tools/search/index.js';
import { fileToolsNode } from '../tools/file/index.js';
import { textToolsNode } from '../tools/text/index.js';
import { mathToolsNode } from '../tools/math/index.js';
import { httpToolsNode } from '../tools/http/index.js';
import { ToolAgent } from './toolAgent.js';
import { MainAgent } from './mainAgent.js';
import { feedbackService } from './feedbackService.js';

// Initialize agent instances
const toolAgent = new ToolAgent();
const mainAgent = new MainAgent();

/**
 * Main Agent node - delegates to MainAgent class
 */
async function mainAgentNode(state) {
    const result = await mainAgent.processInput(state);
    
    // Preserve important state fields that should flow through the workflow
    return {
        ...result,
        hasHistoryContext: state.hasHistoryContext,
        threadId: state.threadId,
        getChatHistory: state.getChatHistory,
        currentUserQuestion: state.currentUserQuestion,
        config: state.config
    };
}

/**
 * Router Agent handles all tool routing decisions
 * This function delegates to ToolAgent for tool selection
 */
function whichToolsNode(state) {
    // Let ToolAgent handle all routing decisions
    return toolAgent.determineToolNode(state);
}

/**
 * Result Node - handles conclusion and feedback collection
 * This node summarizes results and collects user feedback
 */
async function resultNode(state) {
    try {
        // Initialize feedback service if not already done
        if (!feedbackService.isInitialized) {
            await feedbackService.initialize();
        }

        const messages = state.messages || [];
        const lastMessage = messages[messages.length - 1];
        
        // Check if this is a feedback response from user  
        if (lastMessage && lastMessage._getType() === 'human' && state.feedbackRequested) {
            return await processFeedbackResponse(state, lastMessage);
        }

        // Step 1: If no conclusion generated yet, generate it first
        if (!state.conclusionGenerated) {
            // console.log("📋 Generating conclusion for completed tasks...");
            return await generateConclusion(state);
        }

        // Step 2: If conclusion generated but feedback not yet requested, wait for user input
        // The conclusion already includes rating instructions, so just wait
        if (state.conclusionGenerated && state.feedbackRequested) {
            // console.log("📝 Waiting for user feedback...");
            // Just maintain the current state, waiting for user input
            return {
                feedbackRequested: true,
                feedbackContext: state.feedbackContext || {
                    context: "awaiting_user_rating",
                    timestamp: new Date().toISOString()
                }
            };
        }

        // Fallback: generate feedback prompt if needed
        return await generateFeedbackPrompt(state);

    } catch (error) {
        console.error("Error in result node:", error);
        return {
            messages: [new AIMessage("❌ Error processing results. Please try rephrasing your request or let me know how I can help you better.")],
            feedbackRequested: false
        };
    }
}

/**
 * Generate conclusion using the conclude tool
 */
async function generateConclusion(state) {
    try {
        const messages = state.messages || [];
        
        // Log the message context for debugging
        console.log(`📋 Generating conclusion with ${messages.length} messages`);
        console.log(`📊 State context: hasHistoryContext=${state.hasHistoryContext}, threadId=${state.threadId}, getChatHistory=${state.getChatHistory}`);
        
        // Extract the current user question - prioritize the explicitly marked current question
        const currentQuestion = state.currentUserQuestion || "User request";
        
        // Also get the latest user message for fallback
        const userMessages = messages.filter(msg => msg._getType() === 'human');
        const latestUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : "User request";
        
        // Use current question if available, otherwise fall back to latest message
        const latestQuestion = currentQuestion !== "User request" ? currentQuestion : latestUserMessage;
        
        // If we have history context, show that we're working with previous context
        if (state.hasHistoryContext && userMessages.length > 1) {
            console.log(`📚 Using conversation history with ${userMessages.length} user messages`);
            console.log(`🧵 Thread context: ${state.threadId}`);
        } else {
            console.log(`🆕 Starting fresh conversation (no history context)`);
        }
        
        // Extract meaningful AI messages (filter out empty or summary messages)
        const aiMessages = messages.filter(msg => {
            if (msg._getType() !== 'ai') return false;
            const content = msg.content || "";
            return content.length > 20 && 
                   !content.includes("📋 **Summary & Results**") &&
                   !content.includes("📋 **Final Results Summary**") &&
                   !content.includes("Rate this response"); // Also filter out previous rating requests
        });
        
        // Create meaningful tool outputs
        const toolOutputs = aiMessages.map((msg, index) => {
            let toolName = "Unknown Action";
            const content = msg.content || "";
            
            if (content.includes("login successful")) {
                toolName = "Authentication";
            } else if (content.includes("funders list get successful")) {
                toolName = "Data Retrieval";
            } else if (content.includes("✅")) {
                toolName = `Task ${index + 1}`;
            }
            
            return {
                toolName: toolName,
                result: content
            };
        });

        // Prepare conversation context with all relevant messages
        const conversationContext = messages
            .map(msg => `${msg._getType()}: ${msg.content}`)
            .join('\n');

        // Use conclude tool to generate clean summary
        const { concludeTool } = await import('../tools/result/concludeTool.js');
        
        // Enhanced conclusion generation with context awareness
        const conclusion = await concludeTool.invoke({
            userQuestion: latestQuestion,
            toolOutputs: toolOutputs,
            conversationContext: conversationContext,
            // Pass additional context information
            hasHistoryContext: state.hasHistoryContext,
            totalMessages: messages.length,
            userMessageCount: userMessages.length,
            threadId: state.threadId
        });

        // console.log(`📋 Clean conclusion generated for: "${latestQuestion.substring(0, 50)}..."`);

        return {
            messages: [new AIMessage(conclusion)],
            conclusionGenerated: true,
            feedbackRequested: true, // Set to true to wait for user feedback
            latestQuestion: latestQuestion,
            toolOutputs: toolOutputs,
            feedbackContext: {
                aiResponse: conclusion,
                context: "conclusion_feedback", 
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error("Error generating conclusion:", error);
        return {
            messages: [new AIMessage("❌ Error generating conclusion. Let me know if you need help with anything else.")],
            conclusionGenerated: true
        };
    }
}

/**
 * Generate feedback prompt for user rating
 * Note: The conclusion already includes rating instructions, so this is minimal
 */
async function generateFeedbackPrompt(state) {
    const messages = state.messages || [];
    const lastAiMessage = messages
        .filter(msg => msg._getType() === 'ai')
        .pop();

    // If the last message already includes rating instructions, don't repeat them
    if (lastAiMessage?.content?.includes("Rate this response")) {
        console.log(`📝 Feedback already requested in conclusion, waiting for user response`);
        return {
            feedbackRequested: true,
            feedbackContext: {
                aiResponse: lastAiMessage?.content || "",
                context: "conclusion_feedback",
                timestamp: new Date().toISOString()
            }
        };
    }

    // Fallback: Simple feedback request
    const feedbackPrompt = `**Rate this interaction (1-5 stars):**
Examples: "5", "4 stars", "3 - could be better"`;

    console.log(`📝 Simple feedback prompt generated`);

    return {
        messages: [new AIMessage(feedbackPrompt)],
        feedbackRequested: true,
        feedbackContext: {
            aiResponse: lastAiMessage?.content || "",
            context: "simple_feedback",
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Process user feedback response and submit to LangSmith
 */
async function processFeedbackResponse(state, userMessage) {
    try {
        const userInput = userMessage.content;
        console.log(`📨 Processing user feedback: "${userInput}"`);

        // Try to get the current run ID from various sources
        let runId = null;
        try {
            runId = feedbackService.getCurrentRunId();
        } catch (error) {
            console.log("Could not get run ID from feedback service:", error.message);
        }

        // If no run ID from feedback service, try to get from state config
        if (!runId && state.config?.metadata?.session_id) {
            runId = state.config.metadata.session_id;
            console.log(`📋 Using session ID as run ID: ${runId}`);
        }

        // Use feedback service to process the rating
        const result = await feedbackService.processUserFeedback(
            userInput,
            state.feedbackContext?.aiResponse || "",
            runId
        );

        if (result.success) {
            console.log(`✅ User feedback processed: ${result.starRating}/5 stars`);
            if (result.submitted) {
                console.log(`📊 Feedback submitted to LangSmith with run ID: ${runId}`);
            } else {
                console.log(`📝 Feedback stored locally: ${result.feedback?.localId || 'unknown'}`);
            }

            return {
                messages: [new AIMessage(result.message)],
                feedbackRequested: false,
                feedbackSubmitted: true,
                feedbackResult: result
            };
        } else {
            // If parsing failed, ask for clarification but stay in result node
            return {
                messages: [new AIMessage(`Please provide a rating from 1-5 stars.
Examples: "5", "4 stars", "3 - needs improvement"`)],
                feedbackRequested: true,
                feedbackContext: state.feedbackContext
            };
        }

    } catch (error) {
        console.error("Error processing feedback:", error);
        return {
            messages: [new AIMessage(`❌ Error processing your feedback: ${error.message}

Please try again or continue with your tasks.`)],
            feedbackRequested: false
        };
    }
}

/**
 * Create and configure the workflow
 */
export function createWorkflow() {
    const workflow = new StateGraph(EnhancedStateAnnotation)
        // Add main agent node
        .addNode("mainAgent", mainAgentNode)
        .addEdge("__start__", "mainAgent")

        // Add router agent node - handles all routing and tool execution
        .addNode("toolAgent", async (state) => {
            return await toolAgent.processRoutingRequest(state);
        })

        // Add result node for conclusion and feedback
        .addNode("resultNode", resultNode)

        // Add tool nodes for each category
        .addNode("authTools", authToolsNode)
        .addNode("dataTools", dataToolsNode)
        .addNode("searchTools", searchToolsNode)
        .addNode("fileTools", fileToolsNode)
        .addNode("textTools", textToolsNode)
        .addNode("mathTools", mathToolsNode)
        .addNode("httpTools", httpToolsNode)

        // Add edges from main agent to router agent
        .addEdge("mainAgent", "toolAgent")

        // Add edges from tool nodes back to main agent
        .addEdge("authTools", "mainAgent")
        .addEdge("dataTools", "mainAgent")
        .addEdge("searchTools", "mainAgent")
        .addEdge("fileTools", "mainAgent")
        .addEdge("textTools", "mainAgent")
        .addEdge("mathTools", "mainAgent")
        .addEdge("httpTools", "mainAgent")

        // Add conditional edges from router agent
        .addConditionalEdges(
            "toolAgent", 
            (state) => {
                const toolNode = whichToolsNode(state);
                
                // ToolAgent now routes to resultNode when no specific tool is matched
                return toolNode;
            },
            // Explicitly specify all possible destinations
            {
                "authTools": "authTools",
                "dataTools": "dataTools", 
                "searchTools": "searchTools",
                "fileTools": "fileTools",
                "textTools": "textTools",
                "mathTools": "mathTools",
                "httpTools": "httpTools",
                "resultNode": "resultNode"
            }
        )

        // Add conditional edges from result node
        .addConditionalEdges(
            "resultNode",
            (state) => {
                console.log("📊 ResultNode state check:", {
                    feedbackSubmitted: state.feedbackSubmitted,
                    feedbackRequested: state.feedbackRequested,
                    conclusionGenerated: state.conclusionGenerated,
                    messageCount: state.messages?.length || 0
                });
                
                // If feedback was submitted, end the workflow
                if (state.feedbackSubmitted) {
                    console.log("🏁 Feedback submitted, ending workflow");
                    return "__end__";
                }
                
                // If feedback is requested and conclusion generated, decide based on context
                if (state.feedbackRequested && state.conclusionGenerated) {
                    // Check if this is an interactive context (CLI has threadManager context)
                    // For now, we'll detect based on whether we have user feedback context
                    const isInteractiveMode = state.config?.metadata?.isInteractive || false;
                    
                    if (isInteractiveMode) {
                        console.log("📝 Waiting for feedback, staying in result node (interactive mode)");
                        return "resultNode";
                    } else {
                        console.log("📝 Feedback requested after conclusion - ending workflow (non-interactive mode)");
                        return "__end__";
                    }
                }
                
                // If conclusion was just generated but no feedback requested yet, stay in result node
                if (state.conclusionGenerated && !state.feedbackRequested) {
                    console.log("📋 Conclusion generated, staying in result node");
                    return "resultNode";
                }
                
                // If feedback is still requested but no conclusion, stay in result node (loop back)
                if (state.feedbackRequested && !state.conclusionGenerated) {
                    console.log("📝 Feedback requested, staying in result node");
                    return "resultNode";
                }
                
                // Otherwise, end
                console.log("🏁 No more processing needed, ending workflow");
                return "__end__";
            },
            {
                "__end__": "__end__",
                "resultNode": "resultNode"
            }
        );

    return workflow.compile();
} 