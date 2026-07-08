"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion, Variants } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";

const MENU_PAGES = [
    { src: "/Assets/Menus/hotel_Taj_Menu-01.jpg", label: "Cover" },
    { src: "/Assets/Menus/hotel_Taj_Menu-02.jpg", label: "Soup & Starters" },
    { src: "/Assets/Menus/hotel_Taj_Menu-03.jpg", label: "Shawarma & Tandoori" },
    { src: "/Assets/Menus/hotel_Taj_Menu-04.jpg", label: "Biryani & Mandi" },
    { src: "/Assets/Menus/hotel_Taj_Menu-05.jpg", label: "Rice & Noodles" },
    { src: "/Assets/Menus/hotel_Taj_Menu-06.jpg", label: "Veg & Non-Veg Gravy" },
    { src: "/Assets/Menus/hotel_Taj_Menu-07.jpg", label: "Seafood & Breads" },
    { src: "/Assets/Menus/hotel_Taj_Menu-08.jpg", label: "Drinks & Milkshakes" },
    { src: "/Assets/Menus/hotel_Taj_Menu-09.jpg", label: "Taj Signatures" },
    { src: "/Assets/Menus/hotel_Taj_Menu-010.jpg", label: "Momos & Rolls" },
    { src: "/Assets/Menus/hotel_Taj_Menu-011.jpg", label: "Contact Info" },
];

const CATEGORIES = [
    { name: "Cover", index: 0 },
    { name: "Soup & Starters", index: 1 },
    { name: "Shawarma & Tandoori", index: 2 },
    { name: "Biryani & Mandi", index: 3 },
    { name: "Rice & Noodles", index: 4 },
    { name: "Veg & Chicken Gravy", index: 5 },
    { name: "Seafood & Breads", index: 6 },
    { name: "Drinks & Milkshakes", index: 7 },
    { name: "Signatures", index: 8 },
    { name: "Momos & Rolls", index: 9 },
];

