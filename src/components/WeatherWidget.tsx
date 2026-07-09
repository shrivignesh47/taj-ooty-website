"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { getWeatherFoodSuggestion } from "@/lib/weatherSuggestions";

type WeatherPhase = 'none' | 'sunrise' | 'sunset';
type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'thunder' | 'fog';

interface WeatherData {
    temp: number;
    code: number;
    isDay: number;
    phase: WeatherPhase;
    condition: WeatherCondition;
}

const mapWmoCode = (code: number): WeatherCondition => {
    if (code <= 1) return 'clear';
    if (code === 2 || code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 51 && code <= 67) return 'rain';
    if (code >= 80 && code <= 82) return 'rain';
    if (code >= 71 && code <= 77) return 'rain';
    if (code === 85 || code === 86) return 'rain';
    if (code >= 95) return 'thunder';
    return 'cloudy'; // fallback
};

export default function WeatherWidget({ compact = false }: { compact?: boolean }) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [timeStr, setTimeStr] = useState(() => {
        if (typeof window !== "undefined") {
            return new Date().toLocaleTimeString("en-US", {
                timeZone: "Asia/Kolkata",
                hour: "numeric",
                minute: "2-digit"
            });
        }
        return "";
    });
    const [error, setError] = useState(false);

    // Popover & Badge State
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [showBadge, setShowBadge] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const prefersReduced = useReducedMotion();

    // Time ticker
    useEffect(() => {
        const formatTime = () => {
            return new Date().toLocaleTimeString("en-US", {
                timeZone: "Asia/Kolkata",
                hour: "numeric",
                minute: "2-digit"
            });
        };
        const timeInterval = setInterval(() => {
            setTimeStr(formatTime());
        }, 1000);
        return () => clearInterval(timeInterval);
    }, []);

    // Weather API routine
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const url = "https://api.open-meteo.com/v1/forecast?latitude=11.4064&longitude=76.6932&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&timezone=Asia%2FKolkata";
                const res = await fetch(url);
                if (!res.ok) throw new Error("API failed");
                const data = await res.json();

                const cur = data.current;
                const daily = data.daily;
                let phase: WeatherPhase = 'none';

                if (daily && daily.sunrise?.length > 0 && daily.sunset?.length > 0) {
                    const now = Date.now();
                    const sr = new Date(daily.sunrise[0]).getTime();
                    const ss = new Date(daily.sunset[0]).getTime();
                    const range = 60 * 60 * 1000;
                    if (Math.abs(now - sr) < range) phase = 'sunrise';
                    else if (Math.abs(now - ss) < range) phase = 'sunset';
                }

                setWeather({
                    temp: Math.round(cur.temperature_2m),
                    code: cur.weather_code,
                    isDay: cur.is_day,
                    phase,
                    condition: mapWmoCode(cur.weather_code)
                });
                setError(false);
            } catch (err) {
                console.error("Weather fetch error", err);
                setError(true);
            }
        };

        fetchWeather();
        const weatherInterval = setInterval(fetchWeather, 15 * 60 * 1000);
        return () => clearInterval(weatherInterval);
    }, []);

    // Auto-open logic & tracking
    useEffect(() => {
        if (!weather || error || typeof window === 'undefined') return;

        const autoShown = sessionStorage.getItem('weatherSuggestionAutoShown');
        const wasClicked = sessionStorage.getItem('weatherPillClicked');

        // Show badge if it hasn't been manually clicked yet
        if (!wasClicked) {
            setShowBadge(true);
        }

        // Auto-play the popover once per session
        if (!autoShown && !prefersReduced) {
            sessionStorage.setItem('weatherSuggestionAutoShown', 'true');

            const openTimer = setTimeout(() => {
                setIsPopoverOpen(true);

                const closeTimer = setTimeout(() => {
                    // Only auto-close if the user hasn't explicitly clicked it to keep it open
                    setIsPopoverOpen((prev) => {
                        return prev ? false : prev;
                    });
                }, 6000);

                return () => clearTimeout(closeTimer);
            }, 2500);

            return () => clearTimeout(openTimer);
        }
    }, [weather, error, prefersReduced]);

    // Popover outside clicks
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsPopoverOpen(false);
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsPopoverOpen(false);
        };

        if (isPopoverOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEsc);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isPopoverOpen]);


    const handlePillClick = () => {
        setIsPopoverOpen((v) => !v);
        // User explicitly engaged - turn off badge
        if (showBadge) {
            setShowBadge(false);
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('weatherPillClicked', 'true');
            }
        }
    };


    if (error) return null;

    const renderIcon = () => {
        if (!weather) {
            return <div className="w-6 h-6 rounded-full border-2 border-[#C9974A]/20 border-t-[#C9974A] animate-spin" />;
        }

        const { condition, isDay, code } = weather;

        if (condition === 'clear') {
            if (isDay) {
                return (
                    <motion.svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 flex-shrink-0 origin-center drop-shadow-md">
                        <motion.circle cx="12" cy="12" r="4" fill="#C9974A" animate={prefersReduced ? {} : { fillOpacity: [0.3, 0.7, 0.3], scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} />
                        <motion.g animate={prefersReduced ? {} : { rotate: 360 }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="origin-center">
                            <line x1="12" y1="2" x2="12" y2="5" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                            <line x1="2" y1="12" x2="5" y2="12" />
                            <line x1="19" y1="12" x2="22" y2="12" />
                            <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
                            <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
                            <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" />
                            <line x1="16.95" y1="7.05" x2="19.07" y2="4.93" />
                        </motion.g>
                    </motion.svg>
                );
            } else {
                return (
                    <div className="relative w-7 h-7 flex-shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#F6EEDF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="absolute inset-0">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#F6EEDF" fillOpacity="0.3" />
                        </svg>
                        <motion.div className="absolute top-1 right-[2px] w-1 h-1 bg-[#C9974A] rounded-full drop-shadow-[0_0_2px_#C9974A]" animate={prefersReduced ? {} : { opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                        <motion.div className="absolute top-4 right-[16px] w-[2px] h-[2px] bg-[#C9974A] rounded-full drop-shadow-[0_0_2px_#C9974A]" animate={prefersReduced ? {} : { opacity: [0.1, 1, 0.1], scale: [0.8, 1.5, 0.8] }} transition={{ repeat: Infinity, duration: 2.2, delay: 0.5 }} />
                    </div>
                );
            }
        }

        if (condition === 'cloudy') {
            const isPartlyCloudy = code === 2;
            return (
                <div className="relative w-7 h-7 flex-shrink-0">
                    {/* Sun or Moon peek */}
                    {isPartlyCloudy && isDay === 1 && (
                        <svg className="absolute inset-0 z-0 overflow-visible" viewBox="0 0 24 24">
                            <motion.circle cx="17" cy="8" r="4" fill="#C9974A" animate={prefersReduced ? {} : { scale: [1, 1.1, 1], fillOpacity: [0.5, 0.9, 0.5] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} />
                        </svg>
                    )}
                    {isPartlyCloudy && isDay === 0 && (
                        <svg className="absolute inset-0 z-0 overflow-visible" viewBox="0 0 24 24">
                            <motion.path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#F6EEDF" className="origin-center scale-50 -translate-y-3 translate-x-2" animate={prefersReduced ? {} : { opacity: [0.4, 0.9, 0.4] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} />
                        </svg>
                    )}

                    <motion.svg viewBox="0 0 24 24" fill="none" stroke="#F6EEDF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="absolute inset-0 z-10" animate={prefersReduced ? {} : { x: ["-2px", "3px", "-2px"] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
                        <path d="M17.5 19C19.985 19 22 16.985 22 14.5C22 12.137 20.177 10.224 17.868 10.02C17.399 7.18 14.93 5 12 5C8.686 5 6 7.686 6 11C6 11.025 6 11.05 6.002 11.075C3.21 11.272 1 13.606 1 16.5C1 19.538 3.462 22 6.5 22H17.5V19Z" fill="#241B15" fillOpacity="0.8" />
                    </motion.svg>
                    <motion.svg viewBox="0 0 24 24" fill="none" stroke="#C9974A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="absolute inset-0 z-20 mix-blend-screen scale-[0.8] -translate-y-[2px] translate-x-3" animate={prefersReduced ? {} : { x: ["1px", "-3px", "1px"] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
                        <path d="M17.5 19C19.985 19 22 16.985 22 14.5C22 12.137 20.177 10.224 17.868 10.02C17.399 7.18 14.93 5 12 5C8.686 5 6 7.686 6 11C6 11.025 6 11.05 6.002 11.075C3.21 11.272 1 13.606 1 16.5C1 19.538 3.462 22 6.5 22H17.5V19Z" fill="#F6EEDF" fillOpacity="0.2" />
                    </motion.svg>
                </div>
            );
        }

        if (condition === 'rain') {
            return (
                <div className="relative w-7 h-7 flex-shrink-0 overflow-hidden">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#F6EEDF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="absolute top-[-2px] left-0 w-full h-full z-10 drop-shadow-sm">
                        <path d="M17.5 19C19.985 19 22 16.985 22 14.5C22 12.137 20.177 10.224 17.868 10.02C17.399 7.18 14.93 5 12 5C8.686 5 6 7.686 6 11C6 11.025 6 11.05 6.002 11.075C3.21 11.272 1 13.606 1 16.5C1 19.538 3.462 22 6.5 22H17.5V19Z" fill="#241b15" fillOpacity="0.8" />
                    </svg>
                    <motion.div className="absolute w-[2px] h-2 bg-[#C9974A] left-[8px] top-[14px] rounded-full drop-shadow-[0_0_2px_#C9974A]" animate={prefersReduced ? {} : { y: [0, 8, 16], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
                    <motion.div className="absolute w-[2px] h-2 bg-[#C9974A] left-[14px] top-[14px] rounded-full drop-shadow-[0_0_2px_#C9974A]" animate={prefersReduced ? {} : { y: [0, 8, 16], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear", delay: 0.2 }} />
                    <motion.div className="absolute w-[2px] h-2 bg-[#C9974A] left-[20px] top-[14px] rounded-full drop-shadow-[0_0_2px_#C9974A]" animate={prefersReduced ? {} : { y: [0, 8, 16], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear", delay: 0.4 }} />
                </div>
            );
        }

        if (condition === 'thunder') {
            return (
                <div className="relative w-7 h-7 flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#F6EEDF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="absolute top-[-2px] left-0 w-full h-full z-10">
                        <path d="M17.5 19C19.985 19 22 16.985 22 14.5C22 12.137 20.177 10.224 17.868 10.02C17.399 7.18 14.93 5 12 5C8.686 5 6 7.686 6 11C6 11.025 6 11.05 6.002 11.075C3.21 11.272 1 13.606 1 16.5C1 19.538 3.462 22 6.5 22H17.5V19Z" fill="#1e1815" fillOpacity="0.9" />
                    </svg>
                    {/* Lightning flash */}
                    <motion.svg viewBox="0 0 24 24" fill="#C9974A" className="absolute top-2 left-0 w-full h-full z-20 mix-blend-screen drop-shadow-[0_0_4px_#C9974A]" animate={prefersReduced ? {} : { opacity: [0, 0, 1, 0, 1, 0] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.8, 0.82, 0.84, 0.86, 0.88] }}>
                        <path d="M13 10L10 16H14L11 22L19 14H15L18 8H13V10Z" />
                    </motion.svg>
                </div>
            );
        }

        if (condition === 'fog') {
            return (
                <div className="relative w-7 h-7 flex-shrink-0 flex flex-col items-center justify-center gap-[4px] overflow-hidden px-1">
                    <motion.div className="h-[2px] bg-[#F6EEDF]/80 rounded-full w-full" animate={prefersReduced ? {} : { x: ["-3px", "3px", "-3px"], opacity: [0.6, 0.9, 0.6] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
                    <motion.div className="h-[2px] bg-[#C9974A]/80 rounded-full w-[85%]" animate={prefersReduced ? {} : { x: ["3px", "-3px", "3px"], opacity: [0.5, 1, 0.5] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
                    <motion.div className="h-[2px] bg-[#F6EEDF]/60 rounded-full w-[95%]" animate={prefersReduced ? {} : { x: ["-2px", "4px", "-2px"], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} />
                    <motion.div className="h-[2px] bg-[#C9974A]/60 rounded-full w-[70%]" animate={prefersReduced ? {} : { x: ["4px", "-2px", "4px"], opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} />
                </div>
            );
        }

        return null;
    };

    const gradientClass = weather?.phase === 'sunrise' || weather?.phase === 'sunset'
        ? "bg-gradient-to-r from-[#C9974A]/20 to-transparent"
        : "";

    const suggestion = weather ? getWeatherFoodSuggestion(weather.temp, weather.condition, weather.isDay) : null;

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={handlePillClick}
                aria-expanded={isPopoverOpen}
                aria-label="Toggle weather menu suggestions"
                className="w-full text-left outline-none user-select-none relative"
            >
                {/* Discoverability Pulsing Badge */}
                {showBadge && (
                    <span className="absolute -top-1 -right-1 z-20 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9974A] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C9974A] border cursor-pointer border-[#350C0C]"></span>
                    </span>
                )}

                <motion.div
                    animate={prefersReduced ? {} : { boxShadow: ["0 0 0px rgba(201,151,74,0)", "0 0 6px rgba(201,151,74,0.3)", "0 0 0px rgba(201,151,74,0)"] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                    className={`flex items-center gap-3 rounded-full px-4 py-2 border hover:border-[#C9974A]/60 transition-all ${isPopoverOpen ? 'border-[#C9974A]/60' : 'border-[#C9974A]/30'} bg-[#241B15]/60 backdrop-blur-md relative overflow-hidden ${gradientClass} duration-1000`}
                >
                    {/* Sunrise/Sunset glowing orb effect under the icon */}
                    {weather?.phase !== 'none' && !prefersReduced && (
                        <div className="absolute left-1 top-1 w-10 h-10 rounded-full bg-orange-500/20 blur-xl pointer-events-none" />
                    )}

                    <div className="relative z-10 flex items-center justify-center pointer-events-none">
                        {renderIcon()}
                    </div>

                    <div className="relative z-10 flex flex-col items-start leading-[1.1] pointer-events-none">
                        {weather ? (
                            <>
                                <span className="text-[13px] font-semibold text-[#F6EEDF] whitespace-nowrap">
                                    {!compact && "Ooty, "}{weather.temp}°C
                                </span>
                                {timeStr && (
                                    <span className="text-[10px] text-[#C9974A] mt-0.5 whitespace-nowrap font-medium tracking-[0.03em]">
                                        {timeStr}
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="h-3 w-12 bg-[#C9974A]/20 rounded animate-pulse mb-1" />
                                <div className="h-2 w-8 bg-[#C9974A]/10 rounded animate-pulse" />
                            </>
                        )}
                    </div>
                </motion.div>
            </button>

            <AnimatePresence>
                {isPopoverOpen && weather && suggestion && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={prefersReduced ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 20 }}
                        /* Mobile: fixed drawer style mapping just above bottom edge to avoid clipping. Desktop: pure dropdown. */
                        className="fixed inset-x-4 top-24 z-[100] md:absolute md:inset-auto md:top-full md:right-0 md:mt-3 md:w-64 rounded-xl border border-[#C9974A]/30 bg-[#350C0C]/95 md:bg-[#350C0C] backdrop-blur-xl shadow-[0_16px_40px_rgba(36,27,21,0.8)] p-5 origin-top md:origin-top-right ring-1 ring-black/5"
                    >
                        {/* Caret pointing up (desktop only) connecting to the pill */}
                        <div className="hidden md:block absolute -top-1.5 right-10 w-3 h-3 rotate-45 border-l border-t border-[#C9974A]/30 bg-[#350C0C]" />

                        <div className="flex flex-col gap-1 mb-4">
                            <span className="text-sm font-bold tracking-wide text-[#F6EEDF]">
                                {weather.temp}°C · {suggestion.description}
                            </span>
                            <span className="text-xs text-[#F6EEDF]/70 italic">
                                {suggestion.message}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2 relative z-10">
                            {suggestion.categories.map((cat) => (
                                <a
                                    key={cat}
                                    href="#menu"
                                    onClick={() => {
                                        setIsPopoverOpen(false);
                                        // Actively dismiss the badge if navigating from within it
                                        setShowBadge(false);
                                        if (typeof window !== 'undefined') {
                                            sessionStorage.setItem('weatherPillClicked', 'true');
                                        }
                                    }}
                                    className="block w-full rounded-md border border-[#C9974A]/20 bg-[#241B15]/50 px-3 py-2.5 text-xs font-semibold tracking-wide text-[#C9974A] hover:bg-[#C9974A] hover:text-[#241B15] transition-colors shadow-sm"
                                >
                                    {cat}
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
