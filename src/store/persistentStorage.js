import fs from 'fs/promises';
import path from 'path';

// Generic persistent storage class
class PersistentStorage {
    constructor(fileName) {
        this.fileName = fileName;
        this.filePath = path.join(process.cwd(), 'data', fileName);
        this.ensureDataDir();
    }

    // Ensure data directory exists
    async ensureDataDir() {
        const dataDir = path.dirname(this.filePath);
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    // Load data
    async load(defaultValue = {}) {
        try {
            await this.ensureDataDir();
            const data = await fs.readFile(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // If file does not exist or parsing fails, return default value
            return defaultValue;
        }
    }

    // Save data
    async save(data) {
        try {
            await this.ensureDataDir();
            await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`❌ Failed to save ${this.fileName}:`, error.message);
            return false;
        }
    }

    // Delete storage file
    async clear() {
        try {
            await fs.unlink(this.filePath);
            return true;
        } catch (error) {
            // File not found is also considered successful
            if (error.code === 'ENOENT') {
                return true;
            }
            console.error(`❌ Failed to clear ${this.fileName}:`, error.message);
            return false;
        }
    }

    // Check if file exists
    async exists() {
        try {
            await fs.access(this.filePath);
            return true;
        } catch {
            return false;
        }
    }
}

export default PersistentStorage; 