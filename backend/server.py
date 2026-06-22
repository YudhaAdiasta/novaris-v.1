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

# --- PHASE 2: KRI, Incidents, Calendar, Escalation, Notifications ---

class KriIn(BaseModel):
    name: str
    risk_id: Optional[str] = None
    category_id: Optional[str] = None
    unit: str = ""
    frequency: str = "Monthly"
    threshold_green: float = 0
    threshold_amber: float = 0
    threshold_red: float = 0
    current_value: float = 0
    direction: str = "higher_is_worse"
    owner_id: str = ""
    description: str = ""

def kri_status(k):
    v = float(k.get("current_value", 0))
    a, r = float(k.get("threshold_amber", 0)), float(k.get("threshold_red", 0))
    if k.get("direction") == "lower_is_worse":
        if v <= r: return "Red"
        if v <= a: return "Amber"
        return "Green"
    if v >= r: return "Red"
    if v >= a: return "Amber"
    return "Green"

async def _notify_role(role, message, object_type, object_id):
    users_ = await db.users.find({"role": role}, {"_id": 0}).to_list(50)
    for u in users_:
        await db.notifications.insert_one({"id": new_id(), "user_id": u["id"], "message": message,
            "object_type": object_type, "object_id": object_id, "read": False, "created_at": now_iso()})

@api.get("/kris")
async def list_kris(user=Depends(get_current_user)):
    items = await db.kris.find({}, {"_id": 0}).to_list(500)
    for k in items: k["status"] = kri_status(k)
    return items

@api.post("/kris")
async def create_kri(body: KriIn, user=Depends(require_roles("admin","risk_officer","risk_owner"))):
    doc = body.model_dump(); doc.update({"id": new_id(), "history": [], "created_at": now_iso(), "updated_at": now_iso()})
    doc["status"] = kri_status(doc)
    await db.kris.insert_one(doc)
    await audit(user, "KRI Created", "KRI", doc["id"], None, {"name": doc["name"]})
    doc.pop("_id", None); return doc

@api.put("/kris/{kid}")
async def update_kri(kid: str, body: KriIn, user=Depends(require_roles("admin","risk_officer","risk_owner"))):
    old = await db.kris.find_one({"id": kid}, {"_id": 0})
    if not old: raise HTTPException(404, "Not found")
    payload = body.model_dump(); payload["updated_at"] = now_iso()
    payload["status"] = kri_status({**old, **payload})
    hist = old.get("history", [])
    if float(old.get("current_value", 0)) != float(payload.get("current_value", 0)):
        hist.append({"value": payload["current_value"], "status": payload["status"], "at": now_iso(), "by": user["name"]})
        payload["history"] = hist[-50:]
    await db.kris.update_one({"id": kid}, {"$set": payload})
    await audit(user, "KRI Updated", "KRI", kid, {"v": old.get("current_value")}, {"v": payload.get("current_value")})
    if payload["status"] in ("Amber", "Red"):
        await _notify_role("risk_officer", f"KRI '{old['name']}' breached: {payload['status']}", "KRI", kid)
    return {**old, **payload}

@api.delete("/kris/{kid}")
async def delete_kri(kid: str, user=Depends(require_roles("admin"))):
    await db.kris.delete_one({"id": kid}); await audit(user, "KRI Deleted", "KRI", kid); return {"ok": True}

class IncidentIn(BaseModel):
    title: str
    description: str = ""
    category_id: Optional[str] = None
    related_risk_id: Optional[str] = None
    business_unit: str = ""
    occurrence_date: str = ""
    severity: str = "Medium"
    status: str = "Reported"
    financial_loss: float = 0
    root_cause: str = ""
    corrective_actions: str = ""

@api.get("/incidents")
async def list_incidents(user=Depends(get_current_user)):
    return await db.incidents.find({}, {"_id": 0}).sort("occurrence_date", -1).to_list(1000)

