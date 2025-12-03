<script setup>
import { defineEmits, defineProps } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'text'
  },
  theme: {
    type: String,
    default: 'dark'
  },
  readonly: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: ''
  },
  height: {
    type: String,
    default: '400px'
  },
  options: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'focus', 'blur'])

// Base methods that concrete implementations should override
const focus = () => {
  console.warn('BaseTextEditor: focus() should be implemented by concrete editor')
}

const blur = () => {
  console.warn('BaseTextEditor: blur() should be implemented by concrete editor')
}

const setValue = (value) => {
  console.warn('BaseTextEditor: setValue() should be implemented by concrete editor')
}

const getValue = () => {
  console.warn('BaseTextEditor: getValue() should be implemented by concrete editor')
  return props.modelValue
}

// Expose methods for parent components
defineExpose({
  focus,
  blur,
  setValue,
  getValue
})
</script>

<template>
  <div class="base-text-editor">
    <!-- Fallback textarea if no concrete implementation -->
    <textarea
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
      :placeholder="placeholder"
      :readonly="readonly"
      :style="{ height }"
      class="fallback-editor"
    />
  </div>
</template>

<style scoped>
.base-text-editor {
  width: 100%;
  height: 100%;
}

.fallback-editor {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 12px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  resize: vertical;
  outline: none;
}

.fallback-editor:focus {
  border-color: var(--color-primary);
}
</style>