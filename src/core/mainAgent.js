import { HumanMessage } from "@langchain/core/messages";

/**
 * Main Agent - handles high-level conversation coordination
 * Acts as the primary coordinator that connects to ToolAgent
 * No tool decisions, no routing logic - just coordinates the flow
 */
export class MainAgent {
    constructor() {
        this.name = "MainAgent";
        this.description = "High-level conversation coordinator";
        this.status = "active";
    }

    /**
     * Process user input and coordinate with ToolAgent
     * @param {Object} state - Current conversation state
     * @returns {Object} - Coordinated response or error message
     */
    async processInput(state) {
        try {
            // MainAgent only coordinates flow, no tool decisions
            // Simply pass the state through for ToolAgent to handle
            return {
                messages: state.messages,
                coordinationRequest: true  // Signal that coordination is needed
            };
        } catch (error) {
            console.error('Main Agent error:', error);
            return {
                messages: [new HumanMessage("I encountered an error processing your request. Please try again.")]
            };
        }
    }

    /**
     * Handle responses from tool executions
     * @param {Object} state - Current conversation state with tool results
     * @returns {Object} - Formatted response for user
     */
    async handleToolResponse(state) {
        try {
            // MainAgent can format or enhance responses if needed
            // For now, just pass through the messages
            return {
                messages: state.messages
            };
        } catch (error) {
            console.error('Main Agent response handling error:', error);
            return {
                messages: [new HumanMessage("I encountered an error processing the response. Please try again.")]
            };
        }
    }

    /**
     * Get main agent status and capabilities
     * @returns {Object} - Main agent status information
     */
    getStatus() {
        return {
            name: this.name,
            description: this.description,
            status: this.status,
            capabilities: [
                "High-level conversation coordination",
                "Flow management",
                "Error handling",
                "Response formatting"
            ]
        };
    }

    /**
     * Get main agent capabilities for debugging
     * @returns {string} - Formatted capabilities description
     */
    getCapabilities() {
        return `${this.name} Capabilities:\n\n` +
            "🔄 Flow Coordination\n" +
            "📝 Response Handling\n" +
            "⚠️ Error Management\n" +
            "🔗 ToolAgent Integration\n\n" +
            "MainAgent focuses on coordination, not tool decisions.";
    }
} 