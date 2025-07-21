import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { feedbackService } from "../../core/feedbackService.js";

/**
 * User rating submission tool for collecting star ratings (1-5) and optional comments
 * This helps improve the AI model through user evaluation feedback
 */
export const submitRatingTool = tool(async (input) => {
    try {
        // Initialize feedback service if not already done
        if (!feedbackService.isInitialized) {
            await feedbackService.initialize();
        }

        // Validate star rating
        const starRating = parseInt(input.starRating);
        if (isNaN(starRating) || starRating < 1 || starRating > 5) {
            return "❌ Error: Star rating must be between 1 and 5.";
        }

        // Submit rating using feedback service
        const result = await feedbackService.collectFeedback({
            starRating: starRating,
            comment: input.comment || "",
            key: input.key || "user_rating",
            runId: input.runId
        });

        // Create response with star visualization
        const starEmoji = feedbackService.getStarEmoji(starRating);
        let response = `${starEmoji} **Thank you for your ${starRating}-star rating!**\n\n`;
        
        if (input.comment) {
            response += `💬 **Your comment:** "${input.comment}"\n\n`;
        }
        
        response += `📊 **Rating Details:**\n`;
        response += `   • Stars: ${starRating}/5\n`;
        response += `   • Category: ${input.key || 'user_rating'}\n`;
        
        if (result.submitted) {
            response += `\n✅ Your rating has been submitted to LangSmith to help improve our AI system!`;
        } else {
            response += `\n📝 Your rating has been recorded locally.`;
        }
        
        response += `\n\n🎯 This feedback will help train and improve future AI responses!`;
        
        return response;

    } catch (error) {
        console.error("Rating submission error:", error);
        return `❌ Error submitting rating: ${error.message}`;
    }
}, {
    name: "submit_user_rating",
    description: "Submit user rating (1-5 stars) and optional comment to evaluate AI output quality. Used for collecting feedback to improve the AI system.",
    schema: z.object({
        starRating: z.number().int().min(1).max(5).describe("User rating from 1 (poor) to 5 (excellent) stars"),
        comment: z.string().optional().describe("Optional comment explaining the rating or suggestions for improvement"),
        key: z.string().optional().describe("Rating category (default: 'user_rating')"),
        runId: z.string().optional().describe("LangSmith run ID to attach rating to (if available)")
    }),
});

/**
 * Feedback tool for processing user rating input in various formats
 * This is the main tool for handling user feedback during conversation
 */
export const feedbackTool = tool(async (input) => {
    try {
        // Initialize feedback service if not already done
        if (!feedbackService.isInitialized) {
            await feedbackService.initialize();
        }

        // Process the user feedback input
        const result = await feedbackService.processUserFeedback(
            input.userInput,
            input.aiResponse || "",
            input.runId
        );

        if (result.success) {
            return result.message;
        } else {
            // If parsing failed, show help and prompt again
            let errorResponse = `❌ ${result.error}\n\n`;
            errorResponse += `**Please rate using one of these formats:**\n`;
            errorResponse += `• **Simple:** "5", "4", "3", etc.\n`;
            errorResponse += `• **With stars:** "5 stars", "4 stars"\n`;
            errorResponse += `• **With comment:** "4 - Very helpful!", "3 - Could be better"\n`;
            errorResponse += `• **Formal:** "Rating: 5", "Score: 4"\n\n`;
            errorResponse += `**Rating scale:**\n`;
            errorResponse += `⭐⭐⭐⭐⭐ 5 = Excellent\n`;
            errorResponse += `⭐⭐⭐⭐☆ 4 = Good\n`;
            errorResponse += `⭐⭐⭐☆☆ 3 = Average\n`;
            errorResponse += `⭐⭐☆☆☆ 2 = Poor\n`;
            errorResponse += `⭐☆☆☆☆ 1 = Very Poor\n\n`;
            errorResponse += `*Please try again with your rating:*`;
            
            return errorResponse;
        }

    } catch (error) {
        console.error("Feedback processing error:", error);
        return `❌ Error processing feedback: ${error.message}`;
    }
}, {
    name: "process_user_feedback",
    description: "Process user feedback input in natural language format. Handles various rating formats and submits to LangSmith for AI improvement.",
    schema: z.object({
        userInput: z.string().describe("User's feedback input (e.g., '5 stars', '4 - good response', 'Rating: 3')"),
        aiResponse: z.string().optional().describe("The AI response being rated"),
        runId: z.string().optional().describe("LangSmith run ID for feedback tracking")
    }),
});

/**
 * Interactive rating collection tool that prompts users to rate AI outputs
 */
export const collectUserRatingTool = tool(async (input) => {
    try {
        // Initialize feedback service if not already done
        if (!feedbackService.isInitialized) {
            await feedbackService.initialize();
        }

        // If user provided rating input, process it
        if (input.userInput) {
            const result = await feedbackService.processUserFeedback(
                input.userInput, 
                input.aiResponse || "", 
                input.runId
            );

            if (result.success) {
                return result.message;
            } else {
                return `❌ ${result.error}\n\nPlease try again with a format like:\n• "5" or "5 stars"\n• "4 - Very helpful"\n• "Rating: 3"`;
            }
        }

        // If no user input, generate rating prompt
        const prompt = feedbackService.generateFeedbackPrompt(
            input.aiResponse || "",
            input.context || ""
        );

        return prompt;

    } catch (error) {
        console.error("Rating collection error:", error);
        return `❌ Error collecting rating: ${error.message}`;
    }
}, {
    name: "collect_user_rating",
    description: "Display rating prompt or process user rating input. Supports natural language input formats like '4 stars', '5 - excellent', 'Rating: 3', etc.",
    schema: z.object({
        userInput: z.string().optional().describe("User's rating input to process (e.g., '4 stars', '5 - great job!', 'Rating: 3')"),
        aiResponse: z.string().optional().describe("The AI response/output to collect rating for"),
        context: z.string().optional().describe("Additional context about the interaction"),
        runId: z.string().optional().describe("LangSmith run ID to attach rating to (if available)")
    }),
}); 