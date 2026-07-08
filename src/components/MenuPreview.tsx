"use client";

import { motion } from "framer-motion";
import { menuCategories } from "@/lib/data";

export default function MenuPreview() {
  return (
    <section id="menu" className="relative bg-[#4E1414] px-6 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">The full spread</span>
            <h2 className="mt-4 font-display text-3xl text-[#F6EEDF] sm:text-4xl">
              Twenty-one menus, one kitchen.
            </h2>
          </div>
          <a
            href="/menu"
            className="rounded-full bg-[#C9974A] px-6 py-3 text-sm font-semibold text-[#241B15] transition-all hover:scale-[1.03] hover:bg-[#d2a260]"
          >
            View Full Menu
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {menuCategories.map((cat, i) => (
            <motion.a
              href="/menu"
              key={cat.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: (i % 10) * 0.04 }}
              className="group rounded-lg border border-[#C9974A]/20 bg-[#F6EEDF]/[0.05] p-4 transition-all hover:border-[#C9974A]/55 hover:bg-[#C9974A]/[0.08]"
            >
              <span className="font-display text-lg text-[#F6EEDF] group-hover:text-[#C9974A] transition-colors">
                {cat.name}
              </span>
              <span className="mt-1 block text-xs text-[#F6EEDF]/50">{cat.note}</span>
            </motion.a>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-[#F6EEDF]/50">
          Scan the QR code on your table to browse the live menu and place
          your order directly with our team.
        </p>
      </div>
    </section>
  );
}
