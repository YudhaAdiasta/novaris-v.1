from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os, uuid, logging, csv, io
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
import bcrypt
import jwt

# --- Config ---
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="NOVARIS API")
api = APIRouter(prefix="/api")

# --- Helpers ---
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    return jwt.encode({"sub": user_id, "email": email, "role": role,
                       "exp": datetime.now(timezone.utc) + timedelta(hours=12),
                       "type": "access"}, JWT_SECRET, algorithm=JWT_ALGO)

# --- Risk logic ---
def calc_score(l: int, i: int) -> int:
    return int(l) * int(i)

def calc_level(score: int) -> str:
    if score <= 4: return "Low"
    if score <= 9: return "Medium"
    if score <= 15: return "High"
    return "Critical"

APPETITE_RANK = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}

def calc_appetite_status(residual_level: str, appetite_level: str) -> str:
    if not appetite_level: return "Within Appetite"
    return "Exceeds Appetite" if APPETITE_RANK.get(residual_level, 0) > APPETITE_RANK.get(appetite_level, 0) else "Within Appetite"

def control_overall(design: str, operating: str) -> str:
    if not design or not operating or design == "Not Tested" or operating == "Not Tested":
        return "Not Tested"
    if design == "Ineffective" or operating == "Ineffective":
        return "Ineffective"
    if design == "Partially Effective" or operating == "Partially Effective":
        return "Partially Effective"
    return "Effective"

# --- Auth ---
async def get_current_user(request: Request) -> Dict[str, Any]:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"password_hash": 0, "_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def require_roles(*roles):
    async def dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Forbidden")
        return user
    return dep

# --- Audit ---
async def audit(user, action: str, object_type: str, object_id: str = "", old=None, new=None, remarks: str = ""):
    await db.audit_trail.insert_one({
        "id": new_id(),
        "timestamp": now_iso(),
        "user_id": user.get("id"),
        "user_name": user.get("name"),
        "user_role": user.get("role"),
        "action": action,
        "object_type": object_type,
        "object_id": object_id,
        "old_value": old,
        "new_value": new,
        "remarks": remarks,
    })

# --- Models ---
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class CategoryIn(BaseModel):
    code: str
    name: str
    description: str = ""
    status: str = "Active"

class AppetiteIn(BaseModel):
    category_id: str
    appetite_level: str
    description: str = ""
    status: str = "Active"

class MatrixIn(BaseModel):
    likelihood: List[Dict[str, Any]]
    impact: List[Dict[str, Any]]
    levels: List[Dict[str, Any]]

class ControlIn(BaseModel):
    control_name: str
    description: str = ""
    control_type: str = "Preventive"
    control_owner: str = ""
    frequency: str = "Monthly"
    design_effectiveness: str = "Not Tested"
    operating_effectiveness: str = "Not Tested"
    evidence_notes: str = ""

class RiskIn(BaseModel):
    title: str
    description: str = ""
    category_id: str
    business_unit: str = ""
    process: str = ""
    cause: str = ""
    potential_impact: str = ""
    source: str = "Workshop"
    owner_id: str = ""
    inherent_likelihood: int = 1
    inherent_impact: int = 1
    residual_likelihood: int = 1
    residual_impact: int = 1
    inherent_justification: str = ""
    last_review_date: str = ""
    next_review_date: str = ""
    review_frequency: str = "Annually"
    remarks: str = ""
    controls: List[ControlIn] = []

class TreatmentIn(BaseModel):
    risk_id: str
    treatment_option: str = "Reduce / Mitigate"
    action_description: str = ""
    action_owner: str = ""
    priority: str = "Medium"
    target_completion_date: str = ""
    target_residual_risk_level: str = "Low"
    progress_percentage: int = 0
    evidence_notes: str = ""
    completion_remarks: str = ""

class ApprovalAction(BaseModel):
    notes: str = ""

# --- Auth routes ---
@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    await audit(user, "User Login", "User", user["id"])
    user.pop("password_hash", None); user.pop("_id", None)
    return {"user": user, "access_token": token}

