import readline from "readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { HumanMessage } from "@langchain/core/messages";
import { ConversationManager } from './conversationManager.js';

/**
 * Command Line Interface for the agent
 */
export class CLIInterface {
    constructor(app) {
        this.app = app;
        this.rl = readline.createInterface({ input, output });
        this.conversationManager = new ConversationManager();
        this.isWaitingForFeedback = false; // Add feedback waiting state
        this.isWaitingForComment = false; // Add comment waiting state
        this.pendingRating = null; // Store rating while waiting for comment
        this.isRunning = false;
    }

    /**
     * Start the CLI interface
     */
    async start() {
        try {
            // Initialize application
            await this.app.initialize();

            // Display status
            await this.displayStatus();

            // Try to restore recent conversation
            const restored = await this.conversationManager.restoreRecentConversation(this.rl);
            if (restored) {
                console.log("✅ Conversation history restored");
            }

            // Show welcome message
            this.displayWelcomeMessage();

            // Start main loop
            this.isRunning = true;
            await this.mainLoop();

        } catch (error) {
            console.error("❌ Failed to start application:", error.message);
            process.exit(1);
        }
    }

    /**
     * Display application status
     */
    async displayStatus() {
        const status = await this.app.getStatusSummary();
        console.log(`🔐 Auth status: ${status.auth}`);
        console.log(`💬 ${status.conversations}`);
    }

    /**
     * Display welcome message
     */
    displayWelcomeMessage() {
        console.log("\n=== 🚀 Welcome to Agent Interactive Mode ===");
        console.log("💡 Tips: You can directly input questions, auth information and conversation history will be automatically saved");
        console.log("📌 Input 'exit' to exit program, 'clear' to clear current conversation, 'history' to view conversation history");
        console.log("🧵 Thread commands:");
        console.log("   - 'thread' to show current thread");
        console.log("   - 'threads' to list all available threads");
        console.log("   - 'switch-thread' to interactively switch threads");
        console.log("   - 'thread-<ID>' to switch to specific thread (e.g., 'thread-1752780277309')");
        console.log("   - 'thread-history' to view current thread history");
    }

    /**
     * Main interaction loop
     */
    async mainLoop() {
        while (this.isRunning) {
            try {
                const userInput = await this.rl.question("\nYou: ");

                if (!await this.handleSpecialCommands(userInput)) {
                    await this.processUserInput(userInput);
                }
            } catch (error) {
                console.error("❌ Error in main loop:", error.message);
            }
        }
    }

    /**
     * Handle special commands (exit, clear, history, thread commands)
     */
    async handleSpecialCommands(input) {
        const command = input.trim().toLowerCase();

        switch (command) {
            case 'exit':
                await this.shutdown();
                return true;

            case 'clear':
                await this.conversationManager.clearConversation();
                return true;

            case 'history':
                const summary = await this.conversationManager.getConversationsSummary();
                console.log(`\n${summary}`);
                return true;

            case 'thread':
                await this.showCurrentThread();
                return true;

            case 'thread-history':
                await this.showThreadHistory();
                return true;

            case 'threads':
                await this.listAvailableThreads();
                return true;

            case 'switch-thread':
                await this.switchThread();
                return true;

            default:
                // Check if it's a thread switch command (e.g., "thread-1234567890")
                if (command.startsWith('thread-')) {
                    await this.switchToSpecificThread(command);
                    return true;
                }
                return false;
        }
    }

