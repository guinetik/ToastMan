/**
 * AI Controller
 *
 * Manages AI chat functionality, model lifecycle, and conversation integration.
 * Handles cURL command generation from natural language queries.
 */

import { BaseController } from './BaseController.js'
import aiService from '../services/AiService.js'
import { getWebGPUStatus } from '../utils/webgpu.js'

/**
 * AI Controller for WebLLM-based cURL generation
 */
export class AiController extends BaseController {
  constructor() {
    super('AiController')

    this.createState({
      // Capability state
      webgpuAvailable: false,
      webgpuChecked: false,
      webgpuMessage: '',

      // Model state
      currentModel: null,
      isModelLoading: false,
      loadingProgress: 0,
      loadingText: '',

      // Inference state
      isGenerating: false,
      lastInferenceTime: 0,

      // Error state
      lastError: null
    })
  }

  /**
   * Initialize controller and check WebGPU capability
   */
  async init() {
    super.init()

    // Check WebGPU availability
    await this.checkWebGPUCapability()
  }

  /**
   * Check WebGPU capability status
   * @returns {Promise<{available: boolean, message: string}>}
   */
  async checkWebGPUCapability() {
    this.logger.debug('Checking WebGPU capability...')

    const status = await getWebGPUStatus()

    this.state.webgpuAvailable = status.available
    this.state.webgpuChecked = true
    this.state.webgpuMessage = status.message

    if (!status.available) {
      this.logger.warn(`WebGPU not available: ${status.message}`)
    } else {
      this.logger.info('WebGPU is available')
    }

    this.emit('webgpu-status', status)

    return {
      available: status.available,
      message: status.message
    }
  }

  /**
   * Initialize AI model
   * @param {string} modelKey - Model identifier
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async initModel(modelKey, onProgress = null) {
    if (!this.state.webgpuAvailable) {
      const error = 'WebGPU is not available'
      this.state.lastError = error
      return { success: false, error }
    }

    this.logger.debug(`Initializing model: ${modelKey}`)

    this.state.isModelLoading = true
    this.state.loadingProgress = 0
    this.state.loadingText = 'Initializing model...'
    this.emit('model-loading-start', { model: modelKey })

    const progressCallback = (progress) => {
      this.state.loadingProgress = progress.progress || 0
      this.state.loadingText = progress.text || 'Loading...'

      if (onProgress) {
        onProgress(progress)
      }

      this.emit('model-loading-progress', progress)
    }

    const result = await this.executeAsync(
      async () => {
        await aiService.initModel(modelKey, progressCallback)
        this.state.currentModel = modelKey
        return { model: modelKey }
      },
      `Failed to initialize model: ${modelKey}`
    )

    this.state.isModelLoading = false

    if (result.success) {
      this.logger.info(`Model ${modelKey} initialized successfully`)
      this.emit('model-loaded', { model: modelKey })
    } else {
      this.state.lastError = result.error?.message || 'Model initialization failed'
      this.emit('model-load-error', { error: this.state.lastError })
    }

    return result
  }

  /**
   * Generate cURL command from natural language query
   * @param {string} query - User's natural language query
   * @param {string} modelKey - Model to use (defaults to current or phi-3.5-mini)
   * @param {Function} onProgress - Progress callback for model loading
   * @returns {Promise<{success: boolean, command?: string, guidance?: string, inferenceTime?: number, error?: string}>}
   */
  async generateCurl(query, modelKey = null, onProgress = null) {
    if (!this.state.webgpuAvailable) {
      const error = 'WebGPU is not available'
      this.state.lastError = error
      return { success: false, error }
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      const error = 'Query cannot be empty'
      this.state.lastError = error
      return { success: false, error }
    }

    const model = modelKey || this.state.currentModel || 'phi-3.5-mini'

    this.logger.debug(`Generating cURL for query: "${query}" using model: ${model}`)

    this.state.isGenerating = true
    this.state.lastError = null
    this.emit('generation-start', { query, model })

    const startTime = performance.now()

    const result = await this.executeAsync(
      async () => {
        // Generate raw response
        const rawResponse = await aiService.generateCurl(query, model, onProgress)

        // Parse response into command and guidance
        const { command, guidance } = aiService.parseResponse(rawResponse)

        const inferenceTime = performance.now() - startTime

        this.state.lastInferenceTime = inferenceTime

        return {
          command,
          guidance,
          inferenceTime,
          model
        }
      },
      'Failed to generate cURL command'
    )

    this.state.isGenerating = false

    if (result.success) {
      this.logger.info(`cURL generated in ${result.data.inferenceTime.toFixed(0)}ms`)
      this.emit('generation-complete', result.data)

      return {
        success: true,
        command: result.data.command,
        guidance: result.data.guidance,
        inferenceTime: result.data.inferenceTime,
        model: result.data.model
      }
    } else {
      this.state.lastError = result.error?.message || 'Generation failed'
      this.emit('generation-error', { error: this.state.lastError })

      return {
        success: false,
        error: this.state.lastError
      }
    }
  }

