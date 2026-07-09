/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { LayoutGrid, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// Custom UI Icon to match screenshots tables look precisely
export function CustomTableIcon({ color }: { color: string }) {
    return (
        <div className="relative w-8 h-8 flex items-center justify-center opacity-80" style={{ color }}>
            {/* Center table */}
            <div className="w-4 h-4 rounded shadow-sm opacity-80" style={{ backgroundColor: color }}></div>
            {/* Top Chair */}
            <div className="absolute top-0 w-2 h-1 rounded-full opacity-60" style={{ backgroundColor: color }}></div>
            {/* Bottom Chair */}
            <div className="absolute bottom-0 w-2 h-1 rounded-full opacity-60" style={{ backgroundColor: color }}></div>
            {/* Left Chairs */}
            <div className="absolute left-0 top-1/4 w-1 h-2 rounded-full opacity-60" style={{ backgroundColor: color }}></div>
            <div className="absolute left-0 bottom-1/4 w-1 h-2 rounded-full opacity-60" style={{ backgroundColor: color }}></div>
            {/* Right Chairs */}
            <div className="absolute right-0 top-1/4 w-1 h-2 rounded-full opacity-60" style={{ backgroundColor: color }}></div>
            <div className="absolute right-0 bottom-1/4 w-1 h-2 rounded-full opacity-60" style={{ backgroundColor: color }}></div>
        </div>
    );
}

export function AdminTables({ tables, metrics, selectedTable, setSelectedTable }: any) {
    return (
        <div className="space-y-6">
            {/* Top Analytical Summary Dashboard */}
            <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-sm border border-[#C9974A]/20 overflow-hidden mb-8">
                <div className="bg-[#4E1414] text-[#F6EEDF] p-8 md:w-64 flex flex-col justify-center relative overflow-hidden shadow-inner border-r border-[#C9974A]/20">
                    <span className="text-sm font-semibold text-[#C9974A] mb-2">Total Orders</span>
                    <span className="text-5xl font-black tracking-tighter">{metrics.totalOrders}</span>
                    <div className="absolute right-4 top-4 text-[#C9974A]/20"><LayoutGrid className="w-16 h-16" /></div>
                </div>
                <div className="flex-1 grid grid-cols-3 divide-x divide-[#C9974A]/10 bg-[#FFFFFF]">
                    <div className="p-8 flex flex-col justify-center items-center">
                        <span className="text-sm font-bold text-[#4E1414] mb-2">Occupied</span>
                        <span className="text-4xl font-black text-[#C9974A]">{tables.filter((t: any) => t.status === 'Occupied').length}</span>
                    </div>
                    <div className="p-8 flex flex-col justify-center items-center">
                        <span className="text-sm font-bold text-[#4E1414] mb-2">Reserved</span>
                        <span className="text-4xl font-black text-blue-800">0</span>
                    </div>
                    <div className="p-8 flex flex-col justify-center items-center">
                        <span className="text-sm font-bold text-[#4E1414] mb-2">Available</span>
                        <span className="text-4xl font-black text-green-700">{tables.filter((t: any) => t.status === 'Available').length}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tables.map((t: any) => {
                    const isOcc = t.status === 'Occupied';
                    return (
                        <div key={t.id} onClick={() => setSelectedTable(t)} className="bg-white p-6 rounded-2xl shadow-sm border border-[#C9974A]/20 cursor-pointer hover:shadow-md hover:border-[#C9974A]/50 transition-all relative active:scale-95 duration-200 flex flex-col min-h-[160px] justify-between group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <CustomTableIcon color={isOcc ? '#4E1414' : (t.status === 'Reserved' ? '#1E3A8A' : '#15803D')} />
                                    <span className="font-bold text-xl text-[#241B15] tracking-tight ml-1 group-hover:text-[#4E1414]">T-{t.table_no}</span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isOcc ? 'bg-[#4E1414]/10 text-[#4E1414]' :
                                    t.status === 'Available' ? 'bg-green-100 text-green-800' :
                                        'bg-blue-50 text-blue-800'
                                    }`}>
                                    {t.status}
                                </span>
                            </div>
                            <div className="flex justify-between items-end border-t border-[#F6EEDF] pt-3">
                                <div className="text-xs font-bold text-[#4E1414]/60">Med &nbsp;&bull;&nbsp; {t.pax} Person</div>
                                <div className={`font-black text-lg ${isOcc ? 'text-[#C9974A]' : 'text-[#241B15]'}`}>₹ {t.currentBill.toFixed(2)}</div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Table Modal with Customer Details & QR */}
            {selectedTable && (
                <div className="fixed inset-0 bg-[#241B15]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#F6EEDF] border-2 border-[#C9974A] rounded-3xl w-full max-w-lg p-8 relative shadow-2xl">
                        <button onClick={() => setSelectedTable(null)} className="absolute top-6 right-6 text-[#4E1414] hover:bg-[#C9974A]/20 rounded-full p-2 transition-colors"><X className="w-5 h-5" /></button>
                        <h2 className="text-2xl font-black text-[#4E1414] mb-1">Table T-{selectedTable.table_no}</h2>
                        <p className="text-xs font-bold uppercase tracking-wider mb-6 text-[#241B15]">Status: <span className={selectedTable.status === 'Occupied' ? 'text-[#C9974A]' : 'text-green-700'}>{selectedTable.status}</span></p>

                        <div className="flex justify-center bg-white p-6 rounded-2xl mb-6 border border-[#C9974A]/30 shadow-inner inline-flex w-full items-center">
                            <QRCodeSVG value={`http://localhost:3000/tables/${selectedTable.id}/menu`} size={130} fgColor="#4E1414" />
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between py-3 border-b border-[#C9974A]/20">
                                <span className="text-sm font-semibold text-[#4E1414]">Live Customer Record</span>
                                <span className="font-bold text-[#241B15]">{selectedTable.customers || 'Empty Session'}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-[#C9974A]/20">
                                <span className="text-sm font-semibold text-[#4E1414]">Current Order Value</span>
                                <span className="font-black text-[#C9974A] text-lg">₹ {selectedTable.currentBill}</span>
                            </div>
                            <button className="w-full bg-[#4E1414] text-[#F6EEDF] py-4 rounded-xl font-bold mt-4 shadow-[0_4px_14px_0_rgba(78,20,20,0.39)] hover:bg-[#350C0C] transition-all border border-[#C9974A]/50">
                                Print Configuration Label
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
