#!/bin/bash

# Update Cloudflare Tunnel Configuration
# This script ensures the tunnel routes to the correct dashboard hostname

set -e

echo "🔧 Cloudflare Tunnel Configuration Update"
echo "=========================================="
echo ""

# Configuration
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}"
TUNNEL_NAME="keyword-tracker-tunnel"
DASHBOARD_SERVICE="dashboard:9000"

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Error: CLOUDFLARE_API_TOKEN environment variable not set"
    echo ""
    echo "Please set it with:"
    echo "export CLOUDFLARE_API_TOKEN='your-api-token'"
    echo ""
    echo "Get your token from: https://dash.cloudflare.com/profile/api-tokens"
    exit 1
fi

echo "📡 Fetching tunnel information..."
echo ""

# Get account ID
ACCOUNT_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" | jq -r '.result[0].id')

if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" = "null" ]; then
    echo "❌ Failed to get account ID. Check your API token."
    exit 1
fi

echo "✅ Account ID: $ACCOUNT_ID"

# Get tunnel ID
TUNNEL_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" | jq -r ".result[] | select(.name==\"$TUNNEL_NAME\") | .id")

if [ -z "$TUNNEL_ID" ] || [ "$TUNNEL_ID" = "null" ]; then
    echo "❌ Failed to find tunnel: $TUNNEL_NAME"
    exit 1
fi

echo "✅ Tunnel ID: $TUNNEL_ID"
echo ""

# Get current tunnel configuration
echo "📋 Current tunnel configuration:"
CURRENT_CONFIG=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json")

echo "$CURRENT_CONFIG" | jq '.result.config.ingress'
echo ""

# Update tunnel configuration
echo "🔄 Updating tunnel configuration to route to $DASHBOARD_SERVICE..."
echo ""

UPDATE_RESULT=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"config\": {
            \"ingress\": [
                {
                    \"hostname\": \"seodashboard.theprofitplatform.com.au\",
                    \"service\": \"http://$DASHBOARD_SERVICE\",
                    \"originRequest\": {
                        \"connectTimeout\": 30,
                        \"noTLSVerify\": false
                    }
                },
                {
                    \"service\": \"http_status:404\"
                }
            ]
        }
    }")

SUCCESS=$(echo "$UPDATE_RESULT" | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
    echo "✅ Tunnel configuration updated successfully!"
    echo ""
    echo "📋 New configuration:"
    echo "$UPDATE_RESULT" | jq '.result.config.ingress'
    echo ""
    echo "⏳ Please wait 30-60 seconds for Cloudflare to propagate the changes..."
    echo ""
    echo "🧪 Then test with:"
    echo "curl https://seodashboard.theprofitplatform.com.au/api/v2/health"
else
    echo "❌ Failed to update tunnel configuration"
    echo ""
    echo "Error details:"
    echo "$UPDATE_RESULT" | jq '.'
    exit 1
fi

echo ""
echo "🎯 Next steps:"
echo "1. The Cloudflare tunnel will automatically pick up the new configuration"
echo "2. Wait 30-60 seconds for propagation"
echo "3. Test the dashboard: https://seodashboard.theprofitplatform.com.au/"
echo "4. Check container logs if needed: docker logs keyword-tracker-cloudflared"
