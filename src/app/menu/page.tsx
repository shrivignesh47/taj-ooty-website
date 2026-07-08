"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

const menuPages = [
    { src: "/Assets/Menus/hotel_Taj_Menu-01.jpg", label: "Cover" },
    { src: "/Assets/Menus/hotel_Taj_Menu-02.jpg", label: "Page 2" },
    { src: "/Assets/Menus/hotel_Taj_Menu-03.jpg", label: "Page 3" },
    { src: "/Assets/Menus/hotel_Taj_Menu-04.jpg", label: "Page 4" },
    { src: "/Assets/Menus/hotel_Taj_Menu-05.jpg", label: "Page 5" },
    { src: "/Assets/Menus/hotel_Taj_Menu-06.jpg", label: "Page 6" },
    { src: "/Assets/Menus/hotel_Taj_Menu-07.jpg", label: "Page 7" },
    { src: "/Assets/Menus/hotel_Taj_Menu-08.jpg", label: "Page 8" },
    { src: "/Assets/Menus/hotel_Taj_Menu-09.jpg", label: "Page 9" },
    { src: "/Assets/Menus/hotel_Taj_Menu-010.jpg", label: "Page 10" },
    { src: "/Assets/Menus/hotel_Taj_Menu-011.jpg", label: "Page 11" },
];

export default function MenuPage() {
    const [active, setActive] = useState<number | null>(null);
    const [zoomed, setZoomed] = useState(false);

    const open = useCallback((i: number) => {
        setActive(i);
        setZoomed(false);
    }, []);

    const close = useCallback(() => {
        setActive(null);
        setZoomed(false);
    }, []);

    const prev = useCallback(() => {
        setActive((a) => (a !== null ? (a - 1 + menuPages.length) % menuPages.length : 0));
        setZoomed(false);
    }, []);

    const next = useCallback(() => {
        setActive((a) => (a !== null ? (a + 1) % menuPages.length : 0));
        setZoomed(false);
    }, []);

    // Keyboard navigation
    const handleKey = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "ArrowRight") next();
            if (e.key === "ArrowLeft") prev();
            if (e.key === "Escape") close();
        },
        [next, prev, close]
    );

    return (
        <div className="min-h-screen bg-[#4E1414] pt-28 pb-20 px-6 sm:px-8">
            {/* Header */}
            <div className="mx-auto max-w-5xl mb-12 text-center">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[#F6EEDF]/60 hover:text-[#C9974A] text-sm transition-colors mb-8"
                >
                    ← Back to Home
                </Link>
                <p className="eyebrow mb-3">Hotel Taj Ooty</p>
                <h1 className="font-display text-4xl text-[#F6EEDF] sm:text-5xl">
                    Our <span className="italic font-normal text-[#C9974A]">Menu</span>
                </h1>
                <p className="mt-4 text-[#F6EEDF]/60 max-w-md mx-auto text-sm">
                    Browse through all 11 pages of our physical menu card. Tap any page to zoom in.
                </p>
            </div>

            {/* Thumbnail grid */}
            <div className="mx-auto max-w-5xl grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {menuPages.map((page, i) => (
                    <motion.button
                        key={page.src}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.04 }}
                        onClick={() => open(i)}
                        className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-[#C9974A]/20 bg-[#350C0C] shadow-lg hover:border-[#C9974A]/55 transition-all hover:shadow-[0_0_24px_rgba(201,151,74,0.25)]"
                        aria-label={`Open menu ${page.label}`}
                    >
                        <Image
                            src={page.src}
                            alt={page.label}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-[#350C0C]/0 group-hover:bg-[#350C0C]/50 transition-colors flex items-center justify-center">
                            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={28} />
                        </div>
                        {/* Page label */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#350C0C] to-transparent px-3 py-2">
                            <span className="text-xs font-medium text-[#F6EEDF]">{page.label}</span>
                        </div>
                    </motion.button>
                ))}
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {active !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-sm flex items-center justify-center"
                        onClick={close}
                        onKeyDown={handleKey}
                        tabIndex={0}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu page viewer"
                    >
                        {/* Close */}
                        <button
                            onClick={close}
                            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                            aria-label="Close"
                        >
                            <X size={22} />
                        </button>

                        {/* Prev */}
                        <button
                            onClick={(e) => { e.stopPropagation(); prev(); }}
                            className="absolute left-4 z-10 rounded-full bg-[#F6EEDF]/10 p-3 text-[#F6EEDF] hover:bg-[#C9974A] hover:text-[#241B15] transition-colors"
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        {/* Image — click to toggle zoom */}
                        <motion.div
                            key={active}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.92 }}
                            transition={{ duration: 0.2 }}
                            className={`relative max-h-[88vh] overflow-auto rounded-lg shadow-2xl transition-transform ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                                }`}
                            onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
                            style={{ width: zoomed ? "min(90vw, 900px)" : "min(72vw, 700px)" }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={menuPages[active].src}
                                alt={menuPages[active].label}
                                className="w-full h-auto rounded-lg"
                            />
                        </motion.div>

                        {/* Next */}
                        <button
                            onClick={(e) => { e.stopPropagation(); next(); }}
                            className="absolute right-4 z-10 rounded-full bg-[#F6EEDF]/10 p-3 text-[#F6EEDF] hover:bg-[#C9974A] hover:text-[#241B15] transition-colors"
                            aria-label="Next page"
                        >
                            <ChevronRight size={24} />
                        </button>

                        {/* Page counter */}
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <span className="text-sm text-[#F6EEDF]/60">
                                {active + 1} / {menuPages.length}
                            </span>
                            <div className="flex gap-1.5">
                                {menuPages.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={(e) => { e.stopPropagation(); open(i); }}
                                        className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-[#C9974A]" : "w-1.5 bg-[#F6EEDF]/30"
                                            }`}
                                        aria-label={`Go to page ${i + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
