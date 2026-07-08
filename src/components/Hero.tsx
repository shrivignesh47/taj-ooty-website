"use client";

import { motion } from "framer-motion";
import HeroCarousel from "./HeroCarousel";

export default function Hero() {
    return (
        // Section: solid maroon bg — NO background image or video behind the text panel
        <section className="bg-[#4E1414] w-full pt-28 pb-16 sm:pt-32 sm:pb-20">
            <div className="mx-auto max-w-6xl px-6 sm:px-8">
                <div className="grid gap-12 md:grid-cols-[1fr_1fr] md:gap-16 md:items-center">

                    {/* ── LEFT: solid maroon text panel ─────────────────────────────── */}
                    <div>
                        {/* Eyebrow pill */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#C9974A]/40 bg-[#F6EEDF]/5 px-4 py-1.5"
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-[#C9974A]" />
                            <span className="eyebrow text-[#E4C88C]">Since 1992 · New Main Bazaar Road, Ooty</span>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
                            className="font-display text-5xl leading-[0.95] text-[#F6EEDF] sm:text-6xl lg:text-7xl"
                        >
                            Hotel Taj,
                            <br />
                            <span className="italic font-normal text-[#C9974A]">multi-cuisine</span>
                            <br />
                            Ooty
                        </motion.h1>

                        {/* Tagline */}
                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.25 }}
                            className="mt-6 max-w-md text-base text-[#F6EEDF]/75 leading-relaxed sm:text-lg"
                        >
                            Tradition and innovation on one plate — aromatic Indian delicacies,
                            coastal seafood, tandoor classics and global favourites, served in
                            the heart of the hills.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                            className="mt-9 flex flex-wrap items-center gap-4"
                        >
                            <a
                                href="/menu"
                                className="rounded-full bg-[#C9974A] px-7 py-3.5 text-sm font-semibold text-[#241B15] transition-all hover:scale-[1.03] hover:bg-[#d2a260]"
                            >
                                View Full Menu
                            </a>
                            <a
                                href="#visit"
                                className="rounded-full border border-[#F6EEDF]/35 px-7 py-3.5 text-sm font-semibold text-[#F6EEDF] transition-colors hover:bg-[#F6EEDF]/10"
                            >
                                Get Directions
                            </a>
                        </motion.div>

                        {/* Est. badge — inside the text column, not floating at section bottom */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.6 }}
                            className="mt-10 flex items-center gap-3"
                        >
                            <div className="h-px flex-1 bg-[#C9974A]/20" />
                            <span className="eyebrow text-[#C9974A]/60">Est. 1992 · Ooty</span>
                            <div className="h-px flex-1 bg-[#C9974A]/20" />
                        </motion.div>
                    </div>

                    {/* ── RIGHT: framed media carousel ─────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, x: 32 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
                        // px-4 on mobile so arrow overhang doesn't clip; md:px-8 on desktop
                        className="px-4 md:px-8"
                    >
                        <HeroCarousel />
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
