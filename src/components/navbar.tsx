import { Github, Linkedin, Menu } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetDescription,
  SheetTitle
} from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/trail", label: "The Trail" },
    { to: "/poetry", label: "Poetry" },
  ]

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-black text-white">
      <h1 className="text-xl font-bold tracking-widest">UKA</h1>

      {/* Desktop navbar */}
      <nav className="hidden md:flex items-center gap-8 text-lg font-semibold">
        {navLinks.map((link) => (
          <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
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

        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <button aria-label="Open navigation menu">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-black text-white p-6">
            <VisuallyHidden>
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Select a destination</SheetDescription>
            </VisuallyHidden>

            <nav className="flex flex-col gap-6 text-lg font-semibold">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
