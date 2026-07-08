import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { siteInfo } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="bg-[#350C0C] border-t border-[#C9974A]/15 px-6 py-12 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 text-center sm:flex-row sm:justify-between sm:text-left">
        {/* Logo + copyright */}
        <div className="flex flex-col items-center sm:items-start gap-3">
          <Image
            src="/Assets/taj.png"
            alt="Hotel Taj Ooty logo"
            width={72}
            height={72}
            className="h-16 w-16 rounded-full object-contain ring-1 ring-[#C9974A]/30"
          />
          <div>
            <p className="font-display text-xl text-[#F6EEDF]">
              Hotel Taj <span className="italic font-normal text-[#C9974A]">Ooty</span>
            </p>
            <p className="mt-1 text-xs text-[#F6EEDF]/45">
              © {new Date().getFullYear()} Hotel Taj Ooty. All rights reserved.
            </p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-[#F6EEDF]/60">
          <a href="#about" className="hover:text-[#C9974A] transition-colors">About</a>
          <a href="#menu" className="hover:text-[#C9974A] transition-colors">Menu</a>
          <a href="#gallery" className="hover:text-[#C9974A] transition-colors">Gallery</a>
          <a href="#visit" className="hover:text-[#C9974A] transition-colors">Contact</a>
        </nav>

        {/* Social links */}
        <div className="flex gap-5 text-sm">
          <a
            href={siteInfo.instagram}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[#F6EEDF]/60 hover:text-[#C9974A] transition-colors"
          >
            Instagram <ExternalLink size={13} />
          </a>
          <a
            href={siteInfo.facebook}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[#F6EEDF]/60 hover:text-[#C9974A] transition-colors"
          >
            Facebook <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </footer>
  );
}
