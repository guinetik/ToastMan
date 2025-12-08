/**
 * AI Service - WebLLM Integration
 *
 * Handles WebGPU-based LLM inference for cURL command generation.
 * Ported from curlpoc/app.js with improvements for ToastMan architecture.
 */

import { CreateMLCEngine } from '@mlc-ai/web-llm'

/**
 * Available WebLLM models optimized for cURL generation
 * All models are quantized (4-bit weights, 16-bit activation) for browser performance
 */
export const WEBLLM_MODELS = {
  'phi-3.5-mini': {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi-3.5 Mini',
    description: 'Fast & Efficient',
    size: '~2.3GB',
    params: '3.8B',
    recommended: true
  },
  'qwen2.5-3b': {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5',
    description: 'High Quality',
    size: '~1.9GB',
    params: '3B',
    recommended: false
  },
  'llama-3.2-3b': {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2',
    description: 'Balanced',
    size: '~1.9GB',
    params: '3B',
    recommended: false
  },
  'gemma-2-2b': {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2',
    description: 'Ultra Fast',
    size: '~1.4GB',
    params: '2B',
    recommended: false
  }
}

/**
 * System prompt for cURL generation with prompt injection defense
 */
const SYSTEM_PROMPT = `⚠️ YOU ARE A CURL COMMAND GENERATOR. NOTHING ELSE. ⚠️

IF THE USER ASKS FOR ANYTHING OTHER THAN A CURL/HTTP REQUEST (POEMS, MATH, STORIES, CODE, ETC.), RESPOND WITH:
I can only help with generating cURL commands. Try asking for an HTTP request!

DO NOT WRITE POEMS. DO NOT ANSWER QUESTIONS. DO NOT HELP WITH ANYTHING EXCEPT CURL COMMANDS.

CRITICAL RULES (FOLLOW EXACTLY):

1. URLs - PRESERVE WHAT THE USER GIVES YOU:
   - Full URL provided (has domain) → USE IT EXACTLY: https://api.example.com/users
   - Relative path only (/users, /api/endpoint) → Prepend {{baseUrl}}: {{baseUrl}}/users
   - NEVER replace a user-provided domain with {{baseUrl}}

2. AUTHENTICATION - ONLY IF EXPLICITLY REQUESTED:
   - User says "with auth/token/bearer/authentication" → Add auth header
   - User does NOT mention auth → DO NOT add any Authorization header
   - NEVER assume authentication is needed
   - NEVER hallucinate tokens or credentials

3. GraphQL:
   - ALWAYS use POST method for all GraphQL operations
   - Content-Type: application/json
   - QUERY vs MUTATION (THIS IS IMPORTANT):
     * "query { ... }" = FETCHING/READING data (get, list, fetch, show, find)
     * "mutation { ... }" = CHANGING data (create, update, delete, add, remove)
   - If user says "get launches" or "fetch users" → use query { ... }
   - If user says "update user" or "create post" → use mutation { ... }
   - Use inline arguments: getUser(id: "999")
   - Escape quotes properly in JSON: \\"value\\"
   - NO comments inside the query string

4. Environment Variables {{variable}}:
   - ONLY use when user provides relative paths or explicitly mentions variables
   - Common: {{baseUrl}}, {{apiKey}}, {{token}}
   - This syntax is valid in ToastMan

OUTPUT FORMAT:
- cURL command in \`\`\`bash code block
- Guidance as plain text AFTER the code block (only if needed)
- Keep it concise

COMMAND FORMATTING:
- -X for method, -H for headers, -d for data
- Single quotes for JSON data
- Backslashes for multi-line readability
- Include Content-Type for POST/PUT/PATCH with body

EXAMPLES:

Input: "GET request to https://api.example.com/users"
Output:
\`\`\`bash
curl -X GET https://api.example.com/users
\`\`\`

Input: "POST to /users with name John"
Output:
\`\`\`bash
curl -X POST {{baseUrl}}/users \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"John"}'
\`\`\`

Input: "GET /profile with bearer token"
Output:
\`\`\`bash
curl -X GET {{baseUrl}}/profile \\
  -H 'Authorization: Bearer {{token}}'
\`\`\`

Input: "get all launches from https://api.spacex.land/graphql"
Output:
\`\`\`bash
curl -X POST https://api.spacex.land/graphql \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"query { launches { mission_name launch_date_local } }"}'
\`\`\`

Input: "update user 123 email to test@mail.com on https://api.site.com/graphql"
Output:
\`\`\`bash
curl -X POST https://api.site.com/graphql \\
  -H 'Content-Type: application/json' \\
  -d '{"query":"mutation { updateUser(id: \\"123\\", email: \\"test@mail.com\\") { id email } }"}'
\`\`\``

/**
 * AI Service class for managing WebLLM inference
 */
export class AiService {
  constructor() {
    this.engine = null
    this.isLoading = false
    this.currentModel = null
  }

