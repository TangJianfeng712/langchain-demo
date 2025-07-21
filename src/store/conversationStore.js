import PersistentStorage from './persistentStorage.js';
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getMessageType, isHumanMessage } from './messageUtils.js';

// Conversation store
class ConversationStore {
    constructor() {
        this.storage = new PersistentStorage('conversations.json');
        this.maxHistorySize = 100; // Maximum history size
    }

    // Serialize message object to saveable format
    serializeMessage(message) {
        return {
            type: getMessageType(message),
            content: message.content,
            timestamp: new Date().toISOString(),
            // Save tool calls (if any)
            tool_calls: message.tool_calls || null,
            tool_call_id: message.tool_call_id || null
        };
    }

    // deserialize message object
    deserializeMessage(messageData) {
        if (messageData.type === 'human') {
            return new HumanMessage(messageData.content);
        } else if (messageData.type === 'ai') {
            const aiMessage = new AIMessage(messageData.content);
            if (messageData.tool_calls) {
                aiMessage.tool_calls = messageData.tool_calls;
            }
            return aiMessage;
        }
        // Return original data if other type
        return messageData;
    }

    // Load conversation history
    async loadConversations() {
        const data = await this.storage.load({ conversations: [] });

        // Deserialize message objects
        const conversations = data.conversations.map(conv => ({
            ...conv,
            messages: conv.messages.map(msg => this.deserializeMessage(msg))
        }));

        return conversations;
    }

    // Save conversation history
    async saveConversations(conversations) {
        // Serialize message objects
        const serializedConversations = conversations.map(conv => ({
            ...conv,
            messages: conv.messages.map(msg => this.serializeMessage(msg))
        }));

        return await this.storage.save({ conversations: serializedConversations });
    }

    // Add new conversation
    async addConversation(messages, title = null) {
        const conversations = await this.loadConversations();

        const newConversation = {
            id: Date.now().toString(),
            title: title || this.generateTitle(messages),
            messages: messages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        conversations.unshift(newConversation); // Latest conversation at the front

        // Limit history size
        if (conversations.length > this.maxHistorySize) {
            conversations.splice(this.maxHistorySize);
        }

        await this.saveConversations(conversations);
        return newConversation.id;
    }

    // Update existing conversation
    async updateConversation(conversationId, messages) {
        const conversations = await this.loadConversations();
        const index = conversations.findIndex(conv => conv.id === conversationId);

        if (index !== -1) {
            conversations[index].messages = messages;
            conversations[index].updatedAt = new Date().toISOString();
            await this.saveConversations(conversations);
            return true;
        }

        return false;
    }

    // Get recent conversation
    async getRecentConversation() {
        const conversations = await this.loadConversations();
        return conversations.length > 0 ? conversations[0] : null;
    }

    // Get conversation by ID
    async getConversationById(conversationId) {
        const conversations = await this.loadConversations();
        return conversations.find(conv => conv.id === conversationId) || null;
    }

    // Get all conversations
    async getAllConversations() {
        return await this.loadConversations();
    }

    // Get conversation summary
    async getConversationsSummary() {
        const conversations = await this.loadConversations();

        if (conversations.length === 0) {
            return '📝 No conversation history';
        }

        let summary = `📚 ${conversations.length} conversations:\n`;
        conversations.slice(0, 5).forEach((conv, index) => {
            const messageCount = conv.messages.length;
            const lastUpdate = new Date(conv.updatedAt).toLocaleString();
            summary += `${index + 1}. ${conv.title} (${messageCount} messages, ${lastUpdate})\n`;
        });

        if (conversations.length > 5) {
            summary += `... ${conversations.length - 5} more earlier conversations`;
        }

        return summary;
    }

    // Generate conversation title
    generateTitle(messages) {
        if (messages.length === 0) return 'New conversation';

        const firstHumanMessage = messages.find(msg => isHumanMessage(msg));
        if (firstHumanMessage) {
            let title = firstHumanMessage.content.substring(0, 30);
            if (firstHumanMessage.content.length > 30) {
                title += '...';
            }
            return title;
        }

        return `Conversation ${new Date().toLocaleString()}`;
    }

    // Clear all conversations
    async clearAllConversations() {
        await this.storage.save({ conversations: [] });
    }
}

// Create global instance
const conversationStore = new ConversationStore();

export default conversationStore; 