import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Play, RotateCcw, Save, Terminal, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SkillTest } from "./types";

type TestResult = { index: number; pass: boolean; actual?: unknown; expected?: unknown; error?: string };

const STORAGE_PREFIX = "dlms-skill-code:";

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function CodePlayground({
  challengeId,
  language,
  starterCode,
  tests,
  onSubmit,
  saving,
}: {
  challengeId: string;
  language: "javascript" | "html";
  starterCode: string;
  tests: SkillTest[];
  onSubmit: (code: string, passed: boolean, summary: string) => void | Promise<void>;
  saving?: boolean;
}) {
  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem(`${STORAGE_PREFIX}${challengeId}`) || starterCode;
    } catch {
      return starterCode;
    }
  });
  const [srcDoc, setSrcDoc] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const token = useMemo(() => `t_${Math.random().toString(36).slice(2)}_${Date.now()}`, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      const data = event.data;
      if (!data || data.type !== "dlms-code-result" || data.token !== token) return;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      setResults(Array.isArray(data.results) ? data.results : []);
      setLogs(Array.isArray(data.logs) ? data.logs.map(String).slice(0, 40) : []);
      setError(typeof data.error === "string" ? data.error : "");
      setRunning(false);
      setHasRun(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [token]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const persist = (value: string) => {
    setCode(value);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${challengeId}`, value);
    } catch {
      // Storage may be disabled; the editor still works for this session.
    }
  };

  const run = () => {
    setRunning(true);
    setError("");
    setResults([]);
    setLogs([]);
    setHasRun(false);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    const escapedCode = code.replace(/<\/script/gi, "<\\/script");
    const testJson = safeJson(tests);

    if (language === "html") {
      const testScript = `<script>
(function () {
  var token = ${safeJson(token)};
  var tests = ${testJson};
  var results = tests.map(function (test, index) {
    var element = document.querySelector(test.selector);
    var text = (element && element.textContent ? element.textContent : "").replace(/\\s+/g, " ").trim();
    return { index: index, pass: !!element && text.indexOf(test.text) !== -1, actual: text, expected: test.text };
  });
  parent.postMessage({ type: "dlms-code-result", token: token, results: results, logs: [] }, "*");
})();
</script>`;
      const withTests = escapedCode.includes("</body>")
        ? escapedCode.replace(/<\/body>/i, `${testScript}</body>`)
        : `${escapedCode}${testScript}`;
      const withCsp = withTests.includes("<head>")
        ? withTests.replace(/<head>/i, `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;">`)
        : withTests;
      setSrcDoc(withCsp);
    } else {
      setSrcDoc(`<!doctype html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
</head>
<body>
<script>
var __token = ${safeJson(token)};
var __tests = ${testJson};
var __logs = [];
console.log = function () {
  var parts = Array.prototype.slice.call(arguments).map(function (value) {
    try { return typeof value === "string" ? value : JSON.stringify(value); } catch (e) { return String(value); }
  });
  __logs.push(parts.join(" "));
};
function __report(payload) {
  payload.type = "dlms-code-result";
  payload.token = __token;
  payload.logs = __logs;
  parent.postMessage(payload, "*");
}
try {
${escapedCode}
  var __results = __tests.map(function (test, index) {
    try {
      var args = Array.isArray(test.input) ? test.input : [];
      var actual = solve.apply(null, args);
      return { index: index, pass: JSON.stringify(actual) === JSON.stringify(test.expected), actual: actual, expected: test.expected };
    } catch (e) {
      return { index: index, pass: false, error: String(e && e.message ? e.message : e), expected: test.expected };
    }
  });
  __report({ results: __results });
} catch (e) {
  __report({ results: [], error: String(e && e.message ? e.message : e) });
}
</script>
</body>
</html>`);
    }

    timeoutRef.current = window.setTimeout(() => {
      setRunning(false);
      setError("The code did not finish in 3 seconds. Check for an infinite loop.");
    }, 3000);
  };

  const passed = hasRun && results.length > 0 && results.every((result) => result.pass);
  const summary = results.map((result) => `Test ${result.index + 1}: ${result.pass ? "pass" : "fail"}`).join("; ");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Terminal className="h-4 w-4" />
          <span>Sandboxed {language === "html" ? "HTML" : "JavaScript"} playground</span>
          {tests.length > 0 && <Badge variant="outline" className="rounded-full">{tests.length} test{tests.length === 1 ? "" : "s"}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="min-h-10 rounded-xl" onClick={() => persist(starterCode)}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
          </Button>
          <Button type="button" size="sm" className="min-h-10 rounded-xl" onClick={run} disabled={running}>
            {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
            {running ? "Running" : "Run tests"}
          </Button>
        </div>
      </div>

      <textarea
        value={code}
        onChange={(event) => persist(event.target.value)}
        spellCheck={false}
        aria-label="Code editor"
        className="min-h-[260px] w-full resize-y rounded-xl border border-border bg-slate-950 p-4 font-mono text-[13px] leading-6 text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {language === "html" && srcDoc && (
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">Preview</div>
          <iframe ref={frameRef} title="HTML preview" sandbox="allow-scripts" srcDoc={srcDoc} className="h-64 w-full bg-white" />
        </div>
      )}
      {language !== "html" && <iframe ref={frameRef} title="JavaScript test runner" sandbox="allow-scripts" srcDoc={srcDoc} className="hidden" />}

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {hasRun && results.length > 0 && (
        <Card className="rounded-xl shadow-none">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{passed ? "All tests passed" : "Some tests need work"}</p>
              <Badge variant={passed ? "default" : "secondary"} className="rounded-full">
                {results.filter((result) => result.pass).length}/{results.length}
              </Badge>
            </div>
            {results.map((result) => (
              <div key={result.index} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
                {result.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                <div className="min-w-0">
                  <p className="font-medium">Test {result.index + 1}</p>
                  <p className="break-words text-xs text-muted-foreground">
                    Expected <code>{safeJson(result.expected)}</code>
                    {result.error ? ` · Error: ${result.error}` : ` · Got ${safeJson(result.actual)}`}
                  </p>
                </div>
              </div>
            ))}
            {logs.length > 0 && (
              <details className="rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                <summary className="cursor-pointer font-medium">Console output</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">{logs.join("\n")}</pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {hasRun ? (passed ? "Save this attempt to earn effort points." : "Fix the failing tests, then run again.") : "Run the tests before saving."}
        </p>
        <Button
          type="button"
          className="min-h-11 rounded-xl"
          disabled={!hasRun || saving}
          onClick={() => onSubmit(code, passed, summary || (passed ? "All tests passed" : "Tests run"))}
        >
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Save attempt
        </Button>
      </div>
    </div>
  );
}
