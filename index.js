#!/usr/bin/env node

const { genPath } = require("./genPath");
const { Command } = require("commander");
const { version, name } = require("./package.json");

const program = new Command();
program.storeOptionsAsProperties(name);

program.version(version, "-v --version", "Output the current version");

program.requiredOption("-p,--page <page>", "Path to your pages folder");
program.requiredOption(
  "-c,--configs <configs>",
  "Path to store generated files"
);

program.option(
  "-b,--build [type]",
  "boolean Option to run the program once. Intended to be with build commands."
);

program.parse();

genPath(program.page, program.configs, program.build);