  /**
   * Generate cURL and add to conversation
   * @param {string} query - User's natural language query
   * @param {Function} conversationStore - Conversation store instance
   * @param {string} modelKey - Model to use
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<{success: boolean, userMessage?: object, assistantMessage?: object, error?: string}>}
   */
  async generateAndAddToConversation(query, conversationStore, modelKey = null, onProgress = null) {
    // Add user query message to conversation
    let userMessage = null
    if (conversationStore && conversationStore.addAiUserMessage) {
      userMessage = conversationStore.addAiUserMessage(query)
      this.emit('user-message-added', { message: userMessage })
    }

    // Generate cURL
    const result = await this.generateCurl(query, modelKey, onProgress)

    if (!result.success) {
      return {
        success: false,
        userMessage,
        error: result.error
      }
    }

    // Add assistant response message to conversation
    let assistantMessage = null
    if (conversationStore && conversationStore.addAiAssistantMessage) {
      assistantMessage = conversationStore.addAiAssistantMessage(
        result.command,
        result.guidance,
        result.model,
        result.inferenceTime
      )
      this.emit('assistant-message-added', { message: assistantMessage })
    }

    return {
      success: true,
      userMessage,
      assistantMessage
    }
  }

  /**
   * Generate a short name for a request based on its cURL command
   * @param {string} curlCommand - The cURL command to analyze
   * @param {string} modelKey - Model to use (defaults to current)
   * @returns {Promise<{success: boolean, name?: string, error?: string}>}
   */
  async generateRequestName(curlCommand, modelKey = null) {
    if (!this.state.webgpuAvailable) {
      return { success: false, error: 'WebGPU not available' }
    }

    if (!curlCommand || typeof curlCommand !== 'string') {
      return { success: false, error: 'Invalid cURL command' }
    }

    // Don't generate if model isn't loaded
    if (!this.isModelLoaded()) {
      return { success: false, error: 'No model loaded' }
    }

    // Get the actual loaded model from aiService (state may be stale after reset)
    const model = modelKey || aiService.getCurrentModel()

    if (!model) {
      return { success: false, error: 'No model available' }
    }

    this.logger.debug('Generating request name from cURL command using model:', model)

    const prompt = `Generate a very short name (2-4 words max) for this API request. Reply with ONLY the name, no explanations or extra text:

${curlCommand}

Name:`

    const result = await this.executeAsync(
      async () => {
        // Use the AI service to generate response
        const rawResponse = await aiService.generate(prompt, model)

        // Clean up the response - take first line, trim, remove quotes
        const name = rawResponse
          .split('\n')[0]
          .trim()
          .replace(/^["']|["']$/g, '') // Remove surrounding quotes
          .substring(0, 50) // Max 50 characters

        return { name }
      },
      'Failed to generate request name'
    )

    if (result.success && result.data.name) {
      this.logger.info(`Generated request name: ${result.data.name}`)
      return {
        success: true,
        name: result.data.name
      }
    } else {
      return {
        success: false,
        error: result.error?.message || 'Name generation failed'
      }
    }
  }

  /**
   * Get current model info
   * @returns {object|null}
   */
  getModelInfo() {
    return aiService.getModelInfo()
  }

  /**
   * Check if model is loaded
   * @returns {boolean}
   */
  isModelLoaded() {
    return aiService.isModelLoaded()
  }

  /**
   * Get WebGPU availability status
   * @returns {boolean}
   */
  isWebGPUAvailable() {
    return this.state.webgpuAvailable
  }

  /**
   * Get loading state
   * @returns {boolean}
   */
  isLoading() {
    return this.state.isModelLoading || this.state.isGenerating
  }

  /**
   * Get last error
   * @returns {string|null}
   */
  getLastError() {
    return this.state.lastError
  }

  /**
   * Clear last error
   */
  clearError() {
    this.state.lastError = null
  }

  /**
   * Reset controller state (useful after clearing app data)
   * Syncs currentModel from aiService to avoid state desync
   */
  resetState() {
    this.logger.debug('Resetting AI controller state')
    // Keep the model in sync with aiService (don't clear if model is still loaded)
    this.state.currentModel = aiService.getCurrentModel()
    this.state.isModelLoading = false
    this.state.isGenerating = false
    this.state.loadingProgress = 0
    this.state.loadingText = ''
    this.state.lastError = null
    this.state.lastInferenceTime = 0
  }

  /**
   * Destroy current model engine and free GPU memory
   */
  async destroyModel() {
    this.logger.debug('Destroying AI model to free GPU memory')
    await aiService.destroyEngine()
    this.state.currentModel = null
  }

  /**
   * Dispose controller and cleanup resources
   */
  dispose() {
    this.logger.debug('Disposing AI controller and cleaning up resources')

    // Destroy AI service engine
    aiService.destroyEngine()

    super.dispose()
  }
}

// Export singleton instance
export default new AiController()
