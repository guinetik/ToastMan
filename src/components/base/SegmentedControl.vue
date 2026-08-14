<template>
  <div
    class="segmented"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="segmented-option"
      :class="{ active: isActive(option.value) }"
      :aria-checked="isActive(option.value)"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
/**
 * Segmented control — replacement for native radio groups.
 * Options: [{ value, label }]
 */
const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  options: {
    type: Array,
    required: true
  },
  ariaLabel: {
    type: String,
    default: 'Options'
  }
})

const emit = defineEmits(['update:modelValue'])

/**
 * @param {string|number|boolean} value
 * @returns {boolean}
 */
function isActive(value) {
  return props.modelValue === value
}

/**
 * @param {string|number|boolean} value
 */
function select(value) {
  if (value === props.modelValue) return
  emit('update:modelValue', value)
}
</script>

<style scoped>
.segmented {
  display: inline-flex;
  align-items: stretch;
  padding: 3px;
  gap: 2px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: var(--surface-highlight);
}

.segmented-option {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  padding: 8px 14px;
  min-height: 34px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.segmented-option:hover:not(.active) {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.segmented-option.active {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-sm);
}

.segmented-option:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .segmented-option {
    transition: none;
  }
}
</style>
