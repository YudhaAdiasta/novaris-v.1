# NOVARIS Auth Testing

## Demo Users (seeded automatically)
- admin@demo.com / Admin@123 (admin)
- riskofficer@demo.com / Officer@123 (risk_officer)
- riskowner@demo.com / Owner@123 (risk_owner)
- approver@demo.com / Approver@123 (approver)
- auditor@demo.com / Viewer@123 (viewer)

## Endpoints
POST /api/auth/login  body: {email, password}   -> sets httpOnly cookie + returns {user, access_token}
GET  /api/auth/me     header: Authorization: Bearer <token>  OR  cookie access_token
POST /api/auth/logout

## Sample
curl -X POST $REACT_APP_BACKEND_URL/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin@123"}'
