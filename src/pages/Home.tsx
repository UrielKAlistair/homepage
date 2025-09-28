import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, ExternalLink } from "lucide-react";
import Navbar from "@/components/navbar";
import SlideIn from "@/components/slidein";
import RevealOverlay from "@/components/reveal";
import HeroText from "@/components/calligraphy"

const Home = () => {
    const projects = [
        {
            title: "RAG ",
            description: " A vectorized retrieval pipeline that augments an LLM to answer questions from large pdf sources efficiently.",
            technologies: ["Frustrating LLMs", "Maniacal PDF parsing", "Arbitrary RAG knob tweaking", "Fighting Rate limits"],
            github: "https://github.com/UrielKAlistair/Textbook_RAG",
            demo: "#",
            newTab: true
        },
        {
            title: "Agentic Analyst",
            description: "Made an LLM bully itself so that I bring more LLM bullying to the world instead of doing it manually. \n This agent can analyse, summarise and give insights about any general dataset. \
            Take verbal inputs, searches the web for datasets, provides results.",
            technologies: ["Resilience", "Sadism", "Python"],
            github: "#",
            demo: "#",
            newTab: true
        },
        {
            title: "Ebony",
            description: "There is space for a third card here... maybe I will add something later.",
            technologies: ["Procrastination"],
            github: "#",
            demo: "#",
            newTab: false
        },
    ];
    return (
        <div className="min-h-screen bg-background overflow-hidden">
            <Navbar />
            {/* Hero Section */}
            <section className="relative flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-20 sm:py-32">
                <HeroText />
            </section>

            {/* Showcase Section */}

            <section id="showcase" className="pt-20 pb-10 bg-muted/50 relative">
                <div className="flex flex-col items-center text-center mb-10 space-y-2">
                    <div className="flex flex-row gap-5 justify-center items-end relative px-10">
                        <h2 className="text-2xl font-bold text-foreground">
                            Showcase:
                        </h2>

                        <p className="text-lg text-muted-foreground">
                            A Snippet of what I've been upto recently*.
                        </p>
                    </div>
                </div>
                <div className="container mx-auto sm:px-6 lg:px-8">
                    <Carousel>
                        <CarouselContent>
                            {projects.map((project, index) => (
                                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3 flex-shrink-0">
                                    <Card key={index} className="hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between h-full">
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                {project.title}
                                                <div className="flex space-x-2">
                                                    <a href={project.github} target={project.newTab ? "_blank" : undefined} rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                                                        <Github className="h-4 w-4" />
                                                    </a>
                                                    <a href={project.demo} className="text-muted-foreground hover:text-foreground">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </div>
                                            </CardTitle>
                                            <CardDescription>{project.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {project.technologies.map((tech, techIndex) => (
                                                    <Badge key={techIndex} variant="secondary">
                                                        {tech}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </CarouselItem>
                            ))}

                        </CarouselContent>
                        <CarouselPrevious className="ml-4" />
                        <CarouselNext className="mr-4" />
                    </Carousel>

                    <footer className="pt-6 pb-5 text-center text-xs text-muted-foreground">
                        *recency subject to laziness in updating page.
                    </footer>
                </div>
            </section>

            {/* About Section */}
            <section className="flex flex-col md:grid md:grid-cols-2 items-center py-20 bg-muted/30">

                <div className="flex flex-col gap-6 order-1 md:order-2 pb-10">
                    <SlideIn>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-center">
                            About Me
                        </h2>
                    </SlideIn>
                    <div className="prose prose-lg max-w-none text-muted-foreground px-5 space-y-2">

                        <SlideIn>
                            <p className="leading-relaxed">
                                I'm a curious builder drawn to elegance. (and coffee.)
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
                                When not writing code, I will be found writing poetry, speedrunning celeste or farming emblem of severed fate.
                            </p>
                        </SlideIn>
                    </div>
                </div>
                <div className="order-2 md:order-1 p-8">
                    <SlideIn>
                        <img
                            src="/uk-sunrise.jpg"
                            alt="UK staring into the sunrise at coorg"
                            className="object-cover rounded-2xl shadow-lg w-full h-full flex justify-center"
                        />
                    </SlideIn>
                </div>
            </section>



            <section className="py-5 bg-background relative">
                <RevealOverlay text="echo $SLEEP > /dev/null" />
            </section>
        </div>
    );
};

export default Home;
