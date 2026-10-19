import { describe, expect, it } from "vitest";
import { resolveTeamSpeakEndpoint } from "./server-address.js";

describe("resolveTeamSpeakEndpoint", () => {
  it("keeps a bare hostname and the port box", () => {
    expect(resolveTeamSpeakEndpoint("voice.example.com", 3949)).toEqual({
      host: "voice.example.com",
      port: 3949,
    });
  });

  it("uses the port written in the address when the port box is still the default", () => {
    expect(resolveTeamSpeakEndpoint("voice.example.com:3949", 9987)).toEqual({
      host: "voice.example.com",
      port: 3949,
    });
  });

  it("unwraps a host that already had the default port appended", () => {
    expect(resolveTeamSpeakEndpoint("voice.example.com:3949:9987", 9987)).toEqual({
      host: "voice.example.com",
      port: 3949,
    });
  });

  it("reads an IPv6 address with a port", () => {
    expect(resolveTeamSpeakEndpoint("[2001:db8::1]:4000", 9987)).toEqual({
      host: "2001:db8::1",
      port: 4000,
    });
  });

  it("falls back to 9987 when neither side has a port", () => {
    expect(resolveTeamSpeakEndpoint("  voice.example.com  ", null)).toEqual({
      host: "voice.example.com",
      port: 9987,
    });
  });
});
