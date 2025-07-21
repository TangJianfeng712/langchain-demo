import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';

// Read file content tool
export const readFileTool = tool(async (input) => {
    try {
        const filePath = input.path;
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return `❌ File not found: ${filePath}`;
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        
        return `📄 File: ${filePath}\n` +
               `📊 Size: ${stats.size} bytes\n` +
               `📅 Modified: ${stats.mtime.toISOString()}\n\n` +
               `📝 Content:\n${content}`;

    } catch (error) {
        return `❌ Error reading file: ${error.message}`;
    }
}, {
    name: "read_file",
    description: "Read the content of a text file and return its contents along with file metadata",
    schema: z.object({
        path: z.string().describe("The file path to read"),
    }),
});

// Write file content tool
export const writeFileTool = tool(async (input) => {
    try {
        const filePath = input.path;
        const content = input.content;
        
        // Create directory if it doesn't exist
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        
        await fs.writeFile(filePath, content, 'utf-8');
        const stats = await fs.stat(filePath);
        
        return `✅ File written successfully!\n` +
               `📄 Path: ${filePath}\n` +
               `📊 Size: ${stats.size} bytes\n` +
               `📅 Created/Modified: ${stats.mtime.toISOString()}`;

    } catch (error) {
        return `❌ Error writing file: ${error.message}`;
    }
}, {
    name: "write_file",
    description: "Write content to a file, creating directories if necessary",
    schema: z.object({
        path: z.string().describe("The file path to write to"),
        content: z.string().describe("The content to write to the file"),
    }),
});

// List directory contents tool  
export const listDirectoryTool = tool(async (input) => {
    try {
        const dirPath = input.path || '.';
        
        // Check if directory exists
        try {
            await fs.access(dirPath);
        } catch (error) {
            return `❌ Directory not found: ${dirPath}`;
        }

        const items = await fs.readdir(dirPath, { withFileTypes: true });
        
        if (items.length === 0) {
            return `📁 Directory is empty: ${dirPath}`;
        }

        let result = `📁 Directory contents: ${path.resolve(dirPath)}\n\n`;
        
        // Separate directories and files
        const directories = items.filter(item => item.isDirectory());
        const files = items.filter(item => item.isFile());
        
        if (directories.length > 0) {
            result += `📂 Directories (${directories.length}):\n`;
            directories.forEach(dir => {
                result += `  📂 ${dir.name}/\n`;
            });
            result += '\n';
        }
        
        if (files.length > 0) {
            result += `📄 Files (${files.length}):\n`;
            for (const file of files) {
                const filePath = path.join(dirPath, file.name);
                const stats = await fs.stat(filePath);
                result += `  📄 ${file.name} (${stats.size} bytes)\n`;
            }
        }
        
        return result;

    } catch (error) {
        return `❌ Error listing directory: ${error.message}`;
    }
}, {
    name: "list_directory",
    description: "List the contents of a directory including files and subdirectories",
    schema: z.object({
        path: z.string().optional().describe("The directory path to list (defaults to current directory)"),
    }),
});

// Delete file tool
export const deleteFileTool = tool(async (input) => {
    try {
        const filePath = input.path;
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return `❌ File not found: ${filePath}`;
        }

        const stats = await fs.stat(filePath);
        await fs.unlink(filePath);
        
        return `✅ File deleted successfully!\n` +
               `📄 Path: ${filePath}\n` +
               `📊 Size was: ${stats.size} bytes`;

    } catch (error) {
        return `❌ Error deleting file: ${error.message}`;
    }
}, {
    name: "delete_file",
    description: "Delete a file from the filesystem",
    schema: z.object({
        path: z.string().describe("The file path to delete"),
    }),
}); 