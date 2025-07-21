// Message utilities - provide safe message type checking

/**
 * Get message type safely
 * @param {Object} message - Message object
 * @returns {string} Message type: 'human', 'ai', or 'unknown'
 */
export function getMessageType(message) {
    if (!message) return 'unknown';

    // First try standard method
    if (typeof message._getType === 'function') {
        return message._getType();
    }

    // Backup method 1: check constructor name
    if (message.constructor && message.constructor.name) {
        switch (message.constructor.name) {
            case 'HumanMessage':
                return 'human';
            case 'AIMessage':
                return 'ai';
        }
    }

    // Backup method 2: check type property
    if (message.type) {
        return message.type;
    }

    // Backup method 3: check content characteristics
    if (message.content !== undefined) {
        // Simple heuristic check
        if (message.tool_calls && message.tool_calls.length > 0) {
            return 'ai';
        }
    }

    return 'unknown';
}

/**
 * Check if message is human message
 * @param {Object} message - Message object
 * @returns {boolean}
 */
export function isHumanMessage(message) {
    return getMessageType(message) === 'human';
}

/**
 * Check if message is AI message
 * @param {Object} message - Message object
 * @returns {boolean}
 */
export function isAIMessage(message) {
    return getMessageType(message) === 'ai';
}

/**
 * Get message content safely
 * @param {Object} message - Message object
 * @returns {string} Message content
 */
export function getMessageContent(message) {
    return message && message.content ? message.content : '';
}

/**
 * Format message for display
 * @param {Object} message - Message object
 * @param {number} maxLength - Maximum length, default 100
 * @returns {string} Formatted content
 */
export function formatMessageForDisplay(message, maxLength = 100) {
    const content = getMessageContent(message);
    if (content.length <= maxLength) {
        return content;
    }
    return content.substring(0, maxLength) + '...';
}

/**
 * Get message display name (speaker)
 * @param {Object} message - Message object
 * @returns {string} Speaker name
 */
export function getMessageSpeaker(message) {
    const type = getMessageType(message);
    switch (type) {
        case 'human':
            return 'You';
        case 'ai':
            return '🤖';
        default:
            return 'System';
    }
} 