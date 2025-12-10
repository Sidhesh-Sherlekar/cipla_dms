#!/bin/bash

# Cipla DMS - Role and Permission Setup Script (Unix/Linux/Mac)
# This script sets up roles, permissions, and creates a test admin account
#
# Usage: ./setup_roles.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="${SCRIPT_DIR}/backend"

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}          Cipla DMS - Role & Permission Setup Script${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "${BACKEND_DIR}" ]; then
    echo -e "${RED}Error: Backend directory not found!${NC}"
    echo -e "${RED}Please run this script from the project root directory.${NC}"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed!${NC}"
    echo -e "${RED}Please install Python 3 before running this script.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python 3 detected: $(python3 --version)${NC}"

# Navigate to backend directory
cd "${BACKEND_DIR}"

# Check if manage.py exists
if [ ! -f "manage.py" ]; then
    echo -e "${RED}Error: manage.py not found in backend directory!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Django project detected${NC}"
echo ""

# Check if virtual environment should be activated
if [ -d "../env" ] || [ -d "../venv" ]; then
    if [ -d "../env" ]; then
        VENV_DIR="../env"
    else
        VENV_DIR="../venv"
    fi

    echo -e "${YELLOW}Virtual environment detected: ${VENV_DIR}${NC}"

    # Check if we're already in a virtual environment
    if [ -z "${VIRTUAL_ENV}" ]; then
        echo -e "${YELLOW}Activating virtual environment...${NC}"
        source "${VENV_DIR}/bin/activate"
        echo -e "${GREEN}✓ Virtual environment activated${NC}"
    else
        echo -e "${GREEN}✓ Already running in virtual environment${NC}"
    fi
    echo ""
fi

# Step 1: Run migrations
echo -e "${BLUE}[1/3] Running database migrations...${NC}"
python3 manage.py migrate --noinput

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations completed successfully${NC}"
    echo ""
else
    echo -e "${RED}✗ Migration failed!${NC}"
    exit 1
fi

# Step 2: Setup roles and permissions
echo -e "${BLUE}[2/3] Setting up roles and permissions...${NC}"
python3 manage.py setup_roles

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Roles and permissions setup completed${NC}"
    echo ""
else
    echo -e "${RED}✗ Role setup failed!${NC}"
    exit 1
fi

# Step 3: Collect static files (optional, but good for production readiness)
echo -e "${BLUE}[3/3] Collecting static files...${NC}"
python3 manage.py collectstatic --noinput --clear

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Static files collected${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ Static files collection had warnings (non-critical)${NC}"
    echo ""
fi

# Final summary
echo -e "${BLUE}=====================================================================${NC}"
echo -e "${GREEN}          Setup Completed Successfully!${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""
echo -e "${YELLOW}Test Admin Account Created:${NC}"
echo -e "  Username: ${GREEN}admin${NC}"
echo -e "  Password: ${GREEN}Admin@123456${NC}"
echo ""
echo -e "${YELLOW}Roles Created:${NC}"
echo -e "  1. Admin - Full system access"
echo -e "  2. Section Head - Document and section management"
echo -e "  3. Head QC - Quality control and approval"
echo -e "  4. Document Store - Storage and retrieval operations"
echo ""
echo -e "${RED}IMPORTANT: Change the admin password in production!${NC}"
echo ""
echo -e "${BLUE}To start the development server:${NC}"
echo -e "  cd backend"
echo -e "  python3 manage.py runserver"
echo ""
echo -e "${BLUE}=====================================================================${NC}"
