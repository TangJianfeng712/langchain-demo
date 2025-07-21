import { conversationStore } from '../store/index.js';
import { getMessageSpeaker, formatMessageForDisplay } from '../store/messageUtils.js';

/**
 * Conversation Manager handles conversation state and persistence
 */
export class ConversationManager {
    constructor() {
        this.currentMessages = [];
        this.currentConversationId = null;
        this.autoSaveInterval = 10; // Auto save every 10 messages
    }

    /**
     * Restore recent conversation if available
     */
    async restoreRecentConversation(rl) {
        const recentConversation = await conversationStore.getRecentConversation();

        if (!recentConversation || recentConversation.messages.length === 0) {
            return false;
        }

        console.log(`\n📋 Found recent conversation: "${recentConversation.title}"`);
        console.log(`   Contains ${recentConversation.messages.length} messages, last updated: ${new Date(recentConversation.updatedAt).toLocaleString()}`);

        const shouldRestore = await rl.question("Continue this conversation? (y/n, default y): ");

        if (shouldRestore.toLowerCase() !== 'n') {
            this.currentMessages = recentConversation.messages;
            this.currentConversationId = recentConversation.id;

            // Show last few messages
            this.displayRecentMessages(4);
            return true;
        }

        return false;
    }

    /**
     * Display recent conversation messages
     */
    displayRecentMessages(count = 4) {
        const lastMessages = this.currentMessages.slice(-count);
        console.log("\n📝 Recent conversation content:");
        lastMessages.forEach((msg) => {
            const speaker = getMessageSpeaker(msg);
            const content = formatMessageForDisplay(msg, 100);
            console.log(`  ${speaker}: ${content}`);
        });
    }

    /**
     * Add user message to conversation
     */
    addUserMessage(message) {
        this.currentMessages.push(message);
    }

    /**
     * Add AI message to conversation
     */
    addAIMessage(message) {
        this.currentMessages.push(message);
    }

    /**
     * Update conversation with AI response
     */
    updateConversation(messages) {
        this.currentMessages = messages;
    }

    /**
     * Clear current conversation
     */
    async clearConversation() {
        if (this.currentMessages.length > 0) {
            await this.saveConversation();
        }

        this.currentMessages = [];
        this.currentConversationId = null;
        console.log("🗑️ Current conversation cleared, starting new conversation");
    }

    /**
     * Save current conversation
     */
    async saveConversation() {
        if (this.currentMessages.length === 0) {
            return;
        }

        try {
            if (this.currentConversationId) {
                await conversationStore.updateConversation(this.currentConversationId, this.currentMessages);
            } else {
                this.currentConversationId = await conversationStore.addConversation(this.currentMessages);
            }
        } catch (error) {
            console.warn("Warning: Failed to save conversation:", error.message);
        }
    }

    /**
     * Auto save conversation if needed
     */
    async autoSaveIfNeeded() {
        if (this.currentMessages.length % this.autoSaveInterval === 0) {
            await this.saveConversation();
            console.log("💾 Conversation auto saved");
        }
    }

    /**
     * Get conversation summary
     */
    async getConversationsSummary() {
        return await conversationStore.getConversationsSummary();
    }

    /**
     * Get current conversation state
     */
    getCurrentState() {
        return {
            messages: this.currentMessages,
            conversationId: this.currentConversationId,
            messageCount: this.currentMessages.length
        };
    }
} 