#!/bin/bash

# ============================================
# Health Check Script
# ============================================
# Verifies all services are running and responding
# Usage: ./infrastructure/scripts/health-check.sh
# ============================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🏥 Checking service health..."
echo "================================"

check_service() {
    local name=$1
    local url=$2

    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        echo -e "${GREEN}✅ $name${NC} — $url"
    else
        echo -e "${RED}❌ $name${NC} — $url (not responding)"
    fi
}

# Infrastructure
echo ""
echo "📦 Infrastructure:"
check_service "PostgreSQL" "localhost:5432" 2>/dev/null || echo -e "${YELLOW}⚠️  PostgreSQL — check with: docker-compose ps postgres${NC}"
check_service "Redis" "localhost:6379" 2>/dev/null || echo -e "${YELLOW}⚠️  Redis — check with: docker-compose ps redis${NC}"

# Application Services
echo ""
echo "🚀 Application Services:"
check_service "Auth Service" "http://localhost:3001/health"
check_service "File Service" "http://localhost:3002/health"
check_service "Metadata Service" "http://localhost:3003/health"
check_service "Search Service" "http://localhost:3004/health"

# API Gateway
echo ""
echo "🌐 API Gateway:"
check_service "Nginx Gateway" "http://localhost/health"
check_service "→ Auth (via gateway)" "http://localhost/api/auth/health"
check_service "→ Files (via gateway)" "http://localhost/api/files/health"
check_service "→ Metadata (via gateway)" "http://localhost/api/metadata/health"
check_service "→ Search (via gateway)" "http://localhost/api/search/health"

# Web UIs
echo ""
echo "🖥️  Web Interfaces:"
echo "   MinIO Console:     http://localhost:9001"
echo "   RabbitMQ Console:  http://localhost:15672"
echo "   Elasticsearch:     http://localhost:9200"

echo ""
echo "================================"
echo "Done!"
