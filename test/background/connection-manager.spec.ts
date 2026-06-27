import { describe, it, expect } from "vitest";
import ConnectionManager from "@/background/connection-manager";
import type Server from "@/models/server";

describe("ConnectionManager", () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  it("should create a new connection when a new server is added", () {
    const server = new Server("Localhost", false, "localhost", 6800, "/jsonrpc", "", {});
    manager.reconcile({
      "server-1": server
    });

    const conn = manager.getConnection("server-1");
    expect(conn).toBeDefined();
    expect(conn.server.uuid).toBe(server.uuid);
  });

  it("should recreate a connection when a server's host changes", () {
    const server1 = new Server("Server 1", false, "host-1", 6800, "/jsonrpc", "", {});
    const server2 = new Server("Server 1", false, "host-2", 6800, "/jsonrpc", "", {});

    // Initial state
    manager.reconcile({
      "server-1": server1
    });

    const firstConn = manager.getConnection("server-1");
    expect(firstConn.server.host).toBe("host-1");

    // Update host
    manager.reconcile({
      "server-1": server2
    });

    const secondConn = manager.getConnection("server-1");
    expect(secondConn.server.host).toBe("host-2");
    expect(firstConn).not.toBe(secondConn);
  });

  it("should remove a connection when a server is deleted", () {
    const server = new Server("Server 1", false, "localhost", 6800, "/jsonrpc", "", {});
    manager.reconcile({
      "server-1": server
    });

    expect(manager.getConnection("server-1")).toBeDefined();

    manager.reconcile({}); // Empty options

    expect(manager.getConnection("server-1")).toBeUndefined();
  });
});
