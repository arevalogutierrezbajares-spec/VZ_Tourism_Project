#!/usr/bin/env bash
# End-to-end WhatsApp webhook test
# Simulates a Meta Cloud API webhook POST to localhost:3000/api/whatsapp/webhook
#
# Usage: bash scripts/test-whatsapp-e2e.sh [message]
# Default message: "Hola! Cuánto cuesta una habitación para 2 personas?"

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
META_APP_SECRET="${META_APP_SECRET:-dev_test_secret_e2e_2026}"
PHONE_NUMBER_ID="${PHONE_NUMBER_ID:-1128083767048671}"
FROM_PHONE="${FROM_PHONE:-584141234567}"
FROM_NAME="${FROM_NAME:-Test Guest}"
MESSAGE="${1:-Hola! Cuánto cuesta una habitación para 2 personas?}"
MSG_ID="wamid.test_$(date +%s)_$(( RANDOM ))"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  WhatsApp E2E Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Target:  $BASE_URL/api/whatsapp/webhook"
echo "  From:    $FROM_PHONE ($FROM_NAME)"
echo "  Message: $MESSAGE"
echo "  Msg ID:  $MSG_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build the Meta webhook payload (identical to what Meta sends)
PAYLOAD=$(cat <<ENDJSON
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "15550000000",
          "phone_number_id": "$PHONE_NUMBER_ID"
        },
        "contacts": [{
          "profile": { "name": "$FROM_NAME" },
          "wa_id": "$FROM_PHONE"
        }],
        "messages": [{
          "from": "$FROM_PHONE",
          "id": "$MSG_ID",
          "timestamp": "$(date +%s)",
          "type": "text",
          "text": { "body": "$MESSAGE" }
        }]
      },
      "field": "messages"
    }]
  }]
}
ENDJSON
)

# Compute HMAC-SHA256 signature (same as Meta does)
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$META_APP_SECRET" | awk '{print $NF}')"

echo "→ Sending webhook POST..."
echo "  Signature: ${SIGNATURE:0:30}..."
echo ""

# Send the webhook
HTTP_CODE=$(curl -s -o /tmp/wa-e2e-response.txt -w "%{http_code}" \
  -X POST "$BASE_URL/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: $SIGNATURE" \
  -d "$PAYLOAD")

RESPONSE=$(cat /tmp/wa-e2e-response.txt)

echo "← Response: HTTP $HTTP_CODE"
echo "  Body: $RESPONSE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Webhook accepted (200 OK)"
  echo ""
  echo "The webhook handler processes messages asynchronously (waitUntil)."
  echo "Waiting 8 seconds for AI reply generation + Meta API send..."
  sleep 8

  # Check Supabase for the conversation and messages
  SB_URL="https://xuxmqpbddtajfiuogbov.supabase.co"
  SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1eG1xcGJkZHRhamZpdW9nYm92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTAwMDc1NywiZXhwIjoyMDkwNTc2NzU3fQ.OBnCoHZEEb6TcLVs5eJIkTemqnJqU5ogO6vZuoCwaCI"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Checking database for results..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Check conversation
  echo ""
  echo "📋 Conversation:"
  curl -s "$SB_URL/rest/v1/wa_conversations?guest_phone=eq.$FROM_PHONE&select=id,guest_phone,guest_name,status,last_message_preview,unread_count,booking_stage,guest_language" \
    -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $SB_KEY" | python3 -m json.tool

  # Check messages
  echo ""
  echo "💬 Messages (most recent first):"
  CONV_ID=$(curl -s "$SB_URL/rest/v1/wa_conversations?guest_phone=eq.$FROM_PHONE&select=id" \
    -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $SB_KEY" | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')")

  if [ -n "$CONV_ID" ]; then
    curl -s "$SB_URL/rest/v1/wa_messages?conversation_id=eq.$CONV_ID&select=role,content,content_en,detected_lang,is_ai,flagged,sentiment_score,created_at&order=created_at.desc&limit=5" \
      -H "apikey: $SB_KEY" \
      -H "Authorization: Bearer $SB_KEY" | python3 -m json.tool
  else
    echo "  (no conversation found — processing may still be in progress)"
  fi

  # Check escalations
  echo ""
  echo "🚨 Escalations:"
  if [ -n "$CONV_ID" ]; then
    curl -s "$SB_URL/rest/v1/wa_escalations?conversation_id=eq.$CONV_ID&select=reason,trigger_type,created_at" \
      -H "apikey: $SB_KEY" \
      -H "Authorization: Bearer $SB_KEY" | python3 -m json.tool
  fi

else
  echo "✗ Webhook rejected (HTTP $HTTP_CODE)"
  echo "  Check: META_APP_SECRET in .env.local, dev server running, posada_whatsapp_config seeded"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
