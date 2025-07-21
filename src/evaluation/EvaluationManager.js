import { WorkflowEvaluationService } from './services/WorkflowEvaluationService.js';
import { ToolsEvaluationService } from './services/ToolsEvaluationService.js';
import { LocalEvaluationService } from './services/LocalEvaluationService.js';

/**
 * Evaluation Manager
 * Centralized management for all evaluation services
 */
export class EvaluationManager {
    constructor() {
        this.workflowEvaluationService = new WorkflowEvaluationService();
        this.toolsEvaluationService = new ToolsEvaluationService();
        this.localEvaluationService = new LocalEvaluationService();
        this.isInitialized = false;
    }

    /**
     * Initialize all evaluation services
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize local evaluation service first (always available)
            await this.localEvaluationService.initialize();

            // Try to initialize LangSmith-based services
            try {
                await this.workflowEvaluationService.initialize();
                console.log("✅ LangSmith-based evaluation services initialized");
            } catch (error) {
                console.warn("⚠️  LangSmith evaluation services initialization failed:", error.message);
            }

            try {
                await this.toolsEvaluationService.initialize();
                console.log("✅ Tools evaluation service initialized");
            } catch (error) {
                console.warn("⚠️  Tools evaluation service initialization failed:", error.message);
            }

            this.isInitialized = true;
        } catch (error) {
            console.error("Failed to initialize evaluation manager:", error);
            throw error;
        }
    }

    /**
     * Run workflow evaluation
     * @param {string} evaluationType - Type of evaluation
     * @param {Object} workflow - Workflow to evaluate
     * @param {Object} options - Evaluation options
     * @returns {Object} Evaluation results
     */
    async runWorkflowEvaluation(evaluationType = "complete", workflow, options = {}) {
        if (!this.isInitialized) {
            throw new Error("Evaluation manager not initialized");
        }

        // Check if LangSmith services are available
        if (!this.workflowEvaluationService.isInitialized) {
            console.log("📝 LangSmith not available, falling back to local evaluation");
            return this.localEvaluationService.runLocalEvaluation(workflow);
        }

        console.log(`🔍 Starting workflow evaluation: ${evaluationType}`);
        
        try {
            let result;
            
            switch (evaluationType) {
                case "complete":
                    result = await this.workflowEvaluationService.runCompleteEvaluation(workflow, options);
                    break;
                case "dataset":
                    const datasetName = options.datasetName || "custom-dataset";
                    const examples = options.examples || this.workflowEvaluationService.getDefaultExamples();
                    await this.workflowEvaluationService.createDataset(datasetName, "Custom evaluation dataset", examples);
                    result = { success: true, datasetName, message: "Dataset created successfully" };
                    break;
                case "openai":
                    // Create dataset first for OpenAI evaluation
                    const openaiDatasetName = options.datasetName || "openai-eval-dataset";
                    const openaiExamples = options.examples || this.workflowEvaluationService.getDefaultExamples();
                    const dataset = await this.workflowEvaluationService.createDataset(openaiDatasetName, "OpenAI evaluation dataset", openaiExamples);
                    
                    const targetFunction = this.workflowEvaluationService.createOpenAITargetFunction();
                    const correctnessEvaluator = await this.workflowEvaluationService.createCorrectnessEvaluator();
                    result = await this.workflowEvaluationService.runEvaluation(
                        targetFunction,
                        dataset.name,
                        [correctnessEvaluator],
                        options
                    );
                    break;
                default:
                    throw new Error(`Unknown evaluation type: ${evaluationType}`);
            }

            return result;
        } catch (error) {
            console.error("Workflow evaluation failed:", error);
            throw error;
        }
    }

    /**
     * Run tools evaluation
     * @param {string} type - Type of tools evaluation
     * @param {Object} options - Evaluation options
     * @returns {Object} Evaluation results
     */
    async runToolsEvaluation(type = 'comprehensive', options = {}) {
        if (!this.isInitialized) {
            throw new Error("Evaluation manager not initialized");
        }

        if (!this.toolsEvaluationService.isInitialized) {
            throw new Error("Tools evaluation service not initialized");
        }

        console.log(`🔍 Starting tools evaluation: ${type}`);
        
        try {
            let result;
            
            switch (type) {
                case 'comprehensive':
                    result = await this.toolsEvaluationService.runComprehensiveToolsEvaluation(options);
                    break;
                case 'auth':
                    result = await this.toolsEvaluationService.runAuthToolsEvaluation(options);
                    break;
                case 'data':
                    result = await this.toolsEvaluationService.runDataToolsEvaluation(options);
                    break;
                default:
                    throw new Error(`Unknown tools evaluation type: ${type}`);
            }

            return result;
        } catch (error) {
            console.error("Tools evaluation failed:", error);
            throw error;
        }
    }

    /**
     * Run local evaluation
     * @param {string} evaluationType - Type of evaluation
     * @param {Object} workflow - Workflow to evaluate
     * @returns {Object} Evaluation results
     */
    async runLocalEvaluation(evaluationType = "quick", workflow) {
        if (!this.isInitialized) {
            throw new Error("Evaluation manager not initialized");
        }

        console.log(`🔍 Starting local evaluation: ${evaluationType}`);
        
        try {
            let result;
            
            switch (evaluationType) {
                case "quick":
                    result = await this.localEvaluationService.runQuickEvaluation(workflow);
                    break;
                case "local":
                    result = await this.localEvaluationService.runLocalEvaluation(workflow);
                    break;
                default:
                    throw new Error(`Unknown local evaluation type: ${evaluationType}`);
            }

            return result;
        } catch (error) {
            console.error("Local evaluation failed:", error);
            throw error;
        }
    }

    /**
     * Create custom test dataset
     * @param {string} name - Dataset name
     * @param {Array} examples - Array of example objects
     * @returns {Object} Dataset creation result
     */
    async createTestDataset(name, examples) {
        if (!this.isInitialized) {
            throw new Error("Evaluation manager not initialized");
        }

        // Try LangSmith first, fallback to local
        if (this.workflowEvaluationService.isInitialized) {
            return await this.workflowEvaluationService.createDataset(name, `Test dataset for ${name}`, examples);
        } else {
            return await this.localEvaluationService.createTestDataset(name, examples);
        }
    }

    /**
     * Get evaluation status for all services
     * @returns {Object} Status information for all services
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            workflowEvaluation: this.workflowEvaluationService.getStatus(),
            toolsEvaluation: this.toolsEvaluationService.getStatus(),
            localEvaluation: this.localEvaluationService.getStatus(),
            langsmithAvailable: this.workflowEvaluationService.isInitialized,
            toolsAvailable: this.toolsEvaluationService.isInitialized
        };
    }

    /**
     * Get workflow evaluation status
     * @returns {Object} Workflow evaluation status
     */
    getWorkflowEvaluationStatus() {
        return this.workflowEvaluationService.getStatus();
    }

    /**
     * Get tools evaluation status
     * @returns {Object} Tools evaluation status
     */
    getToolsEvaluationStatus() {
        return this.toolsEvaluationService.getStatus();
    }

    /**
     * Get local evaluation status
     * @returns {Object} Local evaluation status
     */
    getLocalEvaluationStatus() {
        return this.localEvaluationService.getStatus();
    }
} 