# Codex HTTP API - Bruno Collection

This Bruno collection provides comprehensive testing and examples for the Codex HTTP API. It includes all endpoints with realistic use cases and proper error handling examples.

## 🚀 Quick Start

### 1. Setup Bruno
1. Install [Bruno](https://usebruno.com/) 
2. Open Bruno and import this collection
3. Set up your environment variables

### 2. Configure Environment
Edit the `Local.bru` environment file:
```
baseUrl: http://localhost:3000
sessionId: (will be auto-populated)
apiKey: your-openai-api-key-here
```

### 3. Start Codex HTTP Server
```bash
export OPENAI_API_KEY="your-api-key-here"
codex-http --port 3000
```

### 4. Run the Collection
Start with "Health Check" and work through the examples in order.

## 📁 Collection Structure

### **Basic Operations**
1. **Health Check** - Verify server status
2. **Create Session** - Start a new agent session
3. **Get Session Info** - Retrieve session details
4. **List All Sessions** - View all active sessions

### **Messaging**
5. **Send Message - Introduction** - Basic agent interaction
6. **Send Message - Code Creation** - Request code generation
7. **Send Message - File Analysis** - File system exploration
8. **Send Message - Debugging Help** - Error analysis and fixes
9. **Send Message - with Images** - Multimodal input example

### **History & Management**
10. **Get Message History** - Retrieve conversation logs
11. **Get Message History - Paginated** - Pagination example
12. **Cancel Operation** - Stop running operations
13. **Delete Session** - Clean up resources

### **Error Handling**
14. **Session Not Found** - 404 error example
15. **Invalid Request** - 400 validation error example

### **Advanced Examples**
16. **Create Auto-Edit Session** - Automatic file editing
17. **Create Full-Auto Session** - Full automation (use carefully!)
18. **Bulk Operations** - Multi-file processing

### **Workflows**
19. **Complete Development Workflow** - End-to-end project creation

## 🔧 Features Demonstrated

### **Core Capabilities**
- ✅ Session management and lifecycle
- ✅ Real-time AI agent interaction
- ✅ File system operations
- ✅ Code generation and editing
- ✅ Multi-modal input (text + images)
- ✅ Error handling and validation

### **Advanced Features**
- ✅ Different approval modes (suggest/auto-edit/full-auto)
- ✅ Pagination and history management
- ✅ Bulk operations and workflows
- ✅ Configuration and customization
- ✅ Resource cleanup and optimization

### **Developer Experience**
- ✅ Comprehensive test assertions
- ✅ Automatic variable management
- ✅ Detailed documentation for each endpoint
- ✅ Real-world usage examples
- ✅ Error scenario testing

## 📊 Usage Patterns

### **Development Workflow**
```
1. Create Session (suggest mode)
2. Send Introduction Message
3. Request Code Creation
4. Analyze Results
5. Iterate and Refine
6. Clean Up Session
```

### **Automated Processing**
```
1. Create Session (auto-edit mode)
2. Send Bulk Operations Request
3. Monitor Progress via History
4. Cancel if Needed
5. Validate Results
6. Delete Session
```

### **Error Handling**
```
1. Try Operation
2. Check Response Status
3. Handle Specific Error Types
4. Retry or Fallback
5. Log for Debugging
```

## 🧪 Testing Scenarios

### **Happy Path Testing**
- Complete session lifecycle
- Various message types
- History retrieval
- Proper cleanup

### **Error Testing**
- Invalid session IDs
- Missing required fields
- Malformed requests
- Server error simulation

### **Performance Testing**
- Large message history
- Bulk operations
- Concurrent sessions
- Resource cleanup

## 💡 Tips for Usage

### **Environment Management**
- Use different environments for dev/staging/prod
- Set up API keys securely
- Configure appropriate base URLs

### **Session Management**
- Always clean up sessions when done
- Monitor active session count
- Use appropriate approval modes
- Handle session expiration gracefully

### **Error Handling**
- Check status codes before processing responses
- Implement proper retry logic
- Log errors for debugging
- Provide user-friendly error messages

### **Performance Optimization**
- Use pagination for large history requests
- Cancel long-running operations when needed
- Clean up unused sessions regularly
- Monitor server resource usage

## 🔒 Security Notes

### **API Key Management**
- Never commit API keys to version control
- Use environment variables or secure vaults
- Rotate keys regularly
- Monitor API usage

### **Approval Modes**
- Use "suggest" mode for interactive development
- Use "auto-edit" for trusted file operations
- Use "full-auto" only in isolated environments
- Always review auto-generated changes

### **Input Validation**
- Validate all user inputs
- Sanitize file paths
- Check image file types and sizes
- Implement rate limiting

## 📚 Related Documentation

- [README.md](../README.md) - Complete API documentation
- [examples/http-client-example.js](../examples/http-client-example.js) - JavaScript client example
- [examples/parallel-usage.md](../examples/parallel-usage.md) - CLI + HTTP usage patterns

## 🐛 Troubleshooting

### **Common Issues**
1. **Server not starting**: Check OPENAI_API_KEY is set
2. **404 errors**: Verify server is running on correct port
3. **Session not found**: Check session wasn't auto-expired
4. **Invalid requests**: Validate JSON format and required fields

### **Debug Steps**
1. Check server logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with simple requests first (health check)
4. Use Bruno's response inspection tools
5. Check network connectivity and firewall settings

Happy testing! 🚀