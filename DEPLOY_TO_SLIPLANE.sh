#!/bin/bash

# ============================================
# DEPLOY TO SLIPLANE - Direct Push
# ============================================
#
# Use this script to push the current main branch
# DIRECTLY to the Sliplane git remote, bypassing
# the GitHub webhook. Useful when the webhook is
# slow or has not triggered a new deploy.
#
# Prerequisites:
#   - Run from a machine with internet access to
#     git.sliplane.app (not from within Replit).
#   - The 'sliplane' remote must be configured:
#
#     git remote add sliplane \
#       https://git.sliplane.app/zambelliandrea1973-cloud/gestionale-appuntamenti.git
#
#   - You must have valid Sliplane git credentials.
#     Enter them when prompted (or store in git credential store).
#
# ============================================

set -e

SLIPLANE_REMOTE="sliplane"
BRANCH="main"

echo ""
echo "🚀 Sliplane Direct Deploy"
echo "================================"
echo ""
echo "Remote : $(git remote get-url $SLIPLANE_REMOTE 2>/dev/null || echo '(not configured)')"
echo "Branch : $BRANCH"
echo "Commit : $(git log --oneline -1 main)"
echo ""

# Confirm remote is available
if ! git remote get-url "$SLIPLANE_REMOTE" > /dev/null 2>&1; then
  echo "❌ Remote '$SLIPLANE_REMOTE' is not configured."
  echo ""
  echo "Add it with:"
  echo "  git remote add sliplane https://git.sliplane.app/zambelliandrea1973-cloud/gestionale-appuntamenti.git"
  exit 1
fi

read -p "Push '$BRANCH' directly to Sliplane? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Push annullato"
  exit 1
fi

echo ""
echo "📡 Pushing to Sliplane..."
git push "$SLIPLANE_REMOTE" "$BRANCH"

echo ""
echo "✅ Push completed!"
echo ""
echo "🎯 NEXT STEPS:"
echo "================================"
echo ""
echo "1. Open the Sliplane Dashboard"
echo "   https://sliplane.io/dashboard"
echo ""
echo "2. Wait for the deploy to complete (2–4 min)"
echo "   Look for: '✅ App is running' status"
echo ""
echo "3. Verify the live app:"
echo "   ✓ OnboardingBanner visible for new users"
echo "   ✓ PWA icons load quickly (cached)"
echo "   ✓ Demo client/service badges visible"
echo "   ✓ Login and core flows working"
echo ""
echo "NOTE: This script must be run from a machine"
echo "outside Replit — Replit cannot reach git.sliplane.app"
echo "due to network restrictions."
echo ""
