import { ShieldOff } from "lucide-react";

export default function SuspendedPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Ambient blob */}
      <div
        className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-[0.10] pointer-events-none"
        style={{ background: "hsl(var(--destructive))" }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-[0.08] pointer-events-none"
        style={{ background: "hsl(var(--destructive))" }}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl px-8 py-10 text-center space-y-5 animate-in fade-in duration-300"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 20px 40px -12px hsl(var(--destructive) / 0.12), 0 0 0 1px hsl(var(--border) / 0.5)",
        }}
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
            style={{
              background: "hsl(var(--destructive) / 0.10)",
              border: "1.5px solid hsl(var(--destructive) / 0.25)",
            }}
          >
            <ShieldOff
              className="w-8 h-8"
              style={{ color: "hsl(var(--destructive))" }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <p
            className="text-xs font-bold tracking-[0.2em] uppercase"
            style={{ color: "hsl(var(--destructive))" }}
          >
            Access Suspended
          </p>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight"
            style={{ color: "hsl(var(--foreground))" }}
          >
            School Access Suspended
          </h1>
        </div>

        {/* Body */}
        <p
          className="text-sm sm:text-base leading-relaxed"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          This school's DigiLib has been temporarily suspended. Please contact the{" "}
          <span className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            KV DLMS Network Administrator
          </span>
          .
        </p>

        {/* Divider */}
        <div style={{ borderTop: "1px solid hsl(var(--border))" }} />

        {/* Footer note */}
        <p
          className="text-xs"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          If you believe this is an error, reach out to your school's librarian.
        </p>
      </div>

      {/* Bottom brand strip */}
      <div className="relative z-10 mt-6 flex items-center gap-2 opacity-35">
        <span
          className="text-[10px] sm:text-xs font-medium"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          KV Digital Library Management System · DLMS Network
        </span>
      </div>
    </main>
  );
}
