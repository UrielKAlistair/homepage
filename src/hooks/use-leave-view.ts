import { useTransitionNavigate } from "@/hooks/use-transition-navigate";
import { homeReadyEvent } from "@/pages/home/homeSession";

// Leaving a view for the home page, landing on the panel it was entered from. Shared elements
// (the poem cards, the trail map) fly back into place. `transitionStyle` is CSS for the
// transition's pseudo-elements, in force while it runs, e.g. to time the flight back.
export function useLeaveView(returnTo: string, transitionStyle?: string) {
    const navigate = useTransitionNavigate();
    return () => {
        const style = transitionStyle ? document.head.appendChild(document.createElement("style")) : null;
        if (style) style.textContent = transitionStyle!;
        const removeStyle = () => style?.remove();
        const transition = navigate("/", { state: { returnTo }, readyEvent: homeReadyEvent });
        if (transition) transition.finished.then(removeStyle, removeStyle);
        else removeStyle();
    };
}
