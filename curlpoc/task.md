## ToastMan AI Chat Feature Implementation

### Overview
Add a local LLM-powered cURL assistant that runs in-browser via WebGPU. Users describe requests in natural language, receive generated cURL commands with explanations, and can send them directly to the cURL composer.

### Reference POC
There's a working proof-of-concept to reference. Locate it in the project foldere curlpoc. It demonstrates:
- WebGPU model loading (Qwen 2.5 3B via transformers.js or similar)
- Prompt structure that outputs code in triple backticks
- Post-processing to separate code from guidance text

### UI Architecture

**1. Composer Integration**
- Add "Chat" button/tab in the composer component, alongside existing "Visual" option
- This toggles between the cURL editor view and the AI chat view
- Both share the same conversation context

**2. Chat View Components**
Create two new bubble components:
- `UserChatBubble.vue` — user's natural language question, aligned right
- `AIChatBubble.vue` — AI response, aligned left, containing:
  - Code block section (rendered with ACE editor cURL syntax highlighting, read-only or editable)
  - Guidance/explanation section (collapsible)
  - **"Send to Composer" button** — copies the generated cURL to the main composer editor

**3. Response Structure**
The AI response bubble should parse the LLM output:
```
{
  code: "curl -X POST ...",      // extracted from ```curl...``` block
  guidance: "The -X flag..."     // everything outside the code block
}
```

### Model Support

**Multiple Models**
- Support model selection (dropdown), similar to POC
- Suggested options: Qwen 2.5 (3B), potentially smaller models for lower-end hardware
- Store user's model preference in settings

**Capability Detection**
Before showing the Chat feature:
1. Check for WebGPU availability (`navigator.gpu`)
2. Check for sufficient VRAM if possible
3. Display appropriate messaging:
   - No WebGPU: "AI Chat requires WebGPU. Your browser doesn't support it. Try Chrome/Edge 113+."
   - Insufficient resources: "AI Chat requires ~2GB VRAM. Your device may not support it."
   - Available: Show model selector with size/quality tradeoffs

### History Integration
- AI chat messages should be saved in the existing conversation history system
- Each exchange (user question + AI response) is a history entry
- The generated cURL command should be extractable/replayable from history

### File Locations (likely)
- New components: `UserChatBubble.vue`, `AIChatBubble.vue`
- Composer modification: `/ChatComposer.vue`
- AI service new directory for LLM integration
- Model/capability detection: `src/utils/webgpu.js` or similar

### Implementation Order Suggestion
1. WebGPU capability detection utility
2. AI service wrapper (model loading, inference, response parsing)
3. UserChatBubble and AIChatBubble components
4. Chat view integration in composer
5. "Send to Composer" functionality
6. History integration
7. Settings UI for model selection