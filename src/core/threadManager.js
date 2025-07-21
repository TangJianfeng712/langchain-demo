import OpenAI from "openai";
import { traceable, getCurrentRunTree } from "langsmith/traceable";
import { Client } from "langsmith";
import { wrapOpenAI } from "langsmith/wrappers";
import conversationStore from '../store/conversationStore.js';

/**
 * Thread Manager for handling conversation threads with LangSmith integration
 */
export class ThreadManager {
    constructor() {
        // Use environment variable for project name, fallback to default
        this.langsmithProject = process.env.LANGCHAIN_PROJECT || "agent-project";
        this.client = null;
        this.langsmithClient = null;
        this.currentThreadId = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the thread manager with OpenAI and LangSmith clients
     */
    async initialize(openaiApiKey, langsmithApiKey = null) {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize OpenAI client
            const openai = new OpenAI({
                apiKey: openaiApiKey,
            });

            // Initialize LangSmith client if API key is provided
            // Check for both LANGSMITH_API_KEY and LANGCHAIN_API_KEY
            const langsmithKey = langsmithApiKey || process.env.LANGCHAIN_API_KEY;
            if (langsmithKey) {
                this.langsmithClient = new Client({
                    apiKey: langsmithKey,
                });
                console.log("✅ LangSmith client initialized");
                console.log(`📋 Using project: ${this.langsmithProject}`);
            } else {
                console.log("⚠️  LangSmith API key not provided, tracing will be limited");
            }

            // Wrap OpenAI client with LangSmith
            this.client = wrapOpenAI(openai, {
                project_name: this.langsmithProject,
            });

            this.isInitialized = true;

            // Create an initial thread for immediate use
            await this.createThread();

            console.log("✅ ThreadManager initialized successfully");
        } catch (error) {
            throw new Error(`Failed to initialize ThreadManager: ${error.message}`);
        }
    }

    /**
     * Create a new thread or get existing thread
     */
    async createThread(threadId = null) {
        if (!this.isInitialized) {
            throw new Error("ThreadManager not initialized");
        }

        this.currentThreadId = threadId || `thread-${Date.now()}`;
        return this.currentThreadId;
    }

    /**
     * Get thread history from LangSmith
     */
    async getThreadHistory(threadId, projectName = null) {
        if (!this.langsmithClient) {
            console.warn("LangSmith client not available, returning empty history");
            return [];
        }

        try {
            const project = projectName || this.langsmithProject;

            // Filter runs by the specific thread and project
            const filterString = `and(in(metadata_key, ["session_id","conversation_id","thread_id"]), eq(metadata_value, "${threadId}"))`;

            // Only grab the LLM runs
            const runs = this.langsmithClient.listRuns({
                projectName: project,
                filter: filterString,
                runType: "llm",
            });

            // Sort by start time to get the most recent interaction
            const runsArray = [];
            for await (const run of runs) {
                runsArray.push(run);
            }

            const sortedRuns = runsArray.sort(
                (a, b) =>
                    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
            );

            if (sortedRuns.length === 0) {
                console.log(`📊 No runs found for thread: ${threadId}`);
                return [];
            }

            // Check if the run has the expected structure
            const latestRun = sortedRuns[0];
            if (!latestRun.inputs || !latestRun.inputs.messages || !latestRun.outputs || !latestRun.outputs.choices) {
                console.log(`📊 Run structure incomplete for thread: ${threadId}`);
                return [];
            }

            // Return the current state of the conversation
            return [
                ...latestRun.inputs.messages,
                latestRun.outputs.choices[0].message,
            ];
        } catch (error) {
            console.warn(`Failed to get thread history: ${error.message}`);
            return [];
        }
    }

    /**
     * Create a traceable chat pipeline
     */
    createChatPipeline(threadId = null) {
        const thread = threadId || this.currentThreadId;

        return traceable(
            async (
                question,
                options = {}
            ) => {
                const { getChatHistory = false, model = "gpt-4o-mini" } = options;

                let messages = [];

                // Whether to continue an existing thread or start a new one
                if (getChatHistory && thread) {
                    const runTree = await getCurrentRunTree();
                    const historicalMessages = await this.getThreadHistory(
                        runTree.extra.metadata.session_id,
                        runTree.project_name
                    );
                    messages = [...historicalMessages, { role: "user", content: question }];
                } else {
                    messages = [{ role: "user", content: question }];
                }

                // Invoke the model
                const chatCompletion = await this.client.chat.completions.create({
                    model: model,
                    messages: messages,
                });

                return chatCompletion.choices[0].message.content;
            },
            {
                name: "Agent Chat Bot",
                project_name: this.langsmithProject,
                metadata: { session_id: thread },
            }
        );
    }

    /**
     * Process message with thread context
     */
    async processMessage(message, options = {}) {
        const {
            threadId = null,
            getChatHistory = false,
            model = "gpt-4o-mini",
            saveToLocal = true,
            workflow = null
        } = options;

        // Use existing thread if available, otherwise create new one
        const thread = await this.createThread(threadId || this.currentThreadId);

        // Update current thread ID
        this.currentThreadId = thread;

        // If workflow is provided, use it instead of direct OpenAI call
        if (workflow) {
            return await this.processMessageWithWorkflow(message, workflow, thread, options);
        }

        // Create chat pipeline for direct OpenAI calls
        const chatPipeline = this.createChatPipeline(thread);

        // Process the message
        const response = await chatPipeline(message, { getChatHistory, model });

        // Save to local conversation store if requested
        if (saveToLocal) {
            await this.saveToLocalStore(message, response, thread);
        }

        return {
            response,
            threadId: thread,
            messages: getChatHistory ? await this.getThreadHistory(thread) : []
        };
    }

