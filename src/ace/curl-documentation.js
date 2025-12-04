/**
 * cURL Flag Documentation
 *
 * Comprehensive documentation for cURL command-line flags.
 * Used for educational tooltips in the cURL editor.
 */

export const FLAG_DOCS = {
  // Request method flags
  '-X': {
    name: 'Request Method',
    short: '-X',
    long: '--request',
    description: 'Specifies the HTTP request method to use when communicating with the server.',
    example: '-X POST',
    usage: 'Common methods: GET (default), POST, PUT, PATCH, DELETE, HEAD, OPTIONS.',
    tip: 'GET is used by default. Use -X to override for other methods.'
  },
  '--request': {
    name: 'Request Method',
    short: '-X',
    long: '--request',
    description: 'Specifies the HTTP request method to use when communicating with the server.',
    example: '--request POST',
    usage: 'Common methods: GET (default), POST, PUT, PATCH, DELETE, HEAD, OPTIONS.',
    tip: 'GET is used by default. Use --request to override for other methods.'
  },

  // Header flags
  '-H': {
    name: 'Header',
    short: '-H',
    long: '--header',
    description: 'Adds a custom HTTP header to the request. Multiple -H flags can be used.',
    example: '-H "Content-Type: application/json"',
    usage: 'Format: -H "Header-Name: value". Use for authentication, content types, etc.',
    tip: 'Common headers: Content-Type, Authorization, Accept, User-Agent.'
  },
  '--header': {
    name: 'Header',
    short: '-H',
    long: '--header',
    description: 'Adds a custom HTTP header to the request. Multiple --header flags can be used.',
    example: '--header "Authorization: Bearer token123"',
    usage: 'Format: --header "Header-Name: value". Use for authentication, content types, etc.',
    tip: 'Common headers: Content-Type, Authorization, Accept, User-Agent.'
  },

  // Data/body flags
  '-d': {
    name: 'Data',
    short: '-d',
    long: '--data',
    description: 'Sends the specified data in a POST request body. Implies -X POST.',
    example: '-d \'{"name": "John", "email": "john@example.com"}\'',
    usage: 'Data is sent as application/x-www-form-urlencoded by default.',
    tip: 'Use with -H "Content-Type: application/json" for JSON payloads.'
  },
  '--data': {
    name: 'Data',
    short: '-d',
    long: '--data',
    description: 'Sends the specified data in a POST request body. Implies -X POST.',
    example: '--data \'{"key": "value"}\'',
    usage: 'Data is sent as application/x-www-form-urlencoded by default.',
    tip: 'Use with --header "Content-Type: application/json" for JSON payloads.'
  },
  '--data-raw': {
    name: 'Raw Data',
    short: null,
    long: '--data-raw',
    description: 'Sends data exactly as specified, without any processing.',
    example: '--data-raw \'{"raw": "data"}\'',
    usage: 'Unlike -d, special characters like @ are not interpreted.',
    tip: 'Use when your data contains @ symbols that should be literal.'
  },
  '--data-binary': {
    name: 'Binary Data',
    short: null,
    long: '--data-binary',
    description: 'Sends binary data in the request body.',
    example: '--data-binary @file.bin',
    usage: 'Use for uploading binary files. Preserves newlines and special chars.',
    tip: 'Use @filename to read data from a file.'
  },
  '--data-urlencode': {
    name: 'URL Encoded Data',
    short: null,
    long: '--data-urlencode',
    description: 'URL-encodes the data before sending.',
    example: '--data-urlencode "name=John Doe"',
    usage: 'Automatically encodes special characters for URL safety.',
    tip: 'Useful for form data with spaces or special characters.'
  },

  // Form flags
  '-F': {
    name: 'Form Field',
    short: '-F',
    long: '--form',
    description: 'Sends a multipart/form-data POST request with form fields.',
    example: '-F "file=@photo.jpg" -F "name=John"',
    usage: 'Use for file uploads or form submissions. @ prefix reads from file.',
    tip: 'Automatically sets Content-Type to multipart/form-data.'
  },
  '--form': {
    name: 'Form Field',
    short: '-F',
    long: '--form',
    description: 'Sends a multipart/form-data POST request with form fields.',
    example: '--form "document=@report.pdf"',
    usage: 'Use for file uploads or form submissions. @ prefix reads from file.',
    tip: 'Automatically sets Content-Type to multipart/form-data.'
  },

  // Authentication flags
  '-u': {
    name: 'User Authentication',
    short: '-u',
    long: '--user',
    description: 'Specifies username and password for server authentication.',
    example: '-u username:password',
    usage: 'Format: -u user:pass. Omit password to be prompted.',
    tip: 'Used for Basic HTTP authentication. Consider using tokens instead.'
  },
  '--user': {
    name: 'User Authentication',
    short: '-u',
    long: '--user',
    description: 'Specifies username and password for server authentication.',
    example: '--user admin:secret123',
    usage: 'Format: --user user:pass. Omit password to be prompted.',
    tip: 'Used for Basic HTTP authentication. Consider using tokens instead.'
  },

  // SSL/TLS flags
  '-k': {
    name: 'Insecure',
    short: '-k',
    long: '--insecure',
    description: 'Allows connections to SSL sites without valid certificates.',
    example: '-k https://self-signed.example.com',
    usage: 'Skips SSL certificate verification. Use with caution!',
    tip: 'Only use for development/testing with self-signed certs.'
  },
  '--insecure': {
    name: 'Insecure',
    short: '-k',
    long: '--insecure',
    description: 'Allows connections to SSL sites without valid certificates.',
    example: '--insecure https://localhost:8443',
    usage: 'Skips SSL certificate verification. Use with caution!',
    tip: 'Only use for development/testing with self-signed certs.'
  },

  // Redirect flags
  '-L': {
    name: 'Follow Redirects',
    short: '-L',
    long: '--location',
    description: 'Follows HTTP redirects (3xx responses) to the new location.',
    example: '-L https://short.url/abc',
    usage: 'Automatically follows Location headers up to 50 redirects.',
    tip: 'Essential for shortened URLs or sites with redirects.'
  },
  '--location': {
    name: 'Follow Redirects',
    short: '-L',
    long: '--location',
    description: 'Follows HTTP redirects (3xx responses) to the new location.',
    example: '--location https://example.com/old-page',
    usage: 'Automatically follows Location headers up to 50 redirects.',
    tip: 'Essential for shortened URLs or sites with redirects.'
  },

  // Output flags
  '-o': {
    name: 'Output File',
    short: '-o',
    long: '--output',
    description: 'Writes output to a file instead of stdout.',
    example: '-o response.json',
    usage: 'Saves the response body to the specified file.',
    tip: 'Use with -O to keep the remote filename.'
  },
  '--output': {
    name: 'Output File',
    short: '-o',
    long: '--output',
    description: 'Writes output to a file instead of stdout.',
    example: '--output data.txt',
    usage: 'Saves the response body to the specified file.',
    tip: 'Use with --remote-name to keep the remote filename.'
  },
  '-O': {
    name: 'Remote Name',
    short: '-O',
    long: '--remote-name',
    description: 'Writes output using the remote filename from the URL.',
    example: '-O https://example.com/file.zip',
    usage: 'Saves to "file.zip" based on the URL path.',
    tip: 'Convenient for downloading files with original names.'
  },

  // Verbose/debug flags
  '-v': {
    name: 'Verbose',
    short: '-v',
    long: '--verbose',
    description: 'Shows detailed information about the request and response.',
    example: '-v https://api.example.com',
    usage: 'Displays headers, SSL handshake, and connection info.',
    tip: 'Great for debugging. Use -vv for even more detail.'
  },
  '--verbose': {
    name: 'Verbose',
    short: '-v',
    long: '--verbose',
    description: 'Shows detailed information about the request and response.',
    example: '--verbose https://api.example.com',
    usage: 'Displays headers, SSL handshake, and connection info.',
    tip: 'Great for debugging. Use multiple -v for more detail.'
  },
  '-i': {
    name: 'Include Headers',
    short: '-i',
    long: '--include',
    description: 'Includes HTTP response headers in the output.',
    example: '-i https://api.example.com',
    usage: 'Shows status line and headers before the body.',
    tip: 'Useful for seeing status codes and response headers.'
  },
  '--include': {
    name: 'Include Headers',
    short: '-i',
    long: '--include',
    description: 'Includes HTTP response headers in the output.',
    example: '--include https://api.example.com',
    usage: 'Shows status line and headers before the body.',
    tip: 'Useful for seeing status codes and response headers.'
  },
  '-s': {
    name: 'Silent',
    short: '-s',
    long: '--silent',
    description: 'Suppresses progress meter and error messages.',
    example: '-s https://api.example.com',
    usage: 'Useful in scripts where you only want the response body.',
    tip: 'Combine with -S to show errors but hide progress.'
  },
  '--silent': {
    name: 'Silent',
    short: '-s',
    long: '--silent',
    description: 'Suppresses progress meter and error messages.',
    example: '--silent https://api.example.com',
    usage: 'Useful in scripts where you only want the response body.',
    tip: 'Combine with --show-error to show errors but hide progress.'
  },

  // Timeout flags
  '-m': {
    name: 'Max Time',
    short: '-m',
    long: '--max-time',
    description: 'Sets maximum time in seconds for the entire operation.',
    example: '-m 30',
    usage: 'Request fails if it takes longer than specified seconds.',
    tip: 'Use to prevent hanging on slow servers.'
  },
  '--max-time': {
    name: 'Max Time',
    short: '-m',
    long: '--max-time',
    description: 'Sets maximum time in seconds for the entire operation.',
    example: '--max-time 60',
    usage: 'Request fails if it takes longer than specified seconds.',
    tip: 'Use to prevent hanging on slow servers.'
  },
  '--connect-timeout': {
    name: 'Connect Timeout',
    short: null,
    long: '--connect-timeout',
    description: 'Sets maximum time in seconds to wait for connection.',
    example: '--connect-timeout 10',
    usage: 'Only affects the connection phase, not the transfer.',
    tip: 'Use with --max-time for complete timeout control.'
  },

  // Cookie flags
  '-b': {
    name: 'Cookie',
    short: '-b',
    long: '--cookie',
    description: 'Sends cookies with the request.',
    example: '-b "session=abc123; user=john"',
    usage: 'Format: "name=value" or read from file with -b cookies.txt',
    tip: 'Use -c to save received cookies to a file.'
  },
  '--cookie': {
    name: 'Cookie',
    short: '-b',
    long: '--cookie',
    description: 'Sends cookies with the request.',
    example: '--cookie "token=xyz789"',
    usage: 'Format: "name=value" or read from file with --cookie cookies.txt',
    tip: 'Use --cookie-jar to save received cookies to a file.'
  },
  '-c': {
    name: 'Cookie Jar',
    short: '-c',
    long: '--cookie-jar',
    description: 'Saves received cookies to a file.',
    example: '-c cookies.txt',
    usage: 'Stores cookies from response Set-Cookie headers.',
    tip: 'Use with -b to read cookies back in subsequent requests.'
  },

  // User agent flag
  '-A': {
    name: 'User Agent',
    short: '-A',
    long: '--user-agent',
    description: 'Sets the User-Agent header for the request.',
    example: '-A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"',
    usage: 'Identifies the client to the server.',
    tip: 'Some APIs require specific user agents.'
  },
  '--user-agent': {
    name: 'User Agent',
    short: '-A',
    long: '--user-agent',
    description: 'Sets the User-Agent header for the request.',
    example: '--user-agent "MyApp/1.0"',
    usage: 'Identifies the client to the server.',
    tip: 'Some APIs require specific user agents.'
  }
}

/**
 * Get documentation for a flag
 * @param {string} flag - The flag to look up (e.g., '-H', '--header')
 * @returns {object|null} - The documentation object or null if not found
 */
export function getFlagDoc(flag) {
  const trimmed = flag?.trim()
  return FLAG_DOCS[trimmed] || null
}

/**
 * Get all flag names for autocomplete
 * @returns {string[]} - Array of all flag names
 */
export function getAllFlags() {
  return Object.keys(FLAG_DOCS)
}

export default FLAG_DOCS
