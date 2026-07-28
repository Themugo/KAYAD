#!/bin/bash
# ─────────────────────────────────────────────────────────────
# KAYAD Scalability Deployment Script
# Deploys MongoDB replica set, Redis, and backend with load balancing
# ─────────────────────────────────────────────────────────────

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    log_info "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    log_info "Docker is installed: $(docker --version)"
}

# Check if Docker Compose is installed
check_docker_compose() {
    log_info "Checking Docker Compose installation..."
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    log_info "Docker Compose is installed: $(docker-compose --version)"
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p nginx/ssl
    mkdir -p logs/nginx
    mkdir -p logs/mongodb
    mkdir -p logs/redis
    log_info "Directories created successfully"
}

# Generate self-signed SSL certificates (for development)
generate_ssl_certificates() {
    log_info "Generating self-signed SSL certificates..."
    
    if [ -f "nginx/ssl/cert.pem" ] && [ -f "nginx/ssl/key.pem" ]; then
        log_warn "SSL certificates already exist. Skipping generation."
        return
    fi
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=KE/ST=Nairobi/L=Nairobi/O=KAYAD/OU=IT/CN=api.kayad.space"
    
    log_info "SSL certificates generated successfully"
}

# Check environment variables
check_env_variables() {
    log_info "Checking environment variables..."
    
    if [ ! -f "backend/.env" ]; then
        log_warn "backend/.env not found. Creating from backend/.env.example..."
        cp backend/.env.example backend/.env
        log_warn "Please update backend/.env with your actual values before running the deployment."
    fi
    
    # Check for required variables
    if grep -q "MONGO_URI=mongodb+srv://user:password" backend/.env; then
        log_error "Please update MONGO_URI in backend/.env with your actual MongoDB connection string."
        exit 1
    fi
    
    if grep -q "JWT_SECRET=YOUR_SUPER_SECRET" backend/.env; then
        log_error "Please update JWT_SECRET in backend/.env with a secure random string."
        exit 1
    fi
    
    log_info "Environment variables check completed"
}

# Stop existing containers
stop_existing_containers() {
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.replica-set.yml down
    log_info "Existing containers stopped"
}

# Build and start containers
start_containers() {
    log_info "Building and starting containers..."
    docker-compose -f docker-compose.replica-set.yml up -d --build
    log_info "Containers started successfully"
}

# Wait for MongoDB to be ready
wait_for_mongodb() {
    log_info "Waiting for MongoDB to be ready..."
    
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec kayad-mongo-primary mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
            log_info "MongoDB is ready"
            return
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    log_error "MongoDB failed to start within expected time"
    exit 1
}

# Initialize replica set
initialize_replica_set() {
    log_info "Initializing MongoDB replica set..."
    
    # Check if replica set is already initialized
    if docker exec kayad-mongo-primary mongosh --eval "rs.status()" &> /dev/null; then
        log_warn "Replica set already initialized. Skipping initialization."
        return
    fi
    
    # Run replica set setup script
    docker exec kayad-backend node backend/scripts/setup-replica-set.js
    
    log_info "Replica set initialization completed"
}

# Verify replica set status
verify_replica_set() {
    log_info "Verifying replica set status..."
    
    sleep 5  # Wait for replica set to stabilize
    
    docker exec kayad-mongo-primary mongosh --eval "rs.status()"
    
    log_info "Replica set status verification completed"
}

# Check Redis status
check_redis() {
    log_info "Checking Redis status..."
    
    if docker exec kayad-redis redis-cli ping | grep -q "PONG"; then
        log_info "Redis is running and responding"
    else
        log_error "Redis is not responding"
        exit 1
    fi
}

# Check backend health
check_backend_health() {
    log_info "Checking backend health..."
    
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:5000/health &> /dev/null; then
            log_info "Backend is healthy"
            return
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    log_error "Backend health check failed"
    exit 1
}

# Display deployment status
display_status() {
    log_info "Deployment Status:"
    echo ""
    docker-compose -f docker-compose.replica-set.yml ps
    echo ""
    log_info "Health Check: http://localhost:5000/health"
    log_info "Detailed Health: http://localhost:5000/health/detailed"
    log_info "Cache Stats: http://localhost:5000/health/cache"
}

# Main deployment function
deploy() {
    log_info "Starting KAYAD Scalability Deployment..."
    echo ""
    
    check_docker
    check_docker_compose
    create_directories
    generate_ssl_certificates
    check_env_variables
    stop_existing_containers
    start_containers
    wait_for_mongodb
    initialize_replica_set
    verify_replica_set
    check_redis
    check_backend_health
    display_status
    
    echo ""
    log_info "Deployment completed successfully!"
    log_info "Next steps:"
    log_info "1. Update backend/.env with your actual configuration values"
    log_info "2. Configure NGINX with your domain and SSL certificates"
    log_info "3. Monitor metrics using the health endpoints"
    log_info "4. Test the application functionality"
}

# Rollback function
rollback() {
    log_warn "Rolling back deployment..."
    docker-compose -f docker-compose.replica-set.yml down
    log_warn "Rollback completed"
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    status)
        docker-compose -f docker-compose.replica-set.yml ps
        ;;
    logs)
        docker-compose -f docker-compose.replica-set.yml logs -f
        ;;
    stop)
        docker-compose -f docker-compose.replica-set.yml down
        log_info "Containers stopped"
        ;;
    restart)
        docker-compose -f docker-compose.replica-set.yml restart
        log_info "Containers restarted"
        ;;
    health)
        curl http://localhost:5000/health
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|logs|stop|restart|health}"
        exit 1
        ;;
esac
