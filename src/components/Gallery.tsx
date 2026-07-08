"use client";

import { useState, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

// ── Gallery data (src + caption in one place) ─────────────────────────────────
const ITEMS = [
  { src: "/Assets/Gallery/IMG-20250224-WA0027.jpg", caption: "Al Faham Platter" },
  { src: "/Assets/Gallery/IMG-20250224-WA0042.jpg", caption: "Kuzhimandi Special" },
  { src: "/Assets/Gallery/IMG-20250224-WA0029.jpg", caption: "Biryani Feast" },
  { src: "/Assets/Gallery/IMG-20250224-WA0031.jpg", caption: "Tandoor Nights" },
  { src: "/Assets/Gallery/IMG-20250224-WA0033.jpg", caption: "Grilled Delights" },
  { src: "/Assets/Gallery/IMG-20250224-WA0034.jpg", caption: "Chef's Special" },
  { src: "/Assets/Gallery/IMG-20250224-WA0035.jpg", caption: "Coastal Catch" },
  { src: "/Assets/Gallery/IMG-20250224-WA0036.jpg", caption: "Rice Corner" },
  { src: "/Assets/Gallery/IMG-20250224-WA0041.jpg", caption: "Beef with Paratha" },
];

// Wide cards (sm:col-span-2). With a 4-column grid and auto-placement, items
// 0, 4, 8 shift the wide band across different column positions each row:
//   Row 1: [0-wide(1-2)] [1] [2]
//   Row 2: [3] [4-wide(2-3)] [5]
//   Row 3: [6] [7] [8-wide(3-4)]
//   Row 4: [9-wide(1-2)] [10] [11]
const WIDE = new Set([0, 4, 8]);

// ── GalleryCard ───────────────────────────────────────────────────────────────
type CardProps = {
  item: (typeof ITEMS)[0];
  index: number;
  isHovered: boolean;
  dimmed: boolean;
  onEnter: () => void;
  onLeave: () => void;
};

function GalleryCard({ item, index, isHovered, dimmed, onEnter, onLeave }: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const prefersReduced = useReducedMotion();
  const isWide = WIDE.has(index);

  // Cursor-tracking 3D tilt — desktop only, skipped when reduced-motion is on
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReduced || !cardRef.current) return;
      const r = cardRef.current.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2); // -1..1
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2); // -1..1
      setTilt({ x: -dy * 6, y: dx * 6 });
    },
    [prefersReduced]
  );

  const handleLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    onLeave();
  }, [onLeave]);

  // Fast transition on hover (snappy tilt tracking); slow spring-back on leave
  const cssTransition = isHovered
    ? "transform 0.1s ease-out, opacity 0.3s ease, box-shadow 0.3s ease"
    : "transform 0.45s ease-out,  opacity 0.3s ease, box-shadow 0.3s ease";

  const transform = prefersReduced
    ? `scale(${isHovered ? 1.04 : 1})`
    : `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.04 : 1})`;

  return (
    // Outer motion.div handles scroll-in stagger; col-span class lives here
    <motion.div
      className={isWide ? "sm:col-span-2" : undefined}
      initial={{ opacity: 0, y: prefersReduced ? 0 : 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={
        prefersReduced
          ? { duration: 0 }
          : { duration: 0.5, delay: index * 0.055, ease: "easeOut" }
      }
    >
      {/* Inner div: interaction transforms via CSS (not Framer Motion) */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-xl w-full cursor-pointer"
        style={{
          aspectRatio: isWide ? "16 / 9" : "1 / 1",
          transform,
          opacity: dimmed ? 0.82 : 1,
          transition: cssTransition,
          boxShadow: isHovered
            ? "0 14px 40px rgba(0,0,0,0.32), 0 4px 12px rgba(0,0,0,0.18)"
            : "0 2px 10px rgba(0,0,0,0.10)",
          willChange: "transform",
        }}
        onMouseEnter={onEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleLeave}
        // Touch: shows caption, no tilt
        onTouchStart={onEnter}
        onTouchEnd={handleLeave}
      >
        {/* Photo */}
        <Image
          src={item.src}
          alt={item.caption}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes={
            isWide
              ? "(max-width:640px) 100vw, 50vw"
              : "(max-width:640px) 50vw, 25vw"
          }
          priority={index < 4}
        />

        {/* Mobile caption — always visible at small screens */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2.5 sm:hidden">
          <p className="text-[0.72rem] font-semibold text-white leading-snug">
            {item.caption}
          </p>
        </div>

        {/* Desktop hover caption — slides up from bottom on hover */}
        <div
          className="absolute bottom-0 inset-x-0 px-3 pb-3 pt-8 hidden sm:block"
          style={{
            background:
              "linear-gradient(to top, rgba(53,12,12,0.92) 0%, rgba(53,12,12,0.48) 55%, transparent 100%)",
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
          }}
        >
          <p className="text-sm font-semibold text-[#F6EEDF] leading-snug">
            {item.caption}
          </p>
          <div className="mt-1 h-px w-7 bg-[#C9974A]" />
        </div>

        {/* Thin gold border on hover (inset — no layout shift) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-200"
          style={{
            border: "1px solid #C9974A",
            opacity: isHovered ? 1 : 0,
          }}
        />
      </div>
    </motion.div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function Gallery() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section id="gallery" className="bg-[#EFE3CC] px-6 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">

        {/* Section heading — kept exactly as before */}
        <div className="mb-12 max-w-xl">
          <span className="eyebrow">From our kitchen</span>
          <h2 className="mt-4 font-display text-3xl text-[#4E1414] sm:text-4xl">
            A wall of dishes, pinned like a chef&apos;s recipe box.
          </h2>
          <p className="mt-4 text-[#241B15]/70">
            Real food, real moments — straight from our kitchen to your screen.
          </p>
        </div>

        {/* Bento masonry grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ITEMS.map((item, i) => (
            <GalleryCard
              key={item.src}
              item={item}
              index={i}
              isHovered={hovered === i}
              dimmed={hovered !== null && hovered !== i}
              onEnter={() => setHovered(i)}
              onLeave={() => setHovered(null)}
            />
          ))}
        </div>

        {/* Instagram link — kept exactly as before */}
        <div className="mt-10 flex justify-center">
          <a
            href="https://www.instagram.com/hotel_taj_ooty_/"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-[#C9974A] hover:text-[#4E1414] transition-colors"
          >
            See more on Instagram →
          </a>
        </div>

      </div>
    </section>
  );
}
