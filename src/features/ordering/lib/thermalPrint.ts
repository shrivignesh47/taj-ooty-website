import qz from 'qz-tray';

export async function connectPrinter(): Promise<boolean> {
    try {
        if (!qz.websocket.isActive()) {
            await qz.websocket.connect();
        }
        return true;
    } catch {
        return false;
    }
}

export async function getAvailablePrinters(): Promise<string[]> {
    const connected = await connectPrinter();
    if (!connected) return [];
    try {
        const printers = await qz.printers.find();
        return Array.isArray(printers) ? printers : [];
    } catch {
        return [];
    }
}

export async function printThermalReceipt(
    printerName: string,
    escposCommands: string[]
): Promise<{ success: boolean; error?: string }> {
    const connected = await connectPrinter();
    if (!connected) {
        return { success: false, error: 'QZ Tray service not connected on this device' };
    }
    try {
        const config = qz.configs.create(printerName);
        const data = escposCommands.map(cmd => ({ type: 'raw', format: 'plain', data: cmd }));
        await qz.print(config, data);
        return { success: true };
    } catch (e: unknown) {
        const err = e instanceof Error ? e.message : String(e);
        return { success: false, error: err };
    }
}
