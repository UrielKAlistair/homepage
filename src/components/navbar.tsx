import { Github, Linkedin, Menu } from "lucide-react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useTransitionNavigate } from "@/hooks/use-transition-navigate"
import { homeReadyEvent } from "@/pages/home/homeSession"

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetDescription,
  SheetTitle
} from "@/components/ui/sheet"

// The links (and the name) are the home page's panels. On the home page, which passes
// `sections`, the panel on screen is highlighted and a link scrolls to its panel; from any other
// page a link goes back to the home page, landing on its panel.
type NavbarSections = { current: string | null; goTo: (panel: string) => void }

const navLinks = [
  { panel: "trail", label: "The Trail" },
  { panel: "poetry", label: "Poetry" },
  { panel: "about", label: "About" },
]

// The panel another page belongs to
const pagePanel = (path: string) => (path === "/poetry" ? "poetry" : path.startsWith("/notes/") ? "trail" : null)

// `overlay`: the page runs underneath the bar instead of starting below it
export default function Navbar({ sections, overlay = false }: { sections?: NavbarSections; overlay?: boolean }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useTransitionNavigate()
  const isActive = (panel: string) => (sections ? sections.current : pagePanel(location.pathname)) === panel
  const select = (panel: string) => (event: { preventDefault: () => void }) => {
    event.preventDefault()
    setOpen(false)
    if (sections) sections.goTo(panel)
    else navigate("/", { state: { returnTo: panel }, readyEvent: homeReadyEvent })
  }

  return (
    <>
      <header className="fixed top-0 z-50 flex h-[var(--nav-h)] w-full items-center justify-between border-b border-white/[0.06] bg-background/70 px-6 text-white backdrop-blur-md">
        <h1 className="text-sm font-medium tracking-[0.35em]">
          <Link to="/" state={{ returnTo: "trail" }} className="transition-colors duration-200 hover:text-gray-300" onClick={select("trail")}>
            UKA
          </Link>
        </h1>

        {/* Desktop navbar */}
        <nav className="hidden items-center gap-10 text-[0.7rem] font-light uppercase tracking-[0.3em] md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.panel}
              to="/"
              state={{ returnTo: link.panel }}
              aria-current={isActive(link.panel) ? "page" : undefined}
              className={`underline-offset-[10px] decoration-1 transition-colors duration-300 ${
                isActive(link.panel) ? "text-white underline" : "text-white/45 hover:text-white/80"
              }`}
              onClick={select(link.panel)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Social + mobile toggle */}
        <nav className="flex items-center gap-4">
          <a
            href="https://github.com/UrielKAlistair"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="transition-colors duration-200 hover:text-gray-400"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href="https://linkedin.com/in/UrielKAlistair"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="transition-colors duration-200 hover:text-gray-400"
          >
            <Linkedin className="h-4 w-4" />
          </a>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-black text-white p-6">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Select a destination</SheetDescription>

              <nav className="flex flex-col gap-6 text-sm font-light uppercase tracking-[0.3em]">
                {navLinks.map((link) => (
                  <Link
                    key={link.panel}
                    to="/"
                    state={{ returnTo: link.panel }}
                    aria-current={isActive(link.panel) ? "page" : undefined}
                    className={isActive(link.panel) ? "text-white" : "text-white/50"}
                    onClick={select(link.panel)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </nav>
      </header>
      {!overlay && <div className="h-[var(--nav-h)]" aria-hidden="true" />}
    </>
  )
}
