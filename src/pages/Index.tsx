import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Linkedin, Mail, ExternalLink } from "lucide-react";
import ScrambleText from "@/components/scramble";
import Navbar from "@/components/navbar";
import SlideIn from "@/components/slidein";
import { useEffect, useRef, useState } from 'react';
import { svg, animate } from "animejs";
import RevealOverlay from "@/components/reveal";

function HeroText() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationsRef = useRef<any[]>([]); // To store animation instances

  useEffect(() => {
    let isMounted = true;

    fetch("/header.svg")
      .then((res) => res.text())
      .then((svgText) => {
        if (!isMounted || !containerRef.current) return;

        containerRef.current.innerHTML = svgText;

        const paths = Array.from(containerRef.current.querySelectorAll("path"));

        const svgEl = containerRef.current.querySelector("svg");
        if (svgEl) {
          // Make SVG responsive
          svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
          svgEl.style.display = "block";
          svgEl.style.width = "100%";
          svgEl.style.height = "100%";
          svgEl.style.maxWidth = "100%";
          svgEl.style.maxHeight = "100%";
        }

        // Ensure strokes are styled for drawing
        paths.forEach((path) => {
          path.setAttribute("stroke", "currentColor");
          path.setAttribute("fill-opacity", "0");
          path.setAttribute("stroke-width", "0.8");
        });

        // Animate each path
        const animations = paths.map((path, index) => {
          const drawable = svg.createDrawable(path);
          return animate(drawable, {
            draw: ["0 0", "0 1"],
            duration: 1000,
            easing: "easeInOutQuad",
            delay: 2800 - 40 * index,
            onComplete: () => {
              animate(path, {
                fillOpacity: [0, 1],
                duration: 1000,
                easing: "easeInOutQuad",
              });
            }
          });
        });


        animationsRef.current = animations;
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="max-w-[70vw] aspect-[11/1] mx-auto"
    />
  );
}

const Index = () => {
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      {/* Hero Section */}
      <section className="relative flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-20 sm:py-32">
        <HeroText />
      </section>


      {/* Projects Section */}
      <section className="py-20 bg-background relative">
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
            <RevealOverlay />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="grid grid-cols-2 md:grid-cols-2 items-center py-20 bg-muted/50">
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
      <section className="py-5 bg-background">
        <div className="text-center ">
          <ScrambleText text="echo $SLEEP > /dev/null" className="matrix-text" />
        </div>
      </section>
    </div>
  );
};

export default Index;
