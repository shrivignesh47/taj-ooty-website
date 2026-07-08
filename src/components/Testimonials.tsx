"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { testimonials } from "@/lib/data";

export default function Testimonials() {
  return (
    <section id="reviews" className="bg-[#F6EEDF] px-6 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-xl">
          <span className="eyebrow">What guests say</span>
          <h2 className="mt-4 font-display text-3xl text-[#4E1414] sm:text-4xl">
            Word of mouth, mostly about the biryani.
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.author}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: (i % 6) * 0.06 }}
              className="rounded-xl border border-[#4E1414]/10 bg-[#EFE3CC] p-6 hover:border-[#C9974A]/40 transition-colors"
            >
              <Quote className="mb-3 h-5 w-5 text-[#C9974A]" />
              <blockquote className="text-sm leading-relaxed text-[#241B15]/85">
                {t.quote}
              </blockquote>
              <figcaption className="mt-4 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#4E1414]">{t.author}</span>
                <span className="text-[#241B15]/50">{t.when}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
