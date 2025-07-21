// Core tools exports - organized by category

// Auth tools
export { 
    authTools, 
    authToolsNode, 
    authModel,
    loginTool,
    checkAuthTool,
    getAuthDataTool,
    authenticatedRequestTool
} from './auth/index.js';

// Data tools
export { 
    dataTools, 
    dataToolsNode, 
    dataModel,
    getFundersTool,
    interactiveFundersTool
} from './data/index.js';

// Router tools
export { 
    routerModel, 
    routeToToolSet,
    routerTools,
    routerToolsNode
} from './router/index.js';

// Search tools
export {
    searchTools,
    searchToolsNode,
    searchModel,
    webSearchTool,
    quickSearchTool
} from './search/index.js';

// File operation tools
export {
    fileTools,
    fileToolsNode,
    fileModel,
    readFileTool,
    writeFileTool,
    listDirectoryTool,
    deleteFileTool
} from './file/index.js';

// Text processing tools
export {
    textTools,
    textToolsNode,
    textModel,
    analyzeTextTool,
    transformTextTool,
    replaceTextTool,
    extractInfoTool
} from './text/index.js';

// Math calculation tools
export {
    mathTools,
    mathToolsNode,
    mathModel,
    calculatorTool,
    statisticsTool,
    unitConverterTool
} from './math/index.js';

// HTTP request tools
export {
    httpTools,
    httpToolsNode,
    httpModel,
    httpGetTool,
    httpPostTool,
    urlAnalyzerTool,
    pingTool
} from './http/index.js';

// Result tools
export * from './result/index.js';

// Convenience exports - all tools combined
import { authTools } from './auth/index.js';
import { dataTools } from './data/index.js';
import { searchTools } from './search/index.js';
import { fileTools } from './file/index.js';
import { textTools } from './text/index.js';
import { mathTools } from './math/index.js';
import { httpTools } from './http/index.js';
import { resultTools } from './result/index.js';

export const allTools = [
    ...authTools,
    ...dataTools,
    ...searchTools,
    ...fileTools,
    ...textTools,
    ...mathTools,
    ...httpTools,
    ...resultTools
];

// Categorized tool collections
export const utilityTools = [
    ...searchTools,
    ...fileTools,
    ...textTools,
    ...mathTools,
    ...httpTools,
    ...resultTools
];

export const businessTools = [
    ...authTools,
    ...dataTools
]; 