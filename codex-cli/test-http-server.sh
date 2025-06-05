#!/bin/bash

# Test script for Codex HTTP Server
# This script demonstrates how to run the HTTP server

echo "🚀 Codex HTTP Server Test"
echo "========================="
echo

# Check if built
if [ ! -f "dist/http-cli.js" ]; then
    echo "❌ HTTP server not built. Running build..."
    npm run build
    echo "✅ Build completed"
    echo
fi

# Check if globally linked
if ! command -v codex-http &> /dev/null; then
    echo "⚠️  codex-http command not found globally. Linking package..."
    npm link
    echo "✅ Package linked globally"
    echo
fi

echo "📋 Available commands:"
echo "   1. Direct execution:    node dist/http-cli.js --port 3000"
echo "   2. Global command:      codex-http --port 3000"
echo "   3. With custom host:    codex-http --port 3000 --host 0.0.0.0"
echo

echo "📚 API endpoints will be available at:"
echo "   Health check:    http://localhost:3000/health"
echo "   Create session:  POST http://localhost:3000/sessions"
echo "   Send message:    POST http://localhost:3000/sessions/:id/messages"
echo

echo "🔧 Configuration:"
echo "   The server uses the same config as the CLI:"
echo "   - Config file: ~/.codex/config.json"
echo "   - API key: OPENAI_API_KEY environment variable"
echo "   - Project docs: AGENTS.md files"
echo

echo "📖 For complete API documentation, see: HTTP_API.md"
echo "🧪 To run the example client: node examples/http-client-example.js"
echo

echo "⚡ To start the server now:"
echo "   export OPENAI_API_KEY='your-api-key-here'"
echo "   codex-http --port 3000"