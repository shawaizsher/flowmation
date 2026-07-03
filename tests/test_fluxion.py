"""
Assignment 3 (CLO-2) — Selenium Test Suite for Fluxion Automation Platform
=========================================================================
Task 1a — Application Architecture:
  Framework : React 18 + TypeScript + Vite          (Frontend)
  Backend   : Node.js 18 + Express 4                (REST API)
  Database  : PostgreSQL 16                          (Primary store)
  Queue     : Redis 7 + BullMQ                       (Job execution)
  Auth      : JWT + bcryptjs
  Styling   : Tailwind CSS 3 (dark theme)

Task 2b — Testing & Usability (CRUD via Selenium):
  C — Create : create a new workflow via the modal
  R — Read   : load dashboard, search cards, open editor
  U — Update : rename workflow in the editor header, save
  D — Delete : select workflow card → delete from detail panel

CRUD Test Plan
--------------
  1. Login (positive + negative)
  2. CREATE  — "New Workflow" → fill name → "Create Workflow" → /workflows/:id
  3. READ    — dashboard card appears; search filters correctly
  4. READ    — double-click card → editor URL; header shows name
  5. UPDATE  — edit name in editor header → Save; dashboard refreshes
  6. DELETE  — click card → Delete in right panel → card removed
  7. Logout  — sidebar "Logout" → /login; protected route redirects

How to run
----------
  pip install -r tests/requirements.txt
  python tests/test_fluxion.py

Prerequisites: app running at http://localhost:3000 with seed data loaded.
  cd backend && npm run seed:users
"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager

# ── Configuration ────────────────────────────────────────────────────────────
BASE_URL      = "http://localhost:3000"
TEST_EMAIL    = "admin@fluxion.dev"
TEST_PASSWORD = "admin123"
WF_NAME       = "Selenium CRUD Test"
WF_UPDATED    = "Selenium CRUD Updated"

# ── Result tracking ──────────────────────────────────────────────────────────
results = []

def log(status, name, detail=""):
    icon = "✅" if status == "PASS" else "❌"
    line = f"  {icon} [{status}] {name}"
    if detail:
        line += f"\n         └─ {detail}"
    print(line)
    results.append((status, name))

def W(driver, timeout=10):
    return WebDriverWait(driver, timeout)

# ── React-safe input: select-all then type ───────────────────────────────────
def set_input(elem, text):
    """Select all existing text then type, triggering React onChange reliably."""
    elem.click()
    elem.send_keys(Keys.CONTROL + "a")
    elem.send_keys(text)

# ── Force logout by clearing auth from localStorage ──────────────────────────
def force_logout(driver):
    driver.execute_script("localStorage.clear(); sessionStorage.clear();")
    driver.get(f"{BASE_URL}/login")
    W(driver).until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))

# ── Driver setup ─────────────────────────────────────────────────────────────
def setup_driver():
    opts = webdriver.ChromeOptions()
    opts.add_argument("--start-maximized")
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=opts,
    )
    driver.implicitly_wait(6)
    return driver

def fill_login_form(driver, email, password):
    driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(password)
    # Button text is "Sign In" — use "." to match text inside child elements too
    driver.find_element(By.XPATH, "//button[contains(.,'Sign In')]").click()


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1 — LOGIN
# ═══════════════════════════════════════════════════════════════════════════════
def test_login(driver):
    print("\n━━━  TEST 1 : LOGIN  ━━━")

    # Positive: valid credentials
    try:
        force_logout(driver)
        fill_login_form(driver, TEST_EMAIL, TEST_PASSWORD)
        W(driver).until(EC.url_contains("/dashboard"))
        assert "/dashboard" in driver.current_url
        log("PASS", "Login with valid credentials → redirected to /dashboard")
    except Exception as e:
        log("FAIL", "Login with valid credentials", str(e)[:200])

    # Negative: wrong password — must log out first so the login page is shown
    try:
        force_logout(driver)
        fill_login_form(driver, TEST_EMAIL, "wrongpassword123")
        time.sleep(2)  # wait for any potential redirect
        assert "/dashboard" not in driver.current_url
        log("PASS", "Login with wrong password → stays on login page")
    except Exception as e:
        log("FAIL", "Login with wrong password (negative)", str(e)[:200])

    # Re-authenticate properly for the rest of the suite
    try:
        force_logout(driver)
        fill_login_form(driver, TEST_EMAIL, TEST_PASSWORD)
        W(driver).until(EC.url_contains("/dashboard"))
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2 — CREATE (C in CRUD)
# ═══════════════════════════════════════════════════════════════════════════════
def test_create_workflow(driver):
    print("\n━━━  TEST 2 : CREATE WORKFLOW  ━━━")
    try:
        driver.get(f"{BASE_URL}/dashboard")
        # "New Workflow" button — use "." so it matches even with an icon sibling
        new_btn = W(driver).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(.,'New Workflow')]"))
        )
        new_btn.click()

        # Wait for the modal heading
        W(driver).until(
            EC.presence_of_element_located((By.XPATH, "//h2[contains(.,'New Workflow')]"))
        )
        log("PASS", "Create modal opened")

        # Name input (starts empty, placeholder="e.g. Customer Onboarding")
        # Use element_to_be_clickable so we don't interact before animation ends
        name_input = W(driver, 8).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, "input[placeholder='e. g. Customer Onboarding'], "
                                  "input[placeholder='e.g. Customer Onboarding']")
            )
        )
        # Don't clear — input starts empty. Just click to focus and type.
        name_input.click()
        name_input.send_keys(WF_NAME)

        # Wait until Create button is enabled (it's disabled when name is empty)
        create_btn = W(driver, 5).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(.,'Create Workflow') and not(@disabled)]")
            )
        )
        create_btn.click()

        # Should navigate to the editor
        W(driver, 15).until(EC.url_contains("/workflows/"))
        assert "/workflows/" in driver.current_url
        log("PASS", f'Workflow "{WF_NAME}" created → navigated to editor')
    except Exception as e:
        log("FAIL", "Create new workflow", str(e)[:300])


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3 — READ: Dashboard list & search (R in CRUD)
# ═══════════════════════════════════════════════════════════════════════════════
def test_read_dashboard(driver):
    print("\n━━━  TEST 3 : READ — Dashboard & Search  ━━━")

    # 3a: Workflow card appears
    try:
        driver.get(f"{BASE_URL}/dashboard")
        W(driver, 12).until(
            EC.presence_of_element_located(
                (By.XPATH, f"//h4[contains(text(),'{WF_NAME}')]")
            )
        )
        log("PASS", f'Dashboard lists workflow "{WF_NAME}"')
    except Exception as e:
        log("FAIL", "Dashboard lists created workflow", str(e)[:200])

    # 3b: Search narrows results
    try:
        search = W(driver, 6).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "input[placeholder='Search…']")
            )
        )
        search.clear()
        search.send_keys(WF_NAME)
        time.sleep(1.2)
        cards = driver.find_elements(By.XPATH, f"//h4[contains(text(),'{WF_NAME}')]")
        assert len(cards) > 0
        log("PASS", f'Search for "{WF_NAME}" returns results')
        search.clear()
        time.sleep(0.5)
    except Exception as e:
        log("FAIL", "Search workflow by name", str(e)[:200])

    # 3c: Non-matching search hides card (negative)
    try:
        search = driver.find_element(By.CSS_SELECTOR, "input[placeholder='Search…']")
        search.clear()
        search.send_keys("zzz_no_such_workflow_xyz")
        time.sleep(1.2)
        cards = driver.find_elements(By.XPATH, f"//h4[contains(text(),'{WF_NAME}')]")
        assert len(cards) == 0
        log("PASS", "Non-matching search → workflow hidden (negative)")
        search.clear()
    except Exception as e:
        log("FAIL", "Non-matching search (negative)", str(e)[:200])


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4 — READ: Open Workflow Editor (R in CRUD)
# ═══════════════════════════════════════════════════════════════════════════════
def test_read_editor(driver):
    print("\n━━━  TEST 4 : READ — Open Workflow Editor  ━━━")
    try:
        driver.get(f"{BASE_URL}/dashboard")
        # Double-click the workflow card h4 to open editor
        card = W(driver, 10).until(
            EC.presence_of_element_located(
                (By.XPATH, f"//h4[contains(text(),'{WF_NAME}')]")
            )
        )
        ActionChains(driver).double_click(card).perform()

        W(driver, 15).until(EC.url_contains("/workflows/"))
        assert "/workflows/" in driver.current_url
        log("PASS", "Double-click card → editor opens at /workflows/:id")

        # Verify name shows in editor header input
        name_input = W(driver, 10).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "input.bg-transparent.font-bold")
            )
        )
        val = name_input.get_attribute("value") or ""
        assert WF_NAME in val, f"Expected '{WF_NAME}' in input, got '{val}'"
        log("PASS", f'Editor header shows correct name "{WF_NAME}"')
    except Exception as e:
        log("FAIL", "Open workflow editor (Read)", str(e)[:300])


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5 — UPDATE: Rename Workflow (U in CRUD)
# ═══════════════════════════════════════════════════════════════════════════════
def test_update_workflow(driver):
    print("\n━━━  TEST 5 : UPDATE — Rename Workflow  ━━━")
    try:
        # Navigate to editor if not already there
        if "/workflows/" not in driver.current_url:
            driver.get(f"{BASE_URL}/dashboard")
            card = W(driver, 10).until(
                EC.presence_of_element_located(
                    (By.XPATH, f"//h4[contains(text(),'{WF_NAME}')]")
                )
            )
            ActionChains(driver).double_click(card).perform()
            W(driver, 15).until(EC.url_contains("/workflows/"))

        # Find the name input in the editor header
        name_input = W(driver, 10).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, "input.bg-transparent.font-bold")
            )
        )
        set_input(name_input, WF_UPDATED)
        time.sleep(0.5)

        # Click Save
        save_btn = W(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(.,'Save')]"))
        )
        save_btn.click()
        time.sleep(2)

        val = name_input.get_attribute("value") or ""
        assert WF_UPDATED in val, f"Expected '{WF_UPDATED}', got '{val}'"
        log("PASS", f'Workflow renamed → "{WF_UPDATED}"')
    except Exception as e:
        log("FAIL", "Update workflow name in editor", str(e)[:300])

    # Verify dashboard reflects the new name
    try:
        driver.get(f"{BASE_URL}/dashboard")
        W(driver, 12).until(
            EC.presence_of_element_located(
                (By.XPATH, f"//h4[contains(text(),'{WF_UPDATED}')]")
            )
        )
        log("PASS", f'Dashboard reflects updated name "{WF_UPDATED}"')
    except Exception as e:
        log("FAIL", "Dashboard reflects updated name", str(e)[:200])


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6 — DELETE: Remove Workflow (D in CRUD)
# ═══════════════════════════════════════════════════════════════════════════════
def test_delete_workflow(driver):
    print("\n━━━  TEST 6 : DELETE — Remove Workflow  ━━━")
    try:
        driver.get(f"{BASE_URL}/dashboard")

        # Find whichever name exists (updated or original)
        wf_name = None
        for name in [WF_UPDATED, WF_NAME]:
            elems = driver.find_elements(By.XPATH, f"//h4[contains(text(),'{name}')]")
            if elems:
                wf_name = name
                break
        assert wf_name, "No test workflow found on dashboard to delete"

        # Single-click selects the workflow and reveals the right detail panel
        card = driver.find_element(By.XPATH, f"//h4[contains(text(),'{wf_name}')]")
        card.click()
        time.sleep(1)

        # Delete button in the detail panel has red styling
        delete_btn = W(driver, 8).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(.,'Delete') and contains(@class,'red')]")
            )
        )
        delete_btn.click()
        time.sleep(2)

        # Verify card is gone
        remaining = driver.find_elements(
            By.XPATH,
            f"//h4[contains(text(),'{WF_UPDATED}') or contains(text(),'{WF_NAME}')]"
        )
        assert len(remaining) == 0
        log("PASS", f'Workflow "{wf_name}" deleted — no longer on dashboard')
    except Exception as e:
        log("FAIL", "Delete workflow", str(e)[:300])


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 7 — LOGOUT
# ═══════════════════════════════════════════════════════════════════════════════
def test_logout(driver):
    print("\n━━━  TEST 7 : LOGOUT  ━━━")
    try:
        driver.get(f"{BASE_URL}/dashboard")
        # Logout button is in the sidebar with a span containing "Logout"
        logout_btn = W(driver, 10).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(.,'Logout')]")
            )
        )
        logout_btn.click()
        W(driver, 10).until(EC.url_contains("/login"))
        assert "/login" in driver.current_url
        log("PASS", "Logout → redirected to /login")
    except Exception as e:
        log("FAIL", "Logout", str(e)[:200])

    # Verify protected route is inaccessible after logout
    try:
        driver.get(f"{BASE_URL}/dashboard")
        time.sleep(2.5)
        assert "/login" in driver.current_url or "/dashboard" not in driver.current_url
        log("PASS", "Protected /dashboard redirects to /login after logout")
    except Exception as e:
        log("FAIL", "Protected route redirect after logout", str(e)[:200])


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("  FLUXION — Selenium Test Suite  (Assignment 3 · CLO-2)")
    print("=" * 60)
    print(f"  Target : {BASE_URL}")
    print(f"  User   : {TEST_EMAIL}")
    print("=" * 60)

    driver = setup_driver()
    try:
        test_login(driver)
        test_create_workflow(driver)
        test_read_dashboard(driver)
        test_read_editor(driver)
        test_update_workflow(driver)
        test_delete_workflow(driver)
        test_logout(driver)
    finally:
        driver.quit()

    total  = len(results)
    passed = sum(1 for s, _ in results if s == "PASS")
    failed = total - passed

    print("\n" + "=" * 60)
    print(f"  RESULTS : {passed}/{total} passed   |   {failed} failed")
    print("=" * 60)
    for status, name in results:
        icon = "✅" if status == "PASS" else "❌"
        print(f"  {icon} {name}")
    print("=" * 60)