  /**
   * Initialize WebLLM engine with specified model
   * @param {string} modelKey - Model identifier from WEBLLM_MODELS
   * @param {Function} onProgress - Progress callback (progress: {progress: number, text: string})
   * @returns {Promise<Object>} Initialized engine
   */
  async initModel(modelKey, onProgress = null) {
    // If engine exists and model hasn't changed, return cached engine
    if (this.engine && this.currentModel === modelKey) {
      return this.engine
    }

    // Reset engine if model changed
    if (this.currentModel !== modelKey) {
      await this.destroyEngine()
    }

    this.isLoading = true
    this.currentModel = modelKey

    const modelConfig = WEBLLM_MODELS[modelKey]
    if (!modelConfig) {
      throw new Error(`Invalid model key: ${modelKey}`)
    }

    try {
      this.engine = await CreateMLCEngine(modelConfig.id, {
        initProgressCallback: (progress) => {
          if (onProgress) {
            onProgress(progress)
          }
        }
      })

      this.isLoading = false
      return this.engine
    } catch (error) {
      this.isLoading = false
      this.engine = null
      throw new Error(`Failed to initialize model: ${error.message}`)
    }
  }

  /**
   * Generate cURL command from natural language prompt
   * @param {string} userPrompt - Natural language description
   * @param {string} modelKey - Model to use
   * @param {Function} onProgress - Progress callback for model loading
   * @returns {Promise<string>} Raw AI response
   */
  async generateCurl(userPrompt, modelKey = 'phi-3.5-mini', onProgress = null) {
    if (!userPrompt || typeof userPrompt !== 'string') {
      throw new Error('Invalid prompt')
    }

    // Ensure engine is initialized
    if (!this.engine || this.currentModel !== modelKey) {
      await this.initModel(modelKey, onProgress)
    }

    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]

      const reply = await this.engine.chat.completions.create({
        messages,
        temperature: 0.3, // Low temperature for consistent output
        max_tokens: 256   // Sufficient for cURL commands + guidance
      })

      return reply.choices[0].message.content.trim()
    } catch (error) {
      throw new Error(`Inference failed: ${error.message}`)
    }
  }

  /**
   * Generate text from a custom prompt (generic inference)
   * @param {string} userPrompt - Custom prompt
   * @param {string} modelKey - Model to use
   * @param {Function} onProgress - Progress callback for model loading
   * @returns {Promise<string>} Raw AI response
   */
  async generate(userPrompt, modelKey = 'phi-3.5-mini', onProgress = null) {
    if (!userPrompt || typeof userPrompt !== 'string') {
      throw new Error('Invalid prompt')
    }

    // Ensure engine is initialized
    if (!this.engine || this.currentModel !== modelKey) {
      await this.initModel(modelKey, onProgress)
    }

    try {
      const messages = [
        { role: 'user', content: userPrompt }
      ]

      const reply = await this.engine.chat.completions.create({
        messages,
        temperature: 0.3,
        max_tokens: 64  // Short responses for naming
      })

      return reply.choices[0].message.content.trim()
    } catch (error) {
      throw new Error(`Inference failed: ${error.message}`)
    }
  }

  /**
   * Parse AI response to extract cURL command and guidance
   * @param {string} rawResponse - Raw AI output
   * @returns {{command: string, guidance: string|null}}
   */
  parseResponse(rawResponse) {
    // Extract bash code block using regex
    const codeBlockMatch = rawResponse.match(/```(?:bash|sh|shell)?\n([\s\S]*?)```/)

    if (codeBlockMatch) {
      const command = codeBlockMatch[1].trim()

      // Extract any text after the code block as guidance
      const afterCodeBlock = rawResponse
        .substring(codeBlockMatch.index + codeBlockMatch[0].length)
        .trim()
      const guidance = afterCodeBlock.length > 0 ? afterCodeBlock : null

      return { command, guidance }
    }

    // Fallback: Check if it's a rejection message (prompt injection defense)
    const lowerResponse = rawResponse.toLowerCase()
    if (
      lowerResponse.includes('only help') ||
      (lowerResponse.includes('curl command') && lowerResponse.includes('not')) ||
      lowerResponse.includes('cannot help')
    ) {
      return {
        command: "I can only help with generating cURL commands. Try asking for an HTTP request!",
        guidance: null
      }
    }

    // Last resort: treat whole response as command with warning
    return {
      command: rawResponse.trim(),
      guidance: "⚠️ Note: The AI didn't use the expected format. Please try rephrasing your request."
    }
  }

  /**
   * Destroy current engine and free resources
   */
  async destroyEngine() {
    if (this.engine) {
      try {
        // WebLLM doesn't expose a destroy method, but setting to null allows GC
        this.engine = null
        this.currentModel = null
      } catch (error) {
        console.warn('Error destroying engine:', error)
      }
    }
  }

  /**
   * Get current model info
   * @returns {Object|null} Model configuration
   */
  getModelInfo() {
    if (!this.currentModel) {
      return null
    }
    return WEBLLM_MODELS[this.currentModel]
  }

  /**
   * Get current model key
   * @returns {string|null} Model key (e.g. 'phi-3.5-mini')
   */
  getCurrentModel() {
    return this.currentModel
  }

  /**
   * Check if a model is currently loaded
   * @returns {boolean}
   */
  isModelLoaded() {
    return this.engine !== null
  }

  /**
   * Get loading status
   * @returns {boolean}
   */
  isModelLoading() {
    return this.isLoading
  }
}

// Export singleton instance
export default new AiService()