    /**
     * Process user input through the application
     */
    async processUserInput(userInput) {
        const userMessage = new HumanMessage(userInput);
        this.conversationManager.addUserMessage(userMessage);

        try {
            console.log("🔄 Processing request...");

            // If waiting for comment (second step of feedback)
            if (this.isWaitingForComment) {
                const { feedbackService } = await import("../core/feedbackService.js");
                
                if (!feedbackService.isInitialized) {
                    await feedbackService.initialize();
                }

                // Combine pending rating with comment (empty string if user just pressed enter)
                const comment = userInput.trim();
                
                // Use traceable feedback collection with ThreadManager context
                const result = await feedbackService.collectFeedbackWithContext({
                    starRating: this.pendingRating,
                    comment: comment,
                    key: "user_rating"
                }, this.app.threadManager);
                
                console.log("✅ Feedback processed");
                
                // Create response message
                const starEmoji = feedbackService.getStarEmoji(this.pendingRating);
                let responseMessage = `${starEmoji} Thank you for your ${this.pendingRating}-star rating!`;
                
                if (comment) {
                    responseMessage += `\nComment: "${comment}"`;
                }
                
                if (result.submitted) {
                    responseMessage += `\n✅ Submitted to LangSmith for AI improvement.`;
                } else {
                    responseMessage += `\n📝 Recorded locally.`;
                }
                
                console.log("\n🤖: " + responseMessage);
                
                // Add feedback response to conversation
                const aiMessage = new (await import("@langchain/core/messages")).AIMessage(responseMessage);
                this.conversationManager.addAIMessage(aiMessage);
                
                // Reset feedback waiting states
                this.isWaitingForComment = false;
                this.isWaitingForFeedback = false;
                this.pendingRating = null;
                
                await this.conversationManager.autoSaveIfNeeded();
                return;
            }

            // If waiting for rating (first step of feedback)
            if (this.isWaitingForFeedback) {
                const { feedbackService } = await import("../core/feedbackService.js");
                
                if (!feedbackService.isInitialized) {
                    await feedbackService.initialize();
                }

                // Parse rating only
                const parsed = feedbackService.parseUserFeedback(userInput);
                
                if (parsed && parsed.rating >= 1 && parsed.rating <= 5) {
                    // Store rating and ask for comment
                    this.pendingRating = parsed.rating;
                    this.isWaitingForFeedback = false;
                    this.isWaitingForComment = true;
                    
                    console.log("✅ Rating received");
                    console.log("\n🤖: Great! You rated this " + parsed.rating + " stars.");
                    console.log("💬 Please add any comments to help us improve (or press Enter to skip):");
                    
                    return;
                } else {
                    // Still waiting for valid rating
                    console.log("✅ Request processed");
                    console.log("\n🤖: Please provide a rating from 1-5 stars.\nExamples: \"5\", \"4 stars\", \"3 - needs improvement\"");
                    return;
                }
            }

            // Normal workflow processing
            // Get current thread ID to ensure we're continuing the same thread
            const currentThreadId = this.app.getCurrentThreadId();
            console.log(`🔗 Processing message in thread: ${currentThreadId}`);
            
            const result = await this.app.processMessageWithThread(userInput, {
                getChatHistory: true,
                saveToLocal: true,
                threadId: currentThreadId  // Explicitly pass the current thread ID
            });

            console.log("✅ Request processed");
            console.log("\n🤖: " + result.response);

            // Check if response contains rating request to set feedback waiting state
            if (result.response.includes("Rate this response")) {
                this.isWaitingForFeedback = true;
            }

            // Update conversation history with thread info
            const aiMessage = new (await import("@langchain/core/messages")).AIMessage(result.response);
            this.conversationManager.addAIMessage(aiMessage);

            // Auto save if needed
            await this.conversationManager.autoSaveIfNeeded();

        } catch (error) {
            console.log("\n❌ Error:", error.message);

            if (error.message.includes('timeout')) {
                console.log("💡 Suggestions:");
                console.log("  - Check network connection");
                console.log("  - Check if backend service is running");
                console.log("  - View LangSmith tracking information");
            }

            // Remove last added user message on error
            this.conversationManager.currentMessages.pop();
        }
    }

    /**
     * Show current thread information
     */
    async showCurrentThread() {
        try {
            const threadId = this.app.getCurrentThreadId();
            if (threadId) {
                console.log(`\n🧵 Current Thread ID: ${threadId}`);
            } else {
                console.log("\n🧵 No active thread");
            }
        } catch (error) {
            console.log("\n❌ Error getting thread info:", error.message);
        }
    }

    /**
     * Show thread history
     */
    async showThreadHistory() {
        try {
            const history = await this.app.getThreadHistory();
            if (history.length > 0) {
                console.log("\n📜 Thread History:");
                history.forEach((message, index) => {
                    const role = message.role === 'user' ? '👤' : '🤖';
                    console.log(`${index + 1}. ${role} ${message.content}`);
                });
            } else {
                console.log("\n📜 No thread history available");
            }
        } catch (error) {
            console.log("\n❌ Error getting thread history:", error.message);
        }
    }

    /**
     * List available threads from conversation store
     */
    async listAvailableThreads() {
        try {
            const { conversationStore } = await import('../store/index.js');
            const conversations = await conversationStore.getAllConversations();
            
            if (conversations.length === 0) {
                console.log("\n📋 No saved conversations found");
                return;
            }

            console.log("\n📋 Available Threads:");
            conversations.forEach((conv, index) => {
                const isCurrent = conv.id === this.app.getCurrentThreadId();
                const status = isCurrent ? " (current)" : "";
                console.log(`${index + 1}. ${conv.title}${status}`);
                console.log(`   Thread ID: ${conv.id}`);
                console.log(`   Messages: ${conv.messages.length}`);
                console.log(`   Last updated: ${new Date(conv.updatedAt).toLocaleString()}`);
                console.log("");
            });

            console.log("💡 To switch to a thread, use:");
            console.log("   - 'switch-thread' for interactive selection");
            console.log("   - 'thread-<ID>' to switch directly (e.g., 'thread-1752780277309')");
        } catch (error) {
            console.log("\n❌ Error listing threads:", error.message);
        }
    }

