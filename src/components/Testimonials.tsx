"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { testimonials } from "@/lib/data";

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(true);

  const prefersReduced = useReducedMotion();
  const N = testimonials.length;

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const applyInitial = () => setIsMobile(mql.matches);
    applyInitial();
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % N);
    setProgress(0);
  }, [N]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + N) % N);
    setProgress(0);
  }, [N]);

  useEffect(() => {
    if (prefersReduced || isPaused) {
      return;
    }

    // 6000ms auto-advance, update every 30ms (~33fps smooth)
    const intervalTime = 30;
    const totalTime = 6000;
    const increment = (intervalTime / totalTime) * 100;

    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + increment;
        if (next >= 100) {
          goNext();
          return 0;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPaused, prefersReduced, goNext, activeIndex, N]);

  // Gestures
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goNext();
        else goPrev();
      }
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  const getOffset = (idx: number) => {
    let diff = idx - activeIndex;
    if (diff > N / 2) diff -= N;
    if (diff < -N / 2) diff += N;
    return diff;
  };

  return (
    <section id="reviews" className="bg-[#efe3cc] px-6 py-20 sm:px-8 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-xl text-center sm:text-left">
          <span className="eyebrow">What guests say</span>
          <h2 className="mt-4 font-display text-3xl text-[#350c0c] sm:text-4xl">
            Word of mouth, mostly about the biryani.
          </h2>
        </div>

        {/* Carousel Container */}
        <div
          className="relative mx-auto flex h-80 sm:h-72 w-full max-w-[90vw] md:max-w-2xl items-center justify-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Arrow Nav */}
          <button
            onClick={goPrev}
            className="absolute -left-2 sm:-left-16 z-30 rounded-full bg-[#350c0c] p-2.5 sm:p-3 text-[#C9974A] border border-[#C9974A]/20 shadow-xl hover:bg-[#C9974A] hover:text-[#241B15] transition-all"
            aria-label="Previous Testimonial"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="relative h-full w-full max-w-md perspective-[1000px] flex items-center justify-center">
            <AnimatePresence initial={false}>
              {testimonials.map((t, idx) => {
                const offset = getOffset(idx);
                const isActive = offset === 0;
                const isSide = Math.abs(offset) === 1;

                let x = "0%";
                let opacity = 1;
                let scale = 1;
                let zIndex = 20;

                if (!isActive) {
                  if (isMobile) {
                    x = offset < 0 ? "-120%" : "120%";
                    opacity = 0;
                    scale = 0.8;
                    zIndex = 10;
                  } else {
                    x = offset < 0 ? "-65%" : "65%";
                    opacity = isSide ? 0.4 : 0;
                    scale = 0.85;
                    zIndex = isSide ? 10 : 0;
                  }
                }

                if (Math.abs(offset) > 1 && !isMobile) {
                  x = offset < 0 ? "-120%" : "120%";
                  opacity = 0;
                }

                return (
                  <motion.figure
                    key={t.author}
                    layoutId={`testimony-${idx}`}
                    animate={{ x, scale, opacity, zIndex }}
                    transition={{ type: "spring", stiffness: 180, damping: 22 }}
                    className={`absolute flex h-full w-full flex-col justify-between rounded-xl border border-[#C9974A]/20 bg-[#350C0C] p-6 sm:p-8 shadow-2xl ${isActive ? "cursor-auto" : "cursor-pointer"}`}
                    onClick={() => {
                      if (!isActive && isSide && !isMobile) {
                        if (offset < 0) goPrev();
                        else goNext();
                      }
                    }}
                  >
                    <div>
                      {/* Glow Icon wrapping */}
                      <motion.div
                        animate={
                          isActive && !prefersReduced
                            ? { filter: ["drop-shadow(0px 0px 0px rgba(201,151,74,0))", "drop-shadow(0px 0px 8px rgba(201,151,74,0.7))", "drop-shadow(0px 0px 0px rgba(201,151,74,0))"] }
                            : { filter: "drop-shadow(0px 0px 0px rgba(0,0,0,0))" }
                        }
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        className="inline-block"
                      >
                        <Quote className="mb-4 h-6 w-6 sm:h-8 sm:w-8 text-[#C9974A]" />
                      </motion.div>
                      <blockquote className="text-sm sm:text-base leading-relaxed text-[#F6EEDF] font-medium">
                        {t.quote}
                      </blockquote>
                    </div>

                    <figcaption className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                      <span className="font-semibold text-[#C9974A]">{t.author}</span>
                      <span className="text-xs text-[#F6EEDF]/50 italic">{t.when}</span>
                    </figcaption>
                  </motion.figure>
                );
              })}
            </AnimatePresence>
          </div>

          <button
            onClick={goNext}
            className="absolute -right-2 sm:-right-16 z-30 rounded-full bg-[#350C0C] p-2.5 sm:p-3 text-[#C9974A] border border-[#C9974A]/20 shadow-xl hover:bg-[#C9974A] hover:text-[#241B15] transition-all"
            aria-label="Next Testimonial"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Progress Bar / Indicator */}
        <div className="mx-auto mt-12 sm:mt-16 max-w-[200px] h-1.5 overflow-hidden rounded-full bg-[#1e0707] border border-[#C9974A]/10 relative">
          <motion.div
            className="absolute top-0 left-0 bottom-0 bg-[#C9974A]"
            style={{ width: `${progress}%` }}
            animate={prefersReduced ? { width: `${((activeIndex + 1) / N) * 100}%` } : { width: `${progress}%` }}
            transition={prefersReduced ? { duration: 0.3 } : { duration: 0 }}
          />
        </div>
      </div>
    </section>
  );
}
