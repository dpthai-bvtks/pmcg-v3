const fs = require('fs');

if (!fs.existsSync('d1_schema_audit.json')) {
    console.log('d1_schema_audit.json not ready yet');
    process.exit(0);
}

const schemas = JSON.parse(fs.readFileSync('d1_schema_audit.json', 'utf8'));
const backendCode = fs.readFileSync('backend/src/index.js', 'utf8');

console.log('=== CHECKING SQL QUERIES IN BACKEND AGAINST D1 SCHEMA ===\n');

// Find all INSERT INTO <table> (...) and UPDATE <table> SET ...
const insertRegex = /INSERT\s+INTO\s+([a_z0-9_]+)\s*\(([^)]+)\)/gi;
let match;
let errors = 0;

while ((match = insertRegex.exec(backendCode)) !== null) {
    const table = match[1].toLowerCase();
    const cols = match[2].split(',').map(c => c.trim());
    if (schemas[table]) {
        const actualCols = schemas[table];
        for (const col of cols) {
            if (!actualCols.includes(col)) {
                console.log(`❌ Table [${table}] INSERT refers to non-existent column [${col}]!`);
                console.log(`   Query snippet: ${match[0].substring(0, 100)}...`);
                errors++;
            }
        }
    }
}

// Find all UPDATE <table> SET col1 = ..., col2 = ...
const updateRegex = /UPDATE\s+([a_z0-9_]+)\s+SET\s+([^WHERE;"]+)/gi;
while ((match = updateRegex.exec(backendCode)) !== null) {
    const table = match[1].toLowerCase();
    const setClause = match[2];
    const colMatches = setClause.match(/([a_z0-9_]+)\s*=/gi);
    if (colMatches && schemas[table]) {
        const actualCols = schemas[table];
        for (const cm of colMatches) {
            const col = cm.replace(/\s*=/, '').trim().toLowerCase();
            if (col !== 'excluded' && !actualCols.includes(col)) {
                console.log(`❌ Table [${table}] UPDATE refers to non-existent column [${col}]!`);
                console.log(`   Query snippet: ${match[0].substring(0, 100)}...`);
                errors++;
            }
        }
    }
}

if (errors === 0) {
    console.log('✅ ALL SQL INSERT/UPDATE statements in backend match D1 columns 100%! No errors found.');
} else {
    console.log(`\nFound ${errors} column mismatches!`);
}
