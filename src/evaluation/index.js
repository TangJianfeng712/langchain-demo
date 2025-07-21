// Evaluation module exports
export { EvaluationManager } from './EvaluationManager.js';
export { BaseEvaluationService } from './services/BaseEvaluationService.js';
export { WorkflowEvaluationService } from './services/WorkflowEvaluationService.js';
export { ToolsEvaluationService } from './services/ToolsEvaluationService.js';
export { LocalEvaluationService } from './services/LocalEvaluationService.js';

// Create and export singleton instance
import { EvaluationManager } from './EvaluationManager.js';
export const evaluationManager = new EvaluationManager(); 