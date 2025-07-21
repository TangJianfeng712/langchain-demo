import fs from "fs/promises";
import { initializeStores, authStore, conversationStore } from '../store/index.js';
import { createWorkflow } from './workflow.js';
import threadManager from './threadManager.js';
import { feedbackService } from './feedbackService.js';
import { evaluationManager } from '../evaluation/index.js';

/**
 * Application class to manage the core functionality
 */
export class Application {
    constructor() {
        this.app = null;
        this.isInitialized = false;
        this.threadManager = threadManager;
        this.feedbackService = feedbackService;
        this.evaluationManager = evaluationManager;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.isInitialized) {
            return this.app;
        }

        try {
            // Fix memory leak warning for EventTarget listeners
            const events = await import('events');
            events.EventEmitter.defaultMaxListeners = 20; // Increase from default 10

            // Initialize storage system
            await initializeStores();

            // Initialize thread manager
            const openaiApiKey = process.env.OPENAI_API_KEY;
            const langsmithApiKey = process.env.LANGCHAIN_API_KEY;

            if (openaiApiKey) {
                await this.threadManager.initialize(openaiApiKey, langsmithApiKey);
            } else {
                console.warn("⚠️  OPENAI_API_KEY not found in environment variables");
            }

            // Initialize feedback service
            await this.feedbackService.initialize();

            // Initialize evaluation manager
            await this.evaluationManager.initialize();

            // Create workflow
            this.app = createWorkflow();

            // Generate workflow diagram
            await this.generateWorkflowDiagram();

            this.isInitialized = true;
            return this.app;
        } catch (error) {
            throw new Error(`Failed to initialize application: ${error.message}`);
        }
    }

    /**
     * Generate workflow diagram
     */
    async generateWorkflowDiagram() {
        try {
            const drawableGraph = await this.app.getGraphAsync();
            const image = await drawableGraph.drawMermaidPng();
            const arrayBuffer = await image.arrayBuffer();
            await fs.writeFile("workflow.png", Buffer.from(arrayBuffer));
        } catch (error) {
            // Don't fail initialization if diagram generation fails
            console.warn("Warning: Could not generate workflow diagram");
        }
    }

    /**
     * Get application status summary
     */
    async getStatusSummary() {
        const authSummary = await authStore.getAuthSummary();
        const conversationSummary = await conversationStore.getConversationsSummary();

        return {
            auth: authSummary,
            conversations: conversationSummary
        };
    }

    /**
     * Process user input through the workflow
     */
    async processInput(messages) {
        if (!this.isInitialized) {
            throw new Error("Application not initialized");
        }

        // Add timeout handling
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout (30 seconds)')), 30000);
        });

        const statePromise = this.app.invoke({ messages });

        return Promise.race([statePromise, timeoutPromise]);
    }

    /**
     * Process message with thread context
     */
    async processMessageWithThread(message, options = {}) {
        if (!this.isInitialized) {
            throw new Error("Application not initialized");
        }

        if (!this.threadManager.isReady()) {
            throw new Error("ThreadManager not initialized. Please check OPENAI_API_KEY environment variable.");
        }

        // Get the thread ID to use - prioritize passed threadId, then current thread
        const threadId = options.threadId || this.threadManager.getCurrentThreadId();
        
        // Update thread manager's current thread if a specific threadId was passed
        if (options.threadId) {
            this.threadManager.currentThreadId = options.threadId;
        }

        // Pass the workflow to ThreadManager for proper tool integration
        return await this.threadManager.processMessage(message, {
            ...options,
            threadId: threadId,  // Explicitly pass the threadId
            workflow: this.app
        });
    }

    /**
     * Get current thread ID
     */
    getCurrentThreadId() {
        return this.threadManager.getCurrentThreadId();
    }

    /**
     * Get thread history
     */
    async getThreadHistory(threadId = null) {
        if (!this.threadManager.isReady()) {
            return [];
        }

        const thread = threadId || this.threadManager.getCurrentThreadId();
        return await this.threadManager.getThreadHistory(thread);
    }

    /**
     * Run evaluation on the workflow
     */
    async runEvaluation(evaluationType = "quick") {
        if (!this.isInitialized) {
            throw new Error("Application not initialized");
        }

        return await this.evaluationManager.runLocalEvaluation(evaluationType, this.app);
    }

    /**
     * Get evaluation status
     */
    getEvaluationStatus() {
        return this.evaluationManager.getLocalEvaluationStatus();
    }

    /**
     * Create custom test dataset
     */
    async createTestDataset(name, examples) {
        if (!this.isInitialized) {
            throw new Error("Application not initialized");
        }

        return await this.evaluationManager.createTestDataset(name, examples);
    }

    /**
     * Run LangSmith evaluation following official documentation
     */
    async runLangSmithEvaluation(evaluationType = "complete", options = {}) {
        if (!this.isInitialized) {
            throw new Error("Application not initialized");
        }

        return await this.evaluationManager.runWorkflowEvaluation(evaluationType, this.app, options);
    }

    /**
     * Get LangSmith evaluation status
     */
    getLangSmithEvaluationStatus() {
        return this.evaluationManager.getWorkflowEvaluationStatus();
    }

    /**
     * Run tools evaluation
     */
    async runToolsEvaluation(type = 'comprehensive', options = {}) {
        if (!this.isInitialized) {
            throw new Error("Application not initialized");
        }

        return await this.evaluationManager.runToolsEvaluation(type, options);
    }

    /**
     * Get tools evaluation status
     */
    getToolsEvaluationStatus() {
        return this.evaluationManager.getToolsEvaluationStatus();
    }
} 