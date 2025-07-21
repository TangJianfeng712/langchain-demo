import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";
import { wrapOpenAI } from "langsmith/wrappers";
import OpenAI from "openai";

/**
 * Base Evaluation Service
 * Provides core functionality for all evaluation services
 */
export class BaseEvaluationService {
    constructor(serviceName = "BaseEvaluation") {
        this.client = null;
        this.openai = null;
        this.isInitialized = false;
        this.serviceName = serviceName;
        this.projectName = process.env.LANGCHAIN_PROJECT || "agent-evaluation";
    }

    /**
     * Initialize the evaluation service with LangSmith and OpenAI
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            const langsmithApiKey = process.env.LANGCHAIN_API_KEY;
            const openaiApiKey = process.env.OPENAI_API_KEY;
            
            if (!langsmithApiKey) {
                throw new Error("LANGCHAIN_API_KEY is required for evaluation");
            }
            
            if (!openaiApiKey) {
                throw new Error("OPENAI_API_KEY is required for evaluation");
            }

            // Initialize LangSmith client
            this.client = new Client({
                apiKey: langsmithApiKey,
                apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
            });

            // Initialize OpenAI with LangSmith wrapper
            const openai = new OpenAI({
                apiKey: openaiApiKey,
            });
            this.openai = wrapOpenAI(openai);

            console.log(`✅ ${this.serviceName} initialized`);
            console.log(`📊 Project: ${this.projectName}`);

            this.isInitialized = true;
        } catch (error) {
            console.error(`Failed to initialize ${this.serviceName}:`, error);
            throw error;
        }
    }

    /**
     * Create a dataset with example input/output pairs
     * @param {string} name - Dataset name
     * @param {string} description - Dataset description
     * @param {Array} examples - Array of example objects
     * @returns {Object} Created dataset with unique name
     */
    async createDataset(name, description, examples) {
        if (!this.client) {
            throw new Error("LangSmith client not initialized");
        }

        try {
            // Generate unique dataset name with timestamp
            const timestamp = Date.now();
            const uniqueName = `${name}-${timestamp}`;
            
            // Create dataset
            const dataset = await this.client.createDataset(uniqueName, {
                description: description,
            });

            console.log(`✅ Created dataset: ${uniqueName}`);

            // Add examples to dataset
            const examplesWithDatasetId = examples.map(example => ({
                ...example,
                dataset_id: dataset.id,
            }));

            await this.client.createExamples(examplesWithDatasetId);

            console.log(`✅ Added ${examples.length} examples to dataset: ${uniqueName}`);
            return { ...dataset, name: uniqueName };
        } catch (error) {
            console.error("Error creating dataset:", error);
            throw error;
        }
    }

    /**
     * Run evaluation using LangSmith
     * @param {Function} targetFunction - Function to evaluate
     * @param {string} datasetName - Name of the dataset to use
     * @param {Array} evaluators - Array of evaluator functions
     * @param {Object} options - Evaluation options
     * @returns {Object} Evaluation results
     */
    async runEvaluation(targetFunction, datasetName, evaluators = [], options = {}) {
        if (!this.client) {
            throw new Error("LangSmith client not initialized");
        }

        try {
            console.log(`🔍 Running evaluation on dataset: ${datasetName}`);
            
            const evaluationOptions = {
                data: datasetName,
                evaluators: evaluators,
                experimentPrefix: options.experimentPrefix || "evaluation",
                maxConcurrency: options.maxConcurrency || 2,
                ...options
            };

            const results = await evaluate(targetFunction, evaluationOptions);

            console.log(`✅ Evaluation completed successfully!`);
            console.log(`📊 Results available in LangSmith dashboard`);
            
            return {
                success: true,
                results: results,
                datasetName: datasetName,
                experimentPrefix: evaluationOptions.experimentPrefix
            };
        } catch (error) {
            console.error("Error running evaluation:", error);
            throw error;
        }
    }

    /**
     * Create a fallback evaluator when OpenEvals is not available
     * @param {string} evaluationKey - Key for the evaluation
     * @param {string} systemPrompt - System prompt for the evaluator
     * @returns {Function} Fallback evaluator function
     */
    createFallbackEvaluator(evaluationKey = "evaluation", systemPrompt = "You are an evaluator. Rate the response from 1-5, where 1 is completely wrong and 5 is completely correct.") {
        return async (params) => {
            try {
                const response = await this.openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content: `Question: ${params.inputs.question || params.inputs.input}\n\nAnswer: ${params.outputs.answer || params.outputs.response}\n\nReference: ${params.referenceOutputs?.answer || params.referenceOutputs?.expected || "No reference provided"}\n\nRate the response (1-5):`
                        }
                    ],
                    temperature: 0,
                });

                const rating = response.choices[0].message.content?.trim();
                const score = parseInt(rating) || 3;
                // Convert 1-5 scale to 0-1 scale for LangSmith
                const normalizedScore = Math.max(0, Math.min(1, (score - 1) / 4));

                return {
                    key: evaluationKey,
                    score: normalizedScore,
                    comment: `Rated ${score}/5 (normalized to ${normalizedScore.toFixed(2)})`
                };
            } catch (error) {
                console.error("Error in fallback evaluator:", error);
                return {
                    key: evaluationKey,
                    score: 0.5,
                    comment: "Evaluation failed, defaulting to 3/5 (0.5 normalized)"
                };
            }
        };
    }

    /**
     * Get evaluation status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            clientAvailable: !!this.client,
            openaiAvailable: !!this.openai,
            projectName: this.projectName,
            serviceName: this.serviceName
        };
    }
} 