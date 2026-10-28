import { GameRoom } from "./Room";

export { GameRoom };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/room/")) {
      const code = url.pathname.split("/")[2];
      if (!code || code.length !== 6) {
        return new Response("Invalid room code", { status: 400 });
      }
      const id = env.GAME_ROOMS.idFromName(code);
      const stub = env.GAME_ROOMS.get(id);
      return stub.fetch(request);
    }
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }
    return new Response("Not found", { status: 404 });
  },
};

interface Env {
  GAME_ROOMS: DurableObjectNamespace;
  APP_ORIGIN: string;
}
