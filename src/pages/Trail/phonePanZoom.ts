import { useReactFlow, useStoreApi } from "@xyflow/react";
import { useEffect, useMemo, useRef } from "react";

// Pan and pinch on the phone, done here rather than by React Flow. React Flow moves its camera
// through its store, and every component subscribed to the store checks the change, in every frame
// of a gesture; on a slow phone that alone fills the frame. Here each frame moves the map's layer
// and the territory directly, and the store is told the camera once, when the fingers lift.

export type Camera = { x: number; y: number; zoom: number };
export type CameraFeed = { subscribe: (follow: (camera: Camera) => void) => () => void };

type Point = { x: number; y: number };

// Below this many pixels of travel a touch is a tap, left to the buttons under it
const tapDistance = 4;

export function usePhonePanZoom(enabled: boolean, minZoom: number, maxZoom: number) {
    const store = useStoreApi();
    const { setViewport } = useReactFlow();
    const ref = useRef<HTMLDivElement>(null);
    const followers = useRef(new Set<(camera: Camera) => void>());
    const feed = useMemo<CameraFeed>(
        () => ({
            subscribe: (follow) => {
                followers.current.add(follow);
                return () => followers.current.delete(follow);
            },
        }),
        [],
    );

    useEffect(() => {
        const pane = ref.current;
        if (!enabled || !pane) return;
        const viewport = pane.querySelector<HTMLElement>(".react-flow__viewport")!;
        const fingers = new Map<number, Point>();
        let origin: Point = { x: 0, y: 0 }; // the pane's corner on screen, as the gesture began
        let camera: Camera = { x: 0, y: 0, zoom: 1 };
        let moved = false;
        // The camera and the fingers' centre and spread when the current set of fingers went down; the
        // map point under that centre stays under the fingers' centre, scaled by their spread
        let start = { camera, centre: origin, spread: 0 };

        const shape = () => {
            const points = [...fingers.values()];
            const centre = { x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length };
            const spread = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
            return { centre, spread };
        };
        const regrip = () => (start = { camera, ...shape() });

        const down = (event: PointerEvent) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            if (fingers.size === 0) {
                const [x, y, zoom] = store.getState().transform;
                camera = { x, y, zoom };
                const rect = pane.getBoundingClientRect();
                origin = { x: rect.left, y: rect.top };
                moved = false;
            }
            fingers.set(event.pointerId, { x: event.clientX - origin.x, y: event.clientY - origin.y });
            regrip();
        };

        const move = (event: PointerEvent) => {
            if (!fingers.has(event.pointerId)) return;
            fingers.set(event.pointerId, { x: event.clientX - origin.x, y: event.clientY - origin.y });
            const { centre, spread } = shape();
            if (!moved && Math.hypot(centre.x - start.centre.x, centre.y - start.centre.y) < tapDistance && Math.abs(spread - start.spread) < tapDistance) return;
            moved = true;
            const zoom = Math.min(maxZoom, Math.max(minZoom, start.spread > 0 ? (start.camera.zoom * spread) / start.spread : start.camera.zoom));
            const anchor = { x: (start.centre.x - start.camera.x) / start.camera.zoom, y: (start.centre.y - start.camera.y) / start.camera.zoom };
            camera = { x: centre.x - anchor.x * zoom, y: centre.y - anchor.y * zoom, zoom };
            viewport.style.transform = `translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`;
            followers.current.forEach((follow) => follow(camera));
        };

        const up = (event: PointerEvent) => {
            if (!fingers.delete(event.pointerId)) return;
            if (fingers.size > 0) return void regrip();
            if (!moved) return;
            void setViewport(camera);
            // The click a lifted finger may still fire belongs to the gesture, not to what it ended on
            const swallow = (click: Event) => {
                click.stopPropagation();
                click.preventDefault();
            };
            pane.addEventListener("click", swallow, { capture: true, once: true });
            window.setTimeout(() => pane.removeEventListener("click", swallow, { capture: true }), 0);
        };

        // Capture, so a card that stops a pointer event on its way up can't hide it from the gesture
        pane.addEventListener("pointerdown", down, { capture: true });
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        return () => {
            pane.removeEventListener("pointerdown", down, { capture: true });
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", up);
        };
    }, [enabled, minZoom, maxZoom, store, setViewport]);

    return { ref, feed };
}
