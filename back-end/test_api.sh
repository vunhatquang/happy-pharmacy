#!/bin/bash
# =============================================================================
# Happy Pharmacy API — End-to-End Test Suite
# =============================================================================
# Usage: ./test_api.sh [base_url]
# Default base_url: http://localhost:8080
# =============================================================================

BASE_URL="${1:-http://localhost:8080}"
PASS=0
FAIL=0
ERRORS=()
TIMESTAMP=$(date +%s)
TEST_EMAIL="testuser_${TIMESTAMP}@example.com"

# --- Helpers ----------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

assert_status() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  local body="$4"

  if [ "$actual" -eq "$expected" ] 2>/dev/null; then
    echo -e "  ${GREEN}PASS${NC} $test_name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $test_name — expected HTTP $expected, got HTTP $actual"
    echo -e "       Response: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
    ERRORS+=("$test_name")
  fi
}

assert_json_field() {
  local test_name="$1"
  local body="$2"
  local field="$3"

  local value
  value=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d${field})" 2>/dev/null)
  if [ -n "$value" ] && [ "$value" != "None" ]; then
    echo -e "  ${GREEN}PASS${NC} $test_name (${field} = ${value:0:60})"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $test_name — field ${field} missing or null"
    echo -e "       Response: $(echo "$body" | head -c 200)"
    FAIL=$((FAIL + 1))
    ERRORS+=("$test_name")
  fi
}

section() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━ $1 ━━━${NC}"
}

# --- Pre-flight check -------------------------------------------------------

section "PRE-FLIGHT"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$HEALTH" != "200" ]; then
  echo -e "${RED}Server not reachable at $BASE_URL — aborting.${NC}"
  exit 1
fi
echo -e "  ${GREEN}OK${NC} Server is healthy at $BASE_URL"

# =============================================================================
# 1. AUTH
# =============================================================================
section "1. AUTH — Register & Login"

# 1.1 Register new user
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/register" \
  -H 'Content-Type: application/json' \
  -d "{\"full_name\":\"Test User\",\"email\":\"$TEST_EMAIL\",\"phone\":\"0901234567\",\"password\":\"test1234\"}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "1.1 Register new user" 201 "$HTTP" "$BODY"
USER_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
USER_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null)

# 1.2 Register duplicate email
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/register" \
  -H 'Content-Type: application/json' \
  -d "{\"full_name\":\"Dup User\",\"email\":\"$TEST_EMAIL\",\"phone\":\"0900000000\",\"password\":\"test1234\"}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "1.2 Reject duplicate email" 409 "$HTTP" "$BODY"

# 1.3 Register with bad email
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/register" \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Bad","email":"notanemail","phone":"123","password":"test1234"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "1.3 Reject invalid email" 400 "$HTTP" "$BODY"

# 1.4 Register with short password
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/register" \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Short","email":"short@x.com","phone":"123","password":"12"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "1.4 Reject short password" 400 "$HTTP" "$BODY"

# 1.5 Login
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"test1234\"}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "1.5 Login with correct credentials" 200 "$HTTP" "$BODY"
USER_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

# 1.6 Login with wrong password
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpass\"}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "1.6 Reject wrong password" 401 "$HTTP" "$BODY"

# 1.7 Login admin
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@happypharmacy.com","password":"admin123"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "1.7 Admin login" 200 "$HTTP" "$BODY"
ADMIN_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

# =============================================================================
# 2. PROFILE
# =============================================================================
section "2. PROFILE"

# 2.1 Get profile
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/profile" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "2.1 Get profile (authenticated)" 200 "$HTTP" "$BODY"

# 2.2 Get profile without token
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/profile")
HTTP=$(echo "$BODY" | tail -1)
assert_status "2.2 Get profile (no token) rejected" 401 "$HTTP" "$BODY"

# 2.3 Update profile
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/profile" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Updated Name","phone":"0909999999"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "2.3 Update profile" 200 "$HTTP" "$BODY"

# =============================================================================
# 3. ADDRESSES
# =============================================================================
section "3. ADDRESSES"

# 3.1 Create address
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/addresses" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"label":"Home","street":"123 Nguyen Hue","ward":"Ben Nghe","district":"Quan 1","city":"Ho Chi Minh","is_default":true}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "3.1 Create address" 201 "$HTTP" "$BODY"
ADDRESS_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)

# 3.2 Create second address
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/addresses" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"label":"Work","street":"456 Le Loi","ward":"Ben Thanh","district":"Quan 1","city":"Ho Chi Minh","is_default":false}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "3.2 Create second address" 201 "$HTTP" "$BODY"
ADDRESS_ID_2=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)

# 3.3 List addresses
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/addresses" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "3.3 List addresses" 200 "$HTTP" "$BODY"

