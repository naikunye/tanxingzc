
/**
 * Generic CSV Service for parsing and generating CSV files.
 * Handles UTF-8 BOM for Excel compatibility and quoted strings containing commas.
 */

// Helper to escape fields for CSV
const escapeCSV = (str: string | number | undefined | null): string => {
    if (str === undefined || str === null) return '';
    const stringValue = String(str);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

// Generic Export Function
export const exportToCSV = (data: any[], headers: string[], keys: string[], filename: string) => {
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            keys.map(key => {
                // Handle nested properties or custom formatting if needed, 
                // but for now assume direct access or flat objects
                return escapeCSV(row[key]);
            }).join(',')
        )
    ].join('\n');

    // Add BOM for Excel utf-8 compatibility
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Generic Import Function
export const parseCSV = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                resolve([]);
                return;
            }

            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                resolve([]);
                return;
            }

            // Parse Headers (remove quotes if present)
            const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
            
            const results = [];
            for (let i = 1; i < lines.length; i++) {
                const currentLine = parseCSVLine(lines[i]);
                if (currentLine.length === headers.length) {
                    const obj: any = {};
                    for (let j = 0; j < headers.length; j++) {
                        let value = currentLine[j].trim();
                        // Remove wrapping quotes if they exist from the split logic (though parseCSVLine usually handles it)
                        if (value.startsWith('"') && value.endsWith('"')) {
                            value = value.substring(1, value.length - 1).replace(/""/g, '"');
                        }
                        obj[headers[j]] = value;
                    }
                    results.push(obj);
                }
            }
            resolve(results);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
};

// Regex to split by comma, ignoring commas inside quotes
const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === '"') {
            inQuote = !inQuote;
        }
        
        if (char === ',' && !inQuote) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
};
