import { HumanMessage } from "@langchain/core/messages";

/**
 * Local Evaluation Service
 * Provides evaluation functionality without LangSmith dependency
 */
export class LocalEvaluationService {
    constructor() {
        this.isInitialized = false;
        this.serviceName = "LocalEvaluationService";
    }

    /**
     * Initialize the local evaluation service
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log("✅ LocalEvaluationService initialized");
        this.isInitialized = true;
    }

    /**
     * Create a target function for workflow evaluation
     * @param {Object} workflow - LangGraph workflow to evaluate
     * @returns {Function} Target function for evaluation
     */
    createWorkflowTargetFunction(workflow) {
        return async (input) => {
            try {
                const result = await workflow.invoke({
                    messages: [new HumanMessage(input.inputs.question)]
                });
                
                // Extract the last AI message as the response
                const messages = result.messages || [];
                const lastAiMessage = messages
                    .filter(msg => msg._getType() === 'ai')
                    .pop();
                
                return {
                    outputs: {
                        response: lastAiMessage?.content || "No response generated"
                    }
                };
            } catch (error) {
                return {
                    outputs: {
                        response: `Error: ${error.message}`,
                        error: true
                    }
                };
            }
        };
    }

    /**
     * Create custom evaluators for local evaluation
     * @returns {Array} Array of evaluator objects
     */
    createCustomEvaluators() {
        return [
            {
                name: "response_length",
                criteria: "response_length",
                description: "Evaluates if the response has appropriate length"
            },
            {
                name: "relevance",
                criteria: "relevance",
                description: "Evaluates if the response is relevant to the question"
            },
            {
                name: "helpfulness",
                criteria: "helpfulness", 
                description: "Evaluates if the response is helpful"
            }
        ];
    }

    /**
     * Run a quick evaluation with sample data
     * @param {Object} workflow - Workflow to evaluate
     * @returns {Object} Evaluation results
     */
    async runQuickEvaluation(workflow) {
        console.log("📝 Running local evaluation (LangSmith not available)");
        return this.runLocalEvaluation(workflow);
    }

    /**
     * Run local evaluation without LangSmith
     * @param {Object} workflow - Workflow to evaluate
     * @returns {Object} Local evaluation results
     */
    async runLocalEvaluation(workflow) {
        console.log("🔍 Running local evaluation...");
        
        const testCases = [
            "What is 2 + 2?",
            "Hello, how are you?",
            "Can you help me with authentication?",
            "What tools do you have available?"
        ];

        const results = [];

        for (const testCase of testCases) {
            try {
                const startTime = Date.now();
                const result = await workflow.invoke({
                    messages: [new HumanMessage(testCase)]
                });
                const endTime = Date.now();

                const messages = result.messages || [];
                const lastAiMessage = messages
                    .filter(msg => msg._getType() === 'ai')
                    .pop();

                results.push({
                    input: testCase,
                    output: lastAiMessage?.content || "No response",
                    responseTime: endTime - startTime,
                    success: !lastAiMessage?.content?.includes("Error"),
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                results.push({
                    input: testCase,
                    output: `Error: ${error.message}`,
                    responseTime: 0,
                    success: false,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Calculate metrics
        const successRate = results.filter(r => r.success).length / results.length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

        console.log(`📊 Local Evaluation Results:`);
        console.log(`   Success Rate: ${(successRate * 100).toFixed(1)}%`);
        console.log(`   Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
        console.log(`   Total Tests: ${results.length}`);

        return {
            success: true,
            results: results,
            metrics: {
                successRate,
                avgResponseTime,
                totalTests: results.length
            }
        };
    }

    /**
     * Create custom test dataset
     * @param {string} name - Dataset name
     * @param {Array} examples - Array of example objects
     * @returns {Object} Dataset creation result
     */
    async createTestDataset(name, examples) {
        console.log(`📋 Creating local test dataset: ${name}`);
        console.log(`✅ Added ${examples.length} examples to local dataset`);
        
        return {
            name: name,
            examples: examples,
            local: true
        };
    }

    /**
     * Get evaluation status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            langsmithAvailable: false,
            projectName: "local-evaluation",
            serviceName: this.serviceName
        };
    }
} 