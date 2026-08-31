import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, "");
const DEFAULT_DESCRIPTION =
  "Discover books, track reading, and learn with the digital library of PM SHRI Kendriya Vidyalaya AFS Sulur.";

type PageDetails = {
  title: string;
  description: string;
  index?: boolean;
};

const publicPages: Record<string, PageDetails> = {
  "/": { title: "KV Sulur Digital Library | PM SHRI KV AFS Sulur", description: DEFAULT_DESCRIPTION },
  "/catalog": { title: "Book Catalogue | KV Sulur Digital Library", description: "Browse the online catalogue at PM SHRI Kendriya Vidyalaya AFS Sulur Digital Library." },
  "/support": { title: "Library Help & Support | KV Sulur Digital Library", description: "Get help with the KV Sulur Digital Library, accounts, books, and library services." },
  "/feedback": { title: "Share Feedback | KV Sulur Digital Library", description: "Share feedback to help improve the KV Sulur Digital Library experience." },
  "/download": { title: "Download the Library App | KV Sulur Digital Library", description: "Download the KV Sulur Digital Library app for Android or Windows." },
  "/login": { title: "Sign In | KV Sulur Digital Library", description: "Sign in to the KV Sulur Digital Library.", index: false },
  "/register": { title: "Create an Account | KV Sulur Digital Library", description: "Create a student account for the KV Sulur Digital Library.", index: false },
  "/reset-password": { title: "Reset Password | KV Sulur Digital Library", description: "Reset your KV Sulur Digital Library password.", index: false },
};

const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
};

export const Seo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const details = pathname.startsWith("/book/")
      ? { title: "Book Details | KV Sulur Digital Library", description: "View book details in the KV Sulur Digital Library." }
      : pathname.startsWith("/portfolio/")
        ? { title: "Student Reading Portfolio | KV Sulur Digital Library", description: "A student reading portfolio from KV Sulur Digital Library.", index: false }
        : publicPages[pathname] ?? { title: "Page Not Found | KV Sulur Digital Library", description: "The requested page could not be found.", index: false };
    const canonicalUrl = new URL(pathname, configuredSiteUrl || window.location.origin).href;

    document.title = details.title;
    setMeta('meta[name="description"]', "name", "description", details.description);
    setMeta('meta[name="robots"]', "name", "robots", details.index === false ? "noindex, nofollow" : "index, follow");
    setMeta('meta[property="og:title"]', "property", "og:title", details.title);
    setMeta('meta[property="og:description"]', "property", "og:description", details.description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", details.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", details.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
};
