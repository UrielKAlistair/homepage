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
            title: "Project One",
            description: "A full-stack web application built with React and Node.js",
            technologies: ["React", "TypeScript", "Node.js", "PostgreSQL"],
            github: "#",
            demo: "#",
        },
        {
            title: "Project Two",
            description: "Mobile-first e-commerce platform with modern design",
            technologies: ["Next.js", "Tailwind CSS", "Stripe", "Vercel"],
            github: "#",
            demo: "#",
        },
        {
            title: "Project Three",
            description: "AI-powered analytics dashboard with real-time data",
            technologies: ["React", "Python", "FastAPI", "PostgreSQL"],
            github: "#",
            demo: "#",
        },
    ];

    return (
        <div className="min-h-screen bg-background overflow-hidden">
            <Navbar />
            {/* Hero Section */}
            <section className="relative flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-20 sm:py-32">
                <HeroText />
            </section>


            {/* Projects Section */}
            <section id="projects" className="py-20 bg-muted/50 relative">
                <div className="container mx-auto sm:px-6 lg:px-8">
                    <div className="text-center mb-16 relative">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                            Featured Projects
                        </h2>


                        <p className="mt-4 text-lg text-muted-foreground">
                            Here are some of my recent projects that showcase my skills and passion for development.
                        </p>
                    </div>

                    <div className="flex relative">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {projects.map((project, index) => (
                                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            {project.title}
                                            <div className="flex space-x-2">
                                                <a href={project.github} className="text-muted-foreground hover:text-foreground">
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
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="grid grid-cols-2 md:grid-cols-2 items-center py-20 bg-muted/30">
                <SlideIn>
                    <img
                        src="/uk-sunrise.jpg"
                        alt="UK staring into the sunrise at coorg"
                        className="object-cover rounded-2xl shadow-lg w-full h-full flex justify-center"
                    />
                </SlideIn>

                <div className="flex flex-col gap-6">
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
                                When not writing code, I will be found writing poetry, speedrunning celeste or dying
                                in the pantheons, waiting for silksong.
                            </p>
                        </SlideIn>
                    </div>
                </div>
            </section>



            {/* Contact Section */}
            <section className="py-5 bg-background relative">
                <RevealOverlay text="echo $SLEEP > /dev/null" className="matrix-text" />
            </section>
        </div>
    );
};

export default Home;
