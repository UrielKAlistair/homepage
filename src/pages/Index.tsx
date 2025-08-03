import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, Linkedin, Mail, ExternalLink } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Hi, I'm <span className="text-primary">Your Name</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              Full-stack developer passionate about creating innovative solutions and beautiful user experiences. 
              I build modern web applications using cutting-edge technologies.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg">
                View My Work
              </Button>
              <Button variant="outline" size="lg">
                <Mail className="mr-2 h-4 w-4" />
                Contact Me
              </Button>
            </div>
            <div className="mt-8 flex justify-center space-x-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-6 w-6" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="h-6 w-6" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Featured Projects
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Here are some of my recent projects that showcase my skills and passion for development.
            </p>
          </div>
          
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
      </section>

      {/* About Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                About Me
              </h2>
            </div>
            <div className="prose prose-lg max-w-none text-muted-foreground">
              <p className="text-center">
                I'm a passionate full-stack developer with expertise in modern web technologies. 
                I love creating efficient, scalable applications that solve real-world problems. 
                When I'm not coding, you can find me exploring new technologies, contributing to open-source projects, 
                or sharing knowledge with the developer community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Let's Work Together
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              I'm always interested in new opportunities and collaborations. 
              Feel free to reach out if you'd like to discuss a project or just say hello!
            </p>
            <div className="mt-10">
              <Button size="lg">
                <Mail className="mr-2 h-4 w-4" />
                Get In Touch
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
