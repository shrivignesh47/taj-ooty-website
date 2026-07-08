"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Slide list ───────────────────────────────────────────────────────────────
// Lead must be a vivid food photo (not the dark logo/sparkle video).
export type Slide = {
    type: "video" | "image";
    src: string;
    hasOverlayText?: boolean;
};

export const SLIDES: Slide[] = [
    { type: "image", src: "/Assets/Gallery/IMG-20250224-WA0033.jpg" }, // ①  lead food photo
    { type: "image", src: "/Assets/posters/pt2.jpg" },
    { type: "video", src: "/Assets/tajbg1.mp4" },                      // ③  ~4 MB
    { type: "image", src: "/Assets/posters/pt3.jpg" },
    { type: "image", src: "/Assets/posters/pt1.jpg" },
    { type: "video", src: "/Assets/tajbg.mp4" },                       // ⑥  ~27 MB
    { type: "image", src: "/Assets/posters/pt8.png" },
    { type: "image", src: "/Assets/posters/pt5.jpg" },
    { type: "video", src: "/Assets/tajbg2.mp4" },                      // ⑨  ~73 MB
    { type: "image", src: "/Assets/Gallery/IMG-20250224-WA0027.jpg" },
    { type: "video", src: "/Assets/d.mp4" },                           // ⑪  dark logo — late
];

const DURATION = 7000;  // ms per slide
const FADE_MS = 800;   // crossfade duration

// ─── Component ────────────────────────────────────────────────────────────────
export default function HeroCarousel() {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
        typeof window !== "undefined"
            ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
            : false
    );
    // Cycle counter per image slide — bumping causes kenburns-wrapper remount
    const [cycle, setCycle] = useState<number[]>(new Array(SLIDES.length).fill(0));

    const vidRefs = useRef<(HTMLVideoElement | null)[]>(new Array(SLIDES.length).fill(null));
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Listen for OS reduced-motion toggle
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mq.addEventListener("change", h);
        return () => mq.removeEventListener("change", h);
    }, []);

    // Play active video, pause all others
    useEffect(() => {
        SLIDES.forEach((sl, i) => {
            const v = vidRefs.current[i];
            if (!v || sl.type !== "video") return;
            if (i === active && !reducedMotion) {
                v.currentTime = 0;
                v.play().catch(() => { });
            } else {
                v.pause();
            }
        });
    }, [active, reducedMotion]);

    const goTo = useCallback((i: number) => {
        if (i === active) return;
        setActive(i);
        if (SLIDES[i].type === "image") {
            setCycle(prev => { const c = [...prev]; c[i]++; return c; });
        }
    }, [active]);

    const advance = useCallback(() => {
        setActive(cur => {
            const nxt = (cur + 1) % SLIDES.length;
            if (SLIDES[nxt].type === "image") {
                setCycle(prev => { const c = [...prev]; c[nxt]++; return c; });
            }
            return nxt;
        });
    }, []);

    const prev = useCallback(() => goTo((active - 1 + SLIDES.length) % SLIDES.length), [active, goTo]);
    const next = useCallback(() => goTo((active + 1) % SLIDES.length), [active, goTo]);

    useEffect(() => {
        if (reducedMotion || paused) return;
        timer.current = setTimeout(advance, DURATION);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [active, paused, reducedMotion, advance]);

    // ── Reduced-motion fallback: single static food photo ─────────────────────
    if (reducedMotion) {
        return (
            <div style={{
                borderRadius: "14px", border: "1.5px solid #C9974A", overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.28), 0 2px 8px rgba(201,151,74,0.10)"
            }}>
                <div className="relative w-full" style={{ paddingBottom: "75%" }}>
                    <Image
                        src="/Assets/Gallery/IMG-20250224-WA0033.jpg"
                        alt="Hotel Taj Ooty food"
                        fill className="object-cover" priority
                    />
                </div>
            </div>
        );
    }

    // ── Full carousel ──────────────────────────────────────────────────────────
    return (
        <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
        >
            {/* ── Card frame: plain rectangle with rounded corners ── */}
            <div
                className="relative overflow-hidden"
                style={{
                    borderRadius: "14px",
                    border: "1.5px solid #C9974A",
                    boxShadow:
                        "0 8px 32px rgba(0,0,0,0.30), " +
                        "0 2px 8px rgba(0,0,0,0.20), " +
                        "0 0 0 1px rgba(201,151,74,0.08)",
                }}
            >
                {/* ── Slides ── */}
                {SLIDES.map((sl, i) => {
                    const on = i === active;
                    return (
                        <div
                            key={sl.src}
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                opacity: on ? 1 : 0,
                                transition: `opacity ${FADE_MS}ms ease-in-out`,
                                zIndex: on ? 1 : 0,
                            }}
                            aria-hidden={!on}
                        >
                            {sl.type === "video" ? (
                                <video
                                    ref={el => { vidRefs.current[i] = el; }}
                                    className="absolute inset-0 h-full w-full object-cover"
                                    style={{ filter: "contrast(1.05) saturate(1.1)" }}
                                    muted loop playsInline
                                    preload={i <= 2 ? "auto" : "metadata"}
                                >
                                    <source src={sl.src} type="video/mp4" />
                                </video>
                            ) : (
                                <div
                                    key={`kb-${sl.src}-${cycle[i]}`}
                                    className={`absolute inset-0${on ? " kenburns-wrapper" : ""}`}
                                >
                                    <Image
                                        src={sl.src} alt="" fill
                                        className="object-cover"
                                        priority={i === 0}
                                        sizes="(max-width:768px) 100vw, 50vw"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Sizing ghost — 4:3 landscape aspect ratio */}
                <div className="w-full" style={{ paddingBottom: "75%" }} />
            </div>

            {/* ── Prev arrow — just outside card left edge, vertically centered ── */}
            <button
                onClick={prev}
                aria-label="Previous slide"
                className="absolute top-1/2 -translate-y-1/2 -left-5 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-[#350C0C] border border-[#C9974A]/50 text-[#F6EEDF] transition-all hover:bg-[#C9974A] hover:text-[#241B15] hover:border-[#C9974A] shadow-md"
            >
                <ChevronLeft size={17} strokeWidth={2.5} />
            </button>

            {/* ── Next arrow — just outside card right edge, vertically centered ── */}
            <button
                onClick={next}
                aria-label="Next slide"
                className="absolute top-1/2 -translate-y-1/2 -right-5 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-[#350C0C] border border-[#C9974A]/50 text-[#F6EEDF] transition-all hover:bg-[#C9974A] hover:text-[#241B15] hover:border-[#C9974A] shadow-md"
            >
                <ChevronRight size={17} strokeWidth={2.5} />
            </button>

            {/* ── Dot indicators — directly below the card ── */}
            <div
                className="mt-4 flex justify-center items-center gap-2"
                role="tablist"
                aria-label="Carousel slides"
            >
                {SLIDES.map((sl, i) => (
                    <button
                        key={i}
                        role="tab"
                        aria-selected={i === active}
                        aria-label={`Slide ${i + 1}${sl.type === "video" ? " (video)" : ""}`}
                        onClick={() => goTo(i)}
                        className={`rounded-full transition-all duration-300 ${i === active
                                ? "w-6 h-1.5 bg-[#C9974A]"
                                : "w-1.5 h-1.5 bg-[#F6EEDF]/35 hover:bg-[#F6EEDF]/60"
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
