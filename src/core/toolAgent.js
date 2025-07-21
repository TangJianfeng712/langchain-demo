import { routeToToolSet } from '../tools/router/index.js';
import { authTools, authModel } from '../tools/auth/index.js';
import { dataTools, dataModel } from '../tools/data/index.js';
import { searchTools, searchModel } from '../tools/search/index.js';
import { fileTools, fileModel } from '../tools/file/index.js';
import { textTools, textModel } from '../tools/text/index.js';
import { mathTools, mathModel } from '../tools/math/index.js';
import { httpTools, httpModel } from '../tools/http/index.js';
// Removed resultTools import - resultNode handles conclusion and feedback
import { HumanMessage } from "@langchain/core/messages";

/**
 * Router Agent - acts as an intelligent middleware between mainAgent and tools
 * Analyzes user intent and routes to appropriate specialized tools
 */
export class ToolAgent {
    constructor() {
        this.toolSets = [
            {
                name: "AUTH_TOOLS",
                description: "For authentication, login, password management, auth status checks, user credentials",
                tools: authTools,
                model: authModel
            },
            {
                name: "DATA_TOOLS",
                description: "For data retrieval, funder information, email queries, data operations, information display",
                tools: dataTools,
                model: dataModel
            },
            {
                name: "SEARCH_TOOLS",
                description: "For web search, internet information retrieval, current news, online research",
                tools: searchTools,
                model: searchModel
            },
            {
                name: "FILE_TOOLS",
                description: "For file operations, reading/writing files, directory listing, file management",
                tools: fileTools,
                model: fileModel
            },
            {
                name: "TEXT_TOOLS",
                description: "For text processing, analysis, transformation, extraction, string manipulation",
                tools: textTools,
                model: textModel
            },
            {
                name: "MATH_TOOLS",
                description: "For mathematical calculations, statistics, unit conversions, numerical analysis",
                tools: mathTools,
                model: mathModel
            },
            {
                name: "HTTP_TOOLS",
                description: "For HTTP requests, API calls, URL analysis, network connectivity testing",
                tools: httpTools,
                model: httpModel
            },
            // Removed RESULT_TOOLS - resultNode handles conclusion and feedback
        ];
    }

    /**
     * Route user input to appropriate tool set based on intent analysis
     * @param {Object} state - Current conversation state
     * @returns {Object} - Routing decision with selected tool set and model
     */
    async routeToToolSet(state) {
        try {
            // Use AI router to determine appropriate tool set
            const routerResult = await routeToToolSet(state, this.toolSets);
            const selectedToolSet = this.toolSets.find(ts => ts.name === routerResult.toolSet);

            if (!selectedToolSet) {
                return {
                    success: false,
                    message: "Unable to determine appropriate tool set for your request",
                    suggestions: this.getAvailableCapabilities()
                };
            }

            return {
                success: true,
                toolSet: selectedToolSet,
                confidence: routerResult.confidence || 'medium'
            };
        } catch (error) {
            console.error('Router Agent error:', error);
            return {
                success: false,
                message: "Error in routing decision",
                error: error.message
            };
        }
    }

    /**
     * Process routing request and execute appropriate tool set
     * @param {Object} state - Current conversation state
     * @returns {Object} - Response from tool execution or error message
     */
    async processRoutingRequest(state) {
        try {
            // Determine appropriate tool set
            const routingResult = await this.routeToToolSet(state);

            if (!routingResult.success) {
                return {
                    messages: [new HumanMessage(routingResult.message + "\n\n" + routingResult.suggestions)]
                };
            }

            // Execute the selected tool set
            const executionResult = await this.executeToolSet(state, routingResult.toolSet);

            if (!executionResult.success) {
                return {
                    messages: [new HumanMessage(executionResult.message)]
                };
            }

            // Add routing result to state for tool node routing
            return {
                ...executionResult,
                routingResult: routingResult,
                // Preserve important state fields that should flow through the workflow
                hasHistoryContext: state.hasHistoryContext,
                threadId: state.threadId,
                getChatHistory: state.getChatHistory,
                currentUserQuestion: state.currentUserQuestion,
                config: state.config
            };
        } catch (error) {
            console.error('Router Agent processing error:', error);
            return {
                messages: [new HumanMessage("I encountered an error processing your request. Please try again.")]
            };
        }
    }

