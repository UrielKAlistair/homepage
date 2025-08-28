import { Github, Linkedin } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link } from "react-router-dom"
import ProjectsButton from "@/components/scrollink"

export default function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-black text-white">
      <h1 className="text-xl font-bold tracking-widest">UKA</h1>

      <nav className="flex items-center gap-8 text-lg font-semibold">
        <Link to="/" className="hover:text-gray-400">Home</Link>
        <ProjectsButton />
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:text-gray-400">
            Tools
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-black text-white font-semibold">
            <DropdownMenuItem asChild className="block text-center">
              <Link to="/analyst-ai">Analyst AI</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="block text-center">
              <Link to="/rag">RAG App</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      <nav className="flex items-center gap-4">
        <a
          href="https://github.com/UrielKAlistair"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-400"
        >
          <Github className="h-5 w-5" />
        </a>
        <a
          href="https://linkedin.com/in/UrielKAlistair"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-400"
        >
          <Linkedin className="h-5 w-5" />
        </a>
      </nav>
    </header>
  )
}
