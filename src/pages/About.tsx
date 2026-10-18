import Navbar from "@/components/navbar";
import SlideIn from "@/components/slidein";
import RevealOverlay from "@/components/reveal";

const About = () => (
    <div className="min-h-screen overflow-hidden bg-background">
        <Navbar />
        <section className="pb-12 pt-12">
            <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center gap-10 md:grid md:grid-cols-2 md:gap-14">
                    <div className="order-1 flex max-w-xl flex-col gap-6 px-2 md:order-2">
                        <SlideIn>
                            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">About Me</h1>
                        </SlideIn>
                        <div className="space-y-5 text-lg leading-relaxed text-muted-foreground">
                            <SlideIn>
                                <p>I'm a curious builder driven by discovery. (and coffee.)</p>
                            </SlideIn>

                            <SlideIn>
                                <p>Lazy, Impatient, Vainglorious: I've maxed out the Programmer primary stats.</p>
                            </SlideIn>

                            <SlideIn duration={650}>
                                <p>
                                    I'm wired for understanding and creation — breaking ideas down and building them back up,
                                    be it code, math, or physics. That instinct's led me to IITM, a great many beautiful
                                    problems and fascinating people to work on them with. I love to create things, be it a
                                    clean UI, or a clever piece of unseen code. They are to me, a game, a puzzle, and an
                                    art; they are to me, beauty itself.
                                </p>
                            </SlideIn>

                            <SlideIn>
                                <p>When not writing code, I will be found writing poetry, speedrunning celeste or catching up on anime.</p>
                            </SlideIn>
                        </div>
                    </div>
                    <div className="order-2 w-full md:order-1">
                        <SlideIn threshold={0.1}>
                            <img
                                src="/uk-sunrise.webp"
                                alt="UK staring into the sunrise at coorg"
                                width={1200}
                                height={855}
                                decoding="async"
                                className="h-full w-full rounded-2xl object-cover shadow-lg"
                            />
                        </SlideIn>
                    </div>
                </div>
            </div>
        </section>

        <section className="relative py-2.5">
            <RevealOverlay text="echo $SLEEP > /dev/null" />
        </section>
    </div>
);

export default About;
