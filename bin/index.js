#!/usr/bin/env node
const genPath = require("../src/genPath");
const { Command } = require("commander");
const { version, name } = require("../package.json");

const program = new Command();

program.storeOptionsAsProperties(name);

program.version(version, "-v --version", "Output the current version");

program.requiredOption("-p,--page <page>", "Path to your pages folder");
program.requiredOption(
  "-c,--configs <configs>",
  "Path to store generated files"
);
program.parse(process.argv);

genPath(program.page, program.configs);

module.exports = { configs_path: program.configs };
