import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const PRIMARY_DOMAIN = "https://dlms.kvsulur.in";
const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, "") || PRIMARY_DOMAIN;
const DEFAULT_DESCRIPTION =
  "Official Digital Library Management System (DLMS) of PM SHRI Kendriya Vidyalaya AFS Sulur, Coimbatore. Search book catalogue, track reading progress, and access educational resources.";

type PageDetails = {
  title: string;
  description: string;
  index?: boolean;
};

const publicPages: Record<string, PageDetails> = {
  "/": {
    title: "PM SHRI KV Sulur Digital Library | Official DLMS Kendriya Vidyalaya AFS Sulur",
    description: DEFAULT_DESCRIPTION,
  },
  "/catalog": {
    title: "Book Catalogue & Search | PM SHRI KV Sulur Digital Library",
    description: "Search and browse physical books, CBSE textbooks, reference materials, and literature available at PM SHRI Kendriya Vidyalaya AFS Sulur library.",
  },
  "/download": {
    title: "Download Library App (Android & Windows) | KV Sulur DLMS",
    description: "Download the official PM SHRI KV Sulur Digital Library mobile app (Android APK) and Windows desktop client for offline access and reading updates.",
  },
  "/support": {
    title: "Library Help & Support Desk | PM SHRI KV Sulur Digital Library",
    description: "Get immediate help with book issuing, account login, student admission credentials, and library services at PM SHRI KV AFS Sulur.",
  },
  "/feedback": {
    title: "Feedback & Book Requests | PM SHRI KV Sulur Digital Library",
    description: "Submit feedback, suggest new book purchases, and help us improve the PM SHRI KV Sulur digital library experience.",
  },
  "/login": {
    title: "Sign In | PM SHRI KV Sulur Digital Library",
    description: "Sign in to access your student or teacher reading dashboard, quizzes, and book requests.",
    index: false,
  },
  "/register": {
    title: "Create Student Account | PM SHRI KV Sulur Digital Library",
    description: "Register a new student account for PM SHRI Kendriya Vidyalaya AFS Sulur Digital Library.",
    index: false,
  },
  "/reset-password": {
    title: "Reset Password | PM SHRI KV Sulur Digital Library",
    description: "Reset your KV Sulur Digital Library account password.",
    index: false,
  },
  "/dashboard": {
    title: "Dashboard | PM SHRI KV Sulur Digital Library",
    description: "User dashboard for KV Sulur Digital Library.",
    index: false,
  },
  "/student-dashboard": {
    title: "Student Dashboard | PM SHRI KV Sulur Digital Library",
    description: "Access books, quizzes, reading challenges, and streaks.",
    index: false,
  },
  "/admin-dashboard": {
    title: "Admin Dashboard | PM SHRI KV Sulur Digital Library",
    description: "Library administration, circulation, and user management.",
    index: false,
  },
  "/teacher-dashboard": {
    title: "Teacher Dashboard | PM SHRI KV Sulur Digital Library",
    description: "Manage class reading activity and student achievements.",
    index: false,
  },
  "/points-history": {
    title: "Points & XP History | PM SHRI KV Sulur Digital Library",
    description: "View earned library points and reading streak achievements.",
    index: false,
  },
  "/student-portfolio": {
    title: "Student Reading Portfolio | PM SHRI KV Sulur Digital Library",
    description: "Student reading statistics, digital library card, and badges.",
    index: false,
  },
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
      ? {
          title: "Book Details | PM SHRI KV Sulur Digital Library",
          description: "View book availability, summaries, and issue details at PM SHRI Kendriya Vidyalaya AFS Sulur Digital Library.",
        }
      : pathname.startsWith("/portfolio/")
        ? {
            title: "Student Reading Portfolio | PM SHRI KV Sulur Digital Library",
            description: "Student reading portfolio from PM SHRI KV Sulur Digital Library.",
            index: false,
          }
        : publicPages[pathname] ?? {
            title: "Page Not Found | PM SHRI KV Sulur Digital Library",
            description: "The requested page could not be found.",
            index: false,
          };

    // Use primary production domain dlms.kvsulur.in for canonical indexing
    const canonicalBase = configuredSiteUrl.includes("localhost") ? window.location.origin : PRIMARY_DOMAIN;
    const canonicalUrl = new URL(pathname, canonicalBase).href;

    document.title = details.title;
    setMeta('meta[name="description"]', "name", "description", details.description);
    setMeta('meta[name="robots"]', "name", "robots", details.index === false ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
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