@api.post("/incidents")
async def create_incident(body: IncidentIn, user=Depends(require_roles("admin","risk_officer","risk_owner"))):
    n = await db.incidents.count_documents({})
    doc = body.model_dump()
    doc.update({"id": new_id(), "incident_code": f"INC-{2000+n+1}", "reported_by": user["id"],
                "reported_by_name": user["name"], "reported_at": now_iso(),
                "created_at": now_iso(), "updated_at": now_iso()})
    await db.incidents.insert_one(doc)
    await audit(user, "Incident Created", "Incident", doc["id"], None, {"title": doc["title"]})
    if doc["severity"] in ("High", "Critical"):
        await _notify_role("risk_officer", f"{doc['severity']} incident: {doc['title']}", "Incident", doc["id"])
    doc.pop("_id", None); return doc

@api.put("/incidents/{iid}")
async def update_incident(iid: str, body: IncidentIn, user=Depends(require_roles("admin","risk_officer","risk_owner"))):
    old = await db.incidents.find_one({"id": iid}, {"_id": 0})
    if not old: raise HTTPException(404, "Not found")
    payload = body.model_dump(); payload["updated_at"] = now_iso()
    await db.incidents.update_one({"id": iid}, {"$set": payload})
    await audit(user, "Incident Updated", "Incident", iid, {"status": old.get("status")}, {"status": payload.get("status")})
    return {**old, **payload}

@api.get("/calendar")
async def calendar_events(start: Optional[str] = None, end: Optional[str] = None, user=Depends(get_current_user)):
    events = []
    risks = await db.risks.find({}, {"_id": 0}).to_list(2000)
    for r in risks:
        if r.get("next_review_date"):
            events.append({"id": f"rev-{r['id']}", "type": "Risk Review", "title": r["title"],
                           "date": r["next_review_date"], "ref_id": r["id"], "ref_code": r.get("risk_id"),
                           "level": r.get("residual_level"), "status": r.get("status")})
    treatments = await db.treatment_plans.find({}, {"_id": 0}).to_list(2000)
    for t in treatments:
        if t.get("target_completion_date") and t.get("status") not in ("Closed",):
            events.append({"id": f"trt-{t['id']}", "type": "Treatment Due",
                           "title": t.get("action_description") or "Treatment Action",
                           "date": t["target_completion_date"], "ref_id": t["risk_id"], "status": t.get("status")})
    if start: events = [e for e in events if e["date"] >= start]
    if end: events = [e for e in events if e["date"] <= end]
    events.sort(key=lambda e: e["date"])
    return events

class EscalationIn(BaseModel):
    risk_level: str
    notify_role: str
    days_to_escalate: int = 7
    description: str = ""

@api.get("/escalations")
async def list_escalations(user=Depends(get_current_user)):
    return await db.escalations.find({}, {"_id": 0}).to_list(100)

@api.post("/escalations")
async def create_escalation(body: EscalationIn, user=Depends(require_roles("admin"))):
    doc = body.model_dump(); doc.update({"id": new_id(), "created_at": now_iso()})
    await db.escalations.insert_one(doc)
    await audit(user, "Configuration Changed", "Escalation", doc["id"], None, doc)
    doc.pop("_id", None); return doc

@api.delete("/escalations/{eid}")
async def delete_escalation(eid: str, user=Depends(require_roles("admin"))):
    await db.escalations.delete_one({"id": eid}); return {"ok": True}

@api.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}}); return {"ok": True}

@api.post("/notifications/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}}); return {"ok": True}

@api.get("/dashboard/advanced")
async def dashboard_advanced(user=Depends(get_current_user)):
    today_d = datetime.now(timezone.utc).date(); today_s = today_d.isoformat()
    in7 = (today_d + timedelta(days=7)).isoformat()
    in30 = (today_d + timedelta(days=30)).isoformat()
    risks = await db.risks.find({}, {"_id": 0}).to_list(2000)
    kris = await db.kris.find({}, {"_id": 0}).to_list(500)
    for k in kris: k["status"] = kri_status(k)
    incidents = await db.incidents.find({}, {"_id": 0}).to_list(1000)
    upcoming = [r for r in risks if r.get("next_review_date") and today_s <= r["next_review_date"] <= in30]
    overdue_rev = [r for r in risks if r.get("next_review_date") and r["next_review_date"] < today_s and r.get("status") not in ("Closed",)]
    sev: Dict[str, int] = {}
    for i in incidents: sev[i.get("severity", "Medium")] = sev.get(i.get("severity", "Medium"), 0) + 1
    return {
        "kri_total": len(kris),
        "kri_red": sum(1 for k in kris if k["status"] == "Red"),
        "kri_amber": sum(1 for k in kris if k["status"] == "Amber"),
        "kri_green": sum(1 for k in kris if k["status"] == "Green"),
        "incidents_total": len(incidents),
        "incidents_open": sum(1 for i in incidents if i.get("status") not in ("Closed","Resolved")),
        "incidents_loss_total": sum(float(i.get("financial_loss") or 0) for i in incidents),
        "incidents_severity": sev,
        "upcoming_reviews_7d": sum(1 for r in upcoming if r["next_review_date"] <= in7),
        "upcoming_reviews_30d": len(upcoming),
        "overdue_reviews": len(overdue_rev),
        "top_kris": sorted(kris, key=lambda k: {"Red":0,"Amber":1,"Green":2}.get(k["status"], 3))[:10],
        "recent_incidents": incidents[:10],
    }

# --- PHASE 3 ---
class CommitteeIn(BaseModel):
    name: str; type: str = "Risk Committee"; description: str = ""
    chairperson: str = ""; secretary: str = ""; members: List[str] = []
    meeting_frequency: str = "Monthly"; status: str = "Active"

class MeetingIn(BaseModel):
    committee_id: str; title: str; meeting_date: str
    start_time: str = ""; end_time: str = ""; location: str = ""
    agenda: List[Dict[str, Any]] = []; attendees: List[str] = []; absentees: List[str] = []
    status: str = "Scheduled"; minutes: str = ""
    decisions: List[Dict[str, Any]] = []; follow_ups: List[Dict[str, Any]] = []

class ObligationIn(BaseModel):
    title: str; description: str = ""; obligation_type: str = "Regulatory"
    regulator: str = ""; regulation_ref: str = ""; category_id: Optional[str] = None
    related_risk_id: Optional[str] = None; owner_id: str = ""
    frequency: str = "Quarterly"; due_date: str = ""; reminder_days: int = 14
    status: str = "Not Started"; submission_date: str = ""
    evidence_notes: str = ""; remarks: str = ""

class ControlTestIn(BaseModel):
    risk_id: str; control_id: str = ""; test_period: str = ""
    test_type: str = "Combined Test"; test_procedure: str = ""
    tester: str = ""; sample_size: int = 0; sample_description: str = ""
    test_result: str = "Not Tested"; findings: str = ""; evidence_notes: str = ""
    deficiency: bool = False; remediation_required: bool = False
    remediation_action: str = ""; remediation_owner: str = ""; remediation_due_date: str = ""
    status: str = "Draft"

class AcceptanceIn(BaseModel):
    request_type: str = "Risk Acceptance"; related_risk_id: Optional[str] = None
    related_object_type: str = "Risk"; related_object_id: str = ""
    title: str; justification: str = ""; residual_risk_level: str = "Medium"
    appetite_level: str = "Medium"; reason: str = ""; compensating_controls: str = ""
    effective_date: str = ""; expiry_date: str = ""
    status: str = "Draft"; approval_notes: str = ""; closure_remarks: str = ""

def _crud(coll, audit_label):
    async def _list(user=Depends(get_current_user)): return await coll.find({}, {"_id": 0}).to_list(2000)
    return _list

@api.get("/committees")
async def list_committees(user=Depends(get_current_user)):
    return await db.committees.find({}, {"_id": 0}).to_list(200)

@api.post("/committees")
async def create_committee(body: CommitteeIn, user=Depends(require_roles("admin","risk_officer"))):
    doc = body.model_dump(); doc.update({"id": new_id(), "created_at": now_iso()})
    await db.committees.insert_one(doc)
    await audit(user, "Committee Created", "Committee", doc["id"], None, {"name": doc["name"]})
    doc.pop("_id", None); return doc

@api.put("/committees/{cid}")
async def update_committee(cid: str, body: CommitteeIn, user=Depends(require_roles("admin","risk_officer"))):
    await db.committees.update_one({"id": cid}, {"$set": body.model_dump()})
    await audit(user, "Committee Updated", "Committee", cid)
    return await db.committees.find_one({"id": cid}, {"_id": 0})

@api.get("/meetings")
async def list_meetings(user=Depends(get_current_user)):
    return await db.meetings.find({}, {"_id": 0}).sort("meeting_date", -1).to_list(500)

@api.post("/meetings")
async def create_meeting(body: MeetingIn, user=Depends(require_roles("admin","risk_officer"))):
    n = await db.meetings.count_documents({})
    doc = body.model_dump(); doc.update({"id": new_id(), "meeting_code": f"MTG-{3000+n+1}",
        "created_by": user["id"], "created_at": now_iso(), "updated_at": now_iso()})
    await db.meetings.insert_one(doc)
    await audit(user, "Meeting Created", "Meeting", doc["id"], None, {"title": doc["title"]})
    doc.pop("_id", None); return doc

@api.put("/meetings/{mid}")
async def update_meeting(mid: str, body: MeetingIn, user=Depends(require_roles("admin","risk_officer"))):
    payload = body.model_dump(); payload["updated_at"] = now_iso()
    await db.meetings.update_one({"id": mid}, {"$set": payload})
    await audit(user, "Meeting Updated", "Meeting", mid, None, {"status": payload.get("status")})
    return await db.meetings.find_one({"id": mid}, {"_id": 0})

@api.get("/obligations")
async def list_obligations(user=Depends(get_current_user)):
    items = await db.obligations.find({}, {"_id": 0}).to_list(1000)
    today_s = datetime.now(timezone.utc).date().isoformat()
    for o in items:
        if o.get("due_date") and o["due_date"] < today_s and o.get("status") not in ("Submitted","Approved","Waived"):
            o["status"] = "Overdue"
    return items

@api.post("/obligations")
async def create_obligation(body: ObligationIn, user=Depends(require_roles("admin","risk_officer","risk_owner"))):
    doc = body.model_dump(); doc.update({"id": new_id(), "created_at": now_iso(), "updated_at": now_iso()})
    await db.obligations.insert_one(doc)
    await audit(user, "Obligation Created", "Obligation", doc["id"], None, {"title": doc["title"]})
    doc.pop("_id", None); return doc

@api.put("/obligations/{oid}")
async def update_obligation(oid: str, body: ObligationIn, user=Depends(require_roles("admin","risk_officer","risk_owner"))):
    old = await db.obligations.find_one({"id": oid}, {"_id": 0})
    payload = body.model_dump(); payload["updated_at"] = now_iso()
    await db.obligations.update_one({"id": oid}, {"$set": payload})
    await audit(user, "Obligation Updated", "Obligation", oid, {"status": old.get("status") if old else None}, {"status": payload.get("status")})
    return {**(old or {}), **payload}

@api.get("/control-tests")
async def list_tests(user=Depends(get_current_user)):
    return await db.control_tests.find({}, {"_id": 0}).to_list(1000)

@api.post("/control-tests")
async def create_test(body: ControlTestIn, user=Depends(require_roles("admin","risk_officer","risk_owner"))):
    doc = body.model_dump(); doc.update({"id": new_id(), "created_at": now_iso(), "updated_at": now_iso()})
    await db.control_tests.insert_one(doc)
    # If failed, mark control ineffective
    if doc.get("test_result") == "Failed" and doc.get("control_id"):
        await db.risks.update_one({"id": doc["risk_id"], "controls.id": doc["control_id"]},
            {"$set": {"controls.$.operating_effectiveness": "Ineffective", "controls.$.overall_effectiveness": "Ineffective"}})
    await audit(user, "Control Test Created", "ControlTest", doc["id"], None, {"result": doc["test_result"]})
    doc.pop("_id", None); return doc

@api.put("/control-tests/{tid}")
async def update_test(tid: str, body: ControlTestIn, user=Depends(require_roles("admin","risk_officer","risk_owner"))):
    payload = body.model_dump(); payload["updated_at"] = now_iso()
    await db.control_tests.update_one({"id": tid}, {"$set": payload})
    await audit(user, "Control Test Updated", "ControlTest", tid, None, {"result": payload.get("test_result")})
    return await db.control_tests.find_one({"id": tid}, {"_id": 0})

@api.get("/acceptances")
async def list_acceptances(risk_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"related_risk_id": risk_id} if risk_id else {}
    items = await db.acceptances.find(q, {"_id": 0}).to_list(1000)
    today_s = datetime.now(timezone.utc).date().isoformat()
    for a in items:
        if a.get("expiry_date") and a["expiry_date"] < today_s and a.get("status") == "Approved":
            a["status"] = "Expired"
    return items

@api.post("/acceptances")
async def create_acceptance(body: AcceptanceIn, user=Depends(get_current_user)):
    doc = body.model_dump(); doc.update({"id": new_id(), "requested_by": user["id"],
        "requested_by_name": user["name"], "created_at": now_iso(), "updated_at": now_iso()})
    await db.acceptances.insert_one(doc)
    await audit(user, "Risk Acceptance Created", "Acceptance", doc["id"], None, {"title": doc["title"]})
    doc.pop("_id", None); return doc

@api.post("/acceptances/{aid}/submit")
async def submit_acceptance(aid: str, user=Depends(get_current_user)):
    a = await db.acceptances.find_one({"id": aid}, {"_id": 0})
    if not a: raise HTTPException(404, "Not found")
    await db.acceptances.update_one({"id": aid}, {"$set": {"status": "Submitted", "updated_at": now_iso()}})
    target = "approver" if a.get("residual_risk_level") in ("High","Critical") else "risk_officer"
    await _notify_role(target, f"Risk acceptance pending: {a['title']}", "Acceptance", aid)
    await audit(user, "Risk Acceptance Submitted", "Acceptance", aid)
    return {"ok": True}

@api.post("/acceptances/{aid}/approve")
async def approve_acceptance(aid: str, body: ApprovalAction, user=Depends(require_roles("admin","risk_officer","approver"))):
    a = await db.acceptances.find_one({"id": aid}, {"_id": 0})
    if not a: raise HTTPException(404, "Not found")
    if a.get("residual_risk_level") in ("High","Critical") and user["role"] not in ("approver","admin"):
        raise HTTPException(403, "High/Critical acceptance requires Approver or Admin")
    await db.acceptances.update_one({"id": aid}, {"$set": {"status": "Approved", "approval_notes": body.notes, "updated_at": now_iso()}})
    await audit(user, "Risk Acceptance Approved", "Acceptance", aid, None, None, body.notes)
    return {"ok": True}

@api.post("/acceptances/{aid}/reject")
async def reject_acceptance(aid: str, body: ApprovalAction, user=Depends(require_roles("admin","risk_officer","approver"))):
    await db.acceptances.update_one({"id": aid}, {"$set": {"status": "Rejected", "approval_notes": body.notes, "updated_at": now_iso()}})
    await audit(user, "Risk Acceptance Rejected", "Acceptance", aid, None, None, body.notes)
    return {"ok": True}

@api.get("/dashboard/phase3")
async def dashboard_phase3(user=Depends(get_current_user)):
    today_s = datetime.now(timezone.utc).date().isoformat()
    in30 = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
    meetings = await db.meetings.find({}, {"_id": 0}).to_list(500)
    upcoming_meetings = [m for m in meetings if m.get("meeting_date","") >= today_s and m.get("status") not in ("Completed","Cancelled")]
    obligations = await db.obligations.find({}, {"_id": 0}).to_list(1000)
    overdue_obl = [o for o in obligations if o.get("due_date") and o["due_date"] < today_s and o.get("status") not in ("Submitted","Approved","Waived")]
    upcoming_obl = [o for o in obligations if o.get("due_date") and today_s <= o["due_date"] <= in30]
    tests = await db.control_tests.find({}, {"_id": 0}).to_list(1000)
    failed_tests = [t for t in tests if t.get("test_result") == "Failed"]
    open_deficiencies = [t for t in tests if t.get("deficiency") and t.get("status") not in ("Closed",)]
    acceptances = await db.acceptances.find({}, {"_id": 0}).to_list(1000)
    active_acc = [a for a in acceptances if a.get("status") == "Approved" and (not a.get("expiry_date") or a["expiry_date"] >= today_s)]
    expiring_acc = [a for a in active_acc if a.get("expiry_date") and a["expiry_date"] <= in30]
    return {
        "upcoming_meetings": len(upcoming_meetings),
        "overdue_obligations": len(overdue_obl),
        "upcoming_obligations": len(upcoming_obl),
        "tests_total": len(tests),
        "tests_failed": len(failed_tests),
        "open_deficiencies": len(open_deficiencies),
        "active_acceptances": len(active_acc),
        "expiring_acceptances": len(expiring_acc),
        "high_critical_accepted": sum(1 for a in active_acc if a.get("residual_risk_level") in ("High","Critical")),
    }

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

    # Phase 2 seed
    if await db.escalations.count_documents({}) == 0:
        for lvl, role, days in [("Critical","approver",1),("High","risk_officer",3),("Medium","risk_owner",7),("Low","risk_owner",14)]:
            await db.escalations.insert_one({"id": new_id(), "risk_level": lvl, "notify_role": role,
                "days_to_escalate": days, "description": f"Escalate {lvl} risks to {role} within {days} day(s)",
                "created_at": now_iso()})
    if await db.kris.count_documents({}) == 0:
        owner = await db.users.find_one({"role": "risk_owner"})
        oid = owner["id"] if owner else ""
        for k in [
            {"name":"Investment concentration ratio","unit":"%","threshold_green":15,"threshold_amber":20,"threshold_red":25,"current_value":22},
            {"name":"Regulatory report submission delay","unit":"days","threshold_green":1,"threshold_amber":3,"threshold_red":5,"current_value":2},
            {"name":"Core system availability","unit":"%","threshold_green":99.5,"threshold_amber":98,"threshold_red":95,"current_value":99.2,"direction":"lower_is_worse"},
            {"name":"Member data accuracy","unit":"%","threshold_green":99,"threshold_amber":97,"threshold_red":95,"current_value":98.5,"direction":"lower_is_worse"},
        ]:
            d = {"id": new_id(), "name": k["name"], "unit": k["unit"], "frequency":"Monthly",
                 "threshold_green": k["threshold_green"], "threshold_amber": k["threshold_amber"],
                 "threshold_red": k["threshold_red"], "current_value": k["current_value"],
                 "direction": k.get("direction","higher_is_worse"), "owner_id": oid,
                 "history": [], "description":"", "created_at": now_iso(), "updated_at": now_iso()}
            d["status"] = kri_status(d)
            await db.kris.insert_one(d)
    if await db.incidents.count_documents({}) == 0:
        owner = await db.users.find_one({"role": "risk_owner"})
        oid = owner["id"] if owner else ""
        for n, (title, sev, loss, status) in enumerate([
            ("Pension payment delay due to bank file rejection","High",125000000,"Resolved"),
            ("Phishing email targeted finance team","Medium",0,"Investigating"),
            ("Member data leak from misconfigured report export","Critical",500000000,"Reported"),
        ]):
            await db.incidents.insert_one({"id": new_id(), "incident_code": f"INC-{2001+n}",
                "title": title, "description": title, "business_unit": "Operations",
                "occurrence_date": "2026-02-01", "severity": sev, "status": status,
                "financial_loss": loss, "root_cause":"", "corrective_actions":"",
                "reported_by": oid, "reported_by_name":"Owen Owner", "reported_at": now_iso(),
                "created_at": now_iso(), "updated_at": now_iso()})

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
