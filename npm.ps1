#!/usr/bin/env powershell
# Set up environment with Node.js in PATH
$env:PATH = "C:\Program Files\nodejs;$env:PATH"

# Run npm with passed arguments
& npm.cmd @args
