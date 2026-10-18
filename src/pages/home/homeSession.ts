// What the home page remembers: the panel last on screen (in sessionStorage, so leaving a view
// or reloading returns there) and which panels have finished their animation (in memory, so they
// don't replay when coming back from a view, but do after a reload).

const panelKey = "home-panel";
const played = new Set<string>();

// Fired once the home page can be shown with its panel complete; a transition back waits for it
export const homeReadyEvent = "home-ready";

export function lastPanel(): string | null {
    try {
        return window.sessionStorage.getItem(panelKey);
    } catch {
        return null;
    }
}

export function rememberPanel(id: string) {
    try {
        window.sessionStorage.setItem(panelKey, id);
    } catch {
        // Not remembered: leaving a view returns to the top
    }
}

export const playedPanels = () => new Set(played);

export function rememberPlayed(id: string) {
    played.add(id);
}
