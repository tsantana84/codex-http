# Parallel Usage: CLI and HTTP Interface

This example demonstrates how the CLI and HTTP interface can operate in parallel, both using the same core `AgentLoop` logic.

## Scenario: Code Review Workflow

Let's set up a workflow where:
1. A developer uses the CLI for interactive coding
2. An automated system uses the HTTP API for code analysis
3. Both interfaces share the same underlying Codex capabilities

### Step 1: Start the HTTP Server

```bash
# Terminal 1: Start the HTTP server
codex-http --port 3000
```

### Step 2: Use CLI for Interactive Development

```bash
# Terminal 2: Use CLI interactively
codex "Create a Python function to calculate fibonacci numbers"
```

### Step 3: Use HTTP API for Automated Analysis

```bash
# Terminal 3: Use HTTP API for automated tasks
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "codex-mini-latest",
    "approvalMode": "auto-edit"
  }'

# Extract the sessionId from response and use it:
SESSION_ID="abc123"

curl -X POST http://localhost:3000/sessions/$SESSION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze the fibonacci.py file for potential improvements and security issues"
  }'
```

## Architecture Benefits

Both interfaces use the same:

1. **Core Logic**: `AgentLoop` class handles all AI interactions
2. **Configuration**: Same `~/.codex/config.json` and `AGENTS.md` files
3. **Sandboxing**: Same security model and execution environment
4. **Tool Execution**: Same file operations and command execution
5. **Model Support**: Same provider and model configuration

## Implementation Details

### Shared Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Core Components                          │
├─────────────────────────────────────────────────────────────┤
│  AgentLoop  │  AppConfig  │  Tool Execution  │  Sandboxing  │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼────────┐      ┌──────▼──────┐
        │  CLI Interface │      │ HTTP Server │
        │  (Terminal)    │      │ (REST API)  │
        └────────────────┘      └─────────────┘
```

### No Code Duplication

The HTTP interface **reuses** rather than **reimplements**:

- ✅ Same `AgentLoop` instance
- ✅ Same configuration loading
- ✅ Same tool execution
- ✅ Same approval mechanisms
- ✅ Same error handling

### Minimal Refactoring

Only the interface layer was added:

- **CLI**: `cli.tsx` → `AgentLoop` (existing)
- **HTTP**: `http-server.ts` → `AgentLoop` (reused)

No changes to core logic were needed.

## Use Cases

### 1. Development + CI/CD Integration

- **Developer**: Uses CLI for interactive coding
- **CI/CD Pipeline**: Uses HTTP API for automated code review

### 2. IDE Integration + Web Interface

- **VS Code Extension**: Uses HTTP API for real-time assistance
- **Web Dashboard**: Uses HTTP API for project analysis

### 3. Local + Remote Development

- **Local**: CLI for direct file system access
- **Remote**: HTTP API for containerized environments

### 4. Multiple Workflows

- **Interactive**: CLI for exploratory coding
- **Batch Processing**: HTTP API for bulk operations
- **Integration**: HTTP API for third-party tools

## Configuration Examples

### Shared Configuration (`~/.codex/config.json`)

```json
{
  "model": "codex-mini-latest",
  "provider": "openai",
  "approvalMode": "suggest",
  "providers": {
    "openai": {
      "name": "OpenAI",
      "baseURL": "https://api.openai.com/v1",
      "envKey": "OPENAI_API_KEY"
    }
  }
}
```

### Shared Project Context (`AGENTS.md`)

```markdown
# Project Context

This is a Python web application using Flask.

## Guidelines
- Use Python 3.11+
- Follow PEP 8 style guidelines
- Write comprehensive tests
- Use type hints

## Security Notes
- Always validate user input
- Use parameterized queries
- Implement proper authentication
```

Both CLI and HTTP interface will use these configurations automatically.

## Monitoring Both Interfaces

### CLI Logs
```bash
# Enable verbose logging for CLI
DEBUG=true codex "your prompt"
```

### HTTP Server Logs
```bash
# HTTP server logs automatically to console
# Enable verbose logging
DEBUG=true codex-http --port 3000
```

### Session Management
```bash
# Check active HTTP sessions
curl http://localhost:3000/sessions

# Monitor CLI session (if applicable)
ls ~/.codex/sessions/
```

## Performance Considerations

- **Resource Sharing**: Both interfaces can run simultaneously without conflicts
- **Memory Usage**: Each HTTP session maintains its own `AgentLoop` instance
- **Concurrency**: HTTP API supports multiple concurrent sessions
- **File System**: Both interfaces can work on the same project safely

This architecture ensures that adding HTTP capabilities doesn't compromise the existing CLI functionality while maintaining code reuse and consistency.