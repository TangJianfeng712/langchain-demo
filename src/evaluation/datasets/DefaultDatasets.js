/**
 * Default Datasets for Evaluation
 * Contains predefined test datasets for different evaluation scenarios
 */

/**
 * Default workflow evaluation examples
 * @returns {Array} Array of workflow test examples
 */
export function getWorkflowExamples() {
    return [
        {
            inputs: { question: "Which country is Mount Kilimanjaro located in?" },
            outputs: { answer: "Mount Kilimanjaro is located in Tanzania." },
        },
        {
            inputs: { question: "What is Earth's lowest point?" },
            outputs: { answer: "Earth's lowest point is The Dead Sea." },
        },
        {
            inputs: { question: "What is 2 + 2?" },
            outputs: { answer: "2 + 2 equals 4." },
        },
        {
            inputs: { question: "What is the capital of France?" },
            outputs: { answer: "The capital of France is Paris." },
        },
        {
            inputs: { question: "How do I authenticate with the system?" },
            outputs: { answer: "You can authenticate by using the login tool with your email and password." },
        }
    ];
}

/**
 * Auth tools evaluation examples
 * @returns {Array} Array of auth tools test examples
 */
export function getAuthToolsExamples() {
    return [
        {
            inputs: { 
                question: "I need to login with email test@example.com and password 123456",
                tool: "login_funder"
            },
            outputs: { 
                expected: "login successful",
                expectedStatus: "success"
            },
        },
        {
            inputs: { 
                question: "Check my current authentication status",
                tool: "check_auth_status"
            },
            outputs: { 
                expected: "logged in",
                expectedStatus: "authenticated"
            },
        },
        {
            inputs: { 
                question: "Login with invalid credentials",
                tool: "login_funder"
            },
            outputs: { 
                expected: "login failed",
                expectedStatus: "error"
            },
        },
        {
            inputs: { 
                question: "Get my authentication data",
                tool: "get_auth_data"
            },
            outputs: { 
                expected: "auth data",
                expectedStatus: "success"
            },
        }
    ];
}

/**
 * Data tools evaluation examples
 * @returns {Array} Array of data tools test examples
 */
export function getDataToolsExamples() {
    return [
        {
            inputs: { 
                question: "Get the first page of funders list",
                tool: "get_funders_list"
            },
            outputs: { 
                expected: "funders list get successful",
                expectedStatus: "success"
            },
        },
        {
            inputs: { 
                question: "Search for funders with keyword 'tech'",
                tool: "get_funders_list"
            },
            outputs: { 
                expected: "funders list get successful",
                expectedStatus: "success"
            },
        },
        {
            inputs: { 
                question: "Get funders list without authentication",
                tool: "get_funders_list"
            },
            outputs: { 
                expected: "not logged in",
                expectedStatus: "error"
            },
        },
        {
            inputs: { 
                question: "Get funders with pagination (page 2, limit 5)",
                tool: "get_funders_list"
            },
            outputs: { 
                expected: "funders list get successful",
                expectedStatus: "success"
            },
        }
    ];
}

/**
 * Performance evaluation examples
 * @returns {Array} Array of performance test examples
 */
export function getPerformanceExamples() {
    return [
        {
            inputs: { question: "What is the weather like today?" },
            outputs: { maxResponseTime: 5000 }, // 5 seconds max
        },
        {
            inputs: { question: "Calculate 100 * 50" },
            outputs: { maxResponseTime: 2000 }, // 2 seconds max
        },
        {
            inputs: { question: "Search for recent news" },
            outputs: { maxResponseTime: 8000 }, // 8 seconds max
        }
    ];
}

/**
 * Custom dataset builder
 * @param {string} name - Dataset name
 * @param {Array} examples - Array of examples
 * @param {string} description - Dataset description
 * @returns {Object} Dataset configuration
 */
export function createCustomDataset(name, examples, description = "Custom evaluation dataset") {
    return {
        name,
        description,
        examples,
        metadata: {
            createdAt: new Date().toISOString(),
            exampleCount: examples.length,
            type: "custom"
        }
    };
} 