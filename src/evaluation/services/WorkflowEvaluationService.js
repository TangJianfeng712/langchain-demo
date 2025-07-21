import { BaseEvaluationService } from './BaseEvaluationService.js';
import { HumanMessage } from "@langchain/core/messages";
import { EvaluatorFactory, OpenEvalsEvaluator } from '../evaluators/index.js';

/**
 * Workflow Evaluation Service
 * Evaluates LangGraph workflow performance using LangSmith
 */
export class WorkflowEvaluationService extends BaseEvaluationService {
    constructor() {
        super("WorkflowEvaluationService");
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
     * Create a target function for workflow evaluation
     * @param {Object} workflow - LangGraph workflow to evaluate
     * @returns {Function} Target function for evaluation
     */
    createWorkflowTargetFunction(workflow) {
        return async (inputs) => {
            try {
                // Convert inputs to workflow format
                const result = await workflow.invoke({
                    messages: [new HumanMessage(inputs.question)]
                });
                
                // Extract the last AI message as the response
                const messages = result.messages || [];
                const lastAiMessage = messages
                    .filter(msg => msg._getType() === 'ai')
                    .pop();
                
                return {
                    answer: lastAiMessage?.content || "No response generated"
                };
            } catch (error) {
                console.error("Error in target function:", error);
                return {
                    answer: `Error: ${error.message}`
                };
            }
        };
    }

    /**
     * Create a simple target function using OpenAI directly
     * @returns {Function} OpenAI target function
     */
    createOpenAITargetFunction() {
        return async (inputs) => {
            try {
                const response = await this.openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "Answer the following question accurately" },
                        { role: "user", content: inputs.question },
                    ],
                });
                return { 
                    answer: response.choices[0].message.content?.trim() || "" 
                };
            } catch (error) {
                console.error("Error in OpenAI target function:", error);
                return {
                    answer: `Error: ${error.message}`
                };
            }
        };
    }

    /**
     * Create a correctness evaluator using OpenEvals or fallback
     * @returns {Function} Correctness evaluator function
     */
    async createCorrectnessEvaluator() {
        if (!this.evaluatorFactory) {
            await this.initialize();
        }
        
        try {
            // Try OpenEvals first
            const openevalsEvaluator = new OpenEvalsEvaluator(this.openai, "correctness");
            return async (params) => await openevalsEvaluator.evaluate(params);
        } catch (error) {
            console.warn("OpenEvals not available, using fallback evaluator:", error.message);
            // Fallback to factory-created evaluator
            const fallbackEvaluator = this.evaluatorFactory.getEvaluator('correctness');
            return async (params) => await fallbackEvaluator.evaluate(params);
        }
    }

    /**
     * Create multiple evaluators using the factory
     * @param {Array} evaluatorConfigs - Array of evaluator configurations
     * @returns {Array} Array of evaluator functions
     */
    createEvaluators(evaluatorConfigs) {
        const evaluators = this.evaluatorFactory.createEvaluators(evaluatorConfigs);
        return evaluators.map(evaluator => 
            async (params) => await evaluator.evaluate(params)
        );
    }

    /**
     * Get default examples for evaluation
     * @returns {Array} Default test examples
     */
    async getDefaultExamples() {
        const { getWorkflowExamples } = await import('../datasets/index.js');
        return getWorkflowExamples();
    }

    /**
     * Run a complete evaluation workflow
     * @param {Object} workflow - Workflow to evaluate
     * @param {Object} options - Evaluation options
     * @returns {Object} Evaluation results
     */
    async runCompleteEvaluation(workflow, options = {}) {
        try {
            // Step 1: Create dataset
            const datasetName = options.datasetName || "workflow-evaluation-dataset";
            const examples = options.examples || await this.getDefaultExamples();
            
            console.log("📋 Creating evaluation dataset...");
            const dataset = await this.createDataset(
                datasetName,
                "Evaluation dataset for workflow",
                examples
            );

            // Step 2: Create target function
            console.log("🎯 Creating target function...");
            const targetFunction = this.createWorkflowTargetFunction(workflow);

            // Step 3: Create evaluators
            console.log("📊 Creating evaluators...");
            const correctnessEvaluator = await this.createCorrectnessEvaluator();
            
            // Create additional evaluators if specified
            const additionalEvaluators = options.evaluators || [];
            const evaluators = [correctnessEvaluator, ...additionalEvaluators];

            // Step 4: Run evaluation
            console.log("🚀 Running evaluation...");
            const result = await this.runEvaluation(
                targetFunction,
                dataset.name,
                evaluators,
                {
                    experimentPrefix: options.experimentPrefix || "workflow-eval",
                    maxConcurrency: options.maxConcurrency || 2
                }
            );

            return result;
        } catch (error) {
            console.error("Error in complete evaluation:", error);
            throw error;
        }
    }
} 