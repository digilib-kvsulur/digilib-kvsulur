import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

export default function PlatformPause() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-8 bg-background px-5 py-12 text-center">
      <h1 className="text-balance text-3xl font-black tracking-tight text-foreground sm:text-5xl">
        DLMS 2.0 is coming soon
      </h1>
      <Link
        to="/admin-dashboard"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Lock className="h-4 w-4" aria-hidden="true" />
        Administrator Access
      </Link>
    </main>
  );
}
