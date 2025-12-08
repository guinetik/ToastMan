import { BaseModel } from './BaseModel.js'

/**
 * AI settings configuration for WebLLM-based cURL assistant
 */
export class AiSettings extends BaseModel {
  static schema = {
    enabled: {
      type: 'boolean',
      default: true,
      description: 'Enable AI chat assistant feature'
    },
    selectedModel: {
      type: 'string',
      enum: ['phi-3.5-mini', 'qwen2.5-3b', 'llama-3.2-3b', 'gemma-2-2b'],
      default: 'phi-3.5-mini',
      description: 'Selected WebLLM model for inference'
    },
    showGuidance: {
      type: 'boolean',
      default: true,
      description: 'Show AI guidance/explanations with generated commands'
    },
    autoLoadCommands: {
      type: 'boolean',
      default: false,
      description: 'Automatically load generated commands to composer'
    },
    temperature: {
      type: 'number',
      default: 0.3,
      validator: (v) => v >= 0 && v <= 1,
      description: 'Model temperature for inference (0 = deterministic, 1 = creative)'
    },
    maxTokens: {
      type: 'number',
      default: 256,
      validator: (v) => v >= 128 && v <= 1024,
      description: 'Maximum tokens for AI responses'
    },
    saveChatHistory: {
      type: 'boolean',
      default: true,
      description: 'Save AI chat messages in conversation history'
    },
    showExamplePrompts: {
      type: 'boolean',
      default: true,
      description: 'Display example prompt buttons in AI chat'
    },
    webgpuWarningDismissed: {
      type: 'boolean',
      default: false,
      description: 'User has dismissed WebGPU capability warning'
    }
  }

  constructor(data = {}) {
    super(data)
  }

  /**
   * Check if AI feature is available and enabled
   * @returns {boolean}
   */
  isAvailable() {
    return this.enabled && 'gpu' in navigator
  }

  /**
   * Get model display name
   * @returns {string}
   */
  getModelDisplayName() {
    const modelNames = {
      'phi-3.5-mini': 'Phi-3.5 Mini (3.8B)',
      'qwen2.5-3b': 'Qwen 2.5 (3B)',
      'llama-3.2-3b': 'Llama 3.2 (3B)',
      'gemma-2-2b': 'Gemma 2 (2B)'
    }
    return modelNames[this.selectedModel] || this.selectedModel
  }

  /**
   * Get estimated model size
   * @returns {string}
   */
  getModelSize() {
    const modelSizes = {
      'phi-3.5-mini': '~2.3GB',
      'qwen2.5-3b': '~1.9GB',
      'llama-3.2-3b': '~1.9GB',
      'gemma-2-2b': '~1.4GB'
    }
    return modelSizes[this.selectedModel] || '~2GB'
  }
}
