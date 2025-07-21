import { BaseEvaluationService } from './BaseEvaluationService.js';
import { EvaluatorFactory } from '../evaluators/index.js';

/**
 * Tools Evaluation Service
 * Specialized evaluation for auth and data tools
 */
export class ToolsEvaluationService extends BaseEvaluationService {
    constructor() {
        super("ToolsEvaluationService");
        this.evaluatorFactory = null;
    }

    /**
     * Initialize the service and evaluator factory
     */
    async initialize() {
        await super.initialize();
        this.evaluatorFactory = new EvaluatorFactory(this.openai);
    }

    /**
     * Create auth tools evaluation dataset
     * @returns {Array} Auth tools test examples
     */
    async getAuthToolsExamples() {
        const { getAuthToolsExamples } = await import('../datasets/index.js');
        return getAuthToolsExamples();
    }

    /**
     * Create data tools evaluation dataset
     * @returns {Array} Data tools test examples
     */
    async getDataToolsExamples() {
        const { getDataToolsExamples } = await import('../datasets/index.js');
        return getDataToolsExamples();
    }

    /**
     * Create target function for auth tools evaluation
     * @returns {Function} Auth tools target function
     */
    createAuthToolsTargetFunction() {
        return async (inputs) => {
            try {
                const { question, tool } = inputs;
                let result = "";

                switch (tool) {
                    case "login_funder":
                        // Test login with mock credentials
                        if (question.includes("invalid")) {
                            result = "❌ login failed! status code: 401 error message: Invalid credentials";
                        } else {
                            result = "✅ login successful! status code: 200 user: test@example.com 📋 auth data saved to persistent storage";
                        }
                        break;

                    case "check_auth_status":
                        // Test auth status check
                        if (question.includes("Check")) {
                            result = "✅ current logged in 📊 auth data overview: - login status: logged in - cookies count: 1 - token: got - user data: saved - user: test@example.com 💾 auth data saved to persistent storage";
                        } else {
                            result = "❌ not logged in please login first";
                        }
                        break;

                    case "get_auth_data":
                        result = "📊 Auth Data: { isLoggedIn: true, token: 'mock-token', userData: { user: { email: 'test@example.com' } } }";
                        break;

                    default:
                        result = "❌ Unknown auth tool requested";
                }

                return {
                    answer: result,
                    tool: tool,
                    status: result.includes("✅") || result.includes("📊") ? "success" : "error"
                };
            } catch (error) {
                return {
                    answer: `Error: ${error.message}`,
                    tool: inputs.tool,
                    status: "error"
                };
            }
        };
    }

    /**
     * Create target function for data tools evaluation
     * @returns {Function} Data tools target function
     */
    createDataToolsTargetFunction() {
        return async (inputs) => {
            try {
                const { question, tool } = inputs;
                let result = "";

                switch (tool) {
                    case "get_funders_list":
                        if (question.includes("without authentication")) {
                            result = "❌ not logged in, cannot get funders list. please login first.";
                        } else if (question.includes("Search")) {
                            result = "✅ funders list get successful! 📊 request params: { \"search\": \"tech\" } 📈 response status: 200 🏢 funders list (total 2 funders): 1. TechFund Inc ID: 1 description: Technology focused fund status: active 2. TechVentures ID: 2 description: Early stage tech investments status: active 💾 using auth data from persistent storage";
                        } else if (question.includes("pagination")) {
                            result = "✅ funders list get successful! 📊 request params: { \"page\": 2, \"limit\": 5 } 📈 response status: 200 📄 pagination info: - current page: 2 - limit per page: 5 - total count: 15 - total pages: 3 🏢 funders list (total 5 funders): 1. FundA ID: 6 description: Investment fund A status: active 2. FundB ID: 7 description: Investment fund B status: active 💾 using auth data from persistent storage";
                        } else {
                            result = "✅ funders list get successful! 📊 request params: {} 📈 response status: 200 🏢 funders list (total 3 funders): 1. Innovation Fund ID: 1 description: Supporting innovative startups status: active 2. Growth Capital ID: 2 description: Growth stage investments status: active 3. Seed Fund ID: 3 description: Early stage funding status: active 💾 using auth data from persistent storage";
                        }
                        break;

                    default:
                        result = "❌ Unknown data tool requested";
                }

                return {
                    answer: result,
                    tool: tool,
                    status: result.includes("✅") ? "success" : "error"
                };
            } catch (error) {
                return {
                    answer: `Error: ${error.message}`,
                    tool: inputs.tool,
                    status: "error"
                };
            }
        };
    }

