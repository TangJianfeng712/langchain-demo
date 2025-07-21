import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Basic calculator tool
export const calculatorTool = tool(async (input) => {
    try {
        const expression = input.expression;
        
        if (!expression) {
            return "❌ Error: No mathematical expression provided";
        }

        // Basic security check - only allow safe mathematical operations
        const allowedChars = /^[\d+\-*/()..s^%sin\(\)cos\(\)tan\(\)sqrt\(\)log\(\)abs\(\)floor\(\)ceil\(\)round\(\)pow\(\),min\(\)max\(\)PI_E_e_Infinity]+$/i;
        
        if (!allowedChars.test(expression.replace(/Math\./g, ''))) {
            return "❌ Error: Invalid characters in expression. Only basic mathematical operations are allowed.";
        }

        // Replace common math constants and functions
        let processedExpression = expression
            .replace(/\bpi\b/gi, 'Math.PI')
            .replace(/\be\b/gi, 'Math.E')
            .replace(/\bsin\(/gi, 'Math.sin(')
            .replace(/\bcos\(/gi, 'Math.cos(')
            .replace(/\btan\(/gi, 'Math.tan(')
            .replace(/\bsqrt\(/gi, 'Math.sqrt(')
            .replace(/\blog\(/gi, 'Math.log(')
            .replace(/\babs\(/gi, 'Math.abs(')
            .replace(/\bfloor\(/gi, 'Math.floor(')
            .replace(/\bceil\(/gi, 'Math.ceil(')
            .replace(/\bround\(/gi, 'Math.round(')
            .replace(/\bpow\(/gi, 'Math.pow(')
            .replace(/\bmin\(/gi, 'Math.min(')
            .replace(/\bmax\(/gi, 'Math.max(')
            .replace(/\^/g, '**'); // Replace ^ with ** for power

        // Evaluate the expression safely
        const result = Function(`"use strict"; return (${processedExpression})`)();
        
        if (typeof result !== 'number') {
            return "❌ Error: Expression did not evaluate to a number";
        }

        if (!isFinite(result)) {
            return "❌ Error: Result is infinite or not a number";
        }

        return `🧮 Calculation Result:\n\n` +
               `📝 Expression: ${expression}\n` +
               `📊 Result: ${result}\n` +
               `🔢 Scientific notation: ${result.toExponential()}\n` +
               `📐 Rounded (2 decimals): ${result.toFixed(2)}`;

    } catch (error) {
        return `❌ Error calculating expression: ${error.message}`;
    }
}, {
    name: "calculator",
    description: "Perform mathematical calculations and evaluate expressions with support for basic math functions",
    schema: z.object({
        expression: z.string().describe("Mathematical expression to evaluate (e.g., '2 + 3 * 4', 'sqrt(16)', 'sin(pi/2)')"),
    }),
});

// Statistical calculations tool
export const statisticsTool = tool(async (input) => {
    try {
        const numbers = input.numbers;
        
        if (!numbers || numbers.length === 0) {
            return "❌ Error: No numbers provided for statistical analysis";
        }

        // Validate all inputs are numbers
        const validNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n));
        
        if (validNumbers.length === 0) {
            return "❌ Error: No valid numbers found in the input";
        }

        if (validNumbers.length !== numbers.length) {
            return `⚠️ Warning: ${numbers.length - validNumbers.length} invalid values were ignored`;
        }

        // Sort numbers for percentile calculations
        const sorted = [...validNumbers].sort((a, b) => a - b);
        
        // Basic statistics
        const count = validNumbers.length;
        const sum = validNumbers.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        const min = Math.min(...validNumbers);
        const max = Math.max(...validNumbers);
        const range = max - min;
        
        // Median
        const median = count % 2 === 0 
            ? (sorted[count/2 - 1] + sorted[count/2]) / 2 
            : sorted[Math.floor(count/2)];
        
        // Mode (most frequent value)
        const frequency = {};
        validNumbers.forEach(num => {
            frequency[num] = (frequency[num] || 0) + 1;
        });
        const maxFreq = Math.max(...Object.values(frequency));
        const modes = Object.keys(frequency).filter(key => frequency[key] === maxFreq).map(Number);
        
        // Variance and Standard Deviation
        const variance = validNumbers.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / count;
        const stdDev = Math.sqrt(variance);
        
        // Quartiles
        const q1Index = Math.floor(count * 0.25);
        const q3Index = Math.floor(count * 0.75);
        const q1 = sorted[q1Index];
        const q3 = sorted[q3Index];
        const iqr = q3 - q1;

        return `📊 Statistical Analysis Results:\n\n` +
               `📈 Basic Statistics:\n` +
               `  • Count: ${count}\n` +
               `  • Sum: ${sum.toFixed(2)}\n` +
               `  • Mean (Average): ${mean.toFixed(2)}\n` +
               `  • Median: ${median.toFixed(2)}\n` +
               `  • Mode: ${modes.length > 5 ? 'Multiple modes' : modes.join(', ')}\n\n` +
               `📏 Range & Spread:\n` +
               `  • Minimum: ${min}\n` +
               `  • Maximum: ${max}\n` +
               `  • Range: ${range.toFixed(2)}\n` +
               `  • Variance: ${variance.toFixed(2)}\n` +
               `  • Standard Deviation: ${stdDev.toFixed(2)}\n\n` +
               `📋 Quartiles:\n` +
               `  • Q1 (25th percentile): ${q1}\n` +
               `  • Q3 (75th percentile): ${q3}\n` +
               `  • IQR (Interquartile Range): ${iqr.toFixed(2)}`;

    } catch (error) {
        return `❌ Error performing statistical analysis: ${error.message}`;
    }
}, {
    name: "statistics",
    description: "Calculate statistical measures for a set of numbers (mean, median, mode, standard deviation, etc.)",
    schema: z.object({
        numbers: z.array(z.number()).describe("Array of numbers to analyze"),
    }),
});

// Unit converter tool
export const unitConverterTool = tool(async (input) => {
    try {
        const value = input.value;
        const fromUnit = input.from_unit.toLowerCase();
        const toUnit = input.to_unit.toLowerCase();
        const category = input.category.toLowerCase();
        
        if (typeof value !== 'number' || isNaN(value)) {
            return "❌ Error: Invalid value provided for conversion";
        }

        let result;
        let resultUnit;
        
        switch (category) {
            case "length":
                result = convertLength(value, fromUnit, toUnit);
                resultUnit = toUnit;
                break;
            case "weight":
                result = convertWeight(value, fromUnit, toUnit);
                resultUnit = toUnit;
                break;
            case "temperature":
                result = convertTemperature(value, fromUnit, toUnit);
                resultUnit = toUnit;
                break;
            case "area":
                result = convertArea(value, fromUnit, toUnit);
                resultUnit = toUnit;
                break;
            case "volume":
                result = convertVolume(value, fromUnit, toUnit);
                resultUnit = toUnit;
                break;
            default:
                return `❌ Error: Unknown category "${category}". Available categories: length, weight, temperature, area, volume`;
        }
        
        if (result === null) {
            return `❌ Error: Conversion from "${fromUnit}" to "${toUnit}" in category "${category}" is not supported`;
        }

        return `🔄 Unit Conversion Result:\n\n` +
               `📏 Original: ${value} ${fromUnit}\n` +
               `📐 Converted: ${result.toFixed(6)} ${resultUnit}\n` +
               `📊 Scientific notation: ${result.toExponential()}\n` +
               `🎯 Category: ${category}`;

    } catch (error) {
        return `❌ Error converting units: ${error.message}`;
    }
}, {
    name: "unit_converter",
    description: "Convert between different units of measurement (length, weight, temperature, area, volume)",
    schema: z.object({
        value: z.number().describe("The numeric value to convert"),
        from_unit: z.string().describe("The unit to convert from (e.g., 'meter', 'feet', 'celsius')"),
        to_unit: z.string().describe("The unit to convert to (e.g., 'feet', 'meter', 'fahrenheit')"),
        category: z.enum(["length", "weight", "temperature", "area", "volume"]).describe("The category of measurement"),
    }),
});

// Helper functions for unit conversion
function convertLength(value, from, to) {
    // Convert to meters first
    const toMeters = {
        'meter': 1, 'm': 1, 'metre': 1,
        'kilometer': 1000, 'km': 1000,
        'centimeter': 0.01, 'cm': 0.01,
        'millimeter': 0.001, 'mm': 0.001,
        'inch': 0.0254, 'in': 0.0254,
        'foot': 0.3048, 'ft': 0.3048, 'feet': 0.3048,
        'yard': 0.9144, 'yd': 0.9144,
        'mile': 1609.34, 'mi': 1609.34
    };
    
    if (!toMeters[from] || !toMeters[to]) return null;
    
    const meters = value * toMeters[from];
    return meters / toMeters[to];
}

function convertWeight(value, from, to) {
    // Convert to grams first
    const toGrams = {
        'gram': 1, 'g': 1,
        'kilogram': 1000, 'kg': 1000,
        'pound': 453.592, 'lb': 453.592, 'lbs': 453.592,
        'ounce': 28.3495, 'oz': 28.3495,
        'ton': 1000000, 'tonne': 1000000
    };
    
    if (!toGrams[from] || !toGrams[to]) return null;
    
    const grams = value * toGrams[from];
    return grams / toGrams[to];
}

function convertTemperature(value, from, to) {
    let celsius;
    
    // Convert to Celsius first
    switch (from) {
        case 'celsius': case 'c':
            celsius = value;
            break;
        case 'fahrenheit': case 'f':
            celsius = (value - 32) * 5/9;
            break;
        case 'kelvin': case 'k':
            celsius = value - 273.15;
            break;
        default:
            return null;
    }
    
    // Convert from Celsius to target
    switch (to) {
        case 'celsius': case 'c':
            return celsius;
        case 'fahrenheit': case 'f':
            return celsius * 9/5 + 32;
        case 'kelvin': case 'k':
            return celsius + 273.15;
        default:
            return null;
    }
}

function convertArea(value, from, to) {
    // Convert to square meters first
    const toSquareMeters = {
        'square_meter': 1, 'sqm': 1, 'm2': 1,
        'square_kilometer': 1000000, 'sqkm': 1000000, 'km2': 1000000,
        'square_centimeter': 0.0001, 'sqcm': 0.0001, 'cm2': 0.0001,
        'square_foot': 0.092903, 'sqft': 0.092903, 'ft2': 0.092903,
        'square_inch': 0.00064516, 'sqin': 0.00064516, 'in2': 0.00064516,
        'acre': 4046.86, 'hectare': 10000
    };
    
    if (!toSquareMeters[from] || !toSquareMeters[to]) return null;
    
    const squareMeters = value * toSquareMeters[from];
    return squareMeters / toSquareMeters[to];
}

function convertVolume(value, from, to) {
    // Convert to liters first
    const toLiters = {
        'liter': 1, 'l': 1, 'litre': 1,
        'milliliter': 0.001, 'ml': 0.001,
        'cubic_meter': 1000, 'm3': 1000,
        'cubic_centimeter': 0.001, 'cc': 0.001, 'cm3': 0.001,
        'gallon': 3.78541, 'gal': 3.78541,
        'quart': 0.946353, 'qt': 0.946353,
        'pint': 0.473176, 'pt': 0.473176,
        'cup': 0.236588,
        'fluid_ounce': 0.0295735, 'floz': 0.0295735
    };
    
    if (!toLiters[from] || !toLiters[to]) return null;
    
    const liters = value * toLiters[from];
    return liters / toLiters[to];
} 