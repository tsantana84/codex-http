#!/bin/bash

echo "🧪 Testing Gemini Provider Setup"
echo "================================="
echo

# Check environment variables
echo "Environment Check:"
echo "  GEMINI_API_KEY: ${GEMINI_API_KEY:+Set (${#GEMINI_API_KEY} chars)}${GEMINI_API_KEY:-❌ Not set}"
echo

# Test function
test_gemini() {
    local API_KEY="$1"
    
    echo "🚀 Starting HTTP server..."
    GEMINI_API_KEY="$API_KEY" codex-http --port 3000 &
    SERVER_PID=$!
    sleep 3
    
    echo "1️⃣ Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
    echo "   Health: $HEALTH_RESPONSE"
    
    echo "2️⃣ Creating Gemini session..."
    SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/sessions \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"gemini-2.5-pro\",
            \"provider\": \"gemini\",
            \"approvalMode\": \"suggest\",
            \"apiKey\": \"$API_KEY\"
        }")
    
    echo "   Session Response: $SESSION_RESPONSE"
    
    if echo "$SESSION_RESPONSE" | grep -q "sessionId"; then
        SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
        echo "   ✅ Session created: $SESSION_ID"
        
        echo "3️⃣ Testing simple message..."
        MESSAGE_RESPONSE=$(curl -s -X POST "http://localhost:3000/sessions/$SESSION_ID/messages" \
            -H "Content-Type: application/json" \
            -d '{"message": "Hello! Please introduce yourself as Gemini and say hi."}')
        
        if echo "$MESSAGE_RESPONSE" | grep -q "assistant"; then
            echo "   ✅ Message sent successfully!"
            echo "   Response preview:"
            echo "$MESSAGE_RESPONSE" | grep -o '"text":"[^"]*"' | head -1 | cut -d'"' -f4
        else
            echo "   ❌ Message failed:"
            echo "   $MESSAGE_RESPONSE"
        fi
        
        echo "4️⃣ Cleaning up session..."
        curl -s -X DELETE "http://localhost:3000/sessions/$SESSION_ID" > /dev/null
        echo "   ✅ Session deleted"
    else
        echo "   ❌ Session creation failed:"
        echo "   $SESSION_RESPONSE"
    fi
    
    echo "🛑 Stopping server..."
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
    echo
}

# Instructions
echo "📋 Instructions:"
echo "1. Get your API key from: https://aistudio.google.com/app/apikey"
echo "2. Set it: export GEMINI_API_KEY=\"AIza-your-key-here\""
echo "3. Run this script again"
echo

if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY not set. Please set it first:"
    echo "   export GEMINI_API_KEY=\"AIza-your-key-here\""
    echo
    echo "🔗 Get your key at: https://aistudio.google.com/app/apikey"
else
    echo "✅ API key detected, running test..."
    test_gemini "$GEMINI_API_KEY"
fi

echo "🎉 Test completed!"