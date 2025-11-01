#!/bin/bash
#
# Helper script to display SSH key for GitHub Secrets
#

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║          📋 SSH Key for GitHub Secrets                        ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Look for SSH keys
echo "🔍 Looking for SSH keys on your system..."
echo ""

SSH_KEYS=()

# Check for common key types
if [ -f ~/.ssh/id_rsa ]; then
    SSH_KEYS+=("~/.ssh/id_rsa")
fi

if [ -f ~/.ssh/id_ed25519 ]; then
    SSH_KEYS+=("~/.ssh/id_ed25519")
fi

if [ -f ~/.ssh/id_ecdsa ]; then
    SSH_KEYS+=("~/.ssh/id_ecdsa")
fi

# If no keys found
if [ ${#SSH_KEYS[@]} -eq 0 ]; then
    echo "❌ No SSH keys found in ~/.ssh/"
    echo ""
    echo "To generate a new SSH key:"
    echo "  ssh-keygen -t ed25519 -C 'your_email@example.com'"
    echo ""
    echo "Then add the public key to your VPS:"
    echo "  ssh-copy-id avi@31.97.222.218"
    exit 1
fi

# Display found keys
echo "✅ Found ${#SSH_KEYS[@]} SSH key(s):"
echo ""

for i in "${!SSH_KEYS[@]}"; do
    KEY_PATH="${SSH_KEYS[$i]}"
    KEY_PATH_EXPANDED="${KEY_PATH/#\~/$HOME}"

    echo "[$((i+1))] $KEY_PATH"

    # Check if key has a public counterpart
    if [ -f "${KEY_PATH_EXPANDED}.pub" ]; then
        FINGERPRINT=$(ssh-keygen -lf "${KEY_PATH_EXPANDED}.pub" 2>/dev/null | awk '{print $2}')
        echo "    Fingerprint: $FINGERPRINT"
    fi
    echo ""
done

# If multiple keys, ask which one
if [ ${#SSH_KEYS[@]} -gt 1 ]; then
    echo "Which key do you want to use for VPS deployment?"
    read -p "Enter number [1-${#SSH_KEYS[@]}]: " CHOICE

    if [[ "$CHOICE" =~ ^[0-9]+$ ]] && [ "$CHOICE" -ge 1 ] && [ "$CHOICE" -le ${#SSH_KEYS[@]} ]; then
        SELECTED_KEY="${SSH_KEYS[$((CHOICE-1))]}"
    else
        echo "Invalid choice. Using first key."
        SELECTED_KEY="${SSH_KEYS[0]}"
    fi
else
    SELECTED_KEY="${SSH_KEYS[0]}"
fi

SELECTED_KEY_EXPANDED="${SELECTED_KEY/#\~/$HOME}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Copy the following PRIVATE KEY to GitHub Secrets:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat "$SELECTED_KEY_EXPANDED"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT:"
echo ""
echo "1. Copy EVERYTHING above (including BEGIN and END lines)"
echo ""
echo "2. Go to GitHub Secrets:"
echo "   https://github.com/Theprofitplatform/seoexpert/settings/secrets/actions"
echo ""
echo "3. Click 'New repository secret'"
echo ""
echo "4. Fill in:"
echo "   • Name: VPS_SSH_KEY"
echo "   • Value: (paste the key you copied)"
echo ""
echo "5. Click 'Add secret'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔐 SECURITY NOTE:"
echo ""
echo "  • This is your PRIVATE key - keep it secure!"
echo "  • Only add it to GitHub Secrets (encrypted storage)"
echo "  • Never commit it to git or share it publicly"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ After adding the secret, you can deploy via GitHub Actions:"
echo "   https://github.com/Theprofitplatform/seoexpert/actions"
echo ""
