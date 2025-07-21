import { tool } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";

// Create Tavily search tool instance lazily
let tavilySearch = null;

function getTavilySearch() {
    if (!tavilySearch) {
        tavilySearch = new TavilySearch({
            maxResults: 5,
            searchDepth: "advanced", // Use advanced search for better results
            apiKey: process.env.TAVILY_API_KEY || "dummy-key-for-testing"
        });
    }
    return tavilySearch;
}

// Web search tool using Tavily
export const webSearchTool = tool(async (input) => {
    try {
        if (!process.env.TAVILY_API_KEY) {
            return "❌ Error: TAVILY_API_KEY not found in environment variables. Please set your Tavily API key.";
        }

        const searchResult = await getTavilySearch().invoke({
            query: input.query
        });

        // Handle the response structure - TavilySearch returns an object with results array
        let results;
        if (searchResult && typeof searchResult === 'object') {
            // Check if it's an error response
            if (searchResult.error) {
                return `🔍 No search results found for query: "${input.query}"\n💡 Suggestion: ${searchResult.error}`;
            }
            
            if (Array.isArray(searchResult)) {
                results = searchResult;
            } else if (searchResult.results && Array.isArray(searchResult.results)) {
                results = searchResult.results;
            } else {
                console.log("Unexpected search result format:", searchResult);
                return `🔍 No search results found for query: "${input.query}"`;
            }
        } else {
            return `🔍 No search results found for query: "${input.query}"`;
        }

        if (!results || results.length === 0) {
            return `🔍 No search results found for query: "${input.query}"`;
        }

        let response = `🔍 Search results for: "${input.query}"\n\n`;
        
        results.forEach((result, index) => {
            response += `${index + 1}. **${result.title || 'No title'}**\n`;
            response += `   URL: ${result.url || 'No URL'}\n`;
            response += `   Summary: ${result.content || 'No content'}\n\n`;
        });

        return response;

    } catch (error) {
        console.error("Search error:", error);
        return `❌ Search failed: ${error.message}`;
    }
}, {
    name: "web_search",
    description: "Search the web using Tavily API to get current information from the internet",
    schema: z.object({
        query: z.string().describe("The search query to look up on the web"),
    }),
});

// Quick search tool with fewer results
export const quickSearchTool = tool(async (input) => {
    try {
        if (!process.env.TAVILY_API_KEY) {
            return "❌ Error: TAVILY_API_KEY not found in environment variables.";
        }

        const quickSearch = new TavilySearch({
            maxResults: 3,
            searchDepth: "advanced", // Use advanced search for better results
            apiKey: process.env.TAVILY_API_KEY || "dummy-key-for-testing"
        });

        const searchResult = await quickSearch.invoke({
            query: input.query
        });

        // Handle the response structure - TavilySearch returns an object with results array
        let results;
        if (searchResult && typeof searchResult === 'object') {
            // Check if it's an error response
            if (searchResult.error) {
                return `🔍 No results found for: "${input.query}"\n💡 Suggestion: ${searchResult.error}`;
            }
            
            if (Array.isArray(searchResult)) {
                results = searchResult;
            } else if (searchResult.results && Array.isArray(searchResult.results)) {
                results = searchResult.results;
            } else {
                console.log("Unexpected search result format:", searchResult);
                return `🔍 No results found for: "${input.query}"`;
            }
        } else {
            return `🔍 No results found for: "${input.query}"`;
        }

        if (!results || results.length === 0) {
            return `🔍 No results found for: "${input.query}"`;
        }

        let response = `⚡ Quick search: "${input.query}"\n\n`;
        
        results.forEach((result, index) => {
            response += `${index + 1}. ${result.title || 'No title'}\n`;
            response += `   ${result.url || 'No URL'}\n`;
            response += `   ${(result.content || 'No content').substring(0, 150)}...\n\n`;
        });

        return response;

    } catch (error) {
        console.error("Quick search error:", error);
        return `❌ Quick search failed: ${error.message}`;
    }
}, {
    name: "quick_search", 
    description: "Perform a quick web search with fewer results for faster response",
    schema: z.object({
        query: z.string().describe("The search query"),
    }),
}); 