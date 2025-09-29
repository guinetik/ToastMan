<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseDialog from './BaseDialog.vue'
import { EnvironmentVariable } from '../models/Environment.js'

const props = defineProps({
  environment: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'update'])

// Local state for variables
const variables = ref([])
const newVariable = ref({
  key: '',
  value: '',
  type: 'default',
  description: '',
  enabled: true
})

// Initialize variables from environment
onMounted(() => {
  variables.value = (props.environment.values || []).map(v => ({ ...v }))
  // Add an empty row for new variable
  if (variables.value.length === 0) {
    addEmptyVariable()
  }
})

const variableTypes = [
  { value: 'default', label: 'Text' },
  { value: 'secret', label: 'Secret' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'json', label: 'JSON' }
]

const enabledVariablesCount = computed(() => {
  return variables.value.filter(v => v.enabled && v.key).length
})

const addEmptyVariable = () => {
  variables.value.push({
    id: `temp_${Date.now()}`,
    key: '',
    value: '',
    type: 'default',
    description: '',
    enabled: true
  })
}

const removeVariable = (index) => {
  variables.value.splice(index, 1)
  if (variables.value.length === 0) {
    addEmptyVariable()
  }
}

const duplicateVariable = (index) => {
  const original = variables.value[index]
  const duplicate = {
    ...original,
    id: `temp_${Date.now()}`,
    key: `${original.key}_copy`,
    enabled: true
  }
  variables.value.splice(index + 1, 0, duplicate)
}

const validateVariable = (variable) => {
  if (!variable.key) return 'Key is required'

  // Check for duplicate keys
  const duplicates = variables.value.filter(v => v.key === variable.key && v.key !== '')
  if (duplicates.length > 1) return 'Duplicate key'

  if (variable.type === 'number' && variable.value !== '') {
    if (isNaN(Number(variable.value))) return 'Must be a number'
  }

  if (variable.type === 'boolean' && variable.value !== '') {
    if (variable.value !== 'true' && variable.value !== 'false') {
      return 'Must be true or false'
    }
  }

  if (variable.type === 'json' && variable.value !== '') {
    try {
      JSON.parse(variable.value)
    } catch {
      return 'Invalid JSON'
    }
  }

  return null
}

const hasErrors = computed(() => {
  return variables.value.some(v => v.key && validateVariable(v))
})

const saveChanges = () => {
  if (hasErrors.value) return

  // Filter out empty variables and create EnvironmentVariable instances
  const validVariables = variables.value
    .filter(v => v.key.trim() !== '')
    .map(v => {
      try {
        return new EnvironmentVariable({
          key: v.key.trim(),
          value: v.value,
          type: v.type,
          description: v.description || '',
          enabled: v.enabled
        }).toJSON()
      } catch (error) {
        console.error('Error creating environment variable:', error)
        return null
      }
    })
    .filter(v => v !== null)

  emit('update', {
    ...props.environment,
    values: validVariables
  })
  emit('close')
}

const handleKeyInput = (index, event) => {
  const variable = variables.value[index]
  variable.key = event.target.value

  // Auto-add new row if this is the last row and user typed something
  if (index === variables.value.length - 1 && variable.key.trim() !== '') {
    addEmptyVariable()
  }
}

const formatPlaceholder = (type) => {
  switch (type) {
    case 'secret': return 'Enter secret value...'
    case 'number': return 'Enter number...'
    case 'boolean': return 'true or false'
    case 'json': return 'Enter JSON object...'
    default: return 'Enter value...'
  }
}
</script>

<template>
  <BaseDialog
    :title="`Environment Variables - ${environment.name}`"
    width="800px"
    height="600px"
    @close="emit('close')"
  >
    <div class="variables-container">
      <!-- Variables Table -->
      <div class="variables-table">
        <div class="table-header">
          <div class="col-checkbox">
            <input type="checkbox" disabled>
          </div>
          <div class="col-key">Variable</div>
          <div class="col-type">Type</div>
          <div class="col-value">Initial Value</div>
          <div class="col-actions">Actions</div>
        </div>

        <div class="table-body">
          <div
            v-for="(variable, index) in variables"
            :key="variable.id || index"
            :class="['variable-row', { disabled: !variable.enabled }]"
          >
            <!-- Enabled checkbox -->
            <div class="col-checkbox">
              <input
                type="checkbox"
                v-model="variable.enabled"
                :disabled="!variable.key"
              >
            </div>

            <!-- Key input -->
            <div class="col-key">
              <input
                type="text"
                v-model="variable.key"
                @input="handleKeyInput(index, $event)"
                placeholder="Variable name..."
                class="input-field"
                :class="{ error: variable.key && validateVariable(variable) }"
              >
              <div
                v-if="variable.key && validateVariable(variable)"
                class="error-text"
              >
                {{ validateVariable(variable) }}
              </div>
            </div>

            <!-- Type select -->
            <div class="col-type">
              <select
                v-model="variable.type"
                class="input-field"
                :disabled="!variable.key"
              >
                <option
                  v-for="type in variableTypes"
                  :key="type.value"
                  :value="type.value"
                >
                  {{ type.label }}
                </option>
              </select>
            </div>

            <!-- Value input -->
            <div class="col-value">
              <input
                v-if="variable.type !== 'json'"
                :type="variable.type === 'secret' ? 'password' : 'text'"
                v-model="variable.value"
                :placeholder="formatPlaceholder(variable.type)"
                class="input-field"
                :disabled="!variable.key"
              >
              <textarea
                v-else
                v-model="variable.value"
                :placeholder="formatPlaceholder(variable.type)"
                class="input-field textarea-field"
                :disabled="!variable.key"
                rows="2"
              ></textarea>
            </div>

            <!-- Actions -->
            <div class="col-actions">
              <button
                v-if="variable.key"
                @click="duplicateVariable(index)"
                class="action-btn duplicate-btn"
                title="Duplicate variable"
              >
                📋
              </button>
              <button
                v-if="variables.length > 1"
                @click="removeVariable(index)"
                class="action-btn delete-btn"
                title="Delete variable"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="variables-summary">
        <span class="summary-text">
          {{ enabledVariablesCount }} enabled variable{{ enabledVariablesCount !== 1 ? 's' : '' }}
        </span>
        <button @click="addEmptyVariable" class="btn-secondary">
          + Add Variable
        </button>
      </div>
    </div>

    <!-- Actions -->
    <template #actions>
      <button @click="emit('close')" class="btn-secondary">
        Cancel
      </button>
      <button
        @click="saveChanges"
        class="btn-primary"
        :disabled="hasErrors"
      >
        Save Changes
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.variables-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.variables-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 40px 1fr 120px 2fr 80px;
  gap: 8px;
  padding: 12px;
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.table-body {
  flex: 1;
  overflow-y: auto;
}

.variable-row {
  display: grid;
  grid-template-columns: 40px 1fr 120px 2fr 80px;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--color-border-light);
  transition: all 0.2s ease;
}

.variable-row:hover {
  background: var(--color-bg-hover);
}

.variable-row.disabled {
  opacity: 0.6;
}

.variable-row:last-child {
  border-bottom: none;
}

.col-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-key,
.col-type,
.col-value {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.col-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-field {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 13px;
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.input-field:disabled {
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.input-field.error {
  border-color: var(--color-error);
}

.textarea-field {
  resize: vertical;
  min-height: 40px;
  font-family: monospace;
}

.error-text {
  color: var(--color-error);
  font-size: 11px;
  margin-top: 2px;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.delete-btn:hover {
  background: var(--color-error);
  color: white;
}

.duplicate-btn:hover {
  background: var(--color-primary);
  color: white;
}

.variables-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.summary-text {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.btn-primary {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-primary-light);
  transform: translateY(-1px);
}
</style>