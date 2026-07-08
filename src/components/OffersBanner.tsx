"use client";

const messages = [
    "🍽️ Special Offers Available — Dine In & Enjoy",
    "🔥 Beef Biryani — House Special",
    "🌿 Fresh Ingredients. Every Single Day.",
    "🎉 Order via QR Code at Your Table",
    "⭐ Rated Best Multi-Cuisine in Ooty",
    "🚀 Fast Delivery via Swiggy & Zomato",
    "🍗 Al Faham · Tandoori · Shawarma · Kuzhimandi",
    "☎️  Call us: +91 89404 03040",
];

export default function OffersBanner() {
    const doubled = [...messages, ...messages];

    return (
        <div
            className="relative z-[60] flex items-center overflow-hidden"
            style={{ backgroundColor: "#F6EEDF", height: "36px" }}
            aria-label="Offers and announcements"
        >
            <div className="flex-1 overflow-hidden">
                <div className="animate-marquee">
                    {doubled.map((msg, i) => (
                        <span
                            key={i}
                            className="inline-block whitespace-nowrap px-10 text-xs font-semibold tracking-wider text-[#4e1414]"
                        >
                            {msg}
                            <span className="ml-8 text-[#C9974A] select-none">✦</span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
