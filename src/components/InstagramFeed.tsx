"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Camera, Star } from "lucide-react";

export default function InstagramFeed() {
    const [scriptLoaded, setScriptLoaded] = useState(() => {
        if (typeof document !== "undefined") {
            return !!document.querySelector('script[src="https://static.elfsight.com/platform/platform.js"]');
        }
        return false;
    });

    const prefersReduced = useReducedMotion();

    useEffect(() => {
        if (scriptLoaded) return;
        const elfsightScript = document.createElement("script");
        elfsightScript.src = "https://static.elfsight.com/platform/platform.js";
        elfsightScript.async = true;
        elfsightScript.onload = () => setScriptLoaded(true);
        document.body.appendChild(elfsightScript);
        return () => {
            if (document.body.contains(elfsightScript)) {
                document.body.removeChild(elfsightScript);
            }
        };
    }, [scriptLoaded]);

    return (
        <section id="social" className="relative w-full bg-[#4E1414] overflow-hidden py-24 sm:py-32">

            {/* Subtle Pointillism / Dot Grid Paper Texture */}
            <div
                className="absolute inset-0 z-0 opacity-[0.08]"
                style={{
                    backgroundImage: "radial-gradient(#F6EEDF 1px, transparent 1px)",
                    backgroundSize: "16px 16px"
                }}
            />

            <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={prefersReduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }}
                    className="relative mx-auto flex w-full max-w-2xl flex-col drop-shadow-2xl"
                >
                    {/* CSS Mask for the Scalloped Top and Bottom */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        .torn-ticket-mask {
                            -webkit-mask-image: 
                                radial-gradient(circle at 10px 0px, transparent 5px, black 6px),
                                radial-gradient(circle at 10px 100%, transparent 5px, black 6px),
                                linear-gradient(black, black);
                            -webkit-mask-size: 20px 10px, 20px 10px, 100% calc(100% - 20px);
                            -webkit-mask-position: top, bottom, center;
                            -webkit-mask-repeat: repeat-x, repeat-x, no-repeat;
                        }
                    `}} />

                    {/* Full Ticket Wrapper */}
                    <div className="torn-ticket-mask flex flex-col w-full h-full bg-[#F6EEDF]">

                        {/* 1) Ticket Stub / Header (Maroon) */}
                        <div className="relative bg-[#350C0C] px-8 pt-14 pb-12 flex flex-col items-center">

                            {/* Rotated Corner Sticker details */}
                            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 rotate-12 rounded bg-[#C9974A] px-2 py-1 shadow shadow-black/20">
                                <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold tracking-widest text-[#241B15]">
                                    <Star size={10} className="fill-[#241B15] text-[#241B15]" />
                                    EST. 1992
                                </span>
                            </div>

                            {/* Camera Wax Seal Badge */}
                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#4E1414] border border-[#C9974A]/40 shadow-inner">
                                <Camera size={24} className="text-[#C9974A]" strokeWidth={1.5} />
                            </div>

                            {/* Ticket Heading */}
                            <h2 className="font-display text-3xl sm:text-4xl text-[#F6EEDF] text-center tracking-wide">
                                Fresh From The Pass
                            </h2>
                            {/* Typewriter Sub-handle */}
                            <div className="mt-4 rounded border border-[#C9974A]/20 bg-black/20 px-4 py-1.5 font-mono text-sm tracking-widest text-[#C9974A]">
                                @hotel_taj_ooty_
                            </div>
                        </div>

                        {/* 2) Perforation Divider Block */}
                        <div className="relative h-0 w-full z-10 flex items-center justify-center">
                            {/* Side cutouts (solid color matching background to fake the hole) */}
                            <div className="absolute -left-3 h-6 w-6 rounded-full bg-[#4E1414] shadow-inner" />
                            <div className="absolute -right-3 h-6 w-6 rounded-full bg-[#4E1414] shadow-inner" />
                            {/* Dashed line */}
                            <div className="w-full border-t-[3px] border-dashed border-[#C9974A]/40" />
                        </div>

                        {/* 3) Ticket Body / Polaroid Sleeve */}
                        <div className="bg-[#F6EEDF] px-4 pt-10 pb-14 sm:px-10">

                            <div className="relative w-full rounded-xl outline outline-1 outline-offset-4 outline-[#C9974A]/20 bg-white p-2 shadow-sm">
                                {/* Photo-strip frame bg */}
                                <div className="relative w-full overflow-hidden bg-[#350C0C] rounded-lg border border-[#C9974A]/30 min-h-[400px]">

                                    {/* Skeleton Loader matching theme */}
                                    {!scriptLoaded && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-0">
                                            <div className="w-12 h-12 rounded-full border-4 border-[#C9974A]/20 border-t-[#C9974A] animate-spin mb-6" />
                                            <div className="w-2/3 max-w-[200px] h-3 bg-[#C9974A]/10 rounded animate-pulse mb-3" />
                                        </div>
                                    )}

                                    {/* Elfsight Embed Element */}
                                    <div
                                        className="elfsight-app-292ddc9c-a038-4be3-8bc2-f0678f6e8966 relative z-10 w-full"
                                        data-elfsight-app-lazy
                                        style={{ minHeight: "400px", maxHeight: "650px" }}
                                    />
                                </div>
                                <div className="mt-3 text-center text-[10px] sm:text-xs font-mono font-semibold tracking-widest text-[#241B15]/40 uppercase">
                                    LIVE SOUVENIRS // TICKET NO. 8230
                                </div>
                            </div>

                        </div>

                    </div>
                </motion.div>
            </div>
        </section>
    );
}