@api.post("/auth/logout")
async def logout(response: Response, user=Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

# --- Users ---
@api.get("/users")
async def list_users(user=Depends(get_current_user)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)

# --- Categories ---
@api.get("/categories")
async def list_categories(user=Depends(get_current_user)):
    return await db.risk_categories.find({}, {"_id": 0}).to_list(500)

@api.post("/categories")
async def create_category(body: CategoryIn, user=Depends(require_roles("admin"))):
    doc = body.model_dump(); doc["id"] = new_id(); doc["created_at"] = now_iso()
    await db.risk_categories.insert_one(doc)
    await audit(user, "Configuration Changed", "RiskCategory", doc["id"], None, doc)
    doc.pop("_id", None)
    return doc

@api.put("/categories/{cid}")
async def update_category(cid: str, body: CategoryIn, user=Depends(require_roles("admin"))):
    old = await db.risk_categories.find_one({"id": cid}, {"_id": 0})
    if not old: raise HTTPException(404, "Not found")
    await db.risk_categories.update_one({"id": cid}, {"$set": body.model_dump()})
    new_doc = await db.risk_categories.find_one({"id": cid}, {"_id": 0})
    await audit(user, "Configuration Changed", "RiskCategory", cid, old, new_doc)
    return new_doc

# --- Appetites ---
@api.get("/appetites")
async def list_appetites(user=Depends(get_current_user)):
    return await db.risk_appetites.find({}, {"_id": 0}).to_list(500)

@api.post("/appetites")
async def create_appetite(body: AppetiteIn, user=Depends(require_roles("admin"))):
    doc = body.model_dump(); doc["id"] = new_id(); doc["created_at"] = now_iso()
    await db.risk_appetites.insert_one(doc)
    await audit(user, "Configuration Changed", "RiskAppetite", doc["id"], None, doc)
    doc.pop("_id", None)
    return doc

@api.put("/appetites/{aid}")
async def update_appetite(aid: str, body: AppetiteIn, user=Depends(require_roles("admin"))):
    old = await db.risk_appetites.find_one({"id": aid}, {"_id": 0})
    if not old: raise HTTPException(404, "Not found")
    await db.risk_appetites.update_one({"id": aid}, {"$set": body.model_dump()})
    new_doc = await db.risk_appetites.find_one({"id": aid}, {"_id": 0})
    await audit(user, "Configuration Changed", "RiskAppetite", aid, old, new_doc)
    return new_doc

# --- Matrix ---
@api.get("/matrix")
async def get_matrix(user=Depends(get_current_user)):
    doc = await db.risk_matrix.find_one({"id": "default"}, {"_id": 0})
    return doc or {}

@api.put("/matrix")
async def update_matrix(body: MatrixIn, user=Depends(require_roles("admin"))):
    old = await db.risk_matrix.find_one({"id": "default"}, {"_id": 0})
    payload = body.model_dump(); payload["id"] = "default"; payload["updated_at"] = now_iso()
    await db.risk_matrix.update_one({"id": "default"}, {"$set": payload}, upsert=True)
    await audit(user, "Configuration Changed", "RiskMatrix", "default", old, payload)
    return payload

# --- Helpers for risks ---
async def _appetite_for_category(category_id: str) -> str:
    a = await db.risk_appetites.find_one({"category_id": category_id})
    return a["appetite_level"] if a else "Medium"

def _enrich_risk(r: Dict[str, Any]) -> Dict[str, Any]:
    r["inherent_score"] = calc_score(r["inherent_likelihood"], r["inherent_impact"])
    r["inherent_level"] = calc_level(r["inherent_score"])
    r["residual_score"] = calc_score(r["residual_likelihood"], r["residual_impact"])
    r["residual_level"] = calc_level(r["residual_score"])
    r["appetite_status"] = calc_appetite_status(r["residual_level"], r.get("appetite_level", ""))
    for c in r.get("controls", []):
        c["overall_effectiveness"] = control_overall(c.get("design_effectiveness", ""), c.get("operating_effectiveness", ""))
    return r

async def _generate_risk_code() -> str:
    n = await db.risks.count_documents({})
    return f"RSK-{1000 + n + 1}"

# --- Risks ---
@api.get("/risks")
async def list_risks(user=Depends(get_current_user)):
    risks = await db.risks.find({}, {"_id": 0}).to_list(1000)
    # Role-based filter
    if user["role"] == "risk_owner":
        risks = [r for r in risks if r.get("owner_id") == user["id"]]
    return risks

@api.get("/risks/{rid}")
async def get_risk(rid: str, user=Depends(get_current_user)):
    r = await db.risks.find_one({"id": rid}, {"_id": 0})
    if not r: raise HTTPException(404, "Not found")
    return r

@api.post("/risks")
async def create_risk(body: RiskIn, user=Depends(require_roles("admin", "risk_owner", "risk_officer"))):
    appetite_level = await _appetite_for_category(body.category_id)
    code = await _generate_risk_code()
    doc = body.model_dump()
    doc.update({
        "id": new_id(),
        "risk_id": code,
        "appetite_level": appetite_level,
        "status": "Draft",
        "owner_id": doc.get("owner_id") or user["id"],
        "created_by": user["id"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "controls": [{**(c.model_dump() if hasattr(c, "model_dump") else c), "id": new_id()} for c in body.controls],
        "approval_history": [],
    })
    doc = _enrich_risk(doc)
    await db.risks.insert_one(doc)
    await audit(user, "Risk Created", "Risk", doc["id"], None, {"title": doc["title"]})
    doc.pop("_id", None)
    return doc

@api.put("/risks/{rid}")
async def update_risk(rid: str, body: RiskIn, user=Depends(get_current_user)):
    old = await db.risks.find_one({"id": rid}, {"_id": 0})
    if not old: raise HTTPException(404, "Not found")
    if user["role"] not in ("admin",) and old.get("owner_id") != user["id"] and user["role"] != "risk_officer":
        raise HTTPException(403, "Forbidden")
    appetite_level = await _appetite_for_category(body.category_id)
    payload = body.model_dump()
    payload["appetite_level"] = appetite_level
    payload["updated_at"] = now_iso()
    payload["controls"] = [{**(c if isinstance(c, dict) else c.model_dump()), "id": new_id()} for c in body.controls]
    payload = _enrich_risk({**old, **payload})
    payload.pop("_id", None)
    await db.risks.update_one({"id": rid}, {"$set": payload})
    await audit(user, "Risk Updated", "Risk", rid, {"title": old.get("title")}, {"title": payload.get("title")})
    return payload

@api.post("/risks/{rid}/submit")
async def submit_risk(rid: str, user=Depends(get_current_user)):
    r = await db.risks.find_one({"id": rid}, {"_id": 0})
    if not r: raise HTTPException(404, "Not found")
    await db.risks.update_one({"id": rid}, {"$set": {"status": "Submitted", "updated_at": now_iso()}})
    # Create approval task
    officer = await db.users.find_one({"role": "risk_officer"})
    task = {
        "id": new_id(),
        "object_type": "Risk",
        "object_id": rid,
        "task_name": f"Review Risk: {r['title']}",
        "requested_by": user["id"],
        "assigned_to": officer["id"] if officer else None,
        "status": "Pending",
        "submitted_date": now_iso(),
        "completed_date": None,
        "approver_notes": "",
        "created_at": now_iso(),
    }
    await db.approval_tasks.insert_one(task)
    await audit(user, "Risk Submitted", "Risk", rid, {"status": r["status"]}, {"status": "Submitted"})
    return {"ok": True}

@api.post("/risks/{rid}/review")
async def start_review(rid: str, user=Depends(require_roles("risk_officer", "admin"))):
    await db.risks.update_one({"id": rid}, {"$set": {"status": "Under Review", "updated_at": now_iso()}})
    await audit(user, "Risk Under Review", "Risk", rid)
    return {"ok": True}

@api.post("/risks/{rid}/approve")
async def approve_risk(rid: str, body: ApprovalAction, user=Depends(require_roles("risk_officer", "approver", "admin"))):
    r = await db.risks.find_one({"id": rid}, {"_id": 0})
    if not r: raise HTTPException(404, "Not found")
    new_status = "Treatment Required" if r.get("appetite_status") == "Exceeds Appetite" else "Approved"
    hist = r.get("approval_history", []) + [{"action": "Approved", "by": user["name"], "role": user["role"], "notes": body.notes, "at": now_iso()}]
    await db.risks.update_one({"id": rid}, {"$set": {"status": new_status, "updated_at": now_iso(), "approval_history": hist}})
    await db.approval_tasks.update_many({"object_type": "Risk", "object_id": rid, "status": "Pending"},
                                        {"$set": {"status": "Approved", "completed_date": now_iso(), "approver_notes": body.notes}})
    await audit(user, "Risk Approved", "Risk", rid, {"status": r["status"]}, {"status": new_status}, body.notes)
    return {"ok": True, "status": new_status}

@api.post("/risks/{rid}/return")
async def return_risk(rid: str, body: ApprovalAction, user=Depends(require_roles("risk_officer", "approver", "admin"))):
    r = await db.risks.find_one({"id": rid}, {"_id": 0})
    if not r: raise HTTPException(404, "Not found")
    hist = r.get("approval_history", []) + [{"action": "Returned", "by": user["name"], "role": user["role"], "notes": body.notes, "at": now_iso()}]
    await db.risks.update_one({"id": rid}, {"$set": {"status": "Returned for Revision", "updated_at": now_iso(), "approval_history": hist}})
    await db.approval_tasks.update_many({"object_type": "Risk", "object_id": rid, "status": "Pending"},
                                        {"$set": {"status": "Returned", "completed_date": now_iso(), "approver_notes": body.notes}})
    await audit(user, "Risk Returned", "Risk", rid, None, None, body.notes)
    return {"ok": True}

@api.post("/risks/{rid}/close")
async def close_risk(rid: str, body: ApprovalAction, user=Depends(require_roles("risk_officer", "admin"))):
    await db.risks.update_one({"id": rid}, {"$set": {"status": "Closed", "updated_at": now_iso()}})
    await audit(user, "Risk Closed", "Risk", rid, None, None, body.notes)
    return {"ok": True}

# --- Treatment plans ---
@api.get("/treatments")
async def list_treatments(risk_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"risk_id": risk_id} if risk_id else {}
    items = await db.treatment_plans.find(q, {"_id": 0}).to_list(1000)
    today = datetime.now(timezone.utc).date().isoformat()
    for t in items:
        if t.get("target_completion_date") and t["target_completion_date"] < today and t["status"] not in ("Closed", "Completed"):
            t["is_overdue"] = True
        else:
            t["is_overdue"] = False
    return items

@api.post("/treatments")
async def create_treatment(body: TreatmentIn, user=Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({"id": new_id(), "status": "Draft", "created_by": user["id"],
                "created_at": now_iso(), "updated_at": now_iso()})
    await db.treatment_plans.insert_one(doc)
    await audit(user, "Treatment Plan Created", "TreatmentPlan", doc["id"], None, {"risk_id": doc["risk_id"]})
    doc.pop("_id", None)
    return doc

@api.put("/treatments/{tid}")
async def update_treatment(tid: str, body: TreatmentIn, user=Depends(get_current_user)):
    old = await db.treatment_plans.find_one({"id": tid}, {"_id": 0})
    if not old: raise HTTPException(404, "Not found")
    payload = body.model_dump(); payload["updated_at"] = now_iso()
    await db.treatment_plans.update_one({"id": tid}, {"$set": payload})
    await audit(user, "Treatment Plan Updated", "TreatmentPlan", tid, old, payload)
    return {**old, **payload}

@api.post("/treatments/{tid}/submit")
async def submit_treatment(tid: str, user=Depends(get_current_user)):
    t = await db.treatment_plans.find_one({"id": tid}, {"_id": 0})
    if not t: raise HTTPException(404, "Not found")
    await db.treatment_plans.update_one({"id": tid}, {"$set": {"status": "Submitted", "updated_at": now_iso()}})
    officer = await db.users.find_one({"role": "risk_officer"})
    await db.approval_tasks.insert_one({
        "id": new_id(), "object_type": "TreatmentPlan", "object_id": tid,
        "task_name": f"Approve Treatment Plan", "requested_by": user["id"],
        "assigned_to": officer["id"] if officer else None, "status": "Pending",
        "submitted_date": now_iso(), "completed_date": None, "approver_notes": "", "created_at": now_iso(),
    })
    await audit(user, "Treatment Plan Submitted", "TreatmentPlan", tid)
    return {"ok": True}

@api.post("/treatments/{tid}/approve")
async def approve_treatment(tid: str, body: ApprovalAction, user=Depends(require_roles("risk_officer", "approver", "admin"))):
    t = await db.treatment_plans.find_one({"id": tid}, {"_id": 0})
    if not t: raise HTTPException(404, "Not found")
    await db.treatment_plans.update_one({"id": tid}, {"$set": {"status": "In Progress", "updated_at": now_iso()}})
    await db.risks.update_one({"id": t["risk_id"]}, {"$set": {"status": "Treatment in Progress", "updated_at": now_iso()}})
    await db.approval_tasks.update_many({"object_type": "TreatmentPlan", "object_id": tid, "status": "Pending"},
                                        {"$set": {"status": "Approved", "completed_date": now_iso(), "approver_notes": body.notes}})
    await audit(user, "Treatment Plan Approved", "TreatmentPlan", tid, None, None, body.notes)
    return {"ok": True}

@api.post("/treatments/{tid}/complete")
async def complete_treatment(tid: str, user=Depends(get_current_user)):
    t = await db.treatment_plans.find_one({"id": tid}, {"_id": 0})
    if not t: raise HTTPException(404, "Not found")
    await db.treatment_plans.update_one({"id": tid}, {"$set": {"status": "Pending Validation", "progress_percentage": 100, "updated_at": now_iso()}})
    officer = await db.users.find_one({"role": "risk_officer"})
    await db.approval_tasks.insert_one({
        "id": new_id(), "object_type": "TreatmentPlan", "object_id": tid,
        "task_name": f"Validate Treatment Completion", "requested_by": user["id"],
        "assigned_to": officer["id"] if officer else None, "status": "Pending",
        "submitted_date": now_iso(), "completed_date": None, "approver_notes": "", "created_at": now_iso(),
    })
    await audit(user, "Treatment Plan Completed", "TreatmentPlan", tid)
    return {"ok": True}

@api.post("/treatments/{tid}/validate")
async def validate_treatment(tid: str, body: ApprovalAction, user=Depends(require_roles("risk_officer", "admin"))):
    t = await db.treatment_plans.find_one({"id": tid}, {"_id": 0})
    if not t: raise HTTPException(404, "Not found")
    await db.treatment_plans.update_one({"id": tid}, {"$set": {"status": "Closed", "updated_at": now_iso()}})
    await db.risks.update_one({"id": t["risk_id"]}, {"$set": {"status": "Approved", "updated_at": now_iso()}})
    await db.approval_tasks.update_many({"object_type": "TreatmentPlan", "object_id": tid, "status": "Pending"},
                                        {"$set": {"status": "Approved", "completed_date": now_iso(), "approver_notes": body.notes}})
    await audit(user, "Treatment Plan Validated", "TreatmentPlan", tid, None, None, body.notes)
    return {"ok": True}

# --- Approval tasks ---
@api.get("/approvals")
async def list_approvals(user=Depends(get_current_user)):
    q = {}
    if user["role"] == "approver":
        q = {"assigned_to": user["id"]}
    tasks = await db.approval_tasks.find(q, {"_id": 0}).sort("submitted_date", -1).to_list(500)
    return tasks

# --- Audit ---
@api.get("/audit")
async def list_audit(user=Depends(get_current_user)):
    return await db.audit_trail.find({}, {"_id": 0}).sort("timestamp", -1).to_list(2000)

# --- Dashboard ---
@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    risks = await db.risks.find({}, {"_id": 0}).to_list(2000)
    treatments = await db.treatment_plans.find({}, {"_id": 0}).to_list(2000)
    approvals = await db.approval_tasks.find({"status": "Pending"}, {"_id": 0}).to_list(2000)
    today = datetime.now(timezone.utc).date().isoformat()
    overdue = [t for t in treatments if t.get("target_completion_date") and t["target_completion_date"] < today and t["status"] not in ("Closed", "Completed")]
    by_level = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    by_status: Dict[str, int] = {}
    by_category: Dict[str, int] = {}
    cats = {c["id"]: c["name"] for c in await db.risk_categories.find({}, {"_id": 0}).to_list(500)}
    for r in risks:
        by_level[r.get("residual_level", "Low")] = by_level.get(r.get("residual_level", "Low"), 0) + 1
        by_status[r.get("status", "Draft")] = by_status.get(r.get("status", "Draft"), 0) + 1
        cname = cats.get(r.get("category_id"), "Other")
        by_category[cname] = by_category.get(cname, 0) + 1
    treatment_status: Dict[str, int] = {}
    for t in treatments:
        treatment_status[t.get("status", "Draft")] = treatment_status.get(t.get("status", "Draft"), 0) + 1
    top_residual = sorted(risks, key=lambda r: r.get("residual_score", 0), reverse=True)[:10]
    return {
        "total_risks": len(risks),
        "critical_risks": by_level.get("Critical", 0),
        "high_risks": by_level.get("High", 0),
        "exceeding_appetite": sum(1 for r in risks if r.get("appetite_status") == "Exceeds Appetite"),
        "open_treatments": sum(1 for t in treatments if t.get("status") not in ("Closed",)),
        "overdue_treatments": len(overdue),
        "pending_approvals": len(approvals),
        "by_level": by_level,
        "by_status": by_status,
        "by_category": by_category,
        "treatment_status": treatment_status,
        "inherent_vs_residual": {
            "inherent_avg": round(sum(r.get("inherent_score", 0) for r in risks) / max(len(risks), 1), 2),
            "residual_avg": round(sum(r.get("residual_score", 0) for r in risks) / max(len(risks), 1), 2),
        },
        "top_residual": top_residual,
        "overdue_list": overdue,
        "pending_tasks": approvals[:20],
    }

# --- CSV export ---
@api.get("/reports/risk-register.csv")
async def export_register(user=Depends(get_current_user)):
    risks = await db.risks.find({}, {"_id": 0}).to_list(5000)
    cats = {c["id"]: c["name"] for c in await db.risk_categories.find({}, {"_id": 0}).to_list(500)}
    users = {u["id"]: u["name"] for u in await db.users.find({}, {"_id": 0}).to_list(500)}
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Risk ID","Title","Category","Business Unit","Owner","Inherent L","Inherent I","Inherent Score","Inherent Level","Residual L","Residual I","Residual Score","Residual Level","Appetite Level","Appetite Status","Status","Last Review","Next Review"])
    for r in risks:
        w.writerow([r.get("risk_id"), r.get("title"), cats.get(r.get("category_id"), ""), r.get("business_unit"),
                    users.get(r.get("owner_id"), ""), r.get("inherent_likelihood"), r.get("inherent_impact"), r.get("inherent_score"),
                    r.get("inherent_level"), r.get("residual_likelihood"), r.get("residual_impact"), r.get("residual_score"),
                    r.get("residual_level"), r.get("appetite_level"), r.get("appetite_status"), r.get("status"),
                    r.get("last_review_date"), r.get("next_review_date")])
    await audit(user, "Report Exported", "Report", "risk-register")
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=risk_register.csv"})

# --- Seeding ---
DEFAULT_MATRIX = {
    "likelihood": [
        {"score": 1, "label": "Rare", "description": "Highly unlikely to occur"},
        {"score": 2, "label": "Unlikely", "description": "Could occur at some time"},
        {"score": 3, "label": "Possible", "description": "Might occur at some time"},
        {"score": 4, "label": "Likely", "description": "Probably will occur"},
        {"score": 5, "label": "Almost Certain", "description": "Expected to occur"},
    ],
    "impact": [
        {"score": 1, "label": "Insignificant", "description": "Minimal impact"},
        {"score": 2, "label": "Minor", "description": "Minor impact, easily managed"},
        {"score": 3, "label": "Moderate", "description": "Noticeable impact"},
        {"score": 4, "label": "Major", "description": "Significant impact"},
        {"score": 5, "label": "Severe", "description": "Catastrophic impact"},
    ],
    "levels": [
        {"min": 1, "max": 4, "label": "Low"},
        {"min": 5, "max": 9, "label": "Medium"},
        {"min": 10, "max": 15, "label": "High"},
        {"min": 16, "max": 25, "label": "Critical"},
    ],
}

DEFAULT_USERS = [
    {"email": "admin@demo.com", "password": "Admin@123", "name": "Andrea Admin", "role": "admin", "department": "Corporate"},
    {"email": "riskofficer@demo.com", "password": "Officer@123", "name": "Olivia Officer", "role": "risk_officer", "department": "Risk Management"},
    {"email": "riskowner@demo.com", "password": "Owner@123", "name": "Owen Owner", "role": "risk_owner", "department": "Operations"},
    {"email": "approver@demo.com", "password": "Approver@123", "name": "Aaron Approver", "role": "approver", "department": "Executive"},
    {"email": "auditor@demo.com", "password": "Viewer@123", "name": "Victor Viewer", "role": "viewer", "department": "Internal Audit"},
]

DEFAULT_CATEGORIES = [
    ("INV", "Investment Risk", "Risks from investment portfolio management"),
    ("LIQ", "Liquidity Risk", "Risks from cash flow and liquidity management"),
    ("OPS", "Operational Risk", "Risks from internal processes and people"),
    ("COM", "Compliance Risk", "Risks from regulatory non-compliance"),
    ("STR", "Strategic Risk", "Risks from strategic decisions"),
    ("REP", "Reputation Risk", "Risks affecting brand and reputation"),
    ("CYB", "IT / Cyber Risk", "Risks from technology and cyber threats"),
    ("ACT", "Actuarial Risk", "Risks from actuarial assumptions and modeling"),
]

DEFAULT_APPETITES = {"Investment Risk": "Medium", "Liquidity Risk": "Low", "Operational Risk": "Medium",
                     "Compliance Risk": "Low", "Strategic Risk": "Medium", "Reputation Risk": "Low",
                     "IT / Cyber Risk": "Low", "Actuarial Risk": "Medium"}

async def seed_all():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.risks.create_index("id", unique=True)
    await db.risk_categories.create_index("code", unique=True)

    # Users
    for u in DEFAULT_USERS:
        existing = await db.users.find_one({"email": u["email"]})
        doc = {"id": existing["id"] if existing else new_id(),
               "email": u["email"], "name": u["name"], "role": u["role"],
               "department": u["department"], "status": "Active",
               "password_hash": hash_password(u["password"]),
               "created_at": existing.get("created_at", now_iso()) if existing else now_iso(),
               "updated_at": now_iso()}
        await db.users.update_one({"email": u["email"]}, {"$set": doc}, upsert=True)

    # Categories
    cat_map = {}
    for code, name, desc in DEFAULT_CATEGORIES:
        existing = await db.risk_categories.find_one({"code": code})
        cid = existing["id"] if existing else new_id()
        doc = {"id": cid, "code": code, "name": name, "description": desc, "status": "Active"}
        await db.risk_categories.update_one({"code": code}, {"$set": doc}, upsert=True)
        cat_map[name] = cid

    # Appetites
    for name, level in DEFAULT_APPETITES.items():
        cid = cat_map[name]
        existing = await db.risk_appetites.find_one({"category_id": cid})
        doc = {"id": existing["id"] if existing else new_id(),
               "category_id": cid, "appetite_level": level,
               "description": f"Risk appetite for {name}", "status": "Active"}
        await db.risk_appetites.update_one({"category_id": cid}, {"$set": doc}, upsert=True)

    # Matrix
    await db.risk_matrix.update_one({"id": "default"}, {"$set": {**DEFAULT_MATRIX, "id": "default"}}, upsert=True)

    # Sample risks
    if await db.risks.count_documents({}) == 0:
        owner = await db.users.find_one({"role": "risk_owner"})
        owner_id = owner["id"] if owner else ""
        samples = [
            {"title": "Investment portfolio exceeds single issuer concentration limit",
             "category": "Investment Risk", "business_unit": "Investment",
             "il": 4, "ii": 5, "rl": 3, "ri": 5, "status": "Treatment Required",
             "description": "Concentration of investments in a single issuer exceeds the prudential limit set by regulator.",
             "cause": "Limited diversification due to market constraints",
             "potential_impact": "Regulatory sanction and concentration loss"},
            {"title": "Late submission of regulatory report",
             "category": "Compliance Risk", "business_unit": "Compliance",
             "il": 3, "ii": 4, "rl": 2, "ri": 4, "status": "Treatment Required",
             "description": "Delays in submitting required reports to OJK.",
             "cause": "Manual consolidation process and bottlenecks",
             "potential_impact": "Penalty fines and regulatory scrutiny"},
            {"title": "System downtime affects pension benefit processing",
             "category": "IT / Cyber Risk", "business_unit": "IT",
             "il": 3, "ii": 5, "rl": 2, "ri": 4, "status": "Treatment Required",
             "description": "Critical systems unavailable disrupt pension payments.",
             "cause": "Aging infrastructure and limited redundancy",
             "potential_impact": "Delayed payments to members and reputation damage"},
            {"title": "Incorrect pension benefit payment due to incomplete member data",
             "category": "Operational Risk", "business_unit": "Operations",
             "il": 3, "ii": 5, "rl": 2, "ri": 3, "status": "Approved",
             "description": "Member data inaccuracies leading to mis-payments.",
             "cause": "Legacy data migration gaps",
             "potential_impact": "Financial loss and member dissatisfaction"},
        ]
        for i, s in enumerate(samples):
            cid = cat_map[s["category"]]
            doc = {
                "id": new_id(), "risk_id": f"RSK-{1001 + i}",
                "title": s["title"], "description": s["description"],
                "category_id": cid, "business_unit": s["business_unit"],
                "process": "", "cause": s["cause"], "potential_impact": s["potential_impact"],
                "source": "Workshop", "owner_id": owner_id,
                "inherent_likelihood": s["il"], "inherent_impact": s["ii"],
                "residual_likelihood": s["rl"], "residual_impact": s["ri"],
                "inherent_justification": "Based on historical data and analysis",
                "appetite_level": DEFAULT_APPETITES[s["category"]],
                "status": s["status"], "controls": [
                    {"id": new_id(), "control_name": "Periodic review control",
                     "description": "Regular reviews by control owners",
                     "control_type": "Preventive", "control_owner": "Risk Officer",
                     "frequency": "Monthly", "design_effectiveness": "Effective",
                     "operating_effectiveness": "Partially Effective",
                     "evidence_notes": "Monthly control logs maintained"}
                ],
                "last_review_date": "2026-01-15", "next_review_date": "2026-04-15",
                "review_frequency": "Quarterly", "remarks": "",
                "approval_history": [],
                "created_by": owner_id, "created_at": now_iso(), "updated_at": now_iso(),
            }
            doc = _enrich_risk(doc)
            await db.risks.insert_one(doc)

# --- Lifecycle ---
@app.on_event("startup")
async def on_startup():
    await seed_all()

@app.on_event("shutdown")
async def on_shutdown():
    client.close()

# Mount
app.include_router(api)

# CORS - use specific origin with credentials
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
cors_origins = [frontend_url, "http://localhost:3000"]
app.add_middleware(CORSMiddleware,
                   allow_origins=cors_origins,
                   allow_credentials=True,
                   allow_methods=["*"],
                   allow_headers=["*"])

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
