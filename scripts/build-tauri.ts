import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const actionsDir = path.resolve(__dirname, '../src/features/ordering/actions');

function stripUseServer() {
    if (!fs.existsSync(actionsDir)) return;
    const files = fs.readdirSync(actionsDir);
    for (const file of files) {
        if (file.endsWith('.ts')) {
            const filepath = path.join(actionsDir, file);
            let content = fs.readFileSync(filepath, 'utf8');
            if (content.includes('"use server"') || content.includes("'use server'")) {
                content = content.replace(/"use server";/g, '// "use server";')
                                 .replace(/'use server';/g, '// "use server";')
                                 .replace(/"use server"/g, '// "use server"')
                                 .replace(/'use server'/g, '// "use server"');
                fs.writeFileSync(filepath, content, 'utf8');
                console.log(`Stripped "use server" from ${file}`);
            }
        }
    }
}

function restoreUseServer() {
    if (!fs.existsSync(actionsDir)) return;
    const files = fs.readdirSync(actionsDir);
    for (const file of files) {
        if (file.endsWith('.ts')) {
            const filepath = path.join(actionsDir, file);
            let content = fs.readFileSync(filepath, 'utf8');
            if (content.includes('// "use server"')) {
                content = content.replace(/\/\/ "use server";/g, '"use server";')
                                 .replace(/\/\/ "use server"/g, '"use server";');
                fs.writeFileSync(filepath, content, 'utf8');
                console.log(`Restored "use server" in ${file}`);
            }
        }
    }
}

try {
    stripUseServer();
    console.log('Starting Next.js static build...');
    execSync('cross-env TAURI_BUILD=1 next build --webpack', { stdio: 'inherit' });
    console.log('Build completed successfully!');
} catch (err) {
    console.error('Build failed:', err);
    process.exitCode = 1;
} finally {
    restoreUseServer();
}
