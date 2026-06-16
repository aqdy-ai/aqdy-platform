# Aqdy AI Evaluation Systems

Continuous evaluation is critical to ensure the quality, accuracy, and reliability of the Aqdy AI platform, particularly for our Retrieval-Augmented Generation (RAG) and agentic workflows. This document outlines our automated quality metrics, LLM-as-a-judge setup, and human feedback loops.

## Quality Metrics

We continuously evaluate pipeline performance using the following primary metrics, commonly utilized in RAG evaluations:

### 1. Context Precision
- **Definition:** Measures the proportion of relevant chunks in the retrieved context. It evaluates whether the retriever is fetching information that actually helps answer the user's query.
- **Calculation Method:** `(Number of relevant retrieved chunks) / (Total number of retrieved chunks)`. Often calculated using an LLM to judge the relevance of each chunk against the query.
- **Tooling Used:** Ragas / Langchain Evaluation modules (or custom LLM evaluators).
- **Score Storage Location:** Scores are attached to the "Retrieval" span within Langfuse and logged to our central analytics database.

### 2. Context Recall
- **Definition:** Measures whether all the relevant information required to answer the query was successfully retrieved. It evaluates the retriever's ability to not miss crucial facts.
- **Calculation Method:** Evaluated by checking if the retrieved chunks contain the necessary information to construct a known ground-truth answer. `(Relevant information retrieved) / (Total relevant information needed)`.
- **Tooling Used:** Ragas frameworks, utilizing ground-truth datasets for automated testing.
- **Score Storage Location:** Stored in Langfuse on the trace level and in evaluation run datasets.

### 3. Faithfulness (Hallucination Index)
- **Definition:** Measures how factually accurate the generated answer is relative to the retrieved context. An answer is faithful if all claims made in the answer can be inferred from the context.
- **Calculation Method:** An LLM extracts statements from the generated answer and checks if each statement is supported by the retrieved chunks. `(Number of supported statements) / (Total number of statements)`.
- **Tooling Used:** Automated LLM-as-a-judge (prompted for claim verification).
- **Score Storage Location:** Attached to the "Generation" (LLM call) span in Langfuse.

### 4. Answer Relevancy
- **Definition:** Evaluates how directly the generated answer addresses the original user query, penalizing incomplete or tangential responses.
- **Calculation Method:** Often calculated by prompting an LLM to generate a question based on the generated answer, and then measuring the semantic similarity (cosine similarity of embeddings) between the generated question and the original user query.
- **Tooling Used:** Sentence Transformers for embedding similarity, or LLM-as-a-judge semantic grading.
- **Score Storage Location:** Attached to the top-level trace in Langfuse.

## LLM-as-Judge Setup

To automate the calculation of the metrics above without requiring constant human labeling, we employ an LLM-as-a-judge framework.

- **Judge Model:** We typically use a highly capable model like `gpt-4o` or `claude-3-5-sonnet` as the judge, configured with a temperature of `0.0` for maximum consistency and deterministic outputs.
- **Prompts/Rubrics:** The judge model is prompted with specific evaluation rubrics for each metric. For example, for Faithfulness, the prompt instructs the model to:
  1. Extract all factual claims from the actual response.
  2. For each claim, check if it is explicitly stated or logically entailed by the provided context.
  3. Output a structured JSON response containing the boolean decisions and the final calculated score (0.0 to 1.0).
- **Scoring Flow:**
  1. A user request is processed, and the trace is captured in Langfuse.
  2. Asynchronously (via a background queue or scheduled job), the evaluation service fetches a sample of recent traces.
  3. For each sampled trace, the evaluation service extracts the query, context, and generated answer.
  4. The service constructs the evaluation prompts and calls the Judge Model.
  5. The resulting scores are parsed and pushed back to Langfuse via the Langfuse SDK, attaching them to the original trace ID.
