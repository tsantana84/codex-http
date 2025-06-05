#!/usr/bin/env node
import "dotenv/config";

import { startHttpServer, CodexHttpServer } from "./http-server.js";
import { loadConfig } from "./utils/config.js";
import { initLogger } from "./utils/logger/log.js";
import { onExit } from "./utils/terminal.js";
import chalk from "chalk";
import meow from "meow";

// Initialize logging
initLogger();

const cli = meow(`
  Usage
    $ codex-http [options]

  Options
    --port, -p     Port to listen on (default: 3000)
    --host, -h     Host to bind to (default: localhost)
    --help         Show usage and exit
    --version      Print version and exit

  Examples
    $ codex-http --port 8080
    $ codex-http -p 3000 -h 0.0.0.0
`, {
  importMeta: import.meta,
  autoHelp: true,
  flags: {
    port: { 
      type: "number", 
      aliases: ["p"], 
      default: 3000 
    },
    host: { 
      type: "string", 
      aliases: ["h"], 
      default: "localhost" 
    },
    help: { 
      type: "boolean" 
    },
    version: { 
      type: "boolean" 
    }
  }
});

const port = cli.flags.port;
const host = cli.flags.host;

// Validate configuration
try {
  const config = loadConfig();
  
  if (!config.apiKey && !process.env.OPENAI_API_KEY) {
    console.error(
      `\n${chalk.red("Missing OpenAI API key.")}\n\n` +
      `Set the environment variable ${chalk.bold("OPENAI_API_KEY")} ` +
      `and re-run this command.\n` +
      `You can create a key here: ${chalk.bold(
        chalk.underline("https://platform.openai.com/account/api-keys")
      )}\n`
    );
    process.exit(1);
  }
} catch (error) {
  console.error(`${chalk.red("Configuration error:")} ${error}`);
  process.exit(1);
}

let server: CodexHttpServer;

async function startServer() {
  try {
    server = new (await import("./http-server.js")).CodexHttpServer(port);
    await server.start();
    
    console.log(`\n🚀 ${chalk.bold("Codex HTTP Server")} is running!`);
    console.log(`📡 Listening on: ${chalk.blue(`http://${host}:${port}`)}`);
    console.log(`🏥 Health check: ${chalk.blue(`http://${host}:${port}/health`)}`);
    console.log(`📚 API endpoints:`);
    console.log(`   POST /sessions                    - Create new session`);
    console.log(`   GET  /sessions                    - List all sessions`);
    console.log(`   GET  /sessions/:id                - Get session info`);
    console.log(`   POST /sessions/:id/messages       - Send message`);
    console.log(`   GET  /sessions/:id/messages       - Get message history`);
    console.log(`   POST /sessions/:id/cancel         - Cancel operation`);
    console.log(`   DELETE /sessions/:id              - Delete session`);
    console.log(`\n${chalk.dim("Press Ctrl+C to stop the server")}`);

  } catch (error) {
    console.error(`${chalk.red("Failed to start server:")} ${error}`);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log(`\n${chalk.yellow("Shutting down server...")}`);
  
  if (server) {
    try {
      await server.stop();
      console.log(`${chalk.green("Server stopped successfully")}`);
    } catch (error) {
      console.error(`${chalk.red("Error stopping server:")} ${error}`);
    }
  }
  
  onExit();
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("SIGQUIT", gracefulShutdown);

// Start the server
startServer().catch((error) => {
  console.error(`${chalk.red("Startup error:")} ${error}`);
  process.exit(1);
});