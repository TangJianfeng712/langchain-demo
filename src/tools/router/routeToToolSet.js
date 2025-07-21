import { HumanMessage } from "@langchain/core/messages";
import { routerModel } from './routerModel.js';

// AI-based router to determine which tool set to use
export async function routeToToolSet(state, toolArray) {
    const lastMessage = state.messages[state.messages.length - 1];
    const userInput = lastMessage.content;

    // analyze conversation context and auth status
    const conversationContext = state.messages.slice(-5).map(msg => {
        if (msg.tool_calls?.length) {
            const toolNames = msg.tool_calls.map(call => call.name).join(', ');
            return `Tool used: ${toolNames}`;
        }
        return `User: ${msg.content}`;
    }).join('\n');

    // dynamically analyze tool usage for each tool category
    const toolUsageAnalysis = {};
    for (const toolSet of toolArray) {
        const hasRecentUsage = state.messages.some(msg =>
            msg.tool_calls?.some(call =>
                toolSet.tools.some(tool => tool.name === call.name)
            )
        );
        toolUsageAnalysis[toolSet.name] = hasRecentUsage;
    }

    // create dynamic tool set descriptions
    const toolSetDescriptions = toolArray.map((toolSet, index) => 
        `${index + 1}. ${toolSet.name}: ${toolSet.description}`
    ).join('\n');

    // create dynamic system status
    const systemStatus = Object.entries(toolUsageAnalysis)
        .map(([name, hasUsage]) => `- Recent ${name.toLowerCase()} operations: ${hasUsage ? 'Yes' : 'No'}`)
        .join('\n');

    // create enhanced routing prompt with context
    const routingPrompt = `You are an intelligent router that determines which tool set to use based on user input and conversation context.

Available tool sets:
${toolSetDescriptions}

Recent conversation context:
${conversationContext}

Current user input: "${userInput}"

System status:
${systemStatus}

Analyze the user's request and determine which tool set is most appropriate for the current step. Consider:
- The specific action requested
- Whether authentication is needed first
- Whether data retrieval is the primary goal
- The conversation flow and previous tool usage
- Natural progression of operations

Simply respond with the exact tool set name (e.g., "${toolArray[0]?.name || 'TOOL_NAME'}") based on what makes sense for the current step.`;

    const response = await routerModel.invoke([new HumanMessage(routingPrompt)]);
    const decision = response.content.trim().toUpperCase();

    // Remove debug output to keep console clean
    // console.log(`🔍 AI Router Analysis:`);
    // console.log(`📝 User Input: "${userInput}"`);
    // console.log(`🎯 Decision: ${decision}`);
    // console.log(`📋 Context: ${conversationContext.split('\n').length} recent messages`);

    return { messages: [response], toolSet: decision };
} 