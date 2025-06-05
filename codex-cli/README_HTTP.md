# Codex HTTP API

This document describes the HTTP interface for the Codex CLI, which allows you to interact with the same core agent logic that powers the terminal CLI through RESTful API endpoints.

## Quick Start

1. **Start the HTTP server:**
   ```bash
   codex-http --port 3000
   ```

2. **Test the server:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **View the interactive API documentation:**
   ```bash
   # Open Swagger UI in your browser
   open swagger-ui.html
   
   # Or serve it with a simple HTTP server
   python3 -m http.server 8080
   # Then visit: http://localhost:8080/swagger-ui.html
   ```

4. **Run the example client:**
   ```bash
   node examples/http-client-example.js
   ```

## 📚 Documentation Options

### **Interactive API Documentation (Recommended)**
- **File**: `swagger-ui.html` 
- **Features**: Interactive API explorer, try-it-out functionality, comprehensive examples
- **Usage**: Open the HTML file in your browser or serve it with any web server

### **API Testing Collection**
- **Tool**: Bruno API client
- **Location**: `bruno-collection/` directory
- **Features**: Complete test suite with 19+ requests, environment setup, error scenarios
- **Setup**: Import the collection into [Bruno](https://usebruno.com/)

### **Reference Documentation**
- **File**: This `HTTP_API.md` file
- **Features**: Complete endpoint reference, examples, integration guides
- **Format**: Markdown for easy reading and integration

## Architecture

The HTTP interface reuses the same core `AgentLoop` class that powers the CLI, ensuring feature parity and consistency. Key components:

- **Core Logic Reuse**: Same `AgentLoop`, `AppConfig`, and tool execution logic
- **Session Management**: HTTP sessions map to individual agent instances
- **State Management**: Each session maintains its own conversation history and agent state
- **Auto-cleanup**: Sessions automatically expire after 30 minutes of inactivity

## API Endpoints

### Health Check

**GET /health**

Check if the server is running.

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-06T18:30:00.000Z"
}
```

### Session Management

#### Create Session

**POST /sessions**

Create a new agent session.

> **💡 Model Selection**: The HTTP server doesn't use any model itself - each session chooses its own model when created. Multiple sessions can use different models/providers simultaneously on the same server.

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "codex-mini-latest",
    "provider": "openai",
    "approvalMode": "suggest",
    "apiKey": "your-api-key-here"
  }'
```

**Request Body:**
- `model` (string, optional): AI model to use (defaults to `codex-mini-latest`)
- `provider` (string, optional): AI provider (defaults to `openai`)
- `approvalMode` (string, optional): "suggest", "auto-edit", or "full-auto"  
- `apiKey` (string, optional): API key (uses env var if not provided)
- `additionalWritableRoots` (array, optional): Additional writable directories
- `config` (object, optional): Additional configuration overrides

**Response:**
```json
{
  "sessionId": "abc123...",
  "config": {
    "model": "codex-mini-latest",
    "provider": "openai",
    "approvalMode": "suggest"
  },
  "createdAt": "2025-01-06T18:30:00.000Z"
}
```

#### Get Session Info

**GET /sessions/:sessionId**

Get information about a session.

```bash
curl http://localhost:3000/sessions/abc123
```

**Response:**
```json
{
  "sessionId": "abc123",
  "config": {
    "model": "codex-mini-latest",
    "provider": "openai"
  },
  "messageCount": 4,
  "createdAt": "2025-01-06T18:30:00.000Z",
  "lastActivity": "2025-01-06T18:35:00.000Z"
}
```

#### List Sessions

**GET /sessions**

List all active sessions.

```bash
curl http://localhost:3000/sessions
```

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "abc123",
      "config": {
        "model": "codex-mini-latest",
        "provider": "openai"
      },
      "messageCount": 4,
      "createdAt": "2025-01-06T18:30:00.000Z",
      "lastActivity": "2025-01-06T18:35:00.000Z"
    }
  ],
  "totalCount": 1
}
```

#### Delete Session

**DELETE /sessions/:sessionId**

Delete a session and free its resources.

```bash
curl -X DELETE http://localhost:3000/sessions/abc123
```

**Response:** 204 No Content

### Messaging

#### Send Message

**POST /sessions/:sessionId/messages**

Send a message to the agent and get the response.

```bash
curl -X POST http://localhost:3000/sessions/abc123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a hello world Python script",
    "images": []
  }'
```

**Request Body:**
- `message` (string, required): The text message to send
- `images` (array, optional): Array of image file paths

**Response:**
```json
{
  "sessionId": "abc123",
  "messages": [
    {
      "id": "msg_123",
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "I'll create a simple Hello World Python script for you..."
        }
      ]
    },
    {
      "id": "func_456",
      "type": "function_call",
      "name": "shell",
      "arguments": "{\"cmd\":[\"python\",\"hello.py\"]}"
    }
  ],
  "totalMessageCount": 8
}
```

#### Get Message History

**GET /sessions/:sessionId/messages**

Retrieve conversation history for a session.

```bash
curl "http://localhost:3000/sessions/abc123/messages?offset=0&limit=50"
```

**Query Parameters:**
- `offset` (number, optional): Starting index (default: 0)
- `limit` (number, optional): Maximum messages to return (default: 100, max: 1000)

**Response:**
```json
{
  "sessionId": "abc123",
  "messages": [...],
  "totalCount": 8,
  "offset": 0,
  "limit": 50
}
```

### Operations

#### Cancel Operation

**POST /sessions/:sessionId/cancel**

Cancel the currently running operation in a session.

```bash
curl -X POST http://localhost:3000/sessions/abc123/cancel
```

**Response:**
```json
{
  "sessionId": "abc123",
  "status": "cancelled",
  "timestamp": "2025-01-06T18:35:00.000Z"
}
```

## Message Types

The API returns the same message types as the CLI:

### User Message
```json
{
  "type": "message",
  "role": "user",
  "content": [
    {
      "type": "input_text",
      "text": "Your message here"
    }
  ]
}
```

### Assistant Message
```json
{
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "output_text",
      "text": "Assistant response here"
    }
  ]
}
```

### Function Call
```json
{
  "type": "function_call",
  "name": "shell",
  "call_id": "call_123",
  "arguments": "{\"cmd\":[\"ls\",\"-la\"]}"
}
```

### Function Output
```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"output\":\"file1.txt\\nfile2.txt\",\"metadata\":{\"exit_code\":0}}"
}
```

## Error Handling

All errors return appropriate HTTP status codes with JSON error messages:

```json
{
  "error": "Session not found"
}
```

Common status codes:
- `400`: Bad Request (invalid input)
- `404`: Not Found (session doesn't exist)
- `500`: Internal Server Error

## Session Management

- **Per-Session Models**: Each session can use a different AI model and provider independently
- **Automatic Cleanup**: Sessions are automatically deleted after 30 minutes of inactivity
- **Resource Management**: Each session maintains its own agent instance and conversation state
- **Concurrency**: Multiple sessions can run simultaneously with different configurations
- **Session Isolation**: Sessions are completely isolated from each other

### **Example: Multiple Models on One Server**
```bash
# Session 1: OpenAI GPT-4
curl -X POST http://localhost:3000/sessions -d '{"model":"gpt-4","provider":"openai"}'

# Session 2: Gemini 2.5 Pro  
curl -X POST http://localhost:3000/sessions -d '{"model":"gemini-2.5-pro","provider":"gemini"}'

# Session 3: Default (codex-mini-latest with OpenAI)
curl -X POST http://localhost:3000/sessions -d '{"approvalMode":"suggest"}'
```

## Security Considerations

- **API Keys**: Can be provided per-session or via environment variables
- **Sandboxing**: Same sandboxing mechanisms as the CLI apply
- **CORS**: Enabled for cross-origin requests
- **No Authentication**: This is a development server - add authentication for production use

## Example Integration

```javascript
class CodexClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async createSession(config = {}) {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return response.json();
  }

  async sendMessage(sessionId, message) {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return response.json();
  }

  async deleteSession(sessionId) {
    await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }
}

// Usage
const client = new CodexClient();
const session = await client.createSession({ model: 'codex-mini-latest' });
const response = await client.sendMessage(session.sessionId, 'Hello!');
await client.deleteSession(session.sessionId);
```

## Monitoring and Debugging

- **Logs**: Server logs all operations (use `DEBUG=true` for verbose logging)
- **Health Endpoint**: Monitor server status
- **Session Listing**: Track active sessions and their resource usage
- **Graceful Shutdown**: Server properly cleans up all sessions on shutdown

## Configuration

The HTTP server uses the same configuration system as the CLI:

- **Config Files**: `~/.codex/config.json` or `~/.codex/config.yaml`
- **Environment Variables**: `OPENAI_API_KEY`, etc.
- **Project Docs**: `AGENTS.md` files are loaded and used
- **Provider Support**: All CLI providers are supported

## Limitations

- **No Streaming**: Responses are returned as complete objects (not streamed)
- **Command Approval**: Auto-approves based on session's approval mode
- **File Uploads**: Image paths must be accessible to the server
- **Memory**: Sessions are stored in memory (use Redis for production)

## 📖 Quick Reference

### **View Documentation**
```bash
# Interactive Swagger UI (best experience)
open swagger-ui.html

# Or serve it locally
python3 -m http.server 8080  # Visit http://localhost:8080/swagger-ui.html
```

### **Test API Endpoints**
```bash
# Import Bruno collection
# 1. Install Bruno: https://usebruno.com/
# 2. Import: bruno-collection/
# 3. Set environment variables
# 4. Run tests
```

### **Quick API Test**
```bash
# 1. Start server
codex-http --port 3000

# 2. Create session  
curl -X POST http://localhost:3000/sessions -H "Content-Type: application/json" -d '{"model":"codex-mini-latest"}'

# 3. Send message (replace SESSION_ID)
curl -X POST http://localhost:3000/sessions/SESSION_ID/messages -H "Content-Type: application/json" -d '{"message":"Hello!"}'
```