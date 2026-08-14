<template>
  <div
    class="segmented"
    :class="`is-${variant}`"
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
  },
  /**
   * compact — hug content
   * stretch — full width, equal columns, hairline separators
   * split — centered group with separators between items
   */
  variant: {
    type: String,
    default: 'compact'
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.segmented.is-stretch {
  display: flex;
  width: 100%;
  padding: 0;
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
}

.segmented.is-stretch .segmented-option {
  flex: 1;
  justify-content: center;
  border-radius: 0;
  min-height: 40px;
  padding: 10px 12px;
  position: relative;
}

.segmented.is-stretch .segmented-option + .segmented-option::before {
  content: '';
  position: absolute;
  left: 0;
  top: 22%;
  bottom: 22%;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--color-border-light) 20%,
    var(--color-border-light) 80%,
    transparent
  );
  pointer-events: none;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.segmented.is-stretch .segmented-option.active + .segmented-option::before,
.segmented.is-stretch .segmented-option.active::before {
  opacity: 0;
}

.segmented.is-stretch .segmented-option.active {
  box-shadow: inset 0 0 0 1px var(--color-border-light), var(--shadow-sm);
}

.segmented.is-split {
  display: inline-flex;
  width: auto;
  padding: 0;
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
}

.segmented.is-split .segmented-option {
  justify-content: center;
  border-radius: 0;
  min-height: 40px;
  min-width: 7.5rem;
  padding: 10px 18px;
  position: relative;
}

.segmented.is-split .segmented-option + .segmented-option::before {
  content: '';
  position: absolute;
  left: 0;
  top: 22%;
  bottom: 22%;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--color-border-light) 18%,
    var(--color-border-light) 82%,
    transparent
  );
  pointer-events: none;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.segmented.is-split .segmented-option.active + .segmented-option::before,
.segmented.is-split .segmented-option.active::before {
  opacity: 0;
}

.segmented.is-split .segmented-option.active {
  box-shadow: inset 0 0 0 1px var(--color-border-light), var(--shadow-sm);
}

@media (prefers-reduced-motion: reduce) {
  .segmented-option {
    transition: none;
  }
}
</style>
