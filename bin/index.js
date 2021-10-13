#!/usr/bin/env node
const genPath = require("./dist/genPath");
const { Command } = require("commander");
const { version, name } = require("../package.json");

const program = new Command();

program.storeOptionsAsProperties(name);

program.version(version, "-v --version", "Output the current version");

program.requiredOption("-p,--path <path>", "Path to your pages folder");
program.parse(process.argv);

genPath(program.path);
