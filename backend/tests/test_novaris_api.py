"""NOVARIS backend API tests - covers auth, risks, treatments, approvals, audit, admin"""
import os, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://risk-appetite-system.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

CREDS = {
    "admin": ("admin@demo.com", "Admin@123"),
    "officer": ("riskofficer@demo.com", "Officer@123"),
    "owner": ("riskowner@demo.com", "Owner@123"),
    "approver": ("approver@demo.com", "Approver@123"),
    "viewer": ("auditor@demo.com", "Viewer@123"),
}

# --- helpers ---
def login(role):
    email, pw = CREDS[role]
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, f"login {role} failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and "user" in data
    return data["access_token"], data["user"]

def hdr(tok):
    return {"Authorization": f"Bearer {tok}"}

@pytest.fixture(scope="module")
def tokens():
    return {role: login(role) for role in CREDS}

# --- auth ---
class TestAuth:
    def test_all_users_login(self, tokens):
        assert len(tokens) == 5
        roles = {tokens[r][1]["role"] for r in tokens}
        assert {"admin", "risk_officer", "risk_owner", "approver", "viewer"} == roles

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@demo.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, tokens):
        tok = tokens["admin"][0]
        r = requests.get(f"{API}/auth/me", headers=hdr(tok))
        assert r.status_code == 200
        assert r.json()["email"] == "admin@demo.com"
        assert "password_hash" not in r.json()

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

# --- admin/seed data ---
class TestSeedData:
    def test_users_seeded(self, tokens):
        r = requests.get(f"{API}/users", headers=hdr(tokens["admin"][0]))
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_categories_seeded(self, tokens):
        r = requests.get(f"{API}/categories", headers=hdr(tokens["admin"][0]))
        assert r.status_code == 200
        assert len(r.json()) >= 8

    def test_appetites_seeded(self, tokens):
        r = requests.get(f"{API}/appetites", headers=hdr(tokens["admin"][0]))
        assert r.status_code == 200
        assert len(r.json()) >= 8

    def test_matrix(self, tokens):
        r = requests.get(f"{API}/matrix", headers=hdr(tokens["admin"][0]))
        assert r.status_code == 200
        m = r.json()
        assert len(m.get("likelihood", [])) == 5
        assert len(m.get("impact", [])) == 5

    def test_risks_seeded(self, tokens):
        r = requests.get(f"{API}/risks", headers=hdr(tokens["admin"][0]))
        assert r.status_code == 200
        assert len(r.json()) >= 4

# --- dashboard ---
class TestDashboard:
    def test_dashboard(self, tokens):
        r = requests.get(f"{API}/dashboard", headers=hdr(tokens["admin"][0]))
        assert r.status_code == 200
        d = r.json()
        for k in ["total_risks","critical_risks","high_risks","exceeding_appetite",
                  "open_treatments","overdue_treatments","pending_approvals",
                  "by_level","by_status","by_category","top_residual"]:
            assert k in d, f"missing {k}"
        assert d["total_risks"] >= 4

# --- RBAC ---
class TestRBAC:
    def test_owner_sees_only_own_risks(self, tokens):
        otok, ouser = tokens["owner"]
        r = requests.get(f"{API}/risks", headers=hdr(otok))
        assert r.status_code == 200
        for risk in r.json():
            assert risk.get("owner_id") == ouser["id"]

    def test_viewer_cannot_create_risk(self, tokens):
        vtok = tokens["viewer"][0]
        r = requests.post(f"{API}/risks", headers=hdr(vtok), json={"title":"x","category_id":"x"})
        assert r.status_code == 403

    def test_non_admin_cannot_create_category(self, tokens):
        r = requests.post(f"{API}/categories", headers=hdr(tokens["owner"][0]),
                          json={"code":"XX","name":"X","description":"","status":"Active"})
        assert r.status_code == 403

