/**
 * Variable Interpolation Composable
 *
 * Provides functionality for:
 * - Detecting variables in text ({{variableName}})
 * - Interpolating variables with actual values
 * - Highlighting variables in UI
 */

import { computed } from 'vue'
import { useEnvironments } from '../stores/useEnvironments.js'

export function useVariableInterpolation() {
  const environmentsStore = useEnvironments()

  /**
   * Regular expression to match variables in {{variableName}} format
   */
  const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g

  /**
   * Detect all variables in a text string
   * @param {string} text - The text to scan for variables
   * @returns {Array} Array of variable objects with name, match, start, end positions
   */
  const detectVariables = (text) => {
    if (!text || typeof text !== 'string') return []

    const variables = []
    let match

    // Reset regex lastIndex
    VARIABLE_REGEX.lastIndex = 0

    while ((match = VARIABLE_REGEX.exec(text)) !== null) {
      variables.push({
        name: match[1].trim(),
        match: match[0], // Full match including {{}}
        start: match.index,
        end: match.index + match[0].length,
        raw: match[1] // Raw content inside {{}}
      })
    }

    return variables
  }

  /**
   * Check if a variable exists in the active environment
   * @param {string} variableName - Name of the variable to check
   * @param {string} environmentId - Optional environment ID, uses active if not provided
   * @returns {boolean} True if variable exists and is enabled
   */
  const variableExists = (variableName, environmentId = null) => {
    const targetEnvironment = environmentId
      ? environmentsStore.getEnvironment(environmentId)
      : environmentsStore.activeEnvironment.value
    if (!targetEnvironment) {
      return false
    }
    const variable = targetEnvironment.values?.find(v =>
      v.key === variableName && v.enabled
    )

    return !!variable
  }

  /**
   * Get variable value from environment
   * @param {string} variableName - Name of the variable
   * @param {string} environmentId - Optional environment ID, uses active if not provided
   * @returns {string|null} Variable value or null if not found
   */
  const getVariableValue = (variableName, environmentId = null) => {
    return environmentsStore.resolveVariable(variableName, environmentId)
  }

  /**
   * Interpolate variables in text with their values
   * @param {string} text - Text containing variables
   * @param {string} environmentId - Optional environment ID, uses active if not provided
   * @returns {string} Text with variables replaced by their values
   */
  const interpolateText = (text, environmentId = null) => {
    return environmentsStore.interpolateString(text, environmentId)
  }

  /**
   * Get enhanced variable info including existence and value
   * @param {string} text - Text to analyze
   * @param {string} environmentId - Optional environment ID
   * @returns {Array} Array of enhanced variable objects
   */
  const analyzeVariables = (text, environmentId = null) => {
    const variables = detectVariables(text)
    const analyzed = variables.map(variable => {
      const exists = variableExists(variable.name, environmentId)
      const value = getVariableValue(variable.name, environmentId)
      const resolved = value !== null
      return {
        ...variable,
        exists,
        value,
        resolved
      }
    })
    return analyzed
  }

  /**
   * Split text into parts for rendering with highlighted variables
   * @param {string} text - Text to split
   * @param {string} environmentId - Optional environment ID
   * @returns {Array} Array of text parts with metadata
   */
  const splitTextForHighlighting = (text, environmentId = null) => {
    if (!text || typeof text !== 'string') return [{ type: 'text', content: text }]

    const variables = analyzeVariables(text, environmentId)
    if (variables.length === 0) {
      return [{ type: 'text', content: text }]
    }

    const parts = []
    let lastIndex = 0

    variables.forEach(variable => {
      // Add text before variable
      if (variable.start > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, variable.start)
        })
      }

      // Add variable part
      parts.push({
        type: 'variable',
        content: variable.match,
        name: variable.name,
        exists: variable.exists,
        value: variable.value,
        resolved: variable.resolved
      })

      lastIndex = variable.end
    })

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      })
    }

    return parts
  }

  /**
   * Preview what the interpolated text would look like
   * @param {string} text - Original text
   * @param {string} environmentId - Optional environment ID
   * @returns {object} Object with original, interpolated, and variable info
   */
  const previewInterpolation = (text, environmentId = null) => {
    const variables = analyzeVariables(text, environmentId)
    const interpolated = interpolateText(text, environmentId)

    return {
      original: text,
      interpolated,
      variables,
      hasVariables: variables.length > 0,
      allResolved: variables.every(v => v.resolved),
      unresolvedCount: variables.filter(v => !v.resolved).length
    }
  }

  // Reactive computed properties for active environment
  const activeEnvironment = computed(() => {
    const env = environmentsStore.activeEnvironment.value
    return env
  })
  const availableVariables = computed(() => {
    const vars = environmentsStore.getAvailableVariables()
    return vars
  })

  return {
    // Core functions
    detectVariables,
    variableExists,
    getVariableValue,
    interpolateText,
    analyzeVariables,
    splitTextForHighlighting,
    previewInterpolation,

    // Reactive data
    activeEnvironment,
    availableVariables,

    // Utilities
    VARIABLE_REGEX
  }
}