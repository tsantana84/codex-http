#!/usr/bin/env node
/**
 * Example HTTP client for Codex CLI API
 * 
 * This demonstrates how to interact with the Codex HTTP server programmatically.
 * Start the server first with: `codex-http --port 3000`
 */

const BASE_URL = 'http://localhost:3000';

async function apiCall(method, endpoint, data = null) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

async function main() {
  try {
    console.log('🚀 Testing Codex HTTP API...\n');

    // 1. Health check
    console.log('1. Health check...');
    const health = await apiCall('GET', '/health');
    console.log('✅ Server is healthy:', health.status);
    console.log();

    // 2. Create a new session
    console.log('2. Creating a new session...');
    const session = await apiCall('POST', '/sessions', {
      model: 'codex-mini-latest',
      approvalMode: 'suggest',
      provider: 'openai'
    });
    console.log('✅ Session created:', session.sessionId);
    const sessionId = session.sessionId;
    console.log();

    // 3. Send a message
    console.log('3. Sending a message...');
    const messageResponse = await apiCall('POST', `/sessions/${sessionId}/messages`, {
      message: 'Hello! Please explain what you are and what you can do.'
    });
    console.log('✅ Message sent, received', messageResponse.messages.length, 'response items');
    
    // Print the assistant's response
    messageResponse.messages
      .filter(msg => msg.type === 'message' && msg.role === 'assistant')
      .forEach(msg => {
        const content = msg.content
          .filter(c => c.type === 'output_text')
          .map(c => c.text)
          .join('');
        if (content) {
          console.log('🤖 Assistant:', content);
        }
      });
    console.log();

    // 4. Get conversation history
    console.log('4. Getting conversation history...');
    const history = await apiCall('GET', `/sessions/${sessionId}/messages`);
    console.log('✅ Retrieved', history.totalCount, 'messages');
    console.log();

    // 5. Send another message
    console.log('5. Sending another message...');
    const messageResponse2 = await apiCall('POST', `/sessions/${sessionId}/messages`, {
      message: 'Can you create a simple "Hello World" Python script?'
    });
    console.log('✅ Second message sent, received', messageResponse2.messages.length, 'response items');
    
    // Print the assistant's response
    messageResponse2.messages
      .filter(msg => msg.type === 'message' && msg.role === 'assistant')
      .forEach(msg => {
        const content = msg.content
          .filter(c => c.type === 'output_text')
          .map(c => c.text)
          .join('');
        if (content) {
          console.log('🤖 Assistant:', content);
        }
      });
    console.log();

    // 6. Get session info
    console.log('6. Getting session info...');
    const sessionInfo = await apiCall('GET', `/sessions/${sessionId}`);
    console.log('✅ Session info:', {
      id: sessionInfo.sessionId,
      messageCount: sessionInfo.messageCount,
      model: sessionInfo.config.model
    });
    console.log();

    // 7. List all sessions
    console.log('7. Listing all sessions...');
    const sessions = await apiCall('GET', '/sessions');
    console.log('✅ Found', sessions.totalCount, 'active sessions');
    console.log();

    // 8. Clean up - delete the session
    console.log('8. Cleaning up session...');
    await apiCall('DELETE', `/sessions/${sessionId}`);
    console.log('✅ Session deleted');
    console.log();

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This example requires Node.js 18+ with built-in fetch support');
  process.exit(1);
}

main();