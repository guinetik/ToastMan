/**
 * Script Snippets
 *
 * Pre-built code snippets for common Postman script operations.
 * These can be inserted into the script editor to help users
 * get started quickly.
 */

export const snippets = [
  // ============================================
  // Status Code Tests
  // ============================================
  {
    name: 'Status code is 200',
    category: 'Status Code',
    description: 'Check if response status is 200 OK',
    code: `pm.test("Status code is 200", function () {
    pm.expect(pm.response.code).to.equal(200);
});`
  },
  {
    name: 'Status code is 201',
    category: 'Status Code',
    description: 'Check if response status is 201 Created',
    code: `pm.test("Status code is 201", function () {
    pm.expect(pm.response.code).to.equal(201);
});`
  },
  {
    name: 'Successful response',
    category: 'Status Code',
    description: 'Check if status code is in 2xx range',
    code: `pm.test("Successful response", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});`
  },

  // ============================================
  // Response Time Tests
  // ============================================
  {
    name: 'Response time < 200ms',
    category: 'Performance',
    description: 'Check if response time is under 200 milliseconds',
    code: `pm.test("Response time is less than 200ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(200);
});`
  },
  {
    name: 'Response time < 500ms',
    category: 'Performance',
    description: 'Check if response time is under 500 milliseconds',
    code: `pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});`
  },

  // ============================================
  // Response Body Tests
  // ============================================
  {
    name: 'Response has JSON body',
    category: 'Response Body',
    description: 'Check if response can be parsed as JSON',
    code: `pm.test("Response is valid JSON", function () {
    pm.response.json(); // Throws if invalid JSON
});`
  },
  {
    name: 'Response has property',
    category: 'Response Body',
    description: 'Check if JSON response has a specific property',
    code: `pm.test("Response has 'data' property", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("data");
});`
  },
  {
    name: 'Response array not empty',
    category: 'Response Body',
    description: 'Check if response array has at least one item',
    code: `pm.test("Response array is not empty", function () {
    const json = pm.response.json();
    pm.expect(json).to.be.an("array");
    pm.expect(json.length).to.be.above(0);
});`
  },
  {
    name: 'Response value equals',
    category: 'Response Body',
    description: 'Check if a specific value matches expected',
    code: `pm.test("Response status is 'success'", function () {
    const json = pm.response.json();
    pm.expect(json.status).to.equal("success");
});`
  },
  {
    name: 'Response contains string',
    category: 'Response Body',
    description: 'Check if response body contains a string',
    code: `pm.test("Response contains expected text", function () {
    pm.expect(pm.response.text()).to.include("expected text");
});`
  },

  // ============================================
  // Header Tests
  // ============================================
  {
    name: 'Content-Type is JSON',
    category: 'Headers',
    description: 'Check if Content-Type header indicates JSON',
    code: `pm.test("Content-Type is application/json", function () {
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});`
  },
  {
    name: 'Header exists',
    category: 'Headers',
    description: 'Check if a specific header is present',
    code: `pm.test("X-Request-Id header exists", function () {
    pm.expect(pm.response.headers.has("X-Request-Id")).to.be.true;
});`
  },

  // ============================================
  // Environment Variables
  // ============================================
  {
    name: 'Save access token',
    category: 'Environment',
    description: 'Extract and save access token from response',
    code: `// Save access token to environment
const json = pm.response.json();
if (json.access_token) {
    pm.environment.set("access_token", json.access_token);
    console.log("Access token saved to environment");
}`
  },
  {
    name: 'Save response value',
    category: 'Environment',
    description: 'Save a value from response to environment',
    code: `// Save a value from response to environment
const json = pm.response.json();
pm.environment.set("saved_id", json.id);`
  },
  {
    name: 'Save multiple values',
    category: 'Environment',
    description: 'Save multiple values from OAuth response',
    code: `// Save OAuth tokens
const json = pm.response.json();
if (pm.response.code === 200) {
    pm.environment.set("access_token", json.access_token);
    pm.environment.set("refresh_token", json.refresh_token);
    pm.environment.set("expires_in", json.expires_in);
    console.log("Tokens saved successfully");
}`
  },
  {
    name: 'Use environment variable',
    category: 'Environment',
    description: 'Access an environment variable in test',
    code: `pm.test("Response matches expected user", function () {
    const expectedId = pm.environment.get("user_id");
    const json = pm.response.json();
    pm.expect(json.id).to.equal(expectedId);
});`
  },

  // ============================================
  // Schema Validation
  // ============================================
  {
    name: 'Validate object schema',
    category: 'Schema',
    description: 'Check if response has required properties',
    code: `pm.test("Response has valid schema", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("id");
    pm.expect(json).to.have.property("name");
    pm.expect(json).to.have.property("email");
    pm.expect(json.id).to.be.a("number");
    pm.expect(json.name).to.be.a("string");
    pm.expect(json.email).to.be.a("string");
});`
  },
  {
    name: 'Validate array items',
    category: 'Schema',
    description: 'Check if each array item has required properties',
    code: `pm.test("Each item has required properties", function () {
    const json = pm.response.json();
    pm.expect(json).to.be.an("array");
    json.forEach((item, index) => {
        pm.expect(item, \`Item \${index}\`).to.have.property("id");
        pm.expect(item, \`Item \${index}\`).to.have.property("name");
    });
});`
  },

  // ============================================
  // Error Handling
  // ============================================
  {
    name: 'Check error response',
    category: 'Errors',
    description: 'Verify error response structure',
    code: `pm.test("Error response is valid", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("error");
    pm.expect(json.error).to.have.property("message");
});`
  },
  {
    name: 'Not found response',
    category: 'Errors',
    description: 'Check for 404 Not Found response',
    code: `pm.test("Resource not found", function () {
    pm.expect(pm.response.code).to.equal(404);
    const json = pm.response.json();
    pm.expect(json.error).to.include("not found");
});`
  },

  // ============================================
  // Conditional Logic
  // ============================================
  {
    name: 'Conditional save',
    category: 'Conditional',
    description: 'Save to environment only on success',
    code: `// Only save data on successful response
if (pm.response.code === 200) {
    const json = pm.response.json();
    pm.environment.set("last_response_id", json.id);
    pm.test("Data saved successfully", function () {
        pm.expect(true).to.be.true;
    });
} else {
    console.warn("Request failed with status:", pm.response.code);
}`
  },
  {
    name: 'Log response details',
    category: 'Debugging',
    description: 'Log response information for debugging',
    code: `// Log response details for debugging
console.log("Status:", pm.response.code, pm.response.status);
console.log("Response time:", pm.response.responseTime, "ms");
console.log("Body:", pm.response.text().substring(0, 200));`
  }
]

/**
 * Get snippets grouped by category
 */
export function getSnippetsByCategory() {
  const grouped = {}
  snippets.forEach(snippet => {
    if (!grouped[snippet.category]) {
      grouped[snippet.category] = []
    }
    grouped[snippet.category].push(snippet)
  })
  return grouped
}

/**
 * Get all categories
 */
export function getCategories() {
  return [...new Set(snippets.map(s => s.category))]
}

/**
 * Find snippet by name
 */
export function findSnippet(name) {
  return snippets.find(s => s.name === name)
}

export default snippets
