import { Link } from "react-router-dom";
import Navbar from "@/components/navbar";

const NotFound = () => (
    <div className="min-h-screen bg-night">
        <Navbar />
        <main className="flex min-h-[calc(100dvh-var(--nav-h))] flex-col items-center justify-center gap-6 px-4 text-center">
            <h1 className="text-sm font-light uppercase tracking-[0.35em] text-white/80">Page not found</h1>
            <Link to="/" className="text-xs font-light uppercase tracking-[0.3em] text-white/45 transition-colors hover:text-white">
                ← Home
            </Link>
        </main>
    </div>
);

export default NotFound;
