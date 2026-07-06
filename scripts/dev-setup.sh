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
    echo "❌ Node.js is not installed. Please install Node.js 20.x"
    exit 1
fi

# Check if version is 20.x
if [[ ! $NODE_VERSION =~ ^v20\. ]]; then
    echo "⚠️  Warning: Node.js 20.x is recommended. Current version: $NODE_VERSION"
fi

echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
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
echo "2. Start MongoDB (or configure MONGO_URI in backend/.env)"
echo "3. Run 'npm run dev' to start the frontend"
echo "4. Run 'cd backend && npm run dev' to start the backend"
echo ""
echo "For more information, see README.md"