export default function MenuBook() {
    const [activePage, setActivePage] = useState(0);
    const [direction, setDirection] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const prefersReduced = useReducedMotion();
    const bookContainerRef = useRef<HTMLDivElement>(null);

    const handleNext = useCallback(() => {
        setDirection(1);
        setActivePage((prev) => (prev + 1) % MENU_PAGES.length);
    }, []);

    const handlePrev = useCallback(() => {
        setDirection(-1);
        setActivePage((prev) => (prev - 1 + MENU_PAGES.length) % MENU_PAGES.length);
    }, []);

    const jumpToPage = useCallback((index: number) => {
        if (index === activePage) return;
        setDirection(index > activePage ? 1 : -1);
        setActivePage(index);
    }, [activePage]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        const threshold = 50;
        if (Math.abs(diff) > threshold) {
            if (diff > 0) handleNext();
            else handlePrev();
        }
        touchStartX.current = null;
    }, [handleNext, handlePrev]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (zoomed) return;
            if (e.key === "ArrowRight") handleNext();
            else if (e.key === "ArrowLeft") handlePrev();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleNext, handlePrev, zoomed]);

    const pageTransitionVariants = {
        initial: (customDir: number) => {
            if (prefersReduced) return { opacity: 0 };
            return { rotateY: customDir > 0 ? 80 : -80, opacity: 0.4, scale: 0.98 };
        },
        animate: {
            rotateY: 0, opacity: 1, scale: 1,
            transition: { rotateY: { type: "spring", stiffness: 100, damping: 18 }, opacity: { duration: 0.22 }, scale: { duration: 0.25 } },
        },
        exit: (customDir: number) => {
            if (prefersReduced) return { opacity: 0, transition: { duration: 0.15 } };
            return {
                rotateY: customDir > 0 ? -80 : 80, opacity: 0.4, scale: 0.98,
                transition: { rotateY: { duration: 0.35, ease: "easeIn" }, opacity: { duration: 0.2 }, scale: { duration: 0.3 } },
            };
        },
    };

    return (
        <div className="mx-auto max-w-4xl px-2 py-0">
            {/* Category Quick-Jump Chips - tighter spacing */}
            <div className="mb-5 flex flex-wrap justify-center gap-1.5 px-0">
                {CATEGORIES.map((cat) => {
                    const isActive = activePage === cat.index;
                    return (
                        <button
                            key={cat.name}
                            onClick={() => jumpToPage(cat.index)}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-300 ${isActive
                                ? "bg-[#C9974A] text-[#241B15] shadow-md shadow-[#C9974A]/25 scale-[1.02]"
                                : "bg-[#350C0C] text-[#F6EEDF]/60 border border-[#C9974A]/10 hover:border-[#C9974A]/40 hover:text-[#F6EEDF]"
                                }`}
                        >
                            {cat.name}
                        </button>
                    );
                })}
            </div>

            {/* Main Book-style Page Viewer */}
            <div className="relative flex flex-col items-center">
                <div
                    ref={bookContainerRef}
                    className="relative flex items-center justify-center h-[65vh] max-h-[600px] min-h-[350px] aspect-[3/4]"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    style={{ perspective: 1500 }}
                >
                    {/* Previous Button (Left) */}
                    <button
                        onClick={handlePrev}
                        className="absolute -left-5 md:-left-8 z-30 rounded-full bg-[#350C0C] p-2.5 text-[#C9974A] border border-[#C9974A]/30 shadow-xl hover:bg-[#C9974A] hover:text-[#241B15] transition-all hover:scale-110"
                        aria-label="Previous Page"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    {/* Spine & Page Container - tightened padding and clear formatting */}
                    <div className="relative h-full w-full rounded-xl border border-[#C9974A]/30 bg-[#F6EEDF] p-1 shadow-[0_12px_36px_rgba(36,27,21,0.4)]">

                        <AnimatePresence initial={false} custom={direction} mode="popLayout">
                            <motion.div
                                key={activePage}
                                custom={direction}
                                variants={pageTransitionVariants as unknown as Variants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                style={{
                                    transformOrigin: "left center",
                                    transformStyle: prefersReduced ? "flat" : "preserve-3d",
                                }}
                                onClick={() => setZoomed(true)}
                                className="relative h-full w-full cursor-zoom-in overflow-hidden rounded-lg bg-[#F6EEDF] group"
                            >
                                <Image
                                    src={MENU_PAGES[activePage].src}
                                    alt={MENU_PAGES[activePage].label}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-[1.015]"
                                    sizes="(max-width: 640px) 100vw, 680px"
                                    priority
                                />

                                {/* Internal Spine Shadow Gradient for depth */}
                                <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-black/30 via-black/5 to-transparent mix-blend-multiply" />

                                <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition-colors duration-200 z-10" />

                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="flex items-center gap-2 rounded-full bg-[#241B15]/95 px-4 py-2 text-xs font-semibold tracking-wider text-[#F6EEDF] border border-[#C9974A]/40 shadow-lg">
                                        <ZoomIn size={14} className="text-[#C9974A]" />
                                        Click to Zoom
                                    </span>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Next Button (Right) */}
                    <button
                        onClick={handleNext}
                        className="absolute -right-5 md:-right-8 z-30 rounded-full bg-[#350C0C] p-2.5 text-[#C9974A] border border-[#C9974A]/30 shadow-xl hover:bg-[#C9974A] hover:text-[#241B15] transition-all hover:scale-110"
                        aria-label="Next Page"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Page Counter Indicator */}
                <div className="mt-4 flex flex-col items-center gap-1 text-center">
                    <p className="text-xs font-semibold text-[#F6EEDF]">
                        Page <span className="text-[#C9974A] font-bold">{activePage + 1}</span> of {MENU_PAGES.length}
                        <span className="text-[#F6EEDF]/40 font-normal ml-2 tracking-wide">— {MENU_PAGES[activePage].label}</span>
                    </p>
                </div>
            </div>

            {/* Filmstrip Navigator */}
            <div className="mt-6 border-t border-[#C9974A]/10 pt-4">
                <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-[#C9974A]/30 scrollbar-track-[#350C0C]">
                    {MENU_PAGES.map((page, idx) => {
                        const isSelected = activePage === idx;
                        return (
                            <button
                                key={page.src}
                                onClick={() => jumpToPage(idx)}
                                className={`relative aspect-[3/4] w-[4.5rem] flex-shrink-0 overflow-hidden rounded-md border-2 transition-all duration-300 ${isSelected
                                    ? "border-[#C9974A] shadow-[0_0_10px_rgba(201,151,74,0.3)] scale-[1.03] z-10"
                                    : "border-transparent bg-[#350C0C] opacity-40 hover:opacity-80 grayscale hover:grayscale-0"
                                    }`}
                                aria-label={`Go to page ${idx + 1}`}
                            >
                                <Image
                                    src={page.src}
                                    alt={page.label}
                                    fill
                                    className="object-cover"
                                    sizes="70px"
                                />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent py-0.5 text-center">
                                    <span className="text-[10px] font-bold text-white tracking-widest">{idx + 1}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Lightbox Overlay */}
            <AnimatePresence>
                {zoomed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
                        onClick={() => setZoomed(false)}
                    >
                        <button
                            onClick={() => setZoomed(false)}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 rounded-full bg-[#241B15] p-3 text-white border border-white/10 hover:bg-red-950 transition-colors"
                            aria-label="Close Lightbox"
                        >
                            <X size={20} />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                            className="absolute left-2 sm:left-6 z-10 rounded-full bg-[#241B15] p-3 sm:p-4 text-[#C9974A] border border-white/10 hover:bg-[#C9974A] hover:text-[#241B15] transition-all"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            transition={{ type: "spring", stiffness: 120, damping: 20 }}
                            className="relative max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl shadow-2xl cursor-zoom-out"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative aspect-[3/4] w-full">
                                <Image
                                    src={MENU_PAGES[activePage].src}
                                    alt={MENU_PAGES[activePage].label}
                                    fill
                                    className="object-contain"
                                    sizes="1000px"
                                    priority
                                />
                            </div>
                        </motion.div>

                        <button
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            className="absolute right-2 sm:right-6 z-10 rounded-full bg-[#241B15] p-3 sm:p-4 text-[#C9974A] border border-white/10 hover:bg-[#C9974A] hover:text-[#241B15] transition-all"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
