import katex from "katex";
import "katex/dist/katex.min.css";

/** Render $inline$ and $$display$$ TeX safely with KaTeX's default non-trusting mode. */
export default function MathText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g);
  return <span className={className}>{parts.map((part, index) => {
    const display = part.startsWith("$$") && part.endsWith("$$");
    const inline = !display && part.startsWith("$") && part.endsWith("$");
    if (!display && !inline) return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    const expression = part.slice(display ? 2 : 1, display ? -2 : -1);
    const html = katex.renderToString(expression, { displayMode: display, throwOnError: false, strict: "ignore" });
    return <span key={index} className={display ? "my-2 block overflow-x-auto text-center" : "inline-block max-w-full overflow-x-auto align-middle"} dangerouslySetInnerHTML={{ __html: html }} />;
  })}</span>;
}
