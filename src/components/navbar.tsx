import { Github, Linkedin } from "lucide-react"

export default function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-black text-white">
      <h1 className="text-xl font-bold tracking-widest">UKA</h1>

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
