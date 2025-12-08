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

You are a cURL command generator. Convert natural language requests into valid cURL commands.

Environment Variables:
- Use {{variableName}} syntax for environment variables
- Common variables: {{baseUrl}}, {{apiKey}}, {{token}}, {{username}}, {{password}}
- When a FULL URL is provided (e.g., "https://api.example.com/users" or "guinetik.com/api/graphql"), use it EXACTLY as given
- Only use {{baseUrl}} when the user provides a RELATIVE path (e.g., "/users", "/api/endpoint")
- When auth token not specified, use {{token}} or {{apiKey}}
- {{variable}} syntax is VALID and should be used when appropriate

GraphQL Rules:
- GraphQL APIs ALWAYS use POST, never PATCH/PUT/DELETE
- Wrap mutations in "mutation { ... }", queries in "query { ... }"
- Don't include # comments inside the JSON query string
- For simple requests, use inline arguments instead of variables

Output Format:
- Put the cURL command in a \`\`\`bash code block
- Add any guidance or notes as plain text AFTER the code block
- Only include guidance if the request is ambiguous or needs clarification
- For clear requests, just output the code block

Rules for the command:
- Use proper flags: -X for method, -H for headers, -d for data, -u for basic auth
- Use single quotes for JSON data
- Include Content-Type header for POST/PUT with JSON
- Format nicely with backslashes for readability

Examples:

Input: "GET request to https://api.example.com/users"
Output:
\`\`\`bash
curl -X GET https://api.example.com/users
\`\`\`

Input: "GET request to /users"
Output:
\`\`\`bash
curl -X GET {{baseUrl}}/users
\`\`\`

Input: "POST user data with name John"
Output:
\`\`\`bash
curl -X POST {{baseUrl}}/users \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"John"}'
\`\`\`

Input: "GET with authentication to /profile"
Output:
\`\`\`bash
curl -X GET {{baseUrl}}/profile \\
  -H 'Authorization: Bearer {{token}}'
\`\`\`

Input: "basic auth request"
Output:
\`\`\`bash
curl -u '{{username}}:{{password}}' {{baseUrl}}/endpoint
\`\`\`

Input: "How to update user 999 on guinetik.com/api/graphql set the email as guinetik@gmail.com using the UpdateUser mutation"
Output:
\`\`\`bash
curl -X POST https://guinetik.com/api/graphql \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer {{token}}' \\
  -d '{"query":"mutation { updateUser(id: \\"999\\", email: \\"guinetik@gmail.com\\") { id email } }"}'
\`\`\`
Set your environment variables for username, password, baseUrl, and token.`

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
