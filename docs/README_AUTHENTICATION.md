# PolPaL — Authentication & Authorization Guide

## How Auth Works — Three Layers

### Layer 1: Edge Proxy (`src/proxy.ts`)

The proxy runs on every request before any route handler or page. It blocks unauthenticated access at the edge:

| Path prefix | Unauthenticated behaviour |
|---|---|
| `/admin/*`, `/manage/*`, `/user/*` | Redirect to `/authentication/login?next=<path>` |
| `/api/admin/*` | Return `401 { message: "Authentication required" }` |

The proxy only checks that a valid JWT exists in the `polpal_token` cookie — **it does not check roles**. Role enforcement happens in the API route handlers (Layer 2) and client components (Layer 3).

---

### Layer 2: API Route Handlers (server-side)

Every protected API route calls `enforceRouteAuth` at the top of the handler. This looks up the route in `src/app/api/routes.config.ts` and calls `requireAuth(roles, requiresApproval)`:

```ts
import { enforceRouteAuth } from '@/lib/server/route-auth.server';

export async function POST(request: NextRequest) {
  const auth = await enforceRouteAuth('/api/entities', 'POST');
  if (auth instanceof NextResponse) return auth; // 401 or 403

  // auth is AuthPayload — proceed with handler
}
```

`enforceRouteAuth` enforces:
- Valid JWT + live token version (revoked tokens are rejected)
- Required roles (returns `403` if the user's role is not in the allowed list)
- Admin approval (`approvedByAdmin: true`, unless `requiresApproval: false`)

All routes and their auth requirements are declared in `src/app/api/routes.config.ts`.

---

### Layer 3: Client Components (UI)

The proxy already prevents unauthenticated users from reaching protected pages, but client components must still guard against rendering sensitive content while auth state is loading. All pages use a single consistent pattern:

```tsx
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { RoleEnum } from '@/lib/shared/enums';

export default function AdminPage() {
  const { auth, loadingAuth } = useAuth();

  // CRITICAL: Always check loading first
  if (!auth || loadingAuth) {
    return <LoadingSpinner title="Loading authentication..." message="Authenticating user. Please wait a moment." />;
  }

  // Role check — adjust to the required role(s) for the page
  if (auth.role !== RoleEnum.ADMIN) {
    return <AccessDenied message="You do not have the necessary permissions to access this page." />;
  }

  return <AdminDashboard />;
}
```

For login-only pages (no specific role required), check `auth.loggedIn` instead of `auth.role`:

```tsx
if (!auth.loggedIn) {
  return <AccessDenied message="You need to be logged in to access this page." />;
}
```

`useAuth()` reads from `AuthContext` — no extra network requests. The `auth` object exposes `loggedIn`, `role`, `username`, and `userId` for use inside the page after the guard.

---

## ❌ Common Security Mistakes

```tsx
// WRONG: Sensitive data visible during loading
const { loadingAuth } = useAuth();
return (
  <div>
    {loadingAuth ? <Spinner /> : null}
    <SensitiveData /> {/* ← Visible during loading! */}
  </div>
);

// WRONG: Missing loading check
const { auth } = useAuth();
return auth.role === RoleEnum.ADMIN ? <SensitiveData /> : null;
// ↑ No loadingAuth check — data flashes on screen before auth settles

// CORRECT
const { auth, loadingAuth } = useAuth();
if (!auth || loadingAuth) return <LoadingSpinner title="Loading authentication..." />;
if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="..." />;
return <SensitiveData />;
```
