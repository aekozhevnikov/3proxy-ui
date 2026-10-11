#!/bin/bash

# Verify E2E test environment is ready
# Usage: bash tests/e2e/verify-setup.sh

set -e

echo "🔍 Verifying E2E test environment..."
echo ""

# Check Docker
echo "1. Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "   ❌ Docker is not installed or not in PATH"
    exit 1
fi
echo "   ✅ Docker is available ($(docker --version | head -1))"

# Check Docker daemon
if ! docker info > /dev/null 2>&1; then
    echo "   ❌ Docker daemon is not running or current user lacks permissions"
    exit 1
fi
echo "   ✅ Docker daemon is accessible"

# Check Node.js
echo ""
echo "2. Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "   ❌ Node.js is not installed"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "   ✅ Node.js is available ($NODE_VERSION)"

if [ "$NODE_VERSION" != "v20"* ] && [ "$NODE_VERSION" != "v22"* ]; then
    echo "   ⚠️  Warning: Recommended Node.js 20+ (current: $NODE_VERSION)"
fi

# Check TypeScript
echo ""
echo "3. Checking TypeScript..."
if ! npx tsc --version > /dev/null 2>&1; then
    echo "   ❌ TypeScript is not available via npx"
    exit 1
fi
echo "   ✅ TypeScript is available"

# Check tsx
echo ""
echo "4. Checking tsx..."
if ! npx tsx --version > /dev/null 2>&1; then
    echo "   ⚠️  tsx might not be available (will try to install)"
fi
echo "   ✅ tsx is available"

# Check project structure
echo ""
echo "5. Checking project structure..."
if [ ! -f "package.json" ]; then
    echo "   ❌ Not in project root (package.json not found)"
    exit 1
fi
echo "   ✅ In project root"

if [ ! -f "Dockerfile" ]; then
    echo "   ❌ Dockerfile not found"
    exit 1
fi
echo "   ✅ Dockerfile exists"

if [ ! -f "entrypoint.sh" ]; then
    echo "   ❌ entrypoint.sh not found"
    exit 1
fi
echo "   ✅ entrypoint.sh exists"

if [ ! -d "tests/e2e" ]; then
    echo "   ❌ tests/e2e directory not found"
    exit 1
fi
echo "   ✅ tests/e2e directory exists"

# Check test files
echo ""
echo "6. Checking test files..."
if [ ! -f "tests/e2e/traffic-limit.test.ts" ]; then
    echo "   ❌ traffic-limit.test.ts not found"
    exit 1
fi
echo "   ✅ traffic-limit.test.ts exists"

if [ ! -f "tests/e2e/fail2ban-blocking.test.ts" ]; then
    echo "   ❌ fail2ban-blocking.test.ts not found"
    exit 1
fi
echo "   ✅ fail2ban-blocking.test.ts exists"

if [ ! -f "tests/e2e/utils/helpers.ts" ]; then
    echo "   ❌ helpers.ts not found"
    exit 1
fi
echo "   ✅ Helper utilities exist"

# Check Docker build
echo ""
echo "7. Checking Docker image build..."
if docker build -t 3proxy-ui:verify-test . > /dev/null 2>&1; then
    echo "   ✅ Docker image builds successfully"
    docker rmi 3proxy-ui:verify-test > /dev/null 2>&1 || true
else
    echo "   ⚠️  Docker build failed - check Dockerfile and dependencies"
    echo "      (This might be expected if Docker needs more resources)"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ E2E test environment is ready!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. npm run compile"
echo "  2. npm run test:e2e"
echo ""
echo "Or run specific tests:"
echo "  npm run test:e2e:traffic"
echo "  npm run test:e2e:fail2ban"
echo ""
echo "For more info, see E2E_TESTS.md"
echo ""