    /**
     * Execute the selected tool set with the appropriate model
     * @param {Object} state - Current conversation state
     * @param {Object} toolSet - Selected tool set
     * @returns {Object} - Response from the tool set
     */
    async executeToolSet(state, toolSet) {
        try {
            const response = await toolSet.model.invoke(state.messages);
            return {
                success: true,
                messages: [response],
                toolSet: toolSet.name
            };
        } catch (error) {
            console.error('Tool set execution error:', error);
            return {
                success: false,
                message: `Error executing ${toolSet.name}: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Get available capabilities for user guidance
     * @returns {string} - Formatted list of available capabilities
     */
    getAvailableCapabilities() {
        return "I can help with:\n\n" +
            "🔐 Authentication & Login\n" +
            "📊 Data & Information Retrieval\n" +
            "🔍 Web Search & Research\n" +
            "📁 File Operations\n" +
            "📝 Text Processing & Analysis\n" +
            "🧮 Mathematical Calculations\n" +
            "🌐 HTTP Requests & API Calls\n\n" +
            "Please rephrase your question or be more specific about what you need.";
    }

    /**
     * Determine which tool node to execute based on routing result
     * @param {Object} state - Current conversation state
     * @returns {string} - Tool node name to execute
     */
    determineToolNode(state) {
        const { messages, routingResult } = state;
        const lastMessage = messages[messages.length - 1];

        // If we have a routing result, use it to determine tool node
        if (routingResult?.toolSet) {
            const toolSetName = routingResult.toolSet.name;
            switch (toolSetName) {
                case "AUTH_TOOLS": return "authTools";
                case "DATA_TOOLS": return "dataTools";
                case "SEARCH_TOOLS": return "searchTools";
                case "FILE_TOOLS": return "fileTools";
                case "TEXT_TOOLS": return "textTools";
                case "MATH_TOOLS": return "mathTools";
                case "HTTP_TOOLS": return "httpTools";
                // Removed RESULT_TOOLS case - resultNode handles conclusion and feedback
                default: return "resultNode";
            }
        }

        // Fallback: check tool calls directly
        if (lastMessage.tool_calls?.length) {
            const toolName = lastMessage.tool_calls[0].name;

            // Check which tool category the called tool belongs to
            const toolSets = [
                { name: "authTools", tools: this.toolSets.find(ts => ts.name === "AUTH_TOOLS")?.tools || [] },
                { name: "dataTools", tools: this.toolSets.find(ts => ts.name === "DATA_TOOLS")?.tools || [] },
                { name: "searchTools", tools: this.toolSets.find(ts => ts.name === "SEARCH_TOOLS")?.tools || [] },
                { name: "fileTools", tools: this.toolSets.find(ts => ts.name === "FILE_TOOLS")?.tools || [] },
                { name: "textTools", tools: this.toolSets.find(ts => ts.name === "TEXT_TOOLS")?.tools || [] },
                { name: "mathTools", tools: this.toolSets.find(ts => ts.name === "MATH_TOOLS")?.tools || [] },
                { name: "httpTools", tools: this.toolSets.find(ts => ts.name === "HTTP_TOOLS")?.tools || [] },
                // Removed resultTools - resultNode handles conclusion and feedback
            ];

            for (const toolSet of toolSets) {
                if (toolSet.tools.some(t => t.name === toolName)) {
                    return toolSet.name;
                }
            }

            return "resultNode";
        }

        return "resultNode";
    }

    /**
     * Get router agent status and statistics
     * @returns {Object} - Router agent status information
     */
    getStatus() {
        return {
            name: "ToolAgent",
            description: "Intelligent middleware for tool routing",
            toolSets: this.toolSets.length,
            capabilities: this.toolSets.map(ts => ts.name),
            status: "active"
        };
    }
} 