import 'dotenv/config';
import { Application } from './core/index.js';
import { CLIInterface } from './cli/index.js';

/**
 * Handle local evaluation mode
 * @param {Application} app - Application instance
 * @param {string} mode - Evaluation mode
 */
async function handleLocalEvaluation(app, mode) {
    console.log(`🔍 Running local evaluation mode: ${mode}`);

    try {
        const result = await app.runEvaluation(mode);

        if (result.success) {
            console.log("✅ Local evaluation completed successfully!");

            if (result.metrics) {
                console.log("\n📊 Evaluation Metrics:");
                console.log(`   Success Rate: ${(result.metrics.successRate * 100).toFixed(1)}%`);
                console.log(`   Average Response Time: ${result.metrics.avgResponseTime.toFixed(0)}ms`);
                console.log(`   Total Tests: ${result.metrics.totalTests}`);
            }
        } else {
            console.log("❌ Local evaluation failed");
        }
    } catch (error) {
        console.error("❌ Local evaluation failed:", error.message);
        process.exit(1);
    }
}

/**
 * Handle LangSmith evaluation mode
 * @param {Application} app - Application instance
 * @param {string} mode - Evaluation mode
 */
async function handleLangSmithEvaluation(app, mode) {
    console.log(`🔍 Running LangSmith evaluation mode: ${mode}`);

    try {
        const result = await app.runLangSmithEvaluation(mode);

        if (result.success) {
            console.log("✅ LangSmith evaluation completed successfully!");

            if (result.datasetName) {
                console.log(`📊 Dataset: ${result.datasetName}`);
            }

            if (result.experimentPrefix) {
                console.log(`🔬 Experiment: ${result.experimentPrefix}`);
            }

            console.log("\n📊 Results available in LangSmith dashboard");
            console.log("🔗 Check your LangSmith project for detailed results");
        } else {
            console.log("❌ LangSmith evaluation failed");
        }
    } catch (error) {
        console.error("❌ LangSmith evaluation failed:", error.message);
        process.exit(1);
    }
}

/**
 * Handle tools evaluation mode
 * @param {Application} app - Application instance
 * @param {string} mode - Evaluation mode
 */
async function handleToolsEvaluation(app, mode) {
    console.log(`🔍 Running tools evaluation mode: ${mode}`);

    try {
        const result = await app.runToolsEvaluation(mode);

        if (result.success) {
            console.log("✅ Tools evaluation completed successfully!");

            if (result.summary) {
                console.log("\n📋 Evaluation Summary:");
                console.log(`   Auth Tools Dataset: ${result.summary.authToolsDataset}`);
                console.log(`   Data Tools Dataset: ${result.summary.dataToolsDataset}`);
                console.log(`   Auth Tools Experiment: ${result.summary.authToolsExperiment}`);
                console.log(`   Data Tools Experiment: ${result.summary.dataToolsExperiment}`);
            }

            console.log("\n📊 Results available in LangSmith dashboard");
            console.log("🔗 Check your LangSmith project for detailed results");
        } else {
            console.log("❌ Tools evaluation failed");
        }
    } catch (error) {
        console.error("❌ Tools evaluation failed:", error.message);
        process.exit(1);
    }
}

/**
 * Show evaluation services status
 * @param {Application} app - Application instance
 */
function showEvaluationStatus(app) {
    const evalStatus = app.getEvaluationStatus();
    const langSmithStatus = app.getLangSmithEvaluationStatus();
    const toolsStatus = app.getToolsEvaluationStatus();

    console.log(`📊 Evaluation Service: ${evalStatus.langsmithAvailable ? '✅ LangSmith' : '⚠️ Local only'}`);
    console.log(`🔬 LangSmith Evaluation: ${langSmithStatus.initialized ? '✅ Ready' : '❌ Not available'}`);
    console.log(`🔧 Tools Evaluation: ${toolsStatus.initialized ? '✅ Ready' : '❌ Not available'}`);
}

/**
 * Main entry point for the Agent application
 */
async function main() {
    try {
        // Create and initialize application
        const app = new Application();
        await app.initialize();

        // Parse command line arguments
        const args = process.argv.slice(2);
        const evaluationArg = args.find(arg => arg.startsWith('--evaluation'));

        if (evaluationArg) {
            const mode = evaluationArg.includes('=') ? evaluationArg.split('=')[1] : 'default';

            // Handle different evaluation modes
            if (mode === 'workflow') {
                await handleLangSmithEvaluation(app, 'complete');
            } else if (mode === 'tools') {
                await handleToolsEvaluation(app, 'comprehensive');
            } else if (mode === 'comprehensive') {
                await handleToolsEvaluation(app, 'comprehensive');
            } else if (mode === 'auth') {
                await handleToolsEvaluation(app, 'auth');
            } else if (mode === 'data') {
                await handleToolsEvaluation(app, 'data');
            } else if (mode === 'local') {
                await handleLocalEvaluation(app, 'default');
            } else {
                // Default evaluation mode
                await handleLangSmithEvaluation(app, 'complete');
            }
            process.exit(0);
        }

        // Show evaluation status and start CLI
        showEvaluationStatus(app);

        const cli = new CLIInterface(app);
        await cli.start();

    } catch (error) {
        console.error("❌ Application failed to start:", error.message);
        process.exit(1);
    }
}

// Start the application
main();
