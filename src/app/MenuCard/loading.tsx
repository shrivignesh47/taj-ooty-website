export default function MenuCardLoading() {
    return (
        <div className="max-w-[430px] mx-auto min-h-screen bg-[#F6EEDF] relative shadow-2xl overflow-hidden">
            {/* Header Skeleton */}
            <div className="sticky top-0 z-30 bg-[#F6EEDF] border-b border-[#C9974A]/20 pb-4 shadow-sm px-6 py-4">
                <div className="h-8 w-1/3 bg-black/5 rounded animate-pulse mb-4"></div>
                <div className="h-10 w-full bg-black/5 rounded-xl animate-pulse mb-4"></div>
                <div className="flex gap-2 overflow-hidden">
                    <div className="h-9 w-24 bg-black/5 rounded-full animate-pulse shrink-0"></div>
                    <div className="h-9 w-24 bg-black/5 rounded-full animate-pulse shrink-0"></div>
                    <div className="h-9 w-24 bg-black/5 rounded-full animate-pulse shrink-0"></div>
                </div>
            </div>

            {/* Content Skeleton - Maroon/Gold Shimmer Rows */}
            <div className="p-6 space-y-6">
                <div className="h-6 w-1/4 bg-black/5 rounded animate-pulse mb-4"></div>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex justify-between items-center border-b border-[#C9974A]/10 pb-4">
                        <div className="space-y-2 flex-1 pr-4">
                            <div className="h-5 w-3/4 bg-gradient-to-r from-[#4E1414]/10 to-[#C9974A]/10 rounded animate-pulse"></div>
                            <div className="h-4 w-1/2 bg-gradient-to-r from-[#4E1414]/5 to-[#C9974A]/5 rounded animate-pulse"></div>
                        </div>
                        <div className="h-5 w-12 bg-gradient-to-r from-[#C9974A]/20 to-[#4E1414]/10 rounded animate-pulse shrink-0"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
