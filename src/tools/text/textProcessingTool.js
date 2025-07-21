import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Text analysis tool
export const analyzeTextTool = tool(async (input) => {
    try {
        const text = input.text;
        
        if (!text || text.trim().length === 0) {
            return "❌ Error: No text provided for analysis";
        }

        // Basic text statistics
        const chars = text.length;
        const charsNoSpaces = text.replace(/\s/g, '').length;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
        const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
        const lines = text.split('\n').length;
        
        // Average calculations
        const avgWordsPerSentence = sentences > 0 ? (words / sentences).toFixed(2) : 0;
        const avgCharsPerWord = words > 0 ? (charsNoSpaces / words).toFixed(2) : 0;
        
        return `📊 Text Analysis Results:\n\n` +
               `📝 Characters: ${chars} (${charsNoSpaces} without spaces)\n` +
               `🔤 Words: ${words}\n` +
               `📄 Sentences: ${sentences}\n` +
               `📋 Paragraphs: ${paragraphs}\n` +
               `📏 Lines: ${lines}\n\n` +
               `📈 Averages:\n` +
               `  • Words per sentence: ${avgWordsPerSentence}\n` +
               `  • Characters per word: ${avgCharsPerWord}`;

    } catch (error) {
        return `❌ Error analyzing text: ${error.message}`;
    }
}, {
    name: "analyze_text",
    description: "Analyze text and provide statistics like word count, character count, sentences, etc.",
    schema: z.object({
        text: z.string().describe("The text to analyze"),
    }),
});

// Text transformation tool
export const transformTextTool = tool(async (input) => {
    try {
        const text = input.text;
        const operation = input.operation;
        
        if (!text) {
            return "❌ Error: No text provided for transformation";
        }

        let result = "";
        
        switch (operation) {
            case "uppercase":
                result = text.toUpperCase();
                break;
            case "lowercase":
                result = text.toLowerCase();
                break;
            case "title_case":
                result = text.replace(/\w\S*/g, (txt) => 
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
                break;
            case "reverse":
                result = text.split('').reverse().join('');
                break;
            case "remove_spaces":
                result = text.replace(/\s+/g, '');
                break;
            case "trim":
                result = text.trim();
                break;
            case "remove_duplicates":
                // Remove duplicate words
                const words = text.split(/\s+/);
                const uniqueWords = [...new Set(words)];
                result = uniqueWords.join(' ');
                break;
            case "word_wrap":
                // Wrap text at 80 characters
                const lineLength = 80;
                const words_wrap = text.split(' ');
                let line = '';
                let lines = [];
                
                words_wrap.forEach(word => {
                    if ((line + word).length > lineLength) {
                        if (line) lines.push(line.trim());
                        line = word + ' ';
                    } else {
                        line += word + ' ';
                    }
                });
                if (line) lines.push(line.trim());
                result = lines.join('\n');
                break;
            default:
                return `❌ Error: Unknown operation "${operation}". Available operations: uppercase, lowercase, title_case, reverse, remove_spaces, trim, remove_duplicates, word_wrap`;
        }
        
        return `✅ Text transformation completed (${operation}):\n\n${result}`;

    } catch (error) {
        return `❌ Error transforming text: ${error.message}`;
    }
}, {
    name: "transform_text",
    description: "Transform text using various operations like uppercase, lowercase, reverse, etc.",
    schema: z.object({
        text: z.string().describe("The text to transform"),
        operation: z.enum([
            "uppercase", 
            "lowercase", 
            "title_case", 
            "reverse", 
            "remove_spaces", 
            "trim", 
            "remove_duplicates", 
            "word_wrap"
        ]).describe("The transformation operation to apply"),
    }),
});

// Text search and replace tool
export const replaceTextTool = tool(async (input) => {
    try {
        const text = input.text;
        const searchTerm = input.search;
        const replaceTerm = input.replace;
        const caseSensitive = input.case_sensitive || false;
        
        if (!text || !searchTerm) {
            return "❌ Error: Text and search term are required";
        }

        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        
        // Count matches before replacement
        const matches = text.match(regex) || [];
        const matchCount = matches.length;
        
        if (matchCount === 0) {
            return `🔍 No matches found for "${searchTerm}" in the text`;
        }
        
        const result = text.replace(regex, replaceTerm);
        
        return `✅ Text replacement completed:\n\n` +
               `🔍 Search term: "${searchTerm}"\n` +
               `🔄 Replace with: "${replaceTerm}"\n` +
               `📊 Replacements made: ${matchCount}\n` +
               `🔤 Case sensitive: ${caseSensitive}\n\n` +
               `📝 Result:\n${result}`;

    } catch (error) {
        return `❌ Error replacing text: ${error.message}`;
    }
}, {
    name: "replace_text",
    description: "Search and replace text with support for case sensitivity",
    schema: z.object({
        text: z.string().describe("The text to search in"),
        search: z.string().describe("The text to search for"),
        replace: z.string().describe("The text to replace with"),
        case_sensitive: z.boolean().optional().describe("Whether the search should be case sensitive (default: false)"),
    }),
});

// Extract information tool
export const extractInfoTool = tool(async (input) => {
    try {
        const text = input.text;
        const type = input.type;
        
        if (!text) {
            return "❌ Error: No text provided for extraction";
        }

        let result = "";
        
        switch (type) {
            case "emails":
                const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
                const emails = text.match(emailRegex) || [];
                result = emails.length > 0 ? 
                    `📧 Found ${emails.length} email(s):\n${emails.map((email, i) => `${i+1}. ${email}`).join('\n')}` :
                    "📧 No email addresses found";
                break;
                
            case "urls":
                const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
                const urls = text.match(urlRegex) || [];
                result = urls.length > 0 ? 
                    `🌐 Found ${urls.length} URL(s):\n${urls.map((url, i) => `${i+1}. ${url}`).join('\n')}` :
                    "🌐 No URLs found";
                break;
                
            case "phone_numbers":
                const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
                const phones = text.match(phoneRegex) || [];
                result = phones.length > 0 ? 
                    `📞 Found ${phones.length} phone number(s):\n${phones.map((phone, i) => `${i+1}. ${phone}`).join('\n')}` :
                    "📞 No phone numbers found";
                break;
                
            case "numbers":
                const numberRegex = /-?\d+\.?\d*/g;
                const numbers = text.match(numberRegex) || [];
                result = numbers.length > 0 ? 
                    `🔢 Found ${numbers.length} number(s):\n${numbers.map((num, i) => `${i+1}. ${num}`).join('\n')}` :
                    "🔢 No numbers found";
                break;
                
            default:
                return `❌ Error: Unknown extraction type "${type}". Available types: emails, urls, phone_numbers, numbers`;
        }
        
        return result;

    } catch (error) {
        return `❌ Error extracting information: ${error.message}`;
    }
}, {
    name: "extract_info",
    description: "Extract specific types of information from text (emails, URLs, phone numbers, etc.)",
    schema: z.object({
        text: z.string().describe("The text to extract information from"),
        type: z.enum(["emails", "urls", "phone_numbers", "numbers"]).describe("The type of information to extract"),
    }),
}); 