
/**
 * Data Service for JSON Import/Export
 * Handles full system backups and structured data portability.
 */

export const exportToJSON = (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const parseJSONFile = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = JSON.parse(e.target?.result as string);
                resolve(result);
            } catch (err) {
                reject(new Error("Invalid JSON format"));
            }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
};
