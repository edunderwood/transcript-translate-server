#!/bin/bash
# Test script to check what /church/info returns
# Replace CHURCH_KEY with your actual new church key

CHURCH_KEY="${1:-FTL_12345}"
SERVER_URL="${2:-https://debabel-server.onrender.com}"

echo "Testing /church/info endpoint..."
echo "Church Key: $CHURCH_KEY"
echo "Server: $SERVER_URL"
echo ""

curl -s "${SERVER_URL}/church/info?church=${CHURCH_KEY}" | jq '{
  success: .success,
  hasLogo: (.responseObject.base64Logo != null),
  logoLength: (.responseObject.base64Logo | length),
  logoPreview: (.responseObject.base64Logo | if . then .[0:50] else "null" end),
  name: .responseObject.name,
  greeting: .responseObject.greeting
}'
