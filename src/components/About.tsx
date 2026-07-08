"use client";

import { motion } from "framer-motion";

function SealBadge() {
    return (
        <div className="relative mx-auto flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
                <circle cx="100" cy="100" r="94" fill="none" stroke="#C9974A" strokeWidth="1.5" strokeDasharray="2 6" />
                <circle cx="100" cy="100" r="80" fill="#4E1414" />
                <circle cx="100" cy="100" r="80" fill="none" stroke="#C9974A" strokeWidth="1" />
            </svg>
            <div className="relative z-10 flex flex-col items-center text-[#F6EEDF]">
                <span className="eyebrow !text-[#E4C88C]">Est.</span>
                <span className="font-display text-4xl text-[#F6EEDF]">1992</span>
                <span className="mt-1 text-[0.65rem] tracking-[0.2em] text-[#F6EEDF]/60">OOTY</span>
            </div>
        </div>
    );
}

export default function About() {
    return (
        <section id="about" className="relative bg-[#F6EEDF] px-6 py-24 sm:px-8 sm:py-32">
            <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.7 }}
                >
                    <span className="eyebrow">Our Vision</span>
                    <h2 className="mt-4 font-display text-3xl leading-tight text-[#4E1414] sm:text-4xl">
                        A cherished dining destination, built one memorable meal at a time.
                    </h2>
                    <p className="mt-5 text-[#241B15]/80 leading-relaxed">
                        To become a cherished dining destination known for delivering
                        unforgettable culinary experiences, where every meal brings joy,
                        comfort, and a sense of togetherness, inspiring a love for great
                        food and exceptional service.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="order-first md:order-none"
                >
                    <SealBadge />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.7 }}
                >
                    <span className="eyebrow">Our Mission</span>
                    <h2 className="mt-4 font-display text-3xl leading-tight text-[#4E1414] sm:text-4xl">
                        Freshly prepared, thoughtfully served, every single visit.
                    </h2>
                    <p className="mt-5 text-[#241B15]/80 leading-relaxed">
                        To delight our guests with a wide range of freshly prepared,
                        high-quality dishes that celebrate flavor and tradition. We are
                        committed to providing warm, attentive service, maintaining the
                        highest standards of cleanliness, and creating a welcoming
                        atmosphere where every visit feels like a celebration of great food.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