# 3.4 Update address
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/addresses/$ADDRESS_ID_2" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"label":"Office","street":"789 Dong Khoi"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "3.4 Update address" 200 "$HTTP" "$BODY"

# 3.5 Delete address
BODY=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/addresses/$ADDRESS_ID_2" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "3.5 Delete address" 200 "$HTTP" "$BODY"

# =============================================================================
# 4. MEDICINES & CATEGORIES
# =============================================================================
section "4. MEDICINES & CATEGORIES"

# 4.1 List categories
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/categories")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "4.1 List categories" 200 "$HTTP" "$BODY"
CAT_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
echo -e "       Categories found: $CAT_COUNT"

# 4.2 List all medicines
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/medicines")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "4.2 List all medicines" 200 "$HTTP" "$BODY"
MED_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
echo -e "       Medicines found: $MED_COUNT"
MEDICINE_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])" 2>/dev/null)
MEDICINE_ID_2=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][1]['id'])" 2>/dev/null)

# 4.3 List medicines by category
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/medicines?category=giam-dau")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "4.3 Filter medicines by category" 200 "$HTTP" "$BODY"

# 4.4 Get single medicine
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/medicines/$MEDICINE_ID")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "4.4 Get single medicine" 200 "$HTTP" "$BODY"
assert_json_field "4.4b Medicine has name" "$BODY" "['data']['name']"

# 4.5 Get non-existent medicine
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/medicines/00000000-0000-0000-0000-000000000000")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "4.5 Get non-existent medicine returns 404" 404 "$HTTP" "$BODY"

# 4.6 Search medicines
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/medicines/search?q=paracetamol")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "4.6 Search medicines by name" 200 "$HTTP" "$BODY"
SEARCH_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
echo -e "       Search results for 'paracetamol': $SEARCH_COUNT"

# 4.7 Search with no results
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/medicines/search?q=xyznonexistent")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "4.7 Search with no results" 200 "$HTTP" "$BODY"

# =============================================================================
# 5. CART
# =============================================================================
section "5. CART"

# 5.1 Get empty cart
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "5.1 Get empty cart" 200 "$HTTP" "$BODY"

# 5.2 Add item to cart
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"medicine_id\":\"$MEDICINE_ID\",\"quantity\":2}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "5.2 Add item to cart" 200 "$HTTP" "$BODY"
CART_ITEM_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)

# 5.3 Add second item
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"medicine_id\":\"$MEDICINE_ID_2\",\"quantity\":1}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "5.3 Add second item to cart" 200 "$HTTP" "$BODY"

# 5.4 Get cart with items
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "5.4 Get cart with items" 200 "$HTTP" "$BODY"
CART_TOTAL=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
CART_ITEM_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
echo -e "       Cart items: $CART_ITEM_COUNT, Total: ${CART_TOTAL} VND"

# 5.5 Update cart item quantity
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/cart/$CART_ITEM_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantity":5}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "5.5 Update cart item quantity" 200 "$HTTP" "$BODY"

# 5.6 Remove one item from cart
BODY=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/cart/$CART_ITEM_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "5.6 Remove item from cart" 200 "$HTTP" "$BODY"

# 5.7 Cart without auth
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/cart")
HTTP=$(echo "$BODY" | tail -1)
assert_status "5.7 Cart without auth rejected" 401 "$HTTP" "$BODY"

# Re-add item for order test
curl -s -X POST "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"medicine_id\":\"$MEDICINE_ID\",\"quantity\":2}" > /dev/null

# =============================================================================
# 6. ORDERS
# =============================================================================
section "6. ORDERS"

# 6.1 Place order
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"address_id\":\"$ADDRESS_ID\",\"payment_method\":\"cod\",\"notes\":\"Test order\"}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "6.1 Place order (COD)" 201 "$HTTP" "$BODY"
ORDER_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)
echo -e "       Order ID: $ORDER_ID"

# 6.2 Verify cart is cleared after order
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/cart" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
CART_AFTER=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
if [ "$CART_AFTER" = "0" ]; then
  echo -e "  ${GREEN}PASS${NC} 6.2 Cart cleared after order (items: $CART_AFTER)"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}FAIL${NC} 6.2 Cart not cleared after order (items: $CART_AFTER)"
  FAIL=$((FAIL + 1))
  ERRORS+=("6.2 Cart cleared after order")
fi

# 6.3 Place order with empty cart
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"address_id\":\"$ADDRESS_ID\",\"payment_method\":\"cod\"}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "6.3 Reject order with empty cart" 400 "$HTTP" "$BODY"

# 6.4 Get orders list
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "6.4 Get order list" 200 "$HTTP" "$BODY"
ORDER_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
echo -e "       Orders found: $ORDER_COUNT"

