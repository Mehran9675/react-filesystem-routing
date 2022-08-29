#!/usr/bin/env node

const { genPath } = require("./genPath");
const { Command } = require("commander");
const { version, name } = require("./package.json");

const program = new Command();

program.storeOptionsAsProperties(name);

program.version(version, "-v --version", "Output the current version");
program.requiredOption("-i,--input <directory>", "Path to your pages folder");
program.option(
  "-b,--build [type]",
  "Boolean Option to run the program once. Intended to be used with build commands."
);
program.parse();

genPath(program.input, program.build);
