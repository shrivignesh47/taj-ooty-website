"use client";

import MenuBook from "@/components/MenuBook";

export default function MenuPreview() {
  return (
    <section id="menu" className="relative bg-[#4E1414] px-6 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center sm:text-left">
          <span className="eyebrow">The full spread</span>
          <h2 className="mt-4 font-display text-3xl text-[#F6EEDF] sm:text-4xl">
            Twenty-one menus, one kitchen.
          </h2>
        </div>

        {/* Embedded Interactive Viewer */}
        <div className="-mx-4 sm:mx-0">
          <MenuBook />
        </div>

        <p className="mt-8 text-center text-sm text-[#F6EEDF]/50 max-w-2xl mx-auto">
          Scan the QR code on your table to browse the live menu and place
          your order directly with our team.
        </p>
      </div>
    </section>
  );
}