# 6.5 Get single order
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "6.5 Get single order" 200 "$HTTP" "$BODY"
assert_json_field "6.5b Order has status" "$BODY" "['data']['status']"
assert_json_field "6.5c Order has items" "$BODY" "['data']['items']"

# =============================================================================
# 7. PRESCRIPTIONS
# =============================================================================
section "7. PRESCRIPTIONS"

# 7.1 Upload prescription (create a temp image)
TEMP_IMG=$(mktemp /tmp/test_prescription_XXXXXX.jpg)
echo "fake image data for testing" > "$TEMP_IMG"

BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/prescriptions" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -F "prescription_image=@$TEMP_IMG" \
  -F "doctor_name=Dr. Nguyen" \
  -F "hospital_name=Cho Ray Hospital")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "7.1 Upload prescription" 201 "$HTTP" "$BODY"
PRESCRIPTION_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)
rm -f "$TEMP_IMG"

# 7.2 List prescriptions
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/prescriptions" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "7.2 List prescriptions" 200 "$HTTP" "$BODY"

# 7.3 Get single prescription
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/prescriptions/$PRESCRIPTION_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "7.3 Get single prescription" 200 "$HTTP" "$BODY"

# 7.4 Upload without image
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/prescriptions" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -F "doctor_name=Dr. Test")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "7.4 Reject prescription without image" 400 "$HTTP" "$BODY"

# =============================================================================
# 8. SUBSCRIPTIONS
# =============================================================================
section "8. SUBSCRIPTIONS"

# 8.1 Create subscription
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/subscriptions" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"medicine_id\":\"$MEDICINE_ID\",\"address_id\":\"$ADDRESS_ID\",\"frequency\":\"monthly\",\"quantity\":1}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "8.1 Create subscription" 201 "$HTTP" "$BODY"
SUB_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)

# 8.2 List subscriptions
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/subscriptions" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "8.2 List subscriptions" 200 "$HTTP" "$BODY"

# 8.3 Cancel subscription
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/subscriptions/$SUB_ID/cancel" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "8.3 Cancel subscription" 200 "$HTTP" "$BODY"

# 8.4 Reactivate subscription
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/subscriptions/$SUB_ID/reactivate" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "8.4 Reactivate subscription" 200 "$HTTP" "$BODY"

# 8.5 Invalid frequency
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/subscriptions" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"medicine_id\":\"$MEDICINE_ID\",\"address_id\":\"$ADDRESS_ID\",\"frequency\":\"daily\",\"quantity\":1}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "8.5 Reject invalid frequency" 400 "$HTTP" "$BODY"

# =============================================================================
# 9. AI CHAT (placeholder)
# =============================================================================
section "9. AI CHAT"

# 9.1 Ask assistant
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/chat" \
  -H 'Content-Type: application/json' \
  -d '{"symptoms":"headache and fever"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "9.1 AI chat responds" 200 "$HTTP" "$BODY"
assert_json_field "9.1b Has reply" "$BODY" "['reply']"
assert_json_field "9.1c Has suggested_products" "$BODY" "['suggested_products']"

# 9.2 Missing symptoms
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/ai/chat" \
  -H 'Content-Type: application/json' \
  -d '{}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "9.2 Reject empty symptoms" 400 "$HTTP" "$BODY"

# =============================================================================
# 10. ADMIN — Dashboard & Analytics
# =============================================================================
section "10. ADMIN — Dashboard & Analytics"

# 10.1 Admin stats
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "10.1 Admin dashboard stats" 200 "$HTTP" "$BODY"
assert_json_field "10.1b Has pending_prescriptions" "$BODY" "['data']['pending_prescriptions']"

# 10.2 Admin analytics
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/analytics" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "10.2 Admin analytics" 200 "$HTTP" "$BODY"

# 10.3 Non-admin rejected
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/stats" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "10.3 Non-admin rejected from admin routes" 403 "$HTTP" "$BODY"

# =============================================================================
# 11. ADMIN — Product Management
# =============================================================================
section "11. ADMIN — Product Management"

# 11.1 List medicines (admin)
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/medicines" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "11.1 Admin list medicines" 200 "$HTTP" "$BODY"

# Get a category ID for creating a medicine
CAT_ID=$(curl -s "$BASE_URL/api/categories" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])" 2>/dev/null)

# 11.2 Create medicine
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/admin/medicines" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Test Medicine\",\"generic_name\":\"Testium\",\"category_id\":\"$CAT_ID\",\"price\":50000,\"stock_qty\":100,\"packaging_type\":\"Box of 10\",\"description\":\"Test medicine for API testing\",\"requires_prescription\":false,\"is_active\":true}")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "11.2 Admin create medicine" 201 "$HTTP" "$BODY"
NEW_MED_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)

