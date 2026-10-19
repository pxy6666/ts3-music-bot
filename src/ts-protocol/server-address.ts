const DEFAULT_VOICE_PORT = 9987;

export interface TeamSpeakEndpoint {
  host: string;
  port: number;
}

function isVoicePort(port: unknown): port is number {
  return typeof port === "number" && Number.isInteger(port) && port >= 1 && port <= 65_535;
}

/**
 * TeamSpeak 客户端复制出来的地址经常是「主机:端口」。
 * 网页上端口框的默认值又是 9987。两段直接拼起来会变成
 * `主机:3949:9987`，语音库会把 `主机:3949` 当成主机名。
 * 这个主机名解析失败时，Node 仍会调用 UDP connect 的回调，
 * 紧接着的 send() 把回调函数当成端口，抛出未捕获的 RangeError，
 * 连接就停在 15 秒超时。
 *
 * 地址里已经写了端口时，用那个端口，不再追加端口框里的数字。
 * 地址里没有端口时，才用单独传入的端口。
 */
export function resolveTeamSpeakEndpoint(address: string, port?: number | null): TeamSpeakEndpoint {
  const trimmed = address.trim();
  const embedded = splitEmbeddedPort(trimmed);
  if (embedded) return embedded;
  return {
    host: trimmed,
    port: isVoicePort(port) ? port : DEFAULT_VOICE_PORT,
  };
}

function splitEmbeddedPort(address: string): TeamSpeakEndpoint | null {
  if (address.startsWith("[")) {
    const end = address.indexOf("]");
    if (end <= 1) return null;
    const host = address.slice(1, end);
    const rest = address.slice(end + 1);
    if (!rest.startsWith(":")) return null;
    const raw = rest.slice(1);
    if (!/^\d+$/.test(raw)) return null;
    const parsed = Number(raw);
    if (!isVoicePort(parsed)) return null;
    return { host, port: parsed };
  }

  const parts = address.split(":");
  const ports: number[] = [];
  while (parts.length > 1) {
    const tail = parts[parts.length - 1] ?? "";
    if (!/^\d+$/.test(tail)) break;
    const parsed = Number(tail);
    if (!isVoicePort(parsed)) break;
    parts.pop();
    ports.unshift(parsed);
  }
  if (ports.length === 0) return null;
  const host = parts.join(":");
  if (!host) return null;
  // `主机:3949:9987`：靠近主机名的那个端口才是用户写上的，末尾的 9987 是默认端口被再次拼上。
  const chosen = ports.find((item) => item !== DEFAULT_VOICE_PORT) ?? ports[ports.length - 1];
  if (!isVoicePort(chosen)) return null;
  return { host, port: chosen };
}
