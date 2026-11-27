import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type AnswerSource = { id: string; title: string; source_label?: string; source_url?: string };

function cleanAnswer(text: string, sources: AnswerSource[]) {
  const sourceNames = new Map(sources.map((source) => [source.id.toLowerCase(), source.title]));
  return text
    .split("\n")
    .filter((line) => !/^\s*[-*]?\s*source:\s*[0-9a-f-]{36}\.?\s*$/i.test(line))
    .join("\n")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (id) => sourceNames.get(id.toLowerCase()) || "DLMS study material");
}

export function StudyAnswerMarkdown({ text, sources = [], className = "" }: {
  text: string;
  sources?: AnswerSource[];
  className?: string;
}) {
  if (!text.trim()) return null;

  return (
    <div className={`study-answer-content prose prose-sm max-w-none break-words text-foreground dark:prose-invert ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {cleanAnswer(text, sources)}
      </ReactMarkdown>
    </div>
  );
}

export function StudyAnswerSources({ sources }: { sources?: AnswerSource[] }) {
  if (!sources?.length) return null;

  return (
    <section className="space-y-2 border-t pt-3" aria-label="Study sources">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Study sources</h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {sources.map((source) => {
          const label = source.source_label ? `${source.title} · ${source.source_label}` : source.title;
          return (
            <li key={source.id} className="min-w-0 rounded-xl border bg-muted/20 px-3 py-2 text-xs leading-5">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{sources.indexOf(source) + 1}</span>
              {source.source_url
                ? <a href={source.source_url} target="_blank" rel="noreferrer" className="break-words text-primary underline-offset-2 hover:underline">{label}</a>
                : <span className="break-words">{label}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
