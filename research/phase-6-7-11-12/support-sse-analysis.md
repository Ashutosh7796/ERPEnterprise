# Phase 6, 7, 11 & 12 Research — SSE Notification Architecture

## 1. Architecture Overview

Real-time coordination between customer tenant administrators and platform support specialists is delivered via **Server-Sent Events (SSE)**. SSE provides lightweight, unidirectional HTTP streaming from server to client with native browser reconnection, minimal server overhead compared to full duplex WebSockets, and seamless integration through enterprise HTTP proxies.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │              SupportNotificationService                 │
                  └───────────────────────────┬─────────────────────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
        tenantEmitters Partition                           specialistEmitters Partition
 ConcurrentHashMap<Long, CopyOnWriteList>            ConcurrentHashMap<Long, CopyOnWriteList>
   ┌───────────────────────────────────┐               ┌───────────────────────────────────┐
   │ Tenant 149 -> [Emitter1, Emitter2]│               │ Specialist 10 -> [EmitterA]       │
   │ Tenant 150 -> [Emitter3]          │               │ Specialist 12 -> [EmitterB]       │
   └─────────────────┬─────────────────┘               └─────────────────┬─────────────────┘
                     │                                                   │
                     ▼ (HTTP SSE Stream)                                 ▼ (HTTP SSE Stream)
           Customer Tenant Admins                                Support Specialists
          (/support/sse/tenant-stream)                       (/support/sse/specialist-stream)
```

---

## 2. SSE Endpoints & Security Specifications

### 1. Customer Tenant Stream: `GET /support/sse/tenant-stream`
- **Authentication**: Requires valid JWT token in `X-Access-Token` header or `?token=...` query parameter.
- **Tenant Scope Resolution**: `tenantId` is extracted **exclusively** from server-verified session state in Redis / `SecurityContext` (`Tools.getTenantIdByToken(token)`).
- **Client Parameter Forgery Prevention**: The client **cannot** specify or pass a `tenantId` query parameter to listen to other tenants. The server strictly binds the connection to the authenticated session's tenant ID.

### 2. Support Specialist Stream: `GET /support/sse/specialist-stream`
- **Authentication**: Requires authenticated user with `SYSTEM_SUPPORT` or `Super Admin` role (`roleId = 101` or `roleId = 4`).
- **User Scope Resolution**: Bound strictly to the operator's authenticated `userId`.

---

## 3. Strict Multi-Tenant Isolation & Zero Leakage

To prevent event leakage across customer boundaries:
1. **Isolated Data Partitions**: Emitters are stored in separate `CopyOnWriteArrayList` collections partitioned strictly by `tenantId`.
2. **Targeted Delivery**:
   ```java
   public void notifyTenant(Long targetTenantId, String eventName, Map<String, Object> data) {
       CopyOnWriteArrayList<SseEmitter> list = tenantEmitters.get(targetTenantId);
       if (list != null) {
           for (SseEmitter emitter : list) {
               emitter.send(SseEmitter.event().name(eventName).data(jsonPayload));
           }
       }
   }
   ```
   If Tenant 149 has an event, **only** emitters in `tenantEmitters.get(149L)` receive the payload. Emitters belonging to Tenant 150 or any other tenant are never iterated or touched.

---

## 4. Connection Lifecycle, Heartbeat & Dead Emitter Eviction

| Lifecycle Phase | Technical Mechanism | Operational Guarantee |
|---|---|---|
| **Handshake** | Sends initial `CONNECTED` event with stream type and session metadata. | Confirms live stream connection to frontend client. |
| **Heartbeat Keepalive** | Scheduled job runs every 25 seconds broadcasting `HEARTBEAT` or SSE comment (`:ping\n\n`). | Prevents intermediate reverse proxies (Nginx, Cloudflare, AWS ALB) from timing out idle connections (default 60s timeout). |
| **Dead Emitter Eviction** | Handlers registered on `onCompletion`, `onTimeout`, `onError`. | If client tab closes or network drops, IOException triggers immediate removal from concurrent map, preventing memory leaks. |
| **Client Reconnection** | Browser native `EventSource` automatically reconnects with exponential backoff if disconnected. | Zero state loss; frontend re-establishes stream and requests active notification catch-up. |

---

## 5. Event Catalog & Payload Signatures

| Event Name | Stream Channel | Trigger / Event Source | Payload Contents |
|---|---|---|---|
| **`CONNECTED`** | Tenant / Specialist | Initial SSE stream handshake | `{ "status": "CONNECTED", "stream": "TENANT", "tenantId": 149 }` |
| **`SUPPORT_REQUEST_RECEIVED`** | Tenant Stream | Support Specialist submits request | `{ "sessionId": 501, "specialistName": "Sarah Jenkins", "justification": "GST invoice filing diagnostic", "moduleScope": "TAX_GST", "durationMinutes": 45 }` |
| **`SUPPORT_SESSION_APPROVED`** | Specialist Stream | Customer Tenant Admin clicks Approve | `{ "sessionId": 501, "targetTenantId": 149, "accessMode": "READ_ONLY", "expiresAt": 1724160000000, "supportToken": "SUPPORT_abc..._149" }` |
| **`SUPPORT_SESSION_REJECTED`** | Specialist Stream | Customer Tenant Admin clicks Reject | `{ "sessionId": 501, "reason": "Not authorized by IT director" }` |
| **`SUPPORT_SESSION_REVOKED`** | Specialist Stream | Customer clicks Revoke during active session | `{ "sessionId": 501, "reason": "Diagnostic completed early by customer" }` |
| **`SUPPORT_SESSION_EXPIRED`** | Tenant & Specialist | Timer / TTL passes session expiration | `{ "sessionId": 501, "message": "Session duration completed" }` |
| **`TENANT_EXPIRY_WARNING`** | Tenant Stream | Subscription enters grace period | `{ "tenantId": 149, "daysRemaining": 3, "message": "Subscription grace period ends in 3 days" }` |
