import { Link } from "react-router-dom";
import { Home, Search } from "lucide-react";

const NotFound = () => {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 animate-in fade-in duration-300">
      <div className="max-w-lg text-center">
        <p className="text-sm font-bold tracking-[0.2em] text-indigo-600 mb-3">ERROR 404</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">This page is not in our library.</h1>
        <p className="text-lg text-slate-600 mb-8">The link may be outdated, or the page may have moved. Try one of these helpful places instead.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
            <Home className="h-4 w-4" /> Go to home
          </Link>
          <Link to="/catalog" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100">
            <Search className="h-4 w-4" /> Browse catalogue
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
