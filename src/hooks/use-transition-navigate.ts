import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

// The longest a transition waits for the next page to say it's ready
const readyTimeoutMs = 1500;

// Fired on window when a transition has finished animating
export const transitionDoneEvent = "view-transition-done";

// A second click during a transition would start another and push a second history entry
let inTransition = false;

// Navigates inside a view transition, so the old page crossfades into the new one. React
// Router's own viewTransition flag needs a data router, which this app (BrowserRouter) doesn't
// use. Browsers without the API just navigate.
// `readyEvent`: a window event the next page fires once its content is drawn; until then the
// browser holds the old page, so it doesn't fade into an empty one.
export function useTransitionNavigate() {
    const navigate = useNavigate();
    return useCallback(
        (to: string, { state, readyEvent }: { state?: unknown; readyEvent?: string } = {}) => {
            if (!document.startViewTransition) {
                navigate(to, { state });
                return;
            }
            if (inTransition) return;
            inTransition = true;
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
            const done = () => {
                inTransition = false;
                window.dispatchEvent(new Event(transitionDoneEvent));
            };
            transition.finished.then(done, done);
        },
        [navigate]
    );
}