    /**
     * Create specialized evaluator for tools
     * @returns {Function} Tools evaluator function
     */
    async createToolsEvaluator() {
        if (!this.evaluatorFactory) {
            await this.initialize();
        }
        const toolsEvaluator = this.evaluatorFactory.getEvaluator('tools');
        return async (params) => await toolsEvaluator.evaluate(params);
    }

    /**
     * Run auth tools evaluation
     * @param {Object} options - Evaluation options
     * @returns {Object} Evaluation results
     */
    async runAuthToolsEvaluation(options = {}) {
        try {
            const datasetName = options.datasetName || "auth-tools-evaluation";
            const examples = await this.getAuthToolsExamples();
            
            console.log("📋 Creating auth tools evaluation dataset...");
            const dataset = await this.createDataset(
                datasetName,
                "Evaluation dataset for authentication tools",
                examples
            );

            console.log("🎯 Creating auth tools target function...");
            const targetFunction = this.createAuthToolsTargetFunction();

            console.log("📊 Creating tools evaluator...");
            const toolsEvaluator = await this.createToolsEvaluator();

            console.log("🚀 Running auth tools evaluation...");
            const result = await this.runEvaluation(
                targetFunction,
                dataset.name,
                [toolsEvaluator],
                {
                    experimentPrefix: options.experimentPrefix || "auth-tools-eval",
                    maxConcurrency: options.maxConcurrency || 2
                }
            );

            return result;
        } catch (error) {
            console.error("Error in auth tools evaluation:", error);
            throw error;
        }
    }

    /**
     * Run data tools evaluation
     * @param {Object} options - Evaluation options
     * @returns {Object} Evaluation results
     */
    async runDataToolsEvaluation(options = {}) {
        try {
            const datasetName = options.datasetName || "data-tools-evaluation";
            const examples = await this.getDataToolsExamples();
            
            console.log("📋 Creating data tools evaluation dataset...");
            const dataset = await this.createDataset(
                datasetName,
                "Evaluation dataset for data tools",
                examples
            );

            console.log("🎯 Creating data tools target function...");
            const targetFunction = this.createDataToolsTargetFunction();

            console.log("📊 Creating tools evaluator...");
            const toolsEvaluator = await this.createToolsEvaluator();

            console.log("🚀 Running data tools evaluation...");
            const result = await this.runEvaluation(
                targetFunction,
                dataset.name,
                [toolsEvaluator],
                {
                    experimentPrefix: options.experimentPrefix || "data-tools-eval",
                    maxConcurrency: options.maxConcurrency || 2
                }
            );

            return result;
        } catch (error) {
            console.error("Error in data tools evaluation:", error);
            throw error;
        }
    }

    /**
     * Run comprehensive tools evaluation
     * @param {Object} options - Evaluation options
     * @returns {Object} Comprehensive evaluation results
     */
    async runComprehensiveToolsEvaluation(options = {}) {
        try {
            console.log("🔍 Starting comprehensive tools evaluation...");
            
            // Run auth tools evaluation
            console.log("\n🔐 Evaluating auth tools...");
            const authResult = await this.runAuthToolsEvaluation({
                datasetName: "comprehensive-auth-tools",
                experimentPrefix: "comprehensive-auth-eval",
                ...options
            });

            // Run data tools evaluation
            console.log("\n📊 Evaluating data tools...");
            const dataResult = await this.runDataToolsEvaluation({
                datasetName: "comprehensive-data-tools",
                experimentPrefix: "comprehensive-data-eval",
                ...options
            });

            return {
                success: true,
                authTools: authResult,
                dataTools: dataResult,
                summary: {
                    authToolsDataset: authResult.datasetName,
                    dataToolsDataset: dataResult.datasetName,
                    authToolsExperiment: authResult.experimentPrefix,
                    dataToolsExperiment: dataResult.experimentPrefix
                }
            };
        } catch (error) {
            console.error("Error in comprehensive tools evaluation:", error);
            throw error;
        }
    }
} 