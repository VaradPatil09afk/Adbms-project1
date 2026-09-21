import base64, hashlib, hmac, json, os, time
from fastapi import HTTPException, Request

SECRET = os.getenv('JWT_SECRET', 'unisphere-development-secret').encode()
def issue(payload: dict) -> str:
    payload = {**payload, 'exp': int(time.time()) + 60 * 60 * 8}
    raw = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    signature = hmac.new(SECRET, raw.encode(), hashlib.sha256).hexdigest()
    return raw + '.' + signature
def verify(token: str) -> dict:
    try:
        raw, signature = token.split('.')
        if not hmac.compare_digest(hmac.new(SECRET, raw.encode(), hashlib.sha256).hexdigest(), signature): raise ValueError()
        data = json.loads(base64.urlsafe_b64decode(raw + '=' * (-len(raw) % 4)))
        if data['exp'] < time.time(): raise ValueError()
        return data
    except Exception:
        raise HTTPException(401, 'Invalid or expired session')
def current_user(request: Request):
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '): raise HTTPException(401, 'Authentication required')
    return verify(header[7:])
def permit(*roles):
    def dependency(request: Request):
        user = current_user(request)
        if roles and user['role'] not in roles: raise HTTPException(403, 'Insufficient permission')
        return user
    return dependency