# --- full workflow ---
class TestRiskWorkflow:
    def test_create_submit_approve_flow(self, tokens):
        otok, ouser = tokens["owner"]
        ftok = tokens["officer"][0]

        # get a category
        cats = requests.get(f"{API}/categories", headers=hdr(otok)).json()
        cid = cats[0]["id"]

        # CREATE
        payload = {
            "title": "TEST_workflow_risk",
            "description": "automated test",
            "category_id": cid,
            "business_unit": "Test",
            "inherent_likelihood": 4, "inherent_impact": 5,
            "residual_likelihood": 4, "residual_impact": 5,
            "controls": [{"control_name":"Ctl A","design_effectiveness":"Effective",
                          "operating_effectiveness":"Effective"}],
        }
        r = requests.post(f"{API}/risks", headers=hdr(otok), json=payload)
        assert r.status_code == 200, r.text
        risk = r.json()
        rid = risk["id"]
        # auto-calc checks
        assert risk["inherent_score"] == 20
        assert risk["inherent_level"] == "Critical"
        assert risk["residual_score"] == 20
        assert risk["residual_level"] == "Critical"
        assert risk["status"] == "Draft"
        assert risk["risk_id"].startswith("RSK-")
        assert risk["controls"][0]["overall_effectiveness"] == "Effective"

        # GET verify persistence
        r2 = requests.get(f"{API}/risks/{rid}", headers=hdr(otok))
        assert r2.status_code == 200
        assert r2.json()["title"] == payload["title"]

        # SUBMIT
        r = requests.post(f"{API}/risks/{rid}/submit", headers=hdr(otok))
        assert r.status_code == 200

        # approval task created
        tasks = requests.get(f"{API}/approvals", headers=hdr(ftok)).json()
        assert any(t["object_id"] == rid for t in tasks)

        # APPROVE by officer - since residual=Critical and appetite=Medium -> Treatment Required
        r = requests.post(f"{API}/risks/{rid}/approve", headers=hdr(ftok), json={"notes":"ok"})
        assert r.status_code == 200
        assert r.json()["status"] in ("Treatment Required", "Approved")

        # verify risk status updated
        r3 = requests.get(f"{API}/risks/{rid}", headers=hdr(ftok)).json()
        assert r3["status"] == r.json()["status"]
        assert len(r3.get("approval_history", [])) >= 1

        # Create treatment
        tr = requests.post(f"{API}/treatments", headers=hdr(otok),
                           json={"risk_id": rid, "action_description":"mitigate","priority":"High"})
        assert tr.status_code == 200
        tid = tr.json()["id"]

        # submit + approve treatment
        assert requests.post(f"{API}/treatments/{tid}/submit", headers=hdr(otok)).status_code == 200
        assert requests.post(f"{API}/treatments/{tid}/approve", headers=hdr(ftok), json={"notes":""}).status_code == 200
        assert requests.post(f"{API}/treatments/{tid}/complete", headers=hdr(otok)).status_code == 200
        assert requests.post(f"{API}/treatments/{tid}/validate", headers=hdr(ftok), json={"notes":""}).status_code == 200

        # final risk approved
        final = requests.get(f"{API}/risks/{rid}", headers=hdr(ftok)).json()
        assert final["status"] == "Approved"

    def test_return_risk(self, tokens):
        otok = tokens["owner"][0]
        ftok = tokens["officer"][0]
        cats = requests.get(f"{API}/categories", headers=hdr(otok)).json()
        rid = requests.post(f"{API}/risks", headers=hdr(otok), json={
            "title":"TEST_return","category_id":cats[0]["id"],
            "inherent_likelihood":2,"inherent_impact":2,
            "residual_likelihood":1,"residual_impact":1,
        }).json()["id"]
        requests.post(f"{API}/risks/{rid}/submit", headers=hdr(otok))
        r = requests.post(f"{API}/risks/{rid}/return", headers=hdr(ftok), json={"notes":"revise"})
        assert r.status_code == 200
        assert requests.get(f"{API}/risks/{rid}", headers=hdr(otok)).json()["status"] == "Returned for Revision"

# --- audit & reports ---
class TestAuditAndReport:
    def test_audit_records(self, tokens):
        r = requests.get(f"{API}/audit", headers=hdr(tokens["admin"][0]))
        assert r.status_code == 200
        events = r.json()
        assert len(events) > 0
        actions = {e["action"] for e in events}
        assert "User Login" in actions

    def test_csv_export(self, tokens):
        r = requests.get(f"{API}/reports/risk-register.csv", headers=hdr(tokens["admin"][0]))
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        text = r.text
        assert "Risk ID" in text and "Residual Level" in text
        assert len(text.splitlines()) >= 2
