<template>
  <div class="composer-bar">
    <div class="composer-bar-start">
      <slot name="start" />
    </div>
    <div class="composer-bar-end">
      <slot name="end" />
    </div>
  </div>
</template>

<script setup>
/**
 * Shared recessed action bar for Editor / Visual / Script.
 * Use start for mode tools, end for Save / Send.
 */
</script>

<style scoped>
.composer-bar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  width: 100%;
  min-height: 56px;
  padding: 4px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--surface-highlight);
}

.composer-bar-start,
.composer-bar-end {
  display: flex;
  align-items: stretch;
  gap: 4px;
  min-width: 0;
}

.composer-bar :deep(.bar-rule) {
  width: 1px;
  margin: 8px 6px;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--color-border-light) 15%,
    var(--color-border-light) 85%,
    transparent
  );
}

.composer-bar :deep(.bar-btn) {
  padding: 0 16px;
  min-height: 46px;
  font-size: 14px;
  font-weight: 600;
  background: transparent;
  border: none;
  border-radius: 9px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.composer-bar :deep(.bar-btn:hover:not(:disabled):not(.primary)) {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.composer-bar :deep(.bar-btn.active) {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-sm);
}

.composer-bar :deep(.bar-btn.primary) {
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 0 24px;
}

.composer-bar :deep(.bar-btn.primary:hover:not(:disabled)) {
  opacity: 0.92;
}

.composer-bar :deep(.bar-btn:disabled) {
  opacity: 0.45;
  cursor: not-allowed;
}

.composer-bar :deep(.loading-spinner) {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
