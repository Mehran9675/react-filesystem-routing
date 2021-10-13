#!/usr/bin/env node
var genPath = require("./dis/genPath/index.js");
var Command = require("commander").Command;
var _a = require("./package.json"), version = _a.version, name = _a.name;
var program = new Command();
program.storeOptionsAsProperties(name);
program.version(version, "-v --version", "Output the current version");
program.requiredOption("-p,--path <path>", "Path to your pages folder");
program.parse(process.argv);
genPath(program.path);
