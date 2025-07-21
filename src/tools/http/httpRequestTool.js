import { tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from 'axios';

// HTTP GET request tool
export const httpGetTool = tool(async (input) => {
    try {
        const url = input.url;
        const headers = input.headers || {};
        const timeout = input.timeout || 30000; // 30 seconds default
        
        if (!url) {
            return "❌ Error: URL is required for HTTP GET request";
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (error) {
            return `❌ Error: Invalid URL format: ${url}`;
        }

        const response = await axios.get(url, {
            headers,
            timeout,
            validateStatus: () => true // Don't throw for any status code
        });

        const responseInfo = {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data
        };

        // Truncate large responses
        let dataPreview = typeof response.data === 'string' 
            ? response.data.substring(0, 1000) 
            : JSON.stringify(response.data, null, 2).substring(0, 1000);
        
        if ((typeof response.data === 'string' ? response.data : JSON.stringify(response.data)).length > 1000) {
            dataPreview += '\n... (truncated)';
        }

        return `🌐 HTTP GET Response:\n\n` +
               `📍 URL: ${url}\n` +
               `📊 Status: ${response.status} ${response.statusText}\n` +
               `📋 Headers: ${JSON.stringify(response.headers, null, 2)}\n\n` +
               `📄 Response Data:\n${dataPreview}`;

    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return `❌ Error: Request timeout after ${input.timeout || 30000}ms`;
        } else if (error.code === 'ENOTFOUND') {
            return `❌ Error: DNS resolution failed for ${input.url}`;
        } else if (error.code === 'ECONNREFUSED') {
            return `❌ Error: Connection refused to ${input.url}`;
        } else {
            return `❌ Error making HTTP GET request: ${error.message}`;
        }
    }
}, {
    name: "http_get",
    description: "Make an HTTP GET request to a specified URL with optional headers and timeout",
    schema: z.object({
        url: z.string().describe("The URL to send the GET request to"),
        headers: z.record(z.string()).optional().describe("Optional HTTP headers as key-value pairs"),
        timeout: z.number().optional().describe("Request timeout in milliseconds (default: 30000)"),
    }),
});

// HTTP POST request tool
export const httpPostTool = tool(async (input) => {
    try {
        const url = input.url;
        const data = input.data || {};
        const headers = input.headers || {};
        const timeout = input.timeout || 30000;
        
        if (!url) {
            return "❌ Error: URL is required for HTTP POST request";
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (error) {
            return `❌ Error: Invalid URL format: ${url}`;
        }

        // Set default content-type if not provided
        if (!headers['content-type'] && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await axios.post(url, data, {
            headers,
            timeout,
            validateStatus: () => true
        });

        // Truncate large responses
        let dataPreview = typeof response.data === 'string' 
            ? response.data.substring(0, 1000) 
            : JSON.stringify(response.data, null, 2).substring(0, 1000);
        
        if ((typeof response.data === 'string' ? response.data : JSON.stringify(response.data)).length > 1000) {
            dataPreview += '\n... (truncated)';
        }

        return `🌐 HTTP POST Response:\n\n` +
               `📍 URL: ${url}\n` +
               `📊 Status: ${response.status} ${response.statusText}\n` +
               `📋 Headers: ${JSON.stringify(response.headers, null, 2)}\n\n` +
               `📄 Response Data:\n${dataPreview}`;

    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return `❌ Error: Request timeout after ${input.timeout || 30000}ms`;
        } else if (error.code === 'ENOTFOUND') {
            return `❌ Error: DNS resolution failed for ${input.url}`;
        } else if (error.code === 'ECONNREFUSED') {
            return `❌ Error: Connection refused to ${input.url}`;
        } else {
            return `❌ Error making HTTP POST request: ${error.message}`;
        }
    }
}, {
    name: "http_post",
    description: "Make an HTTP POST request to a specified URL with data, headers, and timeout options",
    schema: z.object({
        url: z.string().describe("The URL to send the POST request to"),
        data: z.any().optional().describe("The data to send in the request body"),
        headers: z.record(z.string()).optional().describe("Optional HTTP headers as key-value pairs"),
        timeout: z.number().optional().describe("Request timeout in milliseconds (default: 30000)"),
    }),
});

// URL analyzer tool
export const urlAnalyzerTool = tool(async (input) => {
    try {
        const url = input.url;
        
        if (!url) {
            return "❌ Error: URL is required for analysis";
        }

        // Validate and parse URL
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (error) {
            return `❌ Error: Invalid URL format: ${url}`;
        }

        // Make a HEAD request to get basic info without downloading content
        try {
            const response = await axios.head(url, {
                timeout: 10000,
                validateStatus: () => true
            });

            const analysis = {
                protocol: parsedUrl.protocol,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80'),
                pathname: parsedUrl.pathname,
                search: parsedUrl.search,
                hash: parsedUrl.hash,
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers['content-type'] || 'Unknown',
                contentLength: response.headers['content-length'] || 'Unknown',
                lastModified: response.headers['last-modified'] || 'Unknown',
                server: response.headers['server'] || 'Unknown'
            };

            return `🔍 URL Analysis Results:\n\n` +
                   `🌐 URL Components:\n` +
                   `  • Protocol: ${analysis.protocol}\n` +
                   `  • Hostname: ${analysis.hostname}\n` +
                   `  • Port: ${analysis.port}\n` +
                   `  • Path: ${analysis.pathname}\n` +
                   `  • Query: ${analysis.search || 'None'}\n` +
                   `  • Fragment: ${analysis.hash || 'None'}\n\n` +
                   `📊 Server Response:\n` +
                   `  • Status: ${analysis.status} ${analysis.statusText}\n` +
                   `  • Content Type: ${analysis.contentType}\n` +
                   `  • Content Length: ${analysis.contentLength}\n` +
                   `  • Last Modified: ${analysis.lastModified}\n` +
                   `  • Server: ${analysis.server}`;

        } catch (headError) {
            // If HEAD request fails, provide basic URL parsing info
            return `🔍 URL Analysis Results:\n\n` +
                   `🌐 URL Components:\n` +
                   `  • Protocol: ${parsedUrl.protocol}\n` +
                   `  • Hostname: ${parsedUrl.hostname}\n` +
                   `  • Port: ${parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80')}\n` +
                   `  • Path: ${parsedUrl.pathname}\n` +
                   `  • Query: ${parsedUrl.search || 'None'}\n` +
                   `  • Fragment: ${parsedUrl.hash || 'None'}\n\n` +
                   `⚠️ Server Response: Could not connect to server\n` +
                   `Error: ${headError.message}`;
        }

    } catch (error) {
        return `❌ Error analyzing URL: ${error.message}`;
    }
}, {
    name: "url_analyzer",
    description: "Analyze a URL and provide information about its components and server response",
    schema: z.object({
        url: z.string().describe("The URL to analyze"),
    }),
});

// Simple ping tool
export const pingTool = tool(async (input) => {
    try {
        const url = input.url;
        const count = input.count || 1;
        
        if (!url) {
            return "❌ Error: URL is required for ping test";
        }

        // Validate URL or hostname
        let targetUrl;
        try {
            // If it's already a URL, use it
            if (url.startsWith('http://') || url.startsWith('https://')) {
                targetUrl = url;
            } else {
                // If it's just a hostname, add protocol
                targetUrl = `https://${url}`;
            }
            new URL(targetUrl);
        } catch (error) {
            return `❌ Error: Invalid URL or hostname: ${url}`;
        }

        const results = [];
        let successCount = 0;
        let totalTime = 0;

        for (let i = 0; i < Math.min(count, 10); i++) { // Limit to 10 pings max
            const startTime = Date.now();
            
            try {
                const response = await axios.head(targetUrl, {
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                results.push({
                    attempt: i + 1,
                    status: response.status,
                    time: responseTime,
                    success: response.status < 400
                });
                
                if (response.status < 400) {
                    successCount++;
                    totalTime += responseTime;
                }
                
            } catch (error) {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                results.push({
                    attempt: i + 1,
                    status: 'Error',
                    time: responseTime,
                    success: false,
                    error: error.message
                });
            }
            
            // Add delay between pings (except for the last one)
            if (i < count - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const avgTime = successCount > 0 ? (totalTime / successCount).toFixed(2) : 'N/A';
        const successRate = ((successCount / results.length) * 100).toFixed(1);

        let report = `🏓 Ping Test Results for ${targetUrl}:\n\n`;
        
        results.forEach(result => {
            const status = result.success ? `✅ ${result.status}` : `❌ ${result.status}`;
            const error = result.error ? ` (${result.error})` : '';
            report += `  ${result.attempt}. ${status} - ${result.time}ms${error}\n`;
        });
        
        report += `\n📊 Summary:\n`;
        report += `  • Success Rate: ${successRate}% (${successCount}/${results.length})\n`;
        report += `  • Average Response Time: ${avgTime}ms\n`;

        return report;

    } catch (error) {
        return `❌ Error performing ping test: ${error.message}`;
    }
}, {
    name: "ping",
    description: "Test connectivity to a URL or hostname by sending HTTP requests and measuring response times",
    schema: z.object({
        url: z.string().describe("The URL or hostname to ping"),
        count: z.number().optional().describe("Number of ping attempts (default: 1, max: 10)"),
    }),
}); 