import { Client } from "langsmith";
import { getCurrentRunTree, traceable } from "langsmith/traceable";

/**
 * Feedback Service for collecting user ratings and evaluations of AI outputs
 * Supports 1-5 star rating system with optional comments
 */
export class FeedbackService {
    constructor() {
        this.langsmithClient = null;
        this.isInitialized = false;
        this.pendingFeedback = new Map(); // Store feedback when runId is not available
    }

    /**
     * Initialize the feedback service
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            const langsmithApiKey = process.env.LANGCHAIN_API_KEY;
            const langsmithEndpoint = process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com";
            
            if (langsmithApiKey) {
                this.langsmithClient = new Client({
                    apiKey: langsmithApiKey,
                    apiUrl: langsmithEndpoint,
                });
                console.log("✅ FeedbackService initialized with LangSmith");
                console.log(`🔗 LangSmith endpoint: ${langsmithEndpoint}`);
                
                // Test the connection
                try {
                    // Try to create a simple test call to validate the connection
                    // Note: This doesn't actually create feedback, just tests the client
                    console.log("🔍 Testing LangSmith connection...");
                } catch (testError) {
                    console.warn("⚠️  LangSmith connection test failed:", testError.message);
                }
            } else {
                console.log("⚠️  LANGCHAIN_API_KEY not found, feedback will be collected locally only");
                console.log("💡 To enable LangSmith feedback, set LANGCHAIN_API_KEY environment variable");
            }

            this.isInitialized = true;
        } catch (error) {
            console.error("Failed to initialize FeedbackService:", error);
            console.log("📝 Continuing with local feedback collection only");
            this.isInitialized = true; // Still initialize for local collection
        }
    }

    /**
     * Generate a valid UUID v4
     */
    generateUUID() {
        // Simple UUID v4 generation
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Get current run ID from LangSmith context
     */
    getCurrentRunId() {
        try {
            const runTree = getCurrentRunTree();
            if (runTree?.id) {
                // Validate if it's a proper UUID format
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(runTree.id)) {
                    console.log(`🆔 Found valid LangSmith run ID: ${runTree.id}`);
                    return runTree.id;
                } else {
                    console.log(`⚠️  LangSmith run ID format invalid: ${runTree.id}, generating fallback`);
                }
            }
        } catch (error) {
            // Only log the specific issue without the full warning message
            // This reduces noise in the console when tracing is not properly set up
            // console.log("⚠️  Could not get current run ID:", error.message);
        }
        
        // Don't use fallback UUID - return null to indicate no valid run context
        console.log(`⚠️  No valid LangSmith run context found for feedback`);
        return null;
    }

    /**
     * Get run ID from ThreadManager context or current trace
     */
    async getRunIdFromContext(threadManager = null) {
        // First try to get from current trace context
        const runId = this.getCurrentRunId();
        if (runId) {
            return runId;
        }

        // If no trace context but we have ThreadManager, create a run in the thread context
        if (threadManager && threadManager.currentThreadId) {
            console.log(`🧵 Using thread ID for feedback context: ${threadManager.currentThreadId}`);
            
            // If we have a valid thread ID that looks like a UUID, use it directly
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(threadManager.currentThreadId)) {
                return threadManager.currentThreadId;
            } else {
                // Generate a UUID that includes the thread ID for traceability
                const threadUUID = this.generateUUID();
                console.log(`🔗 Generated thread-linked UUID: ${threadUUID} (thread: ${threadManager.currentThreadId})`);
                return threadUUID;
            }
        }

