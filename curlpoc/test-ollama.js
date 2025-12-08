// Quick test script to verify Ollama is working
async function testOllama() {
  console.log('🧪 Testing Ollama connection...\n')

  try {
    // Check if Ollama is running
    const tagsResponse = await fetch('http://localhost:11434/api/tags')
    if (!tagsResponse.ok) {
      throw new Error('Ollama not running')
    }
    console.log('✅ Ollama is running')

    const tags = await tagsResponse.json()
    console.log(`📦 Available models: ${tags.models.map(m => m.name).join(', ')}\n`)

    // Test generation
    console.log('🤖 Testing cURL generation...\n')
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: `You are a cURL command generator. Convert this request to a cURL command. Output ONLY the cURL command.

User request: "POST request to https://api.example.com/users with JSON data name: John, email: john@example.com"

cURL command:`,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 150
        }
      })
    })

    const data = await response.json()
    console.log('Generated cURL command:')
    console.log('---')
    console.log(data.response.trim())
    console.log('---\n')
    console.log('✅ Test successful!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Make sure Ollama is installed and running:')
    console.log('   1. Install: https://ollama.ai')
    console.log('   2. Run: ollama run llama3.2')
  }
}

testOllama()
