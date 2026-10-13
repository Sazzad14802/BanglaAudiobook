"""Bounded per-process abuse protection; deploy a shared edge limit for multiple replicas."""
from collections import OrderedDict, deque
import time
from starlette.responses import JSONResponse

def install_rate_limits(app):
    buckets = OrderedDict()
    @app.middleware("http")
    async def throttle(request, call_next):
        auth = request.url.path.startswith("/api/v1/auth/") and request.method == "POST"
        key = (request.client.host if request.client else "unknown", "auth" if auth else "api")
        now = time.monotonic()
        bucket = buckets.setdefault(key, deque())
        buckets.move_to_end(key)
        while bucket and bucket[0] < now - 60:
            bucket.popleft()
        if len(bucket) >= (20 if auth else 300):
            return JSONResponse({"detail":"Too many requests; retry shortly"}, status_code=429, headers={"Retry-After":"60"})
        bucket.append(now)
        while len(buckets) > 10000:
            buckets.popitem(last=False)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response
