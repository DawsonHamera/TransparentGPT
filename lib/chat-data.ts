export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export const DEFAULT_SYSTEM_PROMPT = `You are TransparentGPT, an interactive AI chat using the llama-3.1-8b-instant large language model.
Knowledge cutoff: December 2023
Current date: ${new Date().toISOString().split("T")[0]}
You are helpful, harmless, and honest.
Give a short, fast response in 2-3 complete sentences and end cleanly without trailing off.`;

export const SCRIPTED_RESPONSES: Record<string, string> = {
  "hello": "Hello! How can I assist you today?",
  "hi": "Hi there! What can I help you with?",
  "what is an llm": `A Large Language Model (LLM) is a type of artificial intelligence model trained on vast amounts of text data.

**Key characteristics:**
- **Scale**: Billions of parameters (GPT-4 has ~1.7 trillion parameters)
- **Training**: Learns patterns from internet text, books, code, and more
- **Capabilities**: Text generation, translation, summarization, Q&A, coding

**How they work:**
1. **Tokenization**: Text is broken into tokens (subwords/characters)
2. **Embedding**: Tokens are converted to numerical vectors
3. **Attention**: The model weighs relationships between all tokens
4. **Generation**: Predicts the next most likely token, repeatedly

LLMs don't "understand" like humans—they recognize and generate patterns based on statistical relationships in their training data.`,
  
  "what are tokens": `**Tokens** are the fundamental units that LLMs process. They're not exactly words—they're pieces of text that the model has learned to recognize.

**Examples:**
- "Hello" → 1 token
- " world" → 1 token (note the leading space!)
- "tokenization" → might be 2-3 tokens: "token", "ization"
- Rare words get split into smaller pieces

**Why tokens matter:**
1. **Context window**: Models have limits (e.g., 128K tokens for GPT-4)
2. **Pricing**: API costs are per-token
3. **Performance**: Fewer tokens = faster responses

The tokenizer used by GPT models is called **tiktoken** and uses Byte-Pair Encoding (BPE).`,

  "how does attention work": `**Attention** is the core mechanism that makes transformers (and LLMs) powerful.

**The key insight:**
When processing a word, the model should "pay attention" to relevant other words in the context.

**Example:**
"The animal didn't cross the street because **it** was too tired."
- What does "it" refer to? The model's attention mechanism learns to connect "it" with "animal".

**Self-Attention steps:**
1. Each token creates Query (Q), Key (K), and Value (V) vectors
2. Compare each Q with all Ks to get attention scores
3. Softmax to normalize scores
4. Weighted sum of Values based on scores

**Multi-Head Attention:**
Multiple attention "heads" run in parallel, each learning different relationships (syntax, semantics, etc.)`,

  "what is a system prompt": `The **system prompt** is a special message that sets the behavior and personality of the AI assistant.

**What you're seeing right now:**
\`\`\`
role: "system"
content: "You are TransparentGPT, a large language model..."
\`\`\`

**Key uses:**
1. **Personality**: "You are a helpful, friendly assistant"
2. **Constraints**: "Never provide medical advice"
3. **Format**: "Always respond in JSON"
4. **Context**: "You are helping a software developer"

**Important notes:**
- System prompts are usually hidden from users
- They're the first message in the conversation
- They influence but don't guarantee behavior
- "Jailbreaking" attempts try to override system prompts`,

  "default": `I understand your question. In a real LLM, I would process your input through:

1. **Tokenization** - Breaking your text into tokens
2. **Embedding** - Converting tokens to numerical vectors  
3. **Transformer layers** - Processing through attention mechanisms
4. **Decoding** - Generating tokens one at a time

Since this is a demo, I'm showing you a scripted response. Try asking:
- "What is an LLM?"
- "What are tokens?"
- "How does attention work?"
- "What is a system prompt?"`
};

export function getScriptedResponse(input: string): string {
  const normalizedInput = input.toLowerCase().trim();
  
  // Check for exact or partial matches
  for (const [key, response] of Object.entries(SCRIPTED_RESPONSES)) {
    if (key === "default") continue;
    if (normalizedInput.includes(key)) {
      return response;
    }
  }
  
  return SCRIPTED_RESPONSES.default;
}
