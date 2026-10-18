import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

// The longest a transition waits for the next page to say it's ready
const readyTimeoutMs = 1500;

// Fired on window when a transition has finished animating
export const transitionDoneEvent = "view-transition-done";

// Navigates inside a view transition, so elements sharing a view-transition-name on both pages
// fly from one to the other. React Router's own viewTransition flag needs a data router, which
// this app (BrowserRouter) doesn't use. Browsers without the API just navigate.
// `readyEvent`: a window event the next page fires once its content is drawn; until then the
// browser holds the old page, so the flight doesn't land on an empty one.
// `onAnimate`: runs when the transition's animations exist, to add to them.
// Returns the transition, if there is one.
export function useTransitionNavigate() {
    const navigate = useNavigate();
    return useCallback(
        (to: string, { state, readyEvent, onAnimate }: { state?: unknown; readyEvent?: string; onAnimate?: () => void } = {}) => {
            if (!document.startViewTransition) {
                navigate(to, { state });
                return undefined;
            }
            const transition = document.startViewTransition(() => {
                const ready = readyEvent
                    ? new Promise<void>((resolve) => {
                          const timer = window.setTimeout(resolve, readyTimeoutMs);
                          window.addEventListener(readyEvent, () => (window.clearTimeout(timer), resolve()), { once: true });
                      })
                    : undefined;
                flushSync(() => navigate(to, { state }));
                return ready;
            });
            if (onAnimate) transition.ready.then(onAnimate).catch(() => {});
            const done = () => window.dispatchEvent(new Event(transitionDoneEvent));
            transition.finished.then(done, done);
            return transition;
        },
        [navigate]
    );
}
