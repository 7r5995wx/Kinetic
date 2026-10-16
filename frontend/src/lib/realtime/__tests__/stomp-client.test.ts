import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StompClient, StompFrame } from "../stomp-client";

class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public url: string;
  public readyState: number = WebSocket.CONNECTING;
  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onerror: ((error: any) => void) | null = null;
  public onclose: (() => void) | null = null;
  public sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  public send(data: string) {
    this.sent.push(data);
  }

  public close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  public simulateOpen() {
    this.readyState = WebSocket.OPEN;
    if (this.onopen) this.onopen();
  }

  public simulateMessage(data: string) {
    if (this.onmessage) this.onmessage({ data });
  }

  public simulateError(err: any) {
    if (this.onerror) this.onerror(err);
  }
}

describe("StompClient", () => {
  let originalWebSocket: any;

  beforeEach(() => {
    MockWebSocket.instances = [];
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as any;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    vi.clearAllTimers();
  });

  it("connects to target URL and sends CONNECT frame", () => {
    const client = new StompClient("ws://localhost:8080/ws");
    client.connect();

    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe("ws://localhost:8080/ws");

    ws.simulateOpen();
    expect(ws.sent.length).toBe(1);
    expect(ws.sent[0]).toContain("CONNECT\n");
    expect(ws.sent[0]).toContain("accept-version:1.2\n");
  });

  it("transitions to connected state upon receiving CONNECTED frame", () => {
    const client = new StompClient("ws://localhost:8080/ws");
    let reportedStatus = "";
    client.onStatusChange((s) => (reportedStatus = s));

    client.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    ws.simulateMessage("CONNECTED\nversion:1.2\nheart-beat:10000,10000\n\n\0");

    expect(client.getStatus()).toBe("connected");
    expect(reportedStatus).toBe("connected");
  });

  it("subscribes to destination and delivers incoming messages", () => {
    const client = new StompClient("ws://localhost:8080/ws");
    client.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();
    ws.simulateMessage("CONNECTED\nversion:1.2\n\n\0");

    const receivedFrames: StompFrame[] = [];
    const sub = client.subscribe("/topic/projects/proj-1", (frame) => {
      receivedFrames.push(frame);
    });

    expect(ws.sent.some((s) => s.includes("SUBSCRIBE\n") && s.includes("/topic/projects/proj-1"))).toBe(true);

    // Simulate incoming message frame for this subscription
    ws.simulateMessage(
      `MESSAGE\ndestination:/topic/projects/proj-1\nsubscription:${sub.id}\nmessage-id:m-1\n\n{"type":"task.created"}\0`
    );

    expect(receivedFrames.length).toBe(1);
    expect(receivedFrames[0].command).toBe("MESSAGE");
    expect(receivedFrames[0].body).toBe('{"type":"task.created"}');

    // Unsubscribe sends UNSUBSCRIBE frame
    sub.unsubscribe();
    expect(ws.sent.some((s) => s.includes("UNSUBSCRIBE\n") && s.includes(sub.id))).toBe(true);
  });

  it("handles automatic reconnection and re-subscribes active topics", () => {
    vi.useFakeTimers();
    const client = new StompClient("ws://localhost:8080/ws");
    let reconnected = false;
    client.onReconnect(() => {
      reconnected = true;
    });

    client.connect();
    let ws = MockWebSocket.instances[0];
    ws.simulateOpen();
    ws.simulateMessage("CONNECTED\nversion:1.2\n\n\0");

    client.subscribe("/topic/projects/proj-alpha", () => {});

    // Simulate unexpected connection loss
    ws.close();
    expect(client.getStatus()).toBe("reconnecting");

    // Advance timer to trigger reconnect
    vi.advanceTimersByTime(2000);
    expect(MockWebSocket.instances.length).toBe(2);
    ws = MockWebSocket.instances[1];

    ws.simulateOpen();
    ws.simulateMessage("CONNECTED\nversion:1.2\n\n\0");

    expect(client.getStatus()).toBe("connected");
    expect(reconnected).toBe(true);
    // Verified that SUBSCRIBE was sent on the new socket
    expect(ws.sent.some((s) => s.includes("SUBSCRIBE\n") && s.includes("/topic/projects/proj-alpha"))).toBe(true);

    client.disconnect();
    vi.useRealTimers();
  });

  it("disconnect gracefully shuts down socket without auto-reconnecting", () => {
    const client = new StompClient("ws://localhost:8080/ws");
    client.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();
    ws.simulateMessage("CONNECTED\nversion:1.2\n\n\0");

    client.disconnect();
    expect(client.getStatus()).toBe("disconnected");
    expect(ws.sent.some((s) => s.includes("DISCONNECT\n"))).toBe(true);
  });

  it("requests ticket from ticketProvider and includes ticket in CONNECT frame", async () => {
    const mockTicketProvider = vi.fn().mockResolvedValue("test-secure-ticket-xyz");
    const client = new StompClient({
      url: "ws://localhost:8080/ws",
      ticketProvider: mockTicketProvider,
    });
    client.connect();
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();
    await Promise.resolve();

    expect(mockTicketProvider).toHaveBeenCalledTimes(1);
    expect(ws.sent.some((s) => s.includes("CONNECT\n") && s.includes("ticket:test-secure-ticket-xyz"))).toBe(true);
  });
});
