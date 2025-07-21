/**
 * Custom Evaluators for Evaluation
 * Contains specialized evaluator classes for different evaluation scenarios
 */

/**
 * Base Evaluator Class
 * Provides common functionality for all evaluators
 */
export class BaseEvaluator {
    constructor(name, openai) {
        this.name = name;
        this.openai = openai;
    }

    /**
     * Normalize score from 1-5 scale to 0-1 scale
     * @param {number} score - Raw score (1-5)
     * @returns {number} Normalized score (0-1)
     */
    normalizeScore(score) {
        return Math.max(0, Math.min(1, (score - 1) / 4));
    }

    /**
     * Create error fallback result
     * @param {string} key - Evaluation key
     * @param {Error} error - Error object
     * @returns {Object} Fallback evaluation result
     */
    createErrorFallback(key, error) {
        console.error(`Error in ${key} evaluator:`, error);
        return {
            key: key,
            score: 0.5,
            comment: `${key} evaluation failed, defaulting to 3/5`
        };
    }

    /**
     * Extract score from AI response
     * @param {string} response - AI response text
     * @returns {number} Extracted score
     */
    extractScore(response) {
        const rating = response?.trim();
        const score = parseInt(rating) || 3;
        return Math.max(1, Math.min(5, score));
    }
}

/**
 * Correctness Evaluator Class
 * Evaluates the correctness of responses against reference answers
 */
export class CorrectnessEvaluator extends BaseEvaluator {
    constructor(openai) {
        super("CorrectnessEvaluator", openai);
    }

    async evaluate(params) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are an evaluator. Rate the correctness of the answer from 1-5, where 1 is completely wrong and 5 is completely correct."
                    },
                    {
                        role: "user",
                        content: `Question: ${params.inputs.question || params.inputs.input}\n\nAnswer: ${params.outputs.answer || params.outputs.response}\n\nReference: ${params.referenceOutputs?.answer || params.referenceOutputs?.expected || "No reference provided"}\n\nRate the correctness (1-5):`
                    }
                ],
                temperature: 0,
            });

            const rating = response.choices[0].message.content;
            const score = this.extractScore(rating);
            const normalizedScore = this.normalizeScore(score);

            return {
                key: "correctness",
                score: normalizedScore,
                comment: `Correctness: ${score}/5 (${normalizedScore.toFixed(2)} normalized)`
            };
        } catch (error) {
            return this.createErrorFallback("correctness", error);
        }
    }
}

/**
 * Completeness Evaluator Class
 * Evaluates the completeness of responses
 */
export class CompletenessEvaluator extends BaseEvaluator {
    constructor(openai) {
        super("CompletenessEvaluator", openai);
    }

    async evaluate(params) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are an evaluator. Rate the completeness of the answer from 1-5, where 1 is very incomplete and 5 is very complete."
                    },
                    {
                        role: "user",
                        content: `Question: ${params.inputs.question || params.inputs.input}\n\nAnswer: ${params.outputs.answer || params.outputs.response}\n\nRate the completeness (1-5):`
                    }
                ],
                temperature: 0,
            });

            const rating = response.choices[0].message.content;
            const score = this.extractScore(rating);
            const normalizedScore = this.normalizeScore(score);

            return {
                key: "completeness",
                score: normalizedScore,
                comment: `Completeness: ${score}/5 (${normalizedScore.toFixed(2)} normalized)`
            };
        } catch (error) {
            return this.createErrorFallback("completeness", error);
        }
    }
}

/**
 * Relevance Evaluator Class
 * Evaluates the relevance of responses to questions
 */
export class RelevanceEvaluator extends BaseEvaluator {
    constructor(openai) {
        super("RelevanceEvaluator", openai);
    }

    async evaluate(params) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are an evaluator. Rate the relevance of the answer to the question from 1-5, where 1 is completely irrelevant and 5 is highly relevant."
                    },
                    {
                        role: "user",
                        content: `Question: ${params.inputs.question || params.inputs.input}\n\nAnswer: ${params.outputs.answer || params.outputs.response}\n\nRate the relevance (1-5):`
                    }
                ],
                temperature: 0,
            });

            const rating = response.choices[0].message.content;
            const score = this.extractScore(rating);
            const normalizedScore = this.normalizeScore(score);

            return {
                key: "relevance",
                score: normalizedScore,
                comment: `Relevance: ${score}/5 (${normalizedScore.toFixed(2)} normalized)`
            };
        } catch (error) {
            return this.createErrorFallback("relevance", error);
        }
    }
}

