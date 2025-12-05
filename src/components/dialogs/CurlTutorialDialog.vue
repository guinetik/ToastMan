<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="tutorial-modal-overlay" @click.self="emit('close')">
      <div class="tutorial-modal">
        <div class="tutorial-modal-header">
          <h2>📖 cURL Tutorial</h2>
          <button class="tutorial-close-btn" @click="emit('close')">&times;</button>
        </div>

        <div class="tutorial-modal-content">
          <div class="tutorial-section">
            <h3>Basic Syntax</h3>
            <code class="syntax-block">curl [options] &lt;URL&gt;</code>
            <p>cURL is a command-line tool for transferring data with URLs. ToastMan parses cURL commands to build HTTP requests.</p>
          </div>

          <div class="tutorial-section">
            <h3>Common Options</h3>
            <div class="options-grid">
              <div class="option-item">
                <code>-X, --request</code>
                <span>HTTP method (GET, POST, PUT, DELETE, etc.)</span>
                <code class="example">curl -X POST https://api.example.com</code>
              </div>
              <div class="option-item">
                <code>-H, --header</code>
                <span>Add a header to the request</span>
                <code class="example">curl -H "Content-Type: application/json" URL</code>
              </div>
              <div class="option-item">
                <code>-d, --data</code>
                <span>Send data in the request body</span>
                <code class="example">curl -d '{"key":"value"}' URL</code>
              </div>
              <div class="option-item">
                <code>-u, --user</code>
                <span>Basic authentication (user:password)</span>
                <code class="example">curl -u admin:secret URL</code>
              </div>
              <div class="option-item">
                <code>-A, --user-agent</code>
                <span>Set the User-Agent header</span>
                <code class="example">curl -A "MyApp/1.0" URL</code>
              </div>
              <div class="option-item">
                <code>-b, --cookie</code>
                <span>Send cookies with the request</span>
                <code class="example">curl -b "session=abc123" URL</code>
              </div>
            </div>
          </div>

          <div class="tutorial-section">
            <h3>Quick Examples</h3>
            <div class="examples-list">
              <div class="example-block">
                <span class="example-label">GET Request</span>
                <code>curl https://api.example.com/users</code>
              </div>
              <div class="example-block">
                <span class="example-label">POST with JSON</span>
                <code>curl -X POST -H "Content-Type: application/json" -d '{"name":"John"}' https://api.example.com/users</code>
              </div>
              <div class="example-block">
                <span class="example-label">With Auth Header</span>
                <code>curl -H "Authorization: Bearer token123" https://api.example.com/me</code>
              </div>
              <div class="example-block">
                <span class="example-label">Form Data</span>
                <code>curl -X POST -F "file=@photo.jpg" -F "name=upload" https://api.example.com/upload</code>
              </div>
            </div>
          </div>

          <div class="tutorial-section tip">
            <h3>💡 Pro Tip</h3>
            <p>Most browsers let you copy requests as cURL from DevTools (Network tab → Right-click → Copy as cURL). Paste it directly into ToastMan!</p>
          </div>
        </div>

        <div class="tutorial-modal-footer">
          <button class="tutorial-got-it-btn" @click="emit('close')">Got it!</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tutorial-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.tutorial-modal {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.tutorial-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.tutorial-modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--color-text-primary);
}

.tutorial-close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.tutorial-close-btn:hover {
  color: var(--color-text-primary);
}

.tutorial-modal-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.tutorial-section {
  margin-bottom: 24px;
}

.tutorial-section:last-child {
  margin-bottom: 0;
}

.tutorial-section h3 {
  font-size: 16px;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
}

.tutorial-section p {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.tutorial-section.tip {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-md);
  padding: 16px;
}

.syntax-block {
  display: block;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  color: #64B5F6;
  margin-bottom: 12px;
}

.options-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: 12px;
}

.option-item > code:first-child {
  display: inline-block;
  background: rgba(100, 181, 246, 0.15);
  color: #64B5F6;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.option-item > span {
  display: block;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.option-item > code.example {
  display: block;
  background: var(--color-bg-tertiary);
  color: var(--color-text-muted);
  padding: 8px 10px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  overflow-x: auto;
}

.examples-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.example-block {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: 12px;
}

.example-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.example-block > code {
  display: block;
  background: var(--color-bg-tertiary);
  color: #a5d6a7;
  padding: 10px 12px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  overflow-x: auto;
  white-space: nowrap;
}

.tutorial-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  display: flex;
  justify-content: flex-end;
}

.tutorial-got-it-btn {
  padding: 10px 24px;
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tutorial-got-it-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
