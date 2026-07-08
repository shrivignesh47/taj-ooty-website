"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { MapPin, Phone } from "lucide-react";
import { siteInfo } from "@/lib/data";

export default function Visit() {
  const [sent, setSent] = useState(false);

  return (
    <section id="visit" className="bg-[#f6eedf] px-6 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <span className="eyebrow">Visit us</span>
        <h2 className="mt-4 font-display text-3xl text-[#4E1414] sm:text-4xl">
          Find us on New Main Bazaar Road.
        </h2>

        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-xl border border-[#4E1414]/15"
          >
            <iframe
              src={siteInfo.mapsEmbed}
              className="h-80 w-full md:h-full"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Hotel Taj Ooty location"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="mb-8 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#C9974A]" />
                <p className="text-sm text-[#241B15]/80">{siteInfo.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-[#C9974A]" />
                <a
                  href={`tel:${siteInfo.phone.replace(/\s/g, "")}`}
                  className="text-sm text-[#241B15]/80 hover:text-[#4E1414] transition-colors"
                >
                  {siteInfo.phone}
                </a>
              </div>
            </div>

            {sent ? (
              <div className="rounded-lg border border-[#C9974A]/30 bg-[#C9974A]/10 p-5 text-sm text-[#241B15]">
                Thanks — your message has been sent. We&apos;ll get back to you shortly.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="space-y-4"
              >
                <input
                  required
                  placeholder="Name"
                  className="w-full rounded-lg border border-[#241B15]/15 bg-[#F6EEDF] px-4 py-3 text-sm text-[#241B15] placeholder:text-[#241B15]/40 outline-none focus:border-[#C9974A] transition-colors"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  className="w-full rounded-lg border border-[#241B15]/15 bg-[#F6EEDF] px-4 py-3 text-sm text-[#241B15] placeholder:text-[#241B15]/40 outline-none focus:border-[#C9974A] transition-colors"
                />
                <textarea
                  required
                  rows={4}
                  placeholder="Message"
                  className="w-full rounded-lg border border-[#241B15]/15 bg-[#F6EEDF] px-4 py-3 text-sm text-[#241B15] placeholder:text-[#241B15]/40 outline-none focus:border-[#C9974A] transition-colors"
                />
                <button
                  type="submit"
                  className="rounded-full bg-[#4E1414] px-6 py-3 text-sm font-semibold text-[#F6EEDF] transition-all hover:scale-[1.02] hover:bg-[#5C1616]"
                >
                  Send Message
                </button>
              </form>
            )}

            {/* Delivery platforms */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span className="text-xs font-medium text-[#241B15]/60">Order delivery:</span>

              <a
                href={siteInfo.swiggy}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full border border-[#241B15]/12 bg-[#F6EEDF] px-4 py-2 transition-all hover:border-orange-400/50 hover:scale-[1.03]"
                aria-label="Order on Swiggy"
              >
                <Image
                  src="/Assets/zomato/swiggy1.svg"
                  alt="Swiggy"
                  width={60}
                  height={20}
                  className="h-5 w-auto object-contain"
                />
              </a>

              <a
                href={siteInfo.zomato}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full border border-[#241B15]/12 bg-[#F6EEDF] px-4 py-2 transition-all hover:border-red-500/50 hover:scale-[1.03]"
                aria-label="Order on Zomato"
              >
                <Image
                  src="/Assets/zomato/zomato2.png"
                  alt="Zomato"
                  width={60}
                  height={20}
                  className="h-5 w-auto object-contain"
                />
              </a>

              <Image
                src="/Assets/zomato/delivery.gif"
                alt=""
                width={40}
                height={40}
                className="h-8 w-auto object-contain opacity-80"
                unoptimized
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