/**
 * Tools Evaluator Class
 * Evaluates tool-specific responses
 */
export class ToolsEvaluator extends BaseEvaluator {
    constructor(openai) {
        super("ToolsEvaluator", openai);
    }

    async evaluate(params) {
        try {
            // Extract expected values from the correct location
            const expected = params.outputs?.expected || params.referenceOutputs?.expected;
            const expectedStatus = params.outputs?.expectedStatus || params.referenceOutputs?.expectedStatus;
            const actualResponse = params.outputs?.answer || params.outputs?.response;
            const actualStatus = params.outputs?.status;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are an evaluator for LLM tools. Analyze the tool response and rate it from 1-5 based on:

1. **Correctness** (2 points): Does the response match the expected behavior?
2. **Completeness** (2 points): Does it provide all necessary information?
3. **Error Handling** (1 point): Does it handle errors appropriately?

Expected: ${expected}
Expected Status: ${expectedStatus}
Actual Status: ${actualStatus}

Respond with ONLY a number from 1-5 representing the overall score.`
                    },
                    {
                        role: "user",
                        content: `Tool: ${params.inputs.tool}
Question: ${params.inputs.question}
Response: ${actualResponse}

Rate this response (1-5):`
                    }
                ],
                temperature: 0,
            });

            const rating = response.choices[0].message.content?.trim();
            const score = this.extractScore(rating);
            const normalizedScore = this.normalizeScore(score);

            // Additional logic for status-based scoring
            let statusBonus = 0;
            if (expectedStatus && actualStatus) {
                if (expectedStatus === actualStatus) {
                    statusBonus = 0.1; // Bonus for matching status
                } else if (expectedStatus === "success" && actualStatus === "error") {
                    statusBonus = -0.2; // Penalty for wrong status
                }
            }

            const finalScore = Math.max(0, Math.min(1, normalizedScore + statusBonus));

            return {
                key: "tools_evaluation",
                score: finalScore,
                comment: `Tool evaluation: ${score}/5 (${finalScore.toFixed(2)} normalized). Expected: ${expected}, Got: ${actualResponse?.substring(0, 50)}...`
            };
        } catch (error) {
            return this.createErrorFallback("tools_evaluation", error);
        }
    }
}

/**
 * Performance Evaluator Class
 * Evaluates response time performance
 */
export class PerformanceEvaluator extends BaseEvaluator {
    constructor(maxResponseTime = 5000) {
        super("PerformanceEvaluator", null);
        this.maxResponseTime = maxResponseTime;
    }

    async evaluate(params) {
        const responseTime = params.outputs.responseTime || 0;
        const score = Math.max(0, Math.min(1, 1 - (responseTime / this.maxResponseTime)));
        
        return {
            key: "performance",
            score: score,
            comment: `Response time: ${responseTime}ms (max: ${this.maxResponseTime}ms, score: ${score.toFixed(2)})`
        };
    }
}

/**
 * Custom Evaluator Class
 * Creates evaluators with custom prompts
 */
export class CustomEvaluator extends BaseEvaluator {
    constructor(openai, evaluationKey, systemPrompt) {
        super("CustomEvaluator", openai);
        this.evaluationKey = evaluationKey;
        this.systemPrompt = systemPrompt;
    }

    async evaluate(params) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: this.systemPrompt
                    },
                    {
                        role: "user",
                        content: `Question: ${params.inputs.question || params.inputs.input}\n\nAnswer: ${params.outputs.answer || params.outputs.response}\n\nReference: ${params.referenceOutputs?.answer || params.referenceOutputs?.expected || "No reference provided"}\n\nRate the response (1-5):`
                    }
                ],
                temperature: 0,
            });

            const rating = response.choices[0].message.content;
            const score = this.extractScore(rating);
            const normalizedScore = this.normalizeScore(score);

            return {
                key: this.evaluationKey,
                score: normalizedScore,
                comment: `${this.evaluationKey}: ${score}/5 (${normalizedScore.toFixed(2)} normalized)`
            };
        } catch (error) {
            return this.createErrorFallback(this.evaluationKey, error);
        }
    }
}

/**
 * OpenEvals Integration Evaluator Class
 * Integrates with OpenEvals library for advanced evaluation
 */
export class OpenEvalsEvaluator extends BaseEvaluator {
    constructor(openai, evaluationType = "correctness") {
        super("OpenEvalsEvaluator", openai);
        this.evaluationType = evaluationType;
    }

    async evaluate(params) {
        try {
            // Dynamic import to avoid dependency issues
            const { createLLMAsJudge, CORRECTNESS_PROMPT } = await import("openevals");
            
            const evaluator = createLLMAsJudge({
                prompt: CORRECTNESS_PROMPT,
                model: "openai:o3-mini",
                feedbackKey: this.evaluationType,
            });
            
            const evaluatorResult = await evaluator({
                inputs: params.inputs,
                outputs: params.outputs,
                referenceOutputs: params.referenceOutputs,
            });
            
            return evaluatorResult;
        } catch (error) {
            console.warn("OpenEvals not available, using fallback evaluator:", error.message);
            // Fallback to custom evaluator
            const fallbackEvaluator = new CustomEvaluator(
                this.openai, 
                this.evaluationType,
                `You are an evaluator. Rate the ${this.evaluationType} of the answer from 1-5, where 1 is poor and 5 is excellent.`
            );
            return await fallbackEvaluator.evaluate(params);
        }
    }
}

/**
 * Evaluator Factory Class
 * Creates and manages evaluator instances
 */
export class EvaluatorFactory {
    constructor(openai) {
        this.openai = openai;
        this.evaluators = new Map();
    }

    /**
     * Get or create an evaluator instance
     * @param {string} type - Evaluator type
     * @param {Object} options - Evaluator options
     * @returns {BaseEvaluator} Evaluator instance
     */
    getEvaluator(type, options = {}) {
        const key = `${type}_${JSON.stringify(options)}`;
        
        if (!this.evaluators.has(key)) {
            let evaluator;
            
            switch (type) {
                case 'correctness':
                    evaluator = new CorrectnessEvaluator(this.openai);
                    break;
                case 'completeness':
                    evaluator = new CompletenessEvaluator(this.openai);
                    break;
                case 'relevance':
                    evaluator = new RelevanceEvaluator(this.openai);
                    break;
                case 'tools':
                    evaluator = new ToolsEvaluator(this.openai);
                    break;
                case 'performance':
                    evaluator = new PerformanceEvaluator(options.maxResponseTime);
                    break;
                case 'custom':
                    evaluator = new CustomEvaluator(
                        this.openai, 
                        options.evaluationKey, 
                        options.systemPrompt
                    );
                    break;
                case 'openevals':
                    evaluator = new OpenEvalsEvaluator(this.openai, options.evaluationType);
                    break;
                default:
                    throw new Error(`Unknown evaluator type: ${type}`);
            }
            
            this.evaluators.set(key, evaluator);
        }
        
        return this.evaluators.get(key);
    }

    /**
     * Create multiple evaluators at once
     * @param {Array} evaluatorConfigs - Array of evaluator configurations
     * @returns {Array} Array of evaluator instances
     */
    createEvaluators(evaluatorConfigs) {
        return evaluatorConfigs.map(config => 
            this.getEvaluator(config.type, config.options || {})
        );
    }
}

// Legacy function exports for backward compatibility
export function createCorrectnessEvaluator(openai) {
    const evaluator = new CorrectnessEvaluator(openai);
    return async (params) => await evaluator.evaluate(params);
}

export function createCompletenessEvaluator(openai) {
    const evaluator = new CompletenessEvaluator(openai);
    return async (params) => await evaluator.evaluate(params);
}

export function createRelevanceEvaluator(openai) {
    const evaluator = new RelevanceEvaluator(openai);
    return async (params) => await evaluator.evaluate(params);
}

export function createToolsEvaluator(openai) {
    const evaluator = new ToolsEvaluator(openai);
    return async (params) => await evaluator.evaluate(params);
}

export function createPerformanceEvaluator(maxResponseTime = 5000) {
    const evaluator = new PerformanceEvaluator(maxResponseTime);
    return async (params) => await evaluator.evaluate(params);
}

export function createCustomEvaluator(openai, evaluationKey, systemPrompt) {
    const evaluator = new CustomEvaluator(openai, evaluationKey, systemPrompt);
    return async (params) => await evaluator.evaluate(params);
} 