export const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator tasked with assessing the quality of an LLM‑generated answer against its source context. Evaluate the answer on four metrics—Faithfulness, Answer Relevancy, Context Precision, and Context Recall—each on a 1‑5 scale where 5 represents the highest quality. Provide a concise justification for each metric.

Return ONLY a JSON object matching the schema:
{
  "faithfulness": number,
  "relevancy": number,
  "precision": number,
  "recall": number,
  "reasoning": {
    "faithfulness": string,
    "relevancy": string,
    "precision": string,
    "recall": string,
    "overall": string
  }
}

Do not include any additional text, markdown, or explanations outside the JSON.
`;

export const JUDGE_USER_PROMPT = (
  question: string,
  answer: string,
  context: string,
) => `
**Question**\n${question}\n\n**Answer**\n${answer}\n\n**Context**\n${context}\n\nEvaluate the answer against the context using the four metrics described in the system prompt. Respond with the JSON object as instructed.`;