# 11.3 Update medicine
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/admin/medicines/$NEW_MED_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Updated Test Medicine","price":55000}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "11.3 Admin update medicine" 200 "$HTTP" "$BODY"

# 11.4 Toggle medicine (deactivate)
BODY=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/admin/medicines/$NEW_MED_ID/toggle" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "11.4 Admin toggle medicine" 200 "$HTTP" "$BODY"

# =============================================================================
# 12. ADMIN — Order Management
# =============================================================================
section "12. ADMIN — Order Management"

# 12.1 List all orders
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "12.1 Admin list orders" 200 "$HTTP" "$BODY"

# 12.2 Update order status to processing
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/admin/orders/$ORDER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"processing","payment_status":"paid"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "12.2 Admin update order to processing" 200 "$HTTP" "$BODY"

# 12.3 Update order to shipped (should create shipment)
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/admin/orders/$ORDER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"shipped"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "12.3 Admin ship order (creates shipment)" 200 "$HTTP" "$BODY"

# 12.4 Verify shipment was created
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
SHIPMENT_STATUS=$(echo "$BODY" | python3 -c "import sys,json; s=json.load(sys.stdin).get('data',{}).get('shipment',{}); print(s.get('tracking_code','') if s else '')" 2>/dev/null)
if [ -n "$SHIPMENT_STATUS" ] && [ "$SHIPMENT_STATUS" != "" ]; then
  echo -e "  ${GREEN}PASS${NC} 12.4 Shipment created with tracking: $SHIPMENT_STATUS"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}FAIL${NC} 12.4 Shipment not found on order"
  FAIL=$((FAIL + 1))
  ERRORS+=("12.4 Shipment created")
fi

# 12.5 Filter orders by status
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/orders?status=shipped" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "12.5 Admin filter orders by status" 200 "$HTTP" "$BODY"

# =============================================================================
# 13. ADMIN — Prescription Review
# =============================================================================
section "13. ADMIN — Prescription Review"

# 13.1 List prescriptions (admin)
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/prescriptions" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "13.1 Admin list prescriptions" 200 "$HTTP" "$BODY"

# 13.2 Approve prescription
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/admin/prescriptions/$PRESCRIPTION_ID/review" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"approved"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "13.2 Admin approve prescription" 200 "$HTTP" "$BODY"

# 13.3 Filter by status
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/prescriptions?status=approved" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "13.3 Admin filter prescriptions by status" 200 "$HTTP" "$BODY"

# =============================================================================
# 14. ADMIN — Inventory Management
# =============================================================================
section "14. ADMIN — Inventory"

# 14.1 Get inventory
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/inventory" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "14.1 Admin get inventory" 200 "$HTTP" "$BODY"

# 14.2 Adjust stock
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/admin/inventory/$MEDICINE_ID/stock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"change_qty":50,"reason":"restock"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "14.2 Admin restock medicine" 200 "$HTTP" "$BODY"

# 14.3 Negative stock adjustment
BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/admin/inventory/$MEDICINE_ID/stock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"change_qty":-5,"reason":"expired"}')
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "14.3 Admin remove expired stock" 200 "$HTTP" "$BODY"

# 14.4 Get inventory logs
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/inventory/$MEDICINE_ID/logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "14.4 Admin get inventory logs" 200 "$HTTP" "$BODY"
LOG_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
echo -e "       Inventory log entries: $LOG_COUNT"

# =============================================================================
# 15. AUTH EDGE CASES
# =============================================================================
section "15. AUTH EDGE CASES"

# 15.1 Invalid JWT
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/profile" \
  -H "Authorization: Bearer invalidtoken123")
HTTP=$(echo "$BODY" | tail -1)
assert_status "15.1 Invalid JWT rejected" 401 "$HTTP" "$BODY"

# 15.2 Missing Authorization header
BODY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/orders" \
  -H 'Content-Type: application/json' \
  -d '{}')
HTTP=$(echo "$BODY" | tail -1)
assert_status "15.2 Missing auth header rejected" 401 "$HTTP" "$BODY"

# 15.3 Customer cannot access admin routes
BODY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/medicines" \
  -H "Authorization: Bearer $USER_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
assert_status "15.3 Customer blocked from admin medicine list" 403 "$HTTP" "$BODY"

BODY=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/admin/orders/$ORDER_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"delivered"}')
HTTP=$(echo "$BODY" | tail -1)
assert_status "15.4 Customer blocked from admin order update" 403 "$HTTP" "$BODY"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  TEST RESULTS${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo -e "  Total:  $((PASS + FAIL))"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}Failed tests:${NC}"
  for err in "${ERRORS[@]}"; do
    echo -e "  ${RED}-${NC} $err"
  done
  echo ""
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  echo ""
  exit 0
fi