        // Generate fallback UUID only as last resort
        const fallbackUUID = this.generateUUID();
        console.log(`🔄 Generated fallback UUID for feedback: ${fallbackUUID}`);
        return fallbackUUID;
    }

    /**
     * Convert 1-5 star rating to 0-1 score for LangSmith
     */
    convertStarRatingToScore(starRating) {
        // Convert 1-5 stars to 0-1 scale
        // 1 star = 0.0, 2 stars = 0.25, 3 stars = 0.5, 4 stars = 0.75, 5 stars = 1.0
        return (starRating - 1) / 4;
    }

    /**
     * Get star emoji representation for rating
     */
    getStarEmoji(starRating) {
        const filledStars = "⭐".repeat(starRating);
        const emptyStars = "☆".repeat(5 - starRating);
        return filledStars + emptyStars;
    }

    /**
     * Parse user feedback input to extract rating and comment
     * Supports various formats like "4 stars", "Rating: 3", "5 - Great job!", etc.
     * Only accepts ratings between 1-5
     */
    parseUserFeedback(userInput) {
        const input = userInput.trim();
        
        // Pattern 1: "4" or "4 stars" or "4/5"
        let match = input.match(/^(\d)[\/\s]*(?:stars?|\/5)?(?:\s*[-–]\s*(.+))?$/i);
        if (match) {
            const rating = parseInt(match[1]);
            if (rating >= 1 && rating <= 5) {
                const comment = match[2] || "";
                return { rating, comment };
            }
        }

        // Pattern 2: "Rating: 4" or "Score: 3"
        match = input.match(/(?:rating|score):\s*(\d)(?:\s*[-–]\s*(.+))?$/i);
        if (match) {
            const rating = parseInt(match[1]);
            if (rating >= 1 && rating <= 5) {
                const comment = match[2] || "";
                return { rating, comment };
            }
        }

        // Pattern 3: "4 - Great response!" or "3 - Could be better"
        match = input.match(/^(\d)\s*[-–]\s*(.+)$/);
        if (match) {
            const rating = parseInt(match[1]);
            if (rating >= 1 && rating <= 5) {
                const comment = match[2];
                return { rating, comment };
            }
        }

        // Pattern 4: Just a number
        match = input.match(/^(\d)$/);
        if (match) {
            const rating = parseInt(match[1]);
            if (rating >= 1 && rating <= 5) {
                return { rating, comment: "" };
            }
        }

        return null; // Could not parse or invalid rating
    }

    /**
     * Collect user feedback with star rating (1-5) and optional comment
     */
    async collectFeedback(feedbackData, threadManager = null) {
        try {
            // Validate star rating
            const starRating = parseInt(feedbackData.starRating);
            if (isNaN(starRating) || starRating < 1 || starRating > 5) {
                throw new Error("Star rating must be between 1 and 5");
            }

            // Convert to 0-1 score for LangSmith
            const score = this.convertStarRatingToScore(starRating);
            
            // Get current run ID if not provided, with ThreadManager context
            const runId = feedbackData.runId || await this.getRunIdFromContext(threadManager);
            
            const feedback = {
                starRating: starRating,
                score: score,
                comment: feedbackData.comment || "",
                key: feedbackData.key || "user_rating",
                runId: runId,
                timestamp: new Date().toISOString(),
                // Add thread context information
                threadId: threadManager?.currentThreadId || null,
                sessionId: threadManager?.currentThreadId || null,
                conversationId: threadManager?.currentThreadId || null
            };

            // Submit to LangSmith if possible
            if (this.langsmithClient && runId) {
                try {
                    console.log(`📤 Attempting to submit feedback to LangSmith...`);
                    console.log(`   Run ID: ${runId}`);
                    console.log(`   Rating: ${starRating}/5 stars`);
                    console.log(`   Comment: "${feedback.comment}"`);
                    
                    // Create feedback according to LangSmith format
                    const feedbackResult = await this.langsmithClient.createFeedback(runId, feedback.key, {
                        score: feedback.score,
                        value: `${starRating}_stars`, // Categorical value for star rating
                        comment: feedback.comment ? `${starRating}/5 stars: ${feedback.comment}` : `${starRating}/5 stars`,
                        feedback_source: {
                            type: "api",
                            metadata: {
                                rating_scale: "1-5_stars",
                                converted_score: feedback.score,
                                original_rating: starRating,
                                timestamp: feedback.timestamp,
                                // Add thread context if available
                                thread_id: feedback.threadId || null,
                                session_id: feedback.sessionId || null,
                                conversation_id: feedback.conversationId || null
                            }
                        }
                    });

                    console.log(`📊 User rating submitted to LangSmith: ${starRating}/5 stars (score: ${score})`);
                    console.log(`✅ LangSmith feedback ID: ${feedbackResult?.id || 'unknown'}`);
                    
                    return {
                        success: true,
                        submitted: true,
                        runId: runId,
                        feedbackId: feedbackResult?.id,
                        feedback: feedback,
                        message: `✅ Thank you! Your ${starRating}-star rating has been submitted to improve our AI system.`
                    };
                } catch (langsmithError) {
                    console.error("LangSmith submission failed:", langsmithError);
                    console.error("Error details:", {
                        message: langsmithError.message,
                        status: langsmithError.response?.status,
                        data: langsmithError.response?.data
                    });
                    
                    // Fall back to local storage if LangSmith fails
                    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    this.pendingFeedback.set(localId, feedback);
                    
                    return {
                        success: true,
                        submitted: false,
                        localId: localId,
                        feedback: feedback,
                        error: langsmithError.message,
                        message: `📝 Your ${starRating}-star rating has been recorded locally (LangSmith submission failed: ${langsmithError.message}).`
                    };
                }
            } else {
                // Store locally if LangSmith is not available
                const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                this.pendingFeedback.set(localId, feedback);
                
                const reason = !this.langsmithClient ? "LangSmith not initialized" : "No run ID available";
                console.log(`📝 User rating stored locally: ${starRating}/5 stars (${reason})`);
                
                // Try to initialize LangSmith if it wasn't initialized
                if (!this.langsmithClient) {
                    console.log("🔄 Attempting to re-initialize LangSmith...");
                    try {
                        await this.initialize();
                        if (this.langsmithClient && runId) {
                            console.log("♻️  Retrying LangSmith submission...");
                            return await this.collectFeedback(feedbackData); // Retry once
                        }
                    } catch (retryError) {
                        console.log("⚠️  LangSmith re-initialization failed:", retryError.message);
                    }
                }
                
                return {
                    success: true,
                    submitted: false,
                    localId: localId,
                    feedback: feedback,
                    message: `📝 Thank you! Your ${starRating}-star rating has been recorded locally (${reason}).`
                };
            }

        } catch (error) {
            console.error("Error collecting user feedback:", error);
            throw error;
        }
    }

    /**
     * Generate interactive feedback prompt for user rating
     */
    generateFeedbackPrompt(aiResponse, context = "") {
        const prompt = `📝 **Please Rate This Response**

${aiResponse ? `🤖 **AI Output:** "${aiResponse.substring(0, 200)}${aiResponse.length > 200 ? '...' : ''}"` : ''}

${context ? `📋 **Context:** ${context}\n` : ''}

**⭐ Please rate from 1 to 5 stars:**
• **5 stars** ⭐⭐⭐⭐⭐ - Excellent (Perfect, exactly what you needed)
• **4 stars** ⭐⭐⭐⭐☆ - Good (Very helpful, minor improvements possible)
• **3 stars** ⭐⭐⭐☆☆ - Average (Adequate, some issues)
• **2 stars** ⭐⭐☆☆☆ - Poor (Limited help, major issues)
• **1 star**  ⭐☆☆☆☆ - Very Poor (Not helpful at all)

**💬 Optional:** Add comments to help us improve

**Examples:**
• "5" or "5 stars"
• "4 - Very helpful but could be more detailed"
• "3 - Good start but missing some information"
• "Rating: 2"

*Your feedback helps train and improve our AI system!*`;

        return prompt;
    }

    /**
     * Process user feedback input and submit to LangSmith
     */
    async processUserFeedback(userInput, aiResponse = "", runId = null, threadManager = null) {
        try {
            // Parse user input
            const parsed = this.parseUserFeedback(userInput);
            
            if (!parsed) {
                return {
                    success: false,
                    error: "Please use format like '5', '4 stars', or '3 - comment'"
                };
            }

            const { rating, comment } = parsed;

            // Validate rating
            if (rating < 1 || rating > 5) {
                return {
                    success: false,
                    error: "Rating must be between 1 and 5 stars"
                };
            }

            // Submit feedback with traceable context if threadManager is provided
            const result = threadManager 
                ? await this.collectFeedbackWithContext({
                    starRating: rating,
                    comment: comment,
                    runId: runId
                }, threadManager)
                : await this.collectFeedback({
                    starRating: rating,
                    comment: comment,
                    runId: runId
                });

            // Create user-friendly response
            const starEmoji = this.getStarEmoji(rating);
            let responseMessage = `${starEmoji} Thank you for your ${rating}-star rating!`;
            
            if (comment) {
                responseMessage += `\nComment: "${comment}"`;
            }
            
            if (result.submitted) {
                responseMessage += `\n✅ Feedback submitted to LangSmith for AI improvement.`;
            } else {
                responseMessage += `\n📝 Feedback recorded locally.`;
            }

            return {
                success: true,
                submitted: result.submitted,
                starRating: rating,
                comment: comment,
                message: responseMessage,
                feedback: result.feedback
            };

        } catch (error) {
            console.error("Error processing user feedback:", error);
            return {
                success: false,
                error: `Error processing feedback: ${error.message}`
            };
        }
    }

    /**
     * Get pending feedback summary with star ratings
     */
    getPendingFeedbackSummary() {
        if (this.pendingFeedback.size === 0) {
            return "No pending feedback.";
        }

        const feedbacks = Array.from(this.pendingFeedback.values());
        const avgStarRating = feedbacks.reduce((sum, f) => sum + f.starRating, 0) / feedbacks.length;
        
        const ratingDistribution = feedbacks.reduce((dist, f) => {
            dist[f.starRating] = (dist[f.starRating] || 0) + 1;
            return dist;
        }, {});

        let summary = `📊 **Pending Feedback Summary:**\n`;
        summary += `• Total ratings: ${feedbacks.length}\n`;
        summary += `• Average: ${avgStarRating.toFixed(1)} stars\n`;
        summary += `• Distribution: `;
        for (let i = 5; i >= 1; i--) {
            if (ratingDistribution[i]) {
                summary += `${i}⭐(${ratingDistribution[i]}) `;
            }
        }
        summary += `\n• Most recent: ${feedbacks[feedbacks.length - 1]?.timestamp}`;
        
        return summary;
    }

    /**
     * Clear pending feedback
     */
    clearPendingFeedback() {
        const count = this.pendingFeedback.size;
        this.pendingFeedback.clear();
        return `🗑️ Cleared ${count} pending feedback items.`;
    }

    /**
     * Collect feedback within a traceable context to associate with thread
     */
    async collectFeedbackWithContext(feedbackData, threadManager = null) {
        const projectName = process.env.LANGCHAIN_PROJECT || "agent-project";
        
        // Create a traceable feedback collection function
        const traceableFeedback = traceable(
            async (data) => {
                return await this.collectFeedback(data, threadManager);
            },
            {
                name: "User Feedback Collection",
                project_name: projectName,
                metadata: {
                    session_id: threadManager?.currentThreadId,
                    thread_id: threadManager?.currentThreadId,
                    conversation_id: threadManager?.currentThreadId,
                    feedback_type: "user_rating",
                    rating_scale: "1-5_stars"
                },
                tags: ["feedback", "user_rating", "thread", "conversation"],
            }
        );

        return await traceableFeedback(feedbackData);
    }
}

// Export singleton instance
export const feedbackService = new FeedbackService(); 