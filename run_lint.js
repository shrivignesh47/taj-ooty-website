const { execSync } = require('child_process');
const fs = require('fs');

try {
    execSync('npx eslint src -f json', { encoding: 'utf-8', stdio: 'pipe' });
    fs.writeFileSync('lint_results.txt', 'ALL CLEAN', 'utf8');
} catch (e) {
    try {
        const out = JSON.parse(e.stdout);
        const lines = [];
        out.forEach(f => {
            if (f.messages && f.messages.length > 0) {
                lines.push(f.filePath);
                f.messages.forEach(m => lines.push(`  ${m.line}:${m.column} ${m.ruleId} - ${m.message}`));
            }
        });
        fs.writeFileSync('lint_results.txt', lines.join('\n'), 'utf8');
    } catch (err) {
        fs.writeFileSync('lint_results.txt', e.stdout || e.message, 'utf8');
    }
}
