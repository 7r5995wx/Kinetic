/**
 * Lightweight, zero-dependency STOMP 1.2 client over native WebSocket.
 * Complies with docs/realtime-contract.md for Kinetic real-time collaboration.
 */

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export interface StompSubscription {
  id: string;
  destination: string;
  unsubscribe: () => void;
}

export interface StompFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

export interface StompClientOptions {
  url?: string;
  ticketProvider?: () => Promise<string>;
}

export class StompClient {
  private url: string;
  private ticketProvider?: () => Promise<string>;
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "disconnected";
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private reconnectListeners = new Set<() => void>();
  private subscriptions = new Map<string, { destination: string; callback: (frame: StompFrame) => void }>();
  private subCounter = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private explicitlyDisconnected = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options?: string | StompClientOptions) {
    if (typeof options === "string") {
      this.url = options;
    } else if (options && typeof options === "object") {
      this.url = options.url || this.resolveDefaultUrl();
      this.ticketProvider = options.ticketProvider;
    } else {
      this.url = this.resolveDefaultUrl();
    }
  }

  private resolveDefaultUrl(): string {
    if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_WS_URL) {
      return process.env.NEXT_PUBLIC_WS_URL;
    }
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${window.location.hostname}:8080/ws`;
    }
    return "ws://localhost:8080/ws";
  }

  public setTicketProvider(provider?: () => Promise<string>): void {
    this.ticketProvider = provider;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  public onReconnect(listener: () => void): () => void {
    this.reconnectListeners.add(listener);
    return () => this.reconnectListeners.delete(listener);
  }

  public connect(): void {
    if (this.status === "connected" || this.status === "connecting") {
      return;
    }

    this.explicitlyDisconnected = false;
    this.setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");

    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = this.handleWsOpen.bind(this);
      this.ws.onmessage = this.handleWsMessage.bind(this);
      this.ws.onerror = this.handleWsError.bind(this);
      this.ws.onclose = this.handleWsClose.bind(this);
    } catch (err) {
      this.handleWsError(err);
    }
  }

  public disconnect(): void {
    this.explicitlyDisconnected = true;
    this.clearTimers();
    if (this.ws) {
      try {
        if (this.status === "connected") {
          this.sendFrame("DISCONNECT", {});
        }
        this.ws.close();
      } catch {
        // ignore close errors
      }
      this.ws = null;
    }
    this.setStatus("disconnected");
    this.reconnectAttempts = 0;
  }

  public subscribe(
    destination: string,
    callback: (frame: StompFrame) => void
  ): StompSubscription {
    const id = `sub-${++this.subCounter}`;
    this.subscriptions.set(id, { destination, callback });

    if (this.status === "connected") {
      this.sendFrame("SUBSCRIBE", {
        id,
        destination,
      });
    }

    return {
      id,
      destination,
      unsubscribe: () => {
        this.subscriptions.delete(id);
        if (this.status === "connected") {
          this.sendFrame("UNSUBSCRIBE", { id });
        }
      },
    };
  }

  private async handleWsOpen(): Promise<void> {
    const headers: Record<string, string> = {
      "accept-version": "1.2",
      "heart-beat": "10000,10000",
    };

    if (this.ticketProvider) {
      try {
        const ticket = await this.ticketProvider();
        if (ticket) {
          headers["ticket"] = ticket;
        }
      } catch (err) {
        console.warn("Could not acquire WebSocket ticket:", err);
      }
    }

    this.sendFrame("CONNECT", headers);
  }

  private handleWsMessage(event: MessageEvent): void {
    const data = typeof event.data === "string" ? event.data : "";
    if (data === "\n" || data === "\r\n") {
      // Heartbeat ping
      return;
    }

    const frames = this.parseFrames(data);
    for (const frame of frames) {
      if (frame.command === "CONNECTED") {
        const wasReconnecting = this.status === "reconnecting";
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // Re-subscribe all active subscriptions
        this.subscriptions.forEach((sub, id) => {
          this.sendFrame("SUBSCRIBE", { id, destination: sub.destination });
        });

        if (wasReconnecting) {
          this.reconnectListeners.forEach((listener) => {
            listener();
          });
        }
      } else if (frame.command === "MESSAGE") {
        const subId = frame.headers["subscription"];
        const sub = this.subscriptions.get(subId);
        if (sub) {
          try {
            sub.callback(frame);
          } catch (err) {
            console.error("Error in STOMP message callback:", err);
          }
        }
      } else if (frame.command === "ERROR") {
        console.warn("STOMP error frame received:", frame.headers["message"], frame.body);
      }
    }
  }

  private handleWsError(error: any): void {
    console.warn("WebSocket transport error:", error);
  }

  private handleWsClose(): void {
    this.clearTimers();
    this.ws = null;

    if (this.explicitlyDisconnected) {
      this.setStatus("disconnected");
      return;
    }

    // Schedule reconnect with exponential backoff and jitter
    this.setStatus("reconnecting");
    this.reconnectAttempts++;
    const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts - 1)) + Math.random() * 500;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send("\n");
        } catch {
          // ignore heartbeat send error
        }
      }
    }, 10000);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach((listener) => {
        listener(status);
      });
    }
  }

  private sendFrame(command: string, headers: Record<string, string>, body = ""): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    let frame = `${command}\n`;
    for (const [key, value] of Object.entries(headers)) {
      frame += `${key}:${value}\n`;
    }
    frame += `\n${body}\0`;

    try {
      this.ws.send(frame);
    } catch (err) {
      console.warn("Error sending STOMP frame:", err);
    }
  }

  private parseFrames(raw: string): StompFrame[] {
    const frames: StompFrame[] = [];
    const rawFrames = raw.split("\0");

    for (const rawFrame of rawFrames) {
      const trimmed = rawFrame.trim();
      if (!trimmed) continue;

      const lines = trimmed.split("\n");
      const command = lines[0].trim();
      const headers: Record<string, string> = {};
      let i = 1;

      while (i < lines.length && lines[i].trim() !== "") {
        const line = lines[i];
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          const key = line.substring(0, colonIdx).trim();
          const value = line.substring(colonIdx + 1).trim();
          headers[key] = value;
        }
        i++;
      }

      const body = lines.slice(i + 1).join("\n").trim();
      frames.push({ command, headers, body });
    }

    return frames;
  }
}

// Global shared client instance
let globalStompClient: StompClient | null = null;

export function getStompClient(options?: StompClientOptions): StompClient {
  if (!globalStompClient) {
    globalStompClient = new StompClient(options);
  } else if (options?.ticketProvider) {
    globalStompClient.setTicketProvider(options.ticketProvider);
  }
  return globalStompClient;
}
