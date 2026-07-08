"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import WeatherWidget from "./WeatherWidget";

const links = [
  { href: "#about", label: "About" },
  { href: "#menu", label: "Menu" },
  { href: "#gallery", label: "Gallery" },
  { href: "#reviews", label: "Reviews" },
  { href: "#visit", label: "Visit" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Always solid maroon — never transparent over the new two-column hero
  return (
    <header
      className={`fixed inset-x-0 z-50 transition-all duration-300 ${scrolled
        ? "top-0 bg-[#350C0C] shadow-[0_1px_0_0_rgba(201,151,74,0.18)]"
        : "top-9 bg-[#350C0C]/95 backdrop-blur-md"
        }`}
    >
      <nav className="mx-auto max-w-6xl px-6 sm:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3 group" aria-label="Hotel Taj Ooty home">
          <Image
            src="/Assets/taj.png"
            alt="Hotel Taj Ooty logo"
            width={44} height={44}
            className="h-11 w-11 rounded-full object-contain ring-1 ring-[#C9974A]/30 group-hover:ring-[#C9974A]/70 transition-all"
            priority
          />
          <span className="font-display text-lg tracking-tight text-[#F6EEDF] group-hover:text-[#C9974A] transition-colors">
            Hotel Taj <span className="italic font-normal text-[#C9974A]">Ooty</span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7 lg:gap-9">
          {links.map(l => (
            <a
              key={l.href} href={l.href}
              className="text-sm font-medium tracking-wide text-[#F6EEDF]/80 hover:text-[#C9974A] transition-colors"
            >
              {l.label}
            </a>
          ))}

          <WeatherWidget />

          <a
            href="#visit"
            className="rounded-full bg-[#C9974A] px-5 py-2.5 text-sm font-semibold text-[#241B15] transition-all hover:scale-[1.03] hover:bg-[#d2a260]"
          >
            Reserve a Table
          </a>
        </div>

        {/* Mobile menu triggers */}
        <div className="flex items-center gap-4 md:hidden">
          <WeatherWidget compact={true} />
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(v => !v)}
            className="text-[#F6EEDF]"
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-[#350C0C] border-t border-[#C9974A]/15 px-6 py-6 flex flex-col gap-5">
          {links.map(l => (
            <a
              key={l.href} href={l.href}
              onClick={() => setOpen(false)}
              className="text-base font-medium text-[#F6EEDF]/85 hover:text-[#C9974A] transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#visit"
            onClick={() => setOpen(false)}
            className="rounded-full bg-[#C9974A] px-5 py-3 text-center text-sm font-semibold text-[#241B15]"
          >
            Reserve a Table
          </a>
        </div>
      )}
    </header>
  );
}
