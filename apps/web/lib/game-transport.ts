import type { ClientEvent, ServerEvent } from "@yaply/shared/events";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected" | "failed";

export interface GameTransport {
  connect(): Promise<void>;
  send(event: ClientEvent): void;
  close(): void;
  onEvent(handler: (event: ServerEvent) => void): () => void;
  onStatusChange(handler: (status: ConnectionStatus) => void): () => void;
}

export class WebSocketGameTransport implements GameTransport {
  private socket: WebSocket | null = null;
  private eventHandlers = new Set<(event: ServerEvent) => void>();
  private statusHandlers = new Set<(status: ConnectionStatus) => void>();

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return;
    this.notifyStatus("connecting");
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;
      socket.addEventListener("open", () => {
        this.notifyStatus("connected");
        resolve();
      }, { once: true });
      socket.addEventListener("error", () => {
        this.notifyStatus("failed");
        reject(new Error("WebSocket connection failed"));
      }, { once: true });
      socket.addEventListener("message", (message) => {
        try {
          const event = JSON.parse(message.data) as ServerEvent;
          for (const handler of this.eventHandlers) {
            handler(event);
          }
        } catch {}
      });
      socket.addEventListener("close", () => {
        this.notifyStatus("disconnected");
      });
    });
  }

  send(event: ClientEvent): void {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error("Not connected");
    this.socket.send(JSON.stringify(event));
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
  }

  onEvent(handler: (event: ServerEvent) => void): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private notifyStatus(status: ConnectionStatus): void {
    for (const handler of this.statusHandlers) {
      handler(status);
    }
  }
}
