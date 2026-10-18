import { Github, Linkedin, Menu } from "lucide-react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetDescription,
  SheetTitle
} from "@/components/ui/sheet"

// On the home page the links name its panels: the one on screen is highlighted, and clicking
// a link scrolls to its panel instead of opening the page.
type NavbarSections = { current: string | null; goTo: (to: string) => void }

export default function Navbar({ sections }: { sections?: NavbarSections }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navLinks = [
    { to: "/trail", label: "The Trail" },
    { to: "/poetry", label: "Poetry" },
    { to: "/about", label: "About" },
  ]
  // Notes belong to the trail
  const isActive = (to: string) =>
    sections ? sections.current === to : location.pathname === to || (to === "/trail" && location.pathname.startsWith("/notes/"))
  const select = (to: string) => (event: { preventDefault: () => void }) => {
    setOpen(false)
    if (sections && to !== "/about") {
      event.preventDefault()
      sections.goTo(to)
    } else if (to === location.pathname) {
      scrollToTop()
    }
  }
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" })

  return (
    <>
      <header className="fixed top-0 z-50 flex h-[var(--nav-h)] w-full items-center justify-between border-b border-white/[0.06] bg-background/70 px-6 text-white backdrop-blur-md">
        <h1 className="text-sm font-medium tracking-[0.35em]">
          <Link
            to="/"
            className="transition-colors duration-200 hover:text-gray-300"
            onClick={() => {
              if (location.pathname === "/") {
                scrollToTop()
              }
            }}
          >
            UKA
          </Link>
        </h1>

        {/* Desktop navbar */}
        <nav className="hidden items-center gap-10 text-[0.7rem] font-light uppercase tracking-[0.3em] md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              aria-current={isActive(link.to) ? "page" : undefined}
              className={`underline-offset-[10px] decoration-1 transition-colors duration-300 ${
                isActive(link.to) ? "text-white underline" : "text-white/45 hover:text-white/80"
              }`}
              onClick={select(link.to)}
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
                    key={link.to}
                    to={link.to}
                    aria-current={isActive(link.to) ? "page" : undefined}
                    className={isActive(link.to) ? "text-white" : "text-white/50"}
                    onClick={select(link.to)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </nav>
      </header>
      {/* Pages flow below the bar; the home page's panels sit under it instead */}
      {!sections && <div className="h-[var(--nav-h)]" aria-hidden="true" />}
    </>
  )
}