    /**
     * Process message using the existing workflow
     */
    async processMessageWithWorkflow(message, workflow, threadId, options = {}) {
        const { saveToLocal = true } = options;

        try {
            // Import HumanMessage for proper message format
            const { HumanMessage } = await import("@langchain/core/messages");

            // Create messages array with thread context if needed
            let messages = [];
            if (options.getChatHistory && threadId) {
                console.log(`🔄 Attempting to load history for thread: ${threadId}`);
                
                // Try to get history from LangSmith first
                let history = await this.getThreadHistory(threadId);
                console.log(`📊 LangSmith history found: ${history.length} messages`);
                
                // If no LangSmith history, try to get from local conversation store
                if (history.length === 0) {
                    try {
                        const { conversationStore } = await import('../store/index.js');
                        const recentConversation = await conversationStore.getRecentConversation();
                        
                        if (recentConversation && recentConversation.messages.length > 0) {
                            console.log(`📚 Using local conversation history (${recentConversation.messages.length} messages)`);
                            // Take the last few messages to avoid too much context
                            const recentMessages = recentConversation.messages.slice(-10);
                            messages = [...recentMessages, new HumanMessage(message)];
                            console.log(`📝 Combined ${recentMessages.length} history messages + 1 new message`);
                        } else {
                            console.log(`📝 No local history found, starting fresh conversation`);
                            messages = [new HumanMessage(message)];
                        }
                    } catch (error) {
                        console.warn(`Could not load local conversation history: ${error.message}`);
                        messages = [new HumanMessage(message)];
                    }
                } else {
                    // Convert LangSmith history messages to proper format
                    const historyMessages = history.map(msg => {
                        if (msg.role === 'user') {
                            return new HumanMessage(msg.content);
                        }
                        // For AI messages, we'll create a simple text message
                        return { role: "assistant", content: msg.content };
                    });
                    messages = [...historyMessages, new HumanMessage(message)];
                    console.log(`📝 Using LangSmith history: ${historyMessages.length} messages + 1 new message`);
                }
            } else {
                console.log(`📝 No history requested, starting fresh conversation`);
                messages = [new HumanMessage(message)];
            }

            // Create a traceable workflow invocation with proper metadata
            const traceableWorkflow = traceable(
                async (inputMessages) => {
                    // Set the session_id in the state for the workflow
                    // LangGraph config format should be passed as second parameter
                    const result = await workflow.invoke(
                        { 
                            messages: inputMessages,
                            // Add thread context to state
                            hasHistoryContext: options.getChatHistory && inputMessages.length > 1,
                            threadId: threadId,
                            getChatHistory: options.getChatHistory,
                            // Explicitly mark the current user question
                            currentUserQuestion: message
                        },
                        {
                            metadata: { 
                                session_id: threadId,
                                thread_id: threadId,
                                conversation_id: threadId
                            },
                            tags: ["workflow", "thread"],
                            // Ensure tracing context is properly inherited
                            runName: "Agent Workflow Execution"
                        }
                    );
                    return result;
                },
                {
                    name: "Agent Workflow",
                    project_name: this.langsmithProject,
                    metadata: { 
                        session_id: threadId,
                        thread_id: threadId,
                        conversation_id: threadId
                    },
                    tags: ["workflow", "thread"],
                }
            );

            // Process through workflow with tracing
            const result = await traceableWorkflow(messages);

            // Create a dedicated thread run that will be visible in Threads page
            const threadRun = traceable(
                async () => {
                    return {
                        success: true,
                        threadId: threadId,
                        message: message,
                        response: result.messages[result.messages.length - 1]?.content || "No response"
                    };
                },
                {
                    name: "Thread Conversation",
                    project_name: this.langsmithProject,
                    metadata: {
                        session_id: threadId,
                        thread_id: threadId,
                        conversation_id: threadId
                    },
                    tags: ["thread", "conversation", "chat"],
                }
            );

            // Execute the thread run
            await threadRun();

            // Extract the last AI message as response
            const aiMessages = result.messages.filter(msg => msg._getType() === 'ai');
            const response = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].content : "No response generated";

            // Save to local conversation store if requested
            if (saveToLocal) {
                await this.saveToLocalStore(message, response, threadId);
            }

            // Update current thread ID for future reference
            this.currentThreadId = threadId;

            return {
                response,
                threadId: threadId,
                messages: result.messages
            };

        } catch (error) {
            console.warn(`Workflow processing failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Save conversation to local store
     */
    async saveToLocalStore(userMessage, aiResponse, threadId) {
        try {
            const { HumanMessage, AIMessage } = await import("@langchain/core/messages");

            const messages = [
                new HumanMessage(userMessage),
                new AIMessage(aiResponse)
            ];

            await conversationStore.addConversation(messages, `Thread: ${threadId}`);
        } catch (error) {
            console.warn(`Failed to save to local store: ${error.message}`);
        }
    }

    /**
     * Get current thread ID
     */
    getCurrentThreadId() {
        return this.currentThreadId;
    }

    /**
     * Check if thread manager is initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

// Create global instance
const threadManager = new ThreadManager();

export default threadManager; 