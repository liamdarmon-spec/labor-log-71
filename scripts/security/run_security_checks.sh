#!/bin/bash
# ============================================================================
# run_security_checks.sh
# Runs all security audit scripts against local Supabase database
# Exit code: 0 if clean, 1 if issues found
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default to local Supabase DB
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║               SUPABASE SECURITY AUDIT - PHASE 1                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Database: $DB_URL"
echo "Date: $(date)"
echo ""

ISSUES_FOUND=0

# ============================================================================
# Check 1: RLS Enabled
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CHECK 1: Tables Without RLS Enabled${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RLS_RESULT=$(psql "$DB_URL" -t -f "$SCRIPT_DIR/check_rls.sql" 2>&1)
RLS_COUNT=$(echo "$RLS_RESULT" | grep -c "|" || echo "0")

if [ "$RLS_COUNT" -gt 0 ]; then
  echo -e "${RED}❌ Found $RLS_COUNT tables without RLS:${NC}"
  echo "$RLS_RESULT" | head -30
  ISSUES_FOUND=1
else
  echo -e "${GREEN}✅ All tables have RLS enabled${NC}"
fi

# ============================================================================
# Check 2: Open Policies
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CHECK 2: Open/Unsafe RLS Policies${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

POLICY_RESULT=$(psql "$DB_URL" -t -f "$SCRIPT_DIR/check_policies.sql" 2>&1)
CRITICAL_COUNT=$(echo "$POLICY_RESULT" | grep -c "CRITICAL" || echo "0")

if [ "$CRITICAL_COUNT" -gt 0 ]; then
  echo -e "${RED}❌ Found $CRITICAL_COUNT critical policy issues:${NC}"
  echo "$POLICY_RESULT" | grep -E "(CRITICAL|SUMMARY)" | head -50
  ISSUES_FOUND=1
else
  echo -e "${GREEN}✅ No critical policy issues found${NC}"
  echo "$POLICY_RESULT" | grep "SUMMARY" | head -5
fi

# ============================================================================
# Check 3: Missing company_id
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CHECK 3: Tables Missing company_id${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

COMPANY_RESULT=$(psql "$DB_URL" -t -f "$SCRIPT_DIR/check_company_id.sql" 2>&1)
MISSING_COUNT=$(echo "$COMPANY_RESULT" | grep -c "MISSING" || echo "0")

if [ "$MISSING_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $MISSING_COUNT tables potentially missing company_id:${NC}"
  echo "$COMPANY_RESULT" | grep -E "(MISSING|SUMMARY)" | head -40
  # Warning only, not critical
else
  echo -e "${GREEN}✅ All tenant tables have company_id${NC}"
fi

# ============================================================================
# Check 4: SECURITY DEFINER Functions
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CHECK 4: SECURITY DEFINER Functions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

FUNC_RESULT=$(psql "$DB_URL" -t -f "$SCRIPT_DIR/check_functions.sql" 2>&1)
UNSAFE_FUNC_COUNT=$(echo "$FUNC_RESULT" | grep -c "NO search_path" || echo "0")

if [ "$UNSAFE_FUNC_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $UNSAFE_FUNC_COUNT functions without SET search_path:${NC}"
  echo "$FUNC_RESULT" | grep -E "(NO search_path|SUMMARY)" | head -30
  # Warning only
else
  echo -e "${GREEN}✅ All SECURITY DEFINER functions have search_path${NC}"
fi
echo "$FUNC_RESULT" | grep "SUMMARY" | head -5

# ============================================================================
# Final Summary
# ============================================================================
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                          AUDIT COMPLETE                           ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

if [ "$ISSUES_FOUND" -eq 1 ]; then
  echo -e "${RED}❌ SECURITY ISSUES FOUND - Review above and fix before deploying${NC}"
  echo ""
  echo "Recommended actions:"
  echo "  1. Enable RLS on all tenant tables"
  echo "  2. Replace 'Anyone can...' policies with tenant-scoped policies"
  echo "  3. Add company_id to tenant tables"
  echo "  4. Add SET search_path to SECURITY DEFINER functions"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ No critical security issues found${NC}"
  echo ""
  exit 0
fi
