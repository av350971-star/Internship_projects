# Enterprise API Architecture & Gateway Specifications

## 1. System Overview
The backend architecture is built using asynchronous microservices communicating via HTTP/REST and gRPC. All external requests pass through the centralized API Gateway.

## 2. Authentication & Security
- All authenticated endpoints require an `Authorization: Bearer <token>` HTTP header.
- Access tokens are signed JWTs with an expiration window of exactly 60 minutes.
- Refresh tokens are stored in secure HTTP-only cookies with a 30-day lifespan.

## 3. Rate Limiting Rules
- Standard API endpoints enforce a rate limit of 100 requests per minute per IP address.
- Sensitive endpoints (like `/api/v1/auth/login`) are restricted to 5 attempts per minute to prevent brute-force attacks.
- When a client exceeds the limit, the gateway responds with HTTP 429 Too Many Requests.

## 4. Gateway Error Codes & Diagnostics
- `ERR-502-GATEWAY`: Triggered when an upstream microservice fails to respond within the gateway timeout threshold of 5000 milliseconds.
- `ERR-401-AUTH`: Raised when the JWT signature is invalid, missing, or has expired past the 60-minute window.
- `ERR-403-FORBIDDEN`: Raised when the user's role lacks sufficient privileges for the target tenant or route.

## 5. Caching Layer & Redis Cluster
- Caching is managed using a Redis cluster running on port 6379 with standard LRU (Least Recently Used) eviction policy.
- Standard GET queries have a default Cache-Control TTL of 300 seconds.
- Cache invalidation occurs automatically when mutation endpoints (POST/PUT/DELETE) publish an event to the Redis Pub/Sub bus.
