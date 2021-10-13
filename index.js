const genPath = require("./src/genPath/");
const { Command } = require("commander");
const { version, name } = require("./package.json");

const program = new Command(name);

program.storeOptionsAsProperties(true);

program.version(version, "-v --version", "Output the current version");

program.requiredOption("-p,--path <path>", "Path to your pages folder");

genPath(program.path);
