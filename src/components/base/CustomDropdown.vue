<template>
  <div class="custom-dropdown" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <button
      ref="triggerRef"
      type="button"
      :disabled="disabled"
      @click="toggleDropdown"
      class="custom-dropdown-trigger"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
    >
      <span class="custom-dropdown-value">
        {{ displayValue }}
      </span>
      <svg
        class="custom-dropdown-chevron"
        :class="{ 'is-open': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <Transition name="dropdown-fade">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="custom-dropdown-menu"
        role="listbox"
      >
        <button
          v-for="(option, index) in options"
          :key="getOptionValue(option)"
          type="button"
          role="option"
          :aria-selected="isSelected(option)"
          @click="selectOption(option)"
          class="custom-dropdown-option"
          :class="{ 'is-selected': isSelected(option), 'is-focused': isFocused(index) }"
        >
          {{ getOptionLabel(option) }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: null
  },
  options: {
    type: Array,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: 'Select an option'
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const triggerRef = ref(null)
const dropdownRef = ref(null)
const focusedIndex = ref(-1)

const getOptionValue = (option) => {
  return typeof option === 'object' && option !== null ? option.value : option
}

const getOptionLabel = (option) => {
  return typeof option === 'object' && option !== null ? option.label : option
}

const isSelected = (option) => {
  return getOptionValue(option) === props.modelValue
}

const isFocused = (index) => {
  return focusedIndex.value === index
}

const displayValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') {
    return props.placeholder
  }
  const selectedOption = props.options.find(opt => getOptionValue(opt) === props.modelValue)
  return selectedOption ? getOptionLabel(selectedOption) : props.placeholder
})

const toggleDropdown = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value

  // Reset focused index when opening
  if (isOpen.value) {
    // Focus the selected item or first item
    const selectedIndex = props.options.findIndex(opt => getOptionValue(opt) === props.modelValue)
    focusedIndex.value = selectedIndex >= 0 ? selectedIndex : 0
  } else {
    focusedIndex.value = -1
  }
}

const selectOption = (option) => {
  const value = getOptionValue(option)
  emit('update:modelValue', value)
  isOpen.value = false
  focusedIndex.value = -1
}

const handleKeydown = (event) => {
  if (!isOpen.value) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusedIndex.value = Math.min(focusedIndex.value + 1, props.options.length - 1)
      scrollToFocusedOption()
      break
    case 'ArrowUp':
      event.preventDefault()
      focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
      scrollToFocusedOption()
      break
    case 'Enter':
      event.preventDefault()
      if (focusedIndex.value >= 0 && focusedIndex.value < props.options.length) {
        selectOption(props.options[focusedIndex.value])
      }
      break
    case 'Tab':
      isOpen.value = false
      focusedIndex.value = -1
      break
  }
}

const scrollToFocusedOption = () => {
  if (!dropdownRef.value || focusedIndex.value < 0) return

  const optionElements = dropdownRef.value.querySelectorAll('.custom-dropdown-option')
  const focusedElement = optionElements[focusedIndex.value]

  if (focusedElement) {
    focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
}

const handleClickOutside = (event) => {
  if (
    isOpen.value &&
    triggerRef.value &&
    dropdownRef.value &&
    !triggerRef.value.contains(event.target) &&
    !dropdownRef.value.contains(event.target)
  ) {
    isOpen.value = false
  }
}

const handleEscape = (event) => {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false
    focusedIndex.value = -1
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.custom-dropdown {
  position: relative;
  width: 100%;
}

.custom-dropdown-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.custom-dropdown-trigger:hover:not(:disabled) {
  border-color: var(--color-border-dark);
}

.custom-dropdown-trigger:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.custom-dropdown-trigger:disabled {
  opacity: 0.6;
  background: var(--color-bg-secondary);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.custom-dropdown-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-dropdown-chevron {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
  color: var(--color-text-secondary);
}

.custom-dropdown-chevron.is-open {
  transform: rotate(180deg);
}

.custom-dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 250px;
  overflow-y: auto;
  overflow-x: hidden;
}

.custom-dropdown-option {
  width: 100%;
  display: block;
  padding: 8px 32px 8px 12px;
  background: transparent;
  color: var(--color-text-primary);
  border: none;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
}

.custom-dropdown-option:hover {
  background: var(--color-bg-hover);
}

.custom-dropdown-option.is-focused {
  background: var(--color-bg-hover);
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.custom-dropdown-option.is-selected {
  background: var(--color-bg-tertiary);
  color: var(--color-primary);
  font-weight: 600;
}

.custom-dropdown-option.is-selected::after {
  content: '✓';
  position: absolute;
  right: 12px;
  color: var(--color-primary);
  font-weight: bold;
}

.custom-dropdown-option.is-selected:hover,
.custom-dropdown-option.is-selected.is-focused {
  background: var(--color-bg-hover);
}

/* Scrollbar styling */
.custom-dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.custom-dropdown-menu::-webkit-scrollbar-track {
  background: transparent;
}

.custom-dropdown-menu::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.custom-dropdown-menu::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}

/* Transition animations */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
