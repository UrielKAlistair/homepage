// The navbar's height in pixels, read from the --nav-h CSS variable that lays pages out
export function navHeight() {
    const root = getComputedStyle(document.documentElement);
    const value = root.getPropertyValue("--nav-h").trim();
    return value.endsWith("rem") ? parseFloat(value) * parseFloat(root.fontSize) : parseFloat(value);
}
