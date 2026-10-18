import { ArrowLeft } from "lucide-react";
import { useTransitionNavigate } from "@/hooks/use-transition-navigate";
import { homeReadyEvent } from "@/pages/home/homeSession";

// Leaves a view for the home page, landing on the panel it was entered from. Shared elements
// (the poem cards, the trail map) fly back into place. `beforeLeave` runs first, e.g. to move
// the view to where the home page will show it. `transitionStyle` is CSS for the transition's
// pseudo-elements, in force while it runs, e.g. to time the flight back.
type ExitButtonProps = { returnTo: string; beforeLeave?: () => Promise<void>; transitionStyle?: string; className?: string };

const ExitButton = ({ returnTo, beforeLeave, transitionStyle, className = "" }: ExitButtonProps) => {
    const navigate = useTransitionNavigate();
    const leave = async () => {
        await beforeLeave?.();
        const style = transitionStyle ? document.head.appendChild(document.createElement("style")) : null;
        if (style) style.textContent = transitionStyle!;
        const removeStyle = () => style?.remove();
        const transition = navigate("/", { state: { returnTo }, readyEvent: homeReadyEvent });
        if (transition) transition.finished.then(removeStyle, removeStyle);
        else removeStyle();
    };
    return (
        <button
            type="button"
            onClick={leave}
            className={`flex items-center gap-2 rounded-full border border-border bg-background/70 py-2 pl-2.5 pr-3.5 text-[0.7rem] font-light uppercase tracking-[0.25em] text-white/70 backdrop-blur-sm transition-colors hover:border-white/25 hover:text-white ${className}`}
        >
            <ArrowLeft className="h-4 w-4" />
            Back
        </button>
    );
};

export default ExitButton;
