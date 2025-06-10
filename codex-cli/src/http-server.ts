import type { ApprovalPolicy } from "./approvals.js";
import type { AppConfig } from "./utils/config.js";
import type { CommandConfirmation } from "./utils/agent/agent-loop.js";
import type { ResponseInputItem, ResponseItem } from "openai/resources/responses/responses.mjs";
import type { Request, Response } from "express";

import { AgentLoop } from "./utils/agent/agent-loop.js";
import { AutoApprovalMode } from "./utils/auto-approval-mode.js";
import { ReviewDecision } from "./utils/agent/review.js";
import { loadConfig } from "./utils/config.js";
import { createInputItem } from "./utils/input-utils.js";
import { decoratePrompt } from "./utils/decorate-prompt.js";
import { log } from "./utils/logger/log.js";
import express from "express";
import { randomUUID } from "crypto";

// Session data structure
interface HttpSession {
  id: string;
  agentLoop: AgentLoop | null;
  config: AppConfig;
  messages: ResponseItem[];
  lastResponseId: string;
  createdAt: Date;
  lastActivity: Date;
}

// In-memory session store (in production, use Redis or similar)
const sessions = new Map<string, HttpSession>();

// Session cleanup interval (30 minutes)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export class CodexHttpServer {
  private app: express.Application;
  private server: any;

  constructor(private port: number = 3000) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.startSessionCleanup();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS support
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-ID");
      
      if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
      }
      next();
    });

    // Session middleware
    this.app.use((req, res, next) => {
      const sessionId = req.headers["x-session-id"] as string || req.query.sessionId as string;
      
      if (sessionId) {
        const session = sessions.get(sessionId);
        if (session) {
          session.lastActivity = new Date();
          (req as any).session = session;
        }
      }
      
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });

    // Create new session
    this.app.post("/sessions", (req, res) => {
      this.createSession(req, res);
    });

    // Get session info
    this.app.get("/sessions/:sessionId", (req, res) => {
      this.getSession(req, res);
    });

    // Delete session
    this.app.delete("/sessions/:sessionId", (req, res) => {
      this.deleteSession(req, res);
    });

    // Send message to agent
    this.app.post("/sessions/:sessionId/messages", (req, res) => {
      this.sendMessage(req, res);
    });

    // Get conversation history
    this.app.get("/sessions/:sessionId/messages", (req, res) => {
      this.getMessages(req, res);
    });

    // Cancel current operation
    this.app.post("/sessions/:sessionId/cancel", (req, res) => {
      this.cancelOperation(req, res);
    });

    // List all sessions
    this.app.get("/sessions", (req, res) => {
      this.listSessions(req, res);
    });
  }

  private async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { 
        model, 
        provider = "openai", 
        approvalMode = "suggest",
        apiKey,
        additionalWritableRoots = [],
        config: clientConfig = {}
      } = req.body;

      // Load base config and merge with client-provided config
      const baseConfig = loadConfig();
      const config: AppConfig = {
        ...baseConfig,
        ...clientConfig,
        model: model || baseConfig.model,
        provider: provider || baseConfig.provider,
        apiKey: apiKey || baseConfig.apiKey || process.env.OPENAI_API_KEY
      };

      const sessionId = randomUUID();
      const session: HttpSession = {
        id: sessionId,
        agentLoop: null,
        config,
        messages: [],
        lastResponseId: "",
        createdAt: new Date(),
        lastActivity: new Date()
      };

      // Initialize AgentLoop
      session.agentLoop = new AgentLoop({
        model: config.model,
        provider: config.provider,
        config,
        instructions: config.instructions,
        approvalPolicy: approvalMode as ApprovalPolicy,
        additionalWritableRoots,
        disableResponseStorage: config.disableResponseStorage,
        onItem: (item: ResponseItem) => {
          session.messages.push(item);
          log(`Session ${sessionId}: received item ${item.type}`);
        },
        onLoading: (loading: boolean) => {
          log(`Session ${sessionId}: loading=${loading}`);
        },
        getCommandConfirmation: this.createCommandConfirmationHandler(approvalMode as ApprovalPolicy),
        onLastResponseId: (responseId: string) => {
          session.lastResponseId = responseId;
        }
      });

      sessions.set(sessionId, session);

      res.status(201).json({
        sessionId,
        config: {
          model: config.model,
          provider: config.provider,
          approvalMode
        },
        createdAt: session.createdAt
      });
    } catch (error) {
      log(`Error creating session: ${error}`);
      res.status(500).json({ error: "Failed to create session" });
    }
  }

  private getSession(req: Request, res: Response): void {
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({
      sessionId: session.id,
      config: {
        model: session.config.model,
        provider: session.config.provider
      },
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    });
  }

  private deleteSession(req: Request, res: Response): void {
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Terminate the agent loop if it exists
    if (session.agentLoop) {
      session.agentLoop.terminate();
    }

    sessions.delete(sessionId);
    res.status(204).send();
  }

  private async sendMessage(req: Request, res: Response): Promise<void> {
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);

    if (!session || !session.agentLoop) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    try {
      const { message, images = [] } = req.body;

      if (!message) {
        res.status(400).json({ error: "Message is required" });
        return;
      }

      // Decorate prompt before creating input item
      const decorated = await decoratePrompt(message);
      const inputItem = await createInputItem(decorated, images);
      
      // Get current message count to track new messages
      const initialMessageCount = session.messages.length;

      // Run the agent loop
      await session.agentLoop.run([inputItem], session.lastResponseId);

      // Get new messages since the run started
      const newMessages = session.messages.slice(initialMessageCount);

      session.lastActivity = new Date();

      res.json({
        sessionId,
        messages: newMessages,
        totalMessageCount: session.messages.length
      });
    } catch (error) {
      log(`Error in sendMessage for session ${sessionId}: ${error}`);
      res.status(500).json({ error: "Failed to process message" });
    }
  }

  private getMessages(req: Request, res: Response): void {
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const { offset = 0, limit = 100 } = req.query;
    const startIndex = parseInt(offset as string, 10);
    const maxResults = Math.min(parseInt(limit as string, 10), 1000);

    const messages = session.messages.slice(startIndex, startIndex + maxResults);

    res.json({
      sessionId,
      messages,
      totalCount: session.messages.length,
      offset: startIndex,
      limit: maxResults
    });
  }

  private cancelOperation(req: Request, res: Response): void {
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);

    if (!session || !session.agentLoop) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    session.agentLoop.cancel();
    session.lastActivity = new Date();

    res.json({ 
      sessionId, 
      status: "cancelled",
      timestamp: new Date().toISOString()
    });
  }

  private listSessions(req: Request, res: Response): void {
    const sessionList = Array.from(sessions.values()).map(session => ({
      sessionId: session.id,
      config: {
        model: session.config.model,
        provider: session.config.provider
      },
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    }));

    res.json({
      sessions: sessionList,
      totalCount: sessionList.length
    });
  }

  private createCommandConfirmationHandler(approvalMode: ApprovalPolicy) {
    return async (command: Array<string>): Promise<CommandConfirmation> => {
      // For HTTP interface, we'll auto-approve based on the approval mode
      // In a production scenario, you might want to implement a webhook or
      // real-time mechanism for user confirmation
      
      const reviewDecision = 
        approvalMode === AutoApprovalMode.FULL_AUTO 
          ? ReviewDecision.YES
          : approvalMode === AutoApprovalMode.AUTO_EDIT && command[0] === "apply_patch"
            ? ReviewDecision.YES
            : ReviewDecision.NO_CONTINUE;

      return Promise.resolve({ review: reviewDecision });
    };
  }

  private startSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of sessions.entries()) {
        const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
        
        if (timeSinceLastActivity > SESSION_TIMEOUT_MS) {
          log(`Cleaning up expired session: ${sessionId}`);
          
          if (session.agentLoop) {
            session.agentLoop.terminate();
          }
          
          sessions.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        log(`Codex HTTP server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      // Terminate all active sessions
      for (const session of sessions.values()) {
        if (session.agentLoop) {
          session.agentLoop.terminate();
        }
      }
      sessions.clear();

      if (this.server) {
        this.server.close(() => {
          log("Codex HTTP server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Export a function to start the server
export function startHttpServer(port: number = 3000): CodexHttpServer {
  const server = new CodexHttpServer(port);
  server.start();
  return server;
}