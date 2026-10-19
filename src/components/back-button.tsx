import { ArrowLeft } from "lucide-react";

// The look of every Back button
export const BackButton = ({ onClick, className = "" }: { onClick: () => void; className?: string }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-2 rounded-full border border-border bg-background/70 py-2 pl-2.5 pr-3.5 text-[0.7rem] font-light uppercase tracking-[0.25em] text-white/70 backdrop-blur-sm transition-colors hover:border-white/25 hover:text-white ${className}`}
    >
        <ArrowLeft className="h-4 w-4" />
        Back
    </button>
);
