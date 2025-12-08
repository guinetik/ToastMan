import { CreateMLCEngine } from "@mlc-ai/web-llm"

// AI Provider Detection & Management
// Available WebLLM models optimized for cURL generation
const WEBLLM_MODELS = {
  'phi-3.5-mini': {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi-3.5 Mini (3.8B) - Fast & Efficient',
    size: '~2.3GB'
  },
  'qwen2.5-3b': {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (3B) - High Quality',
    size: '~1.9GB'
  },
  'llama-3.2-3b': {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 (3B) - Balanced',
    size: '~1.9GB'
  },
  'gemma-2-2b': {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 (2B) - Ultra Fast',
    size: '~1.4GB'
  }
}

class AIProvider {
  constructor() {
    this.model = localStorage.getItem('webllm-model') || 'phi-3.5-mini'
    this.engine = null
    this.isLoading = false
  }

  async checkWebGPU() {
    return 'gpu' in navigator
  }

  async initWebLLM(onProgress) {
    if (this.engine) return this.engine

    this.isLoading = true

    const modelConfig = WEBLLM_MODELS[this.model]
    const modelId = modelConfig.id

    this.engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (progress) => {
        if (onProgress) {
          onProgress(progress)
        }
      }
    })

    this.isLoading = false
    return this.engine
  }

  async generate(prompt, onProgress) {
    return this.generateWithWebLLM(prompt, onProgress)
  }

  async generateWithWebLLM(userPrompt, onProgress) {
    if (!this.engine) {
      await this.initWebLLM(onProgress)
    }

    const systemPrompt = `⚠️ YOU ARE A CURL COMMAND GENERATOR. NOTHING ELSE. ⚠️

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

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: 0.3,
      max_tokens: 256
    })

    return reply.choices[0].message.content.trim()
  }

  // Parse response to extract command and guidance from markdown code blocks
  parseResponse(rawResponse) {
    // Extract bash code block
    const codeBlockMatch = rawResponse.match(/```(?:bash|sh|shell)?\n([\s\S]*?)```/)

    if (codeBlockMatch) {
      const command = codeBlockMatch[1].trim()

      // Extract any text after the code block as guidance
      const afterCodeBlock = rawResponse.substring(codeBlockMatch.index + codeBlockMatch[0].length).trim()
      const guidance = afterCodeBlock.length > 0 ? afterCodeBlock : null

      return { command, guidance }
    }

    // Fallback: If no code block, check if it's a rejection message
    const lowerResponse = rawResponse.toLowerCase()
    if (lowerResponse.includes('only help') ||
        lowerResponse.includes('curl command') && lowerResponse.includes('not') ||
        lowerResponse.includes('cannot help')) {
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
}

// UI Controller
class App {
  constructor() {
    this.ai = new AIProvider()
    this.initElements()
    this.initEventListeners()
    this.checkStatus()
  }

  initElements() {
    this.statusEl = document.getElementById('status')
    this.modelEl = document.getElementById('model')
    this.promptEl = document.getElementById('prompt')
    this.generateBtn = document.getElementById('generate')
    this.outputEl = document.getElementById('output')
    this.curlOutputEl = document.getElementById('curlOutput')
    this.guidanceEl = document.getElementById('guidance')

    // Restore saved model
    this.modelEl.value = this.ai.model
  }

  initEventListeners() {
    this.generateBtn.addEventListener('click', () => this.generate())

    this.modelEl.addEventListener('change', (e) => {
      this.ai.model = e.target.value
      localStorage.setItem('webllm-model', e.target.value)
      // Reset engine to load new model
      this.ai.engine = null
      this.checkStatus()
    })

    // Example buttons
    document.querySelectorAll('.example-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.promptEl.value = e.target.dataset.example
      })
    })

    // Enter to generate
    this.promptEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        this.generate()
      }
    })
  }

  async checkStatus() {
    const hasWebGPU = await this.ai.checkWebGPU()
    const modelConfig = WEBLLM_MODELS[this.ai.model]

    if (hasWebGPU) {
      this.statusEl.className = 'status ready'
      this.statusEl.textContent = `✅ WebGPU available - ${modelConfig.name} (${modelConfig.size} download on first use)`
      this.generateBtn.disabled = false
    } else {
      this.statusEl.className = 'status error'
      this.statusEl.innerHTML = '❌ WebGPU not supported. Use Chrome/Edge (v113+) or Safari (v17+)'
      this.generateBtn.disabled = true
    }
  }

  async generate() {
    const prompt = this.promptEl.value.trim()
    if (!prompt) return

    this.generateBtn.disabled = true
    this.generateBtn.textContent = '⏳ Generating...'
    this.outputEl.style.display = 'none'

    try {
      const rawResponse = await this.ai.generate(prompt, (progress) => {
        // Show download progress for first-time WebLLM init
        if (progress.progress !== undefined) {
          const percent = Math.round(progress.progress * 100)
          this.statusEl.className = 'status checking'
          this.statusEl.textContent = `⏳ ${progress.text || 'Loading model'}: ${percent}%`
        }
      })

      // Parse command and guidance
      const { command, guidance } = this.ai.parseResponse(rawResponse)

      // Display command
      this.curlOutputEl.textContent = command

      // Display guidance if present
      if (guidance) {
        this.guidanceEl.textContent = guidance
        this.guidanceEl.style.display = 'block'
      } else {
        this.guidanceEl.style.display = 'none'
      }

      this.outputEl.style.display = 'block'

      // Reset status
      await this.checkStatus()

    } catch (error) {
      this.statusEl.className = 'status error'
      this.statusEl.textContent = `❌ Error: ${error.message}`
    } finally {
      this.generateBtn.disabled = false
      this.generateBtn.textContent = '✨ Generate cURL Command'
    }
  }
}

// Initialize app
new App()
