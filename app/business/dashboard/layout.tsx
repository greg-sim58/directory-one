// Dashboard layout is auth-gated. Phase 8 adds the real check + redirect.
// For Phase 1 this is a passthrough so the route compiles and the
// authorized() callback in auth.ts can be tested later.

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-muted/30 min-h-full flex-1">{children}</div>;
}
