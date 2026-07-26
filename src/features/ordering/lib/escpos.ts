export const ESC = '\x1B';
export const GS = '\x1D';

export function initPrinter(): string { return ESC + '@'; }
export function boldOn(): string { return ESC + 'E' + '\x01'; }
export function boldOff(): string { return ESC + 'E' + '\x00'; }
export function centerAlign(): string { return ESC + 'a' + '\x01'; }
export function leftAlign(): string { return ESC + 'a' + '\x00'; }
export function rightAlign(): string { return ESC + 'a' + '\x02'; }
export function doubleHeight(): string { return GS + '!' + '\x11'; }
export function normalSize(): string { return GS + '!' + '\x00'; }
export function cutPaper(): string { return GS + 'V' + '\x00'; }
export function lineFeed(n = 1): string { return '\n'.repeat(n); }

export interface BillReceiptData {
    restaurantName: string;
    address: string;
    phone: string;
    billNo: string;
    tableNo: string;
    customerName: string;
    date: string;
    items: Array<{ name: string; qty: number; price: number; amount: number }>;
    subtotal: number;
    discount: number;
    pointsEarned?: number;
    pointsRedeemed?: number;
    pointsDiscount?: number;
    taxableAmount: number;
    serviceCharge: number;
    cgst: number;
    sgst: number;
    grandTotal: number;
    footerNote: string;
}

export interface KOTTicketData {
    ticketNo: string;
    tableNo: string;
    orderType: string;
    date: string;
    items: Array<{ name: string; qty: number; notes?: string | null }>;
}

export function buildReceiptCommands(bill: BillReceiptData): string[] {
    const cmds: string[] = [];
    cmds.push(initPrinter());
    cmds.push(centerAlign());
    cmds.push(boldOn(), doubleHeight());
    cmds.push(bill.restaurantName + lineFeed());
    cmds.push(normalSize(), boldOff());
    cmds.push(bill.address + lineFeed());
    cmds.push(`Ph: ${bill.phone}` + lineFeed(2));

    cmds.push(leftAlign());
    cmds.push(`------------------------------------------` + lineFeed());
    cmds.push(`Bill No: ${bill.billNo.padEnd(16)} Table: ${bill.tableNo}` + lineFeed());
    cmds.push(`Guest  : ${bill.customerName}` + lineFeed());
    cmds.push(`Date   : ${bill.date}` + lineFeed());
    cmds.push(`------------------------------------------` + lineFeed());

    cmds.push(boldOn());
    cmds.push(`Item                     Qty   Rate     Amt` + lineFeed());
    cmds.push(boldOff());
    cmds.push(`------------------------------------------` + lineFeed());

    bill.items.forEach(i => {
        const nameStr = i.name.length > 22 ? i.name.slice(0, 21) + '.' : i.name.padEnd(22);
        const qtyStr = String(i.qty).padStart(4);
        const rateStr = i.price.toFixed(0).padStart(6);
        const amtStr = i.amount.toFixed(0).padStart(8);
        cmds.push(`${nameStr} ${qtyStr} ${rateStr} ${amtStr}` + lineFeed());
    });

    cmds.push(`------------------------------------------` + lineFeed());
    cmds.push(rightAlign());
    cmds.push(`Subtotal  : ₹${bill.subtotal.toFixed(2)}` + lineFeed());
    if (bill.discount > 0) {
        cmds.push(`Discount  : -₹${bill.discount.toFixed(2)}` + lineFeed());
    }
    if (bill.pointsRedeemed && bill.pointsRedeemed > 0) {
        cmds.push(`Points Redeemed: -${bill.pointsRedeemed} (₹${(bill.pointsDiscount || 0).toFixed(2)})` + lineFeed());
    }
    if (bill.pointsEarned && bill.pointsEarned > 0) {
        cmds.push(`Points Earned  : +${bill.pointsEarned}` + lineFeed());
    }
    cmds.push(`Taxable   : ₹${bill.taxableAmount.toFixed(2)}` + lineFeed());
    if (bill.serviceCharge > 0) {
        cmds.push(`Service   : ₹${bill.serviceCharge.toFixed(2)}` + lineFeed());
    }
    cmds.push(`CGST 2.5% : ₹${bill.cgst.toFixed(2)}` + lineFeed());
    cmds.push(`SGST 2.5% : ₹${bill.sgst.toFixed(2)}` + lineFeed());
    cmds.push(boldOn(), doubleHeight());
    cmds.push(`GRAND TOTAL: ₹${bill.grandTotal.toFixed(0)}` + lineFeed());
    cmds.push(normalSize(), boldOff());
    cmds.push(`------------------------------------------` + lineFeed());

    cmds.push(centerAlign());
    cmds.push(bill.footerNote + lineFeed(2));
    cmds.push(cutPaper());
    return cmds;
}

export function buildKOTCommands(kot: KOTTicketData): string[] {
    const cmds: string[] = [];
    cmds.push(initPrinter());
    cmds.push(centerAlign());
    cmds.push(boldOn(), doubleHeight());
    cmds.push(`*** KITCHEN ORDER TICKET ***` + lineFeed());
    cmds.push(normalSize(), boldOff());
    cmds.push(`Ticket #: ${kot.ticketNo}  |  Type: ${kot.orderType}` + lineFeed());
    cmds.push(leftAlign());
    cmds.push(`------------------------------------------` + lineFeed());
    cmds.push(`Table: ${kot.tableNo.padEnd(16)} Date: ${kot.date}` + lineFeed());
    cmds.push(`------------------------------------------` + lineFeed());

    cmds.push(boldOn());
    cmds.push(`QTY  ITEM NAME                NOTES` + lineFeed());
    cmds.push(boldOff());
    cmds.push(`------------------------------------------` + lineFeed());

    kot.items.forEach(i => {
        cmds.push(boldOn());
        const qtyStr = `[${i.qty}x]`.padEnd(5);
        const nameStr = i.name.slice(0, 24).padEnd(25);
        cmds.push(`${qtyStr} ${nameStr}` + lineFeed());
        cmds.push(boldOff());
        if (i.notes) {
            cmds.push(`     * Note: ${i.notes}` + lineFeed());
        }
    });

    cmds.push(`------------------------------------------` + lineFeed(2));
    cmds.push(centerAlign());
    cmds.push(`--- END OF KOT ---` + lineFeed(3));
    cmds.push(cutPaper());
    return cmds;
}
