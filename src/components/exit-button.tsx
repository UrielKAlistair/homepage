import { ArrowLeft } from "lucide-react";
import { useTransitionNavigate } from "@/hooks/use-transition-navigate";
import { homeReadyEvent } from "@/pages/home/homeSession";

// Leaves a view for the home page, landing on the panel it was entered from. Shared elements
// (the poem cards, the trail map) fly back into place. `beforeLeave` runs first, e.g. to move
// the view to where the home page will show it.
type ExitButtonProps = { returnTo: string; beforeLeave?: () => Promise<void>; className?: string };

const ExitButton = ({ returnTo, beforeLeave, className = "" }: ExitButtonProps) => {
    const navigate = useTransitionNavigate();
    return (
        <button
            type="button"
            onClick={async () => {
                await beforeLeave?.();
                navigate("/", { state: { returnTo }, readyEvent: homeReadyEvent });
            }}
            className={`flex items-center gap-2 rounded-full border border-border bg-background/70 py-2 pl-2.5 pr-3.5 text-[0.7rem] font-light uppercase tracking-[0.25em] text-white/70 backdrop-blur-sm transition-colors hover:border-white/25 hover:text-white ${className}`}
        >
            <ArrowLeft className="h-4 w-4" />
            Back
        </button>
    );
};

export default ExitButton;
