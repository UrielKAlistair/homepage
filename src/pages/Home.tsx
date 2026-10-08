import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Autoplay from "embla-carousel-autoplay";
import { Github, ExternalLink } from "lucide-react";
import { useRef } from "react";
import { format } from "date-fns";
import Navbar from "@/components/navbar";
import SlideIn from "@/components/slidein";
import RevealOverlay from "@/components/reveal";
import HeroText from "@/components/calligraphy"

const Home = () => {
    const sectionMaxWidthClass = "max-w-[90rem]";
    const autoplay = useRef(
        Autoplay({
            delay: 3400,
            stopOnInteraction: true,
        }),
    );

    const projects = [
        {
            title: "Poetry",
            description: "Musings.",
            lastUpdate: "2025-09-28",
            technologies: ["Rumination"],
            demo: "/poetry",
            newTab: false
        },
        {
            title: "RAG",
            description: "A learning exercise in making a vectorized retrieval pipeline. Augments an LLM to answer questions from large pdf sources efficiently.",
            technologies: ["Frustrating LLMs", "Fighting Rate limits"],
            github: "https://github.com/UrielKAlistair/Textbook_RAG",
            lastUpdate: "2025-08-22",
            newTab: true
        },
        {
            title: "Noisy Music Genre Classification",
            description: "Deep-learning models that classify noisy music mashups from log-mel spectrograms. Trained CNN, CNN-BiLSTM & EfficientNet, reaching 93.1% macro-F1.",
            technologies: ["CNN", "EfficientNet", "Spectrograms"],
            github: "https://github.com/UrielKAlistair/DLGenAIProject2026T1",
            demo: "https://huggingface.co/spaces/UrielKAlistair/efficientspace",
            newTab: true
        },
        {
            title: "The Trail",
            description: "A compendium of knowledge.",
            lastUpdate: "2026-03-25",
            technologies: ["Wanderlust"],
            demo: "/trail",
            newTab: false
        },
    ];
    return (
        <div className="min-h-screen bg-background overflow-hidden">
            <Navbar />
            {/* Hero Section */}
            <section className="relative flex items-center justify-center bg-secondary/[0.30] py-16 md:py-10">
                <HeroText className={sectionMaxWidthClass} />
            </section>

            {/* Showcase Section */}

            <section id="showcase" className="pt-10 pb-5 bg-muted/65 relative">
                <div className={`mx-auto w-full ${sectionMaxWidthClass} px-4 sm:px-6 lg:px-8`}>
                    <div className="flex flex-col items-center text-center mb-10 space-y-2">
                        <div className="flex flex-row gap-5 justify-center items-end relative px-10">
                            <p className="text-2xl font-semibold text-foreground">
                                A Snippet of what I've been upto recently
                            <span className="ml-1 align-super text-muted-foreground">*</span> :
                            </p>
                        </div>
                    </div>
                    <Carousel
                        opts={{ loop: true }}
                        plugins={[autoplay.current]}
                        onMouseEnter={autoplay.current.stop}
                        onMouseLeave={() => autoplay.current.play()}
                    >
                        <CarouselContent>
                            {projects.map((project, index) => (
                                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3 flex-shrink-0">
                                    <Card key={index} className="relative hover:shadow-lg hover:border-muted-foreground/40 transition duration-300 flex flex-col justify-between h-full">
                                        {/* Whole-card link sits underneath; the icon links are raised above it */}
                                        <a
                                            href={project.demo ?? project.github}
                                            target={project.newTab ? "_blank" : undefined}
                                            rel="noopener noreferrer"
                                            aria-label={project.title}
                                            className="absolute inset-0 z-0 rounded-lg"
                                        />
                                        <CardHeader className="space-y-2 p-5">
                                            <CardTitle className="flex items-start justify-between gap-3">
                                                {project.title}
                                                <div className="relative z-10 flex space-x-2 pt-1">
                                                    {project.github &&(
                                                    <a href={project.github} target={project.newTab ? "_blank" : undefined} rel="noopener noreferrer" aria-label={`${project.title} on GitHub`} className="text-muted-foreground hover:text-foreground">
                                                        <Github className="h-4 w-4" />
                                                    </a>
                                                    )}
                                                    {
                                                    project.demo && (<a href={project.demo} target={project.newTab ? "_blank" : undefined} rel="noopener noreferrer" aria-label={`${project.title} demo`} className="text-muted-foreground hover:text-foreground">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>)}
                                                </div>
                                            </CardTitle>
                                            <CardDescription>
                                                {project.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="px-5 pb-5 pt-0 space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {project.technologies.map((tech, techIndex) => (
                                                    <Badge key={techIndex} variant="outline">
                                                        {tech}
                                                    </Badge>
                                                ))}
                                            </div>
                                            {project.lastUpdate && (
                                                <p className="text-xs text-muted-foreground/70">
                                                    Updated {format(new Date(project.lastUpdate), "MMM yyyy")}
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </CarouselItem>
                            ))}

                        </CarouselContent>
                        {/* Below md the side arrows would hang off-screen, so they sit in a row under the cards */}
                        <div className="mt-4 flex justify-center gap-4 md:mt-0">
                            <CarouselPrevious className="static translate-y-0 md:absolute md:-translate-y-1/2 md:ml-4" />
                            <CarouselNext className="static translate-y-0 md:absolute md:-translate-y-1/2 md:mr-4" />
                        </div>
                    </Carousel>

                    <footer className="pt-3 pb-2 text-center text-xs text-muted-foreground">
                        *recency subject to laziness in updating page.
                    </footer>
                </div>
            </section>

            {/* About Section */}
            <section className="pt-5 pb-3 bg-secondary/[0.38]">
                <div className={`mx-auto w-full ${sectionMaxWidthClass} px-4 sm:px-6 lg:px-8`}>
                    <div className="flex flex-col md:grid md:grid-cols-2 items-center">

                        <div className="flex flex-col gap-6 order-1 md:order-2 pb-10">
                            <SlideIn>
                                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-center">
                                    About Me
                                </h2>
                            </SlideIn>
                            <div className="prose prose-lg max-w-none text-muted-foreground px-5 space-y-2">

                                <SlideIn>
                                    <p className="leading-relaxed">
                                        I'm a curious builder driven by discovery. (and coffee.)
                                    </p>
                                </SlideIn>

                                <SlideIn>
                                    <p className="leading-relaxed">
                                        Lazy, Impatient, Vainglorious: I've maxed out the Programmer primary stats.
                                    </p>
                                </SlideIn>

                                <SlideIn duration={650}>
                                    <p className="leading-relaxed">
                                        I'm wired for understanding and creation — breaking ideas down and building them back up,
                                        be it code, math, or physics. That instinct's led me to IITM, a great many beautiful
                                        problems and fascinating people to work on them with. I love to create things, be it a
                                        clean UI, or a clever piece of unseen code. They are to me, a game, a puzzle, and an
                                        art; they are to me, beauty itself.
                                    </p>
                                </SlideIn>

                                <SlideIn>
                                    <p className="leading-relaxed">
                                        When not writing code, I will be found writing poetry, speedrunning celeste or catching up on anime.
                                    </p>
                                </SlideIn>
                            </div>
                        </div>
                        <div className="order-2 md:order-1 p-8">
                            <SlideIn threshold={0.1}>
                                <img
                                    src="/uk-sunrise.webp"
                                    alt="UK staring into the sunrise at coorg"
                                    width={1200}
                                    height={855}
                                    loading="lazy"
                                    decoding="async"
                                    className="object-cover rounded-2xl shadow-lg w-full h-full flex justify-center"
                                />
                            </SlideIn>
                        </div>
                    </div>
                </div>
            </section>



            <section className="py-2.5 bg-background relative">
                <RevealOverlay text="echo $SLEEP > /dev/null" />
            </section>
        </div>
    );
};

export default Home;
