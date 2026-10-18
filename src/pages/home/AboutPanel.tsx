import { useEffect, useRef, useState } from "react";
import SlideIn from "@/components/slidein";
import RevealOverlay from "@/components/reveal";

// The About panel below its heading: the photo and the text slide in once `active` (the panel is
// on screen and its heading written), and the knight's reveal sits beneath the text, its foot
// level with the photo's. Once the photo is in, the knight appears clinging to the photo's right
// edge and dashes off it; on phones, where the photo is above the text, he clings to the
// screen's left edge.
// On phones the photo is cropped to a band so the panel fits one screen, and the side margins
// clear the section dots.

const paragraphStagger = 120; // ms
const photoSlideMs = 1000;
const sideBySide = window.matchMedia("(min-width: 768px)");

const paragraphs = [
    "I'm a curious builder driven by discovery. (and coffee.)",
    "Lazy, Impatient, Vainglorious: I've maxed out the Programmer primary stats.",
    "I'm wired for understanding and creation — breaking ideas down and building them back up, be it code, math, or physics. That instinct's led me to IITM, a great many beautiful problems and fascinating people to work on them with. I love to create things, be it a clean UI, or a clever piece of unseen code. They are to me, a game, a puzzle, and an art; they are to me, beauty itself.",
    "When not writing code, I will be found writing poetry, speedrunning celeste or catching up on anime.",
];

const AboutPanel = ({ active }: { active: boolean }) => {
    const photoRef = useRef<HTMLDivElement>(null);
    const [photoIn, setPhotoIn] = useState(false);
    useEffect(() => {
        if (!active) return;
        const timer = window.setTimeout(() => setPhotoIn(true), photoSlideMs);
        return () => window.clearTimeout(timer);
    }, [active]);
    const wallX = () => (sideBySide.matches ? photoRef.current!.getBoundingClientRect().right : 0);

    return (
        <div className="flex w-full max-w-6xl flex-col items-center gap-4 px-5 md:flex-row md:items-end md:gap-12 md:px-0">
            <div ref={photoRef} className="w-full md:w-[45%] md:shrink-0">
                <SlideIn active={active} threshold={0.1} duration={photoSlideMs}>
                    <img
                        src="/uk-sunrise.webp"
                        alt="UK staring into the sunrise at coorg"
                        width={1200}
                        height={855}
                        decoding="async"
                        className="h-[18dvh] w-full rounded-2xl object-cover shadow-lg md:h-auto md:max-h-[50dvh]"
                    />
                </SlideIn>
            </div>
            <div className="w-full max-w-xl">
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground md:space-y-5 md:text-lg">
                    {paragraphs.map((text, i) => (
                        <SlideIn key={i} active={active} delay={i * paragraphStagger} duration={text.length > 200 ? 650 : 1000}>
                            <p>{text}</p>
                        </SlideIn>
                    ))}
                </div>
                <section className="relative mt-4 w-full md:mt-8">
                    <RevealOverlay text="echo $SLEEP > /dev/null" active={photoIn} wallX={wallX} />
                </section>
            </div>
        </div>
    );
};

export default AboutPanel;