    /**
     * Interactive thread switching
     */
    async switchThread() {
        try {
            const { conversationStore } = await import('../store/index.js');
            const conversations = await conversationStore.getAllConversations();
            
            if (conversations.length === 0) {
                console.log("\n📋 No saved conversations found");
                return;
            }

            console.log("\n📋 Select a thread to switch to:");
            conversations.forEach((conv, index) => {
                const isCurrent = conv.id === this.app.getCurrentThreadId();
                const status = isCurrent ? " (current)" : "";
                console.log(`${index + 1}. ${conv.title}${status}`);
                console.log(`   ID: ${conv.id}`);
            });

            const selection = await this.rl.question("\nEnter thread number (or 'cancel'): ");
            
            if (selection.toLowerCase() === 'cancel') {
                console.log("❌ Thread switch cancelled");
                return;
            }

            // Check if user entered a thread ID directly (with or without 'thread-' prefix)
            if (selection.startsWith('thread-')) {
                await this.switchToSpecificThread(selection);
                return;
            }

            // Check if user entered a numeric thread ID directly
            if (/^\d+$/.test(selection)) {
                // Check if this ID exists in the conversations list
                const foundThread = conversations.find(conv => conv.id === selection);
                if (foundThread) {
                    await this.switchToSpecificThread(foundThread.id);
                    return;
                }
            }

            const threadIndex = parseInt(selection) - 1;
            if (threadIndex >= 0 && threadIndex < conversations.length) {
                const selectedThread = conversations[threadIndex];
                await this.switchToSpecificThread(selectedThread.id);
            } else {
                console.log("❌ Invalid thread number or ID");
                console.log("💡 You can enter:");
                console.log("   - A number (1-4) to select by position");
                console.log("   - A thread ID (e.g., '1752781137674')");
                console.log("   - A full thread ID (e.g., 'thread-1752781137674')");
            }
        } catch (error) {
            console.log("\n❌ Error switching thread:", error.message);
        }
    }

    /**
     * Switch to a specific thread by ID
     */
    async switchToSpecificThread(threadId) {
        try {
            console.log(`🔄 Switching to thread: ${threadId}`);
            
            // First try to load conversation from local store
            const { conversationStore } = await import('../store/index.js');
            let conversation = await conversationStore.getConversationById(threadId);
            
            // If not found by exact ID, try to find by title match
            if (!conversation && threadId.startsWith('thread-')) {
                const allConversations = await conversationStore.getAllConversations();
                const targetTitle = `Thread: ${threadId}`;
                
                // Find conversation with matching title
                conversation = allConversations.find(conv => conv.title === targetTitle);
                
                if (conversation) {
                    console.log(`🔍 Found thread by title match: ${conversation.id}`);
                    // Update threadId to the actual stored ID
                    threadId = conversation.id;
                }
            }
            
            // CRITICAL: Set the thread ID in the thread manager BEFORE loading history
            // This ensures that future messages will be properly traced to this thread
            this.app.threadManager.currentThreadId = threadId;
            
            if (conversation) {
                // Found in local store
                this.conversationManager.currentMessages = conversation.messages;
                this.conversationManager.currentConversationId = conversation.id;
                
                console.log(`✅ Switched to thread: ${conversation.title}`);
                console.log(`📝 Loaded ${conversation.messages.length} messages from local store`);
                console.log(`🔗 Thread ID set for future tracing: ${threadId}`);
                
                // Show recent messages
                this.conversationManager.displayRecentMessages(3);
            } else {
                // Try to load from LangSmith
                console.log(`🔍 Thread ${threadId} not found in local store, trying LangSmith...`);
                
                try {
                    const history = await this.app.threadManager.getThreadHistory(threadId);
                    
                    if (history.length > 0) {
                        // Convert LangSmith history to conversation format
                        const { HumanMessage, AIMessage } = await import("@langchain/core/messages");
                        const messages = history.map(msg => {
                            if (msg.role === 'user') {
                                return new HumanMessage(msg.content);
                            } else if (msg.role === 'assistant') {
                                return new AIMessage(msg.content);
                            }
                            return msg;
                        });
                        
                        // Create a new conversation entry for this thread
                        const newConversation = {
                            id: threadId,
                            title: `Thread: ${threadId}`,
                            messages: messages,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        
                        // Add to local store
                        await conversationStore.addConversation(messages, `Thread: ${threadId}`);
                        
                        // Update conversation manager
                        this.conversationManager.currentMessages = messages;
                        this.conversationManager.currentConversationId = threadId;
                        
                        console.log(`✅ Switched to thread: ${threadId}`);
                        console.log(`📝 Loaded ${messages.length} messages from LangSmith`);
                        console.log(`🔗 Thread ID set for future tracing: ${threadId}`);
                        
                        // Show recent messages
                        this.conversationManager.displayRecentMessages(3);
                    } else {
                        console.log(`❌ Thread ${threadId} not found in LangSmith either`);
                        console.log("💡 This thread might not exist or be accessible");
                    }
                } catch (error) {
                    console.log(`❌ Error loading from LangSmith: ${error.message}`);
                }
            }
        } catch (error) {
            console.log("\n❌ Error switching to thread:", error.message);
        }
    }

    /**
     * Shutdown the interface gracefully
     */
    async shutdown() {
        this.isRunning = false;

        // Save current conversation
        await this.conversationManager.saveConversation();
        if (this.conversationManager.getCurrentState().messageCount > 0) {
            console.log("💾 Conversation saved");
        }

        console.log("👋 Goodbye!");
        this.rl.close();
        process.exit(0);
    }
} 