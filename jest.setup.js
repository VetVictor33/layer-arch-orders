// Jest setup file for path mappings
const path = require("path");

// Ensure module paths are correctly resolved
process.env.NODE_PATH = path.join(__dirname, "src");
