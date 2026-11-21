#!/bin/bash
# scripts/dev-setup.sh
# Development environment setup script for KAYAD

set -e

echo "🚗 KAYAD Development Environment Setup"
echo "======================================"
echo ""

# Check Node.js version
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 22.22.2"
    exit 1
fi

# KAYAD baseline is pinned in .nvmrc.
if [[ "$NODE_VERSION" != "v22.22.2" ]]; then
    echo "⚠️  Warning: Node.js 22.22.2 is the supported baseline. Current version: $NODE_VERSION"
fi

echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm ci

echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci
cd ..

echo ""

# Copy environment files if they don't exist
echo "🔧 Setting up environment files..."

if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your actual configuration"
fi

if [ ! -f backend/.env ]; then
    echo "Creating backend/.env from backend/.env.example..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env with your actual configuration"
fi

echo ""

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/uploads
mkdir -p logs

echo ""

# Set up git hooks (if git is initialized)
if [ -d .git ]; then
    echo "🔗 Setting up git hooks..."
    # Create pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook to run linting
echo "Running frontend lint..."
npm run lint || echo "⚠️  Frontend lint failed, but committing anyway"

echo "Running backend lint..."
cd backend
npm run lint || echo "⚠️  Backend lint failed, but committing anyway"
cd ..
EOF
    chmod +x .git/hooks/pre-commit
    echo "✅ Pre-commit hook installed"
fi

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and backend/.env with your configuration"
echo "2. Provision/use Supabase and configure backend/.env with the required Supabase credentials"
echo "3. Run 'npm run dev' to start the frontend"
echo "4. Run 'cd backend && npm run dev' to start the backend"
echo ""
echo "For more information, see README.md"
