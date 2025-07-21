![](./resources/langchain_stack_112024_dark.svg)

LangChain implements a standard interface for large language models and related technologies, such as embedding models and vector stores, and integrates with hundreds of providers. 



These regulations enable developers to integrate different models, tools, and data sources in a unified way, thereby building LLM applications, Agents, and workflows more quickly.

------

##  I. LangChain's Core Component Regulations

LangChain defines a modular component system where each category has clear responsibilities and standard interfaces. These regulations are similar to **interface protocols**, such as LLM, Tool, Agent, etc., which can all be interchangeable as long as they adhere to this interface.


------

##  II. LangGraph (Workflow + Three-Layer Architecture)

* **Purpose**: Adds a **persistent, stateful, and interactive** Agent workflow orchestration framework on top of LangChain.

* **Three-Layer Architecture**:

  1. **store**: Persists workflow state and history
  2. **memory**: Short-term/long-term memory management (implemented via **Annotation**)
  3. **logic**: Execution flow, conditional logic, loops, Human-in-the-loop

* **Workflow Logic Architecture**:
![](./workflow.png)
  - **StateGraph**: Directed graph with nodes and edges
  - **Agent Nodes**: mainAgent (orchestrator) and toolAgent (decision maker)
  - **Tool Nodes**: Specialized tool sets (auth, data, search, file, text, math, http)
  - **Result Node**: Conclusion generation and feedback collection
  - **Edge Types**:
    - **Solid Lines**: Direct control flow and primary execution path
    - **Dashed Lines**: Conditional routing and indirect tool access

* **Memory Implementation with Annotation**:
  - **State Annotations**: Define persistent state fields with reducers and defaults
  - **Context Preservation**: Maintain conversation history, thread IDs, and user context
  - **Dynamic Memory**: Support for feedback collection, tool outputs, and conversation flow

* **External Memory Stores** (Outside Workflow):
  - **AuthStore**: Persistent authentication state management
  - **ConversationStore**: Local conversation history and persistence
  - **PersistentStorage**: Generic file-based storage system
  - **ThreadManager**: LangSmith integration for remote memory

* **Common Store Use Cases**:
  - **RAG Knowledge Base**: Vector stores for document embeddings and semantic search
  - **Conversation Records**: Persistent chat history across sessions
  - **User Preferences**: Personalized settings and configurations
  - **Session State**: Temporary data during active conversations
  - **Feedback Data**: User ratings and improvement suggestions
  - **Tool Outputs**: Cached results from external API calls

------

##  III. LangSmith (Feedback/Evaluation/Runtime Tracing)

* **Purpose**: Provides visual UI + SDK(Software Development Kit) for monitoring, debugging, evaluating, and improving LLM applications, including Chains and Agents.

* **Key Features**:
  - **Feedback**: Manual annotation feedback & automatic comparison evaluation
  - **Evaluation (Evals)**: Batch runs, compare performance of different prompts/models
  - **Tracing**: Event-level tracing, view input/output status of each chain/node
  - **Thread**: Context persistence, reproducible interactions
  - **Prompt Engineering**: Visual prompt testing and optimization
  - **Database/Dataset Management**: Create and manage test datasets for evaluation

* **Integration Benefits**:
  - **Visual Debugging**: Real-time monitoring of workflow execution
  - **Performance Analysis**: Track response times and token usage
  - **Quality Assurance**: Automated evaluation and feedback collection
  - **Context Management**: Persistent conversation threads across sessions
  - **Prompt Optimization**: A/B testing and iterative prompt improvement
  - **Data Management**: Centralized dataset creation and version control
  - **Cost Monitoring**: Track token usage and API costs in real-time
  - **Time Tracking**: Monitor execution time for each chain/node
  - **Custom Alerts**: Set up alerts for performance issues and errors

