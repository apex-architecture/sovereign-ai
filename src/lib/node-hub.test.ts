import { afterEach, describe, expect, it } from "vitest";
import { requireNode, requireOperator, safeFilename } from "./node-hub.server";

const req = (token?: string) =>
  new Request("http://x/api", { headers: token ? { Authorization: `Bearer ${token}` } : {} });

const saved = { op: process.env.OPERATOR_API_TOKEN, node: process.env.NODE_API_TOKEN };
afterEach(() => {
  process.env.OPERATOR_API_TOKEN = saved.op;
  process.env.NODE_API_TOKEN = saved.node;
  if (saved.op === undefined) delete process.env.OPERATOR_API_TOKEN;
  if (saved.node === undefined) delete process.env.NODE_API_TOKEN;
});

describe("GPU node hub keys", () => {
  it("a node key cannot queue jobs or read results", () => {
    process.env.OPERATOR_API_TOKEN = "owner-key-123";
    process.env.NODE_API_TOKEN = "node-key-456";
    expect(requireOperator(req("node-key-456"))?.status).toBe(401);
    expect(requireOperator(req("owner-key-123"))).toBeNull();
  });

  it("nodes accept the node key, and the owner key while no node key is set", () => {
    process.env.OPERATOR_API_TOKEN = "owner-key-123";
    process.env.NODE_API_TOKEN = "node-key-456";
    expect(requireNode(req("node-key-456"))).toBeNull();
    delete process.env.NODE_API_TOKEN;
    expect(requireNode(req("owner-key-123"))).toBeNull();
  });

  it("no key, or a wrong key, is refused", () => {
    process.env.OPERATOR_API_TOKEN = "owner-key-123";
    delete process.env.NODE_API_TOKEN;
    expect(requireNode(req())?.status).toBe(401);
    expect(requireNode(req("owner-key-124"))?.status).toBe(401);
  });

  it("uploaded file names cannot climb out of the job folder", () => {
    expect(safeFilename("../../etc/passwd")).toBe("passwd");
    expect(safeFilename("..")).toBe("output.bin");
    expect(safeFilename("my film.mp4")).toBe("my_film.mp4");
  });
});
