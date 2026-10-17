import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const COMPOSE_FILE = resolve(import.meta.dirname, "..", "compose.yaml");

function compose(...args: string[]) {
  return execFileSync("docker", ["compose", "-f", COMPOSE_FILE, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}

// Starts the aria2 daemon and stops it afterwards, unless they were already running.
export default function globalSetup() {
  const alreadyRunning = compose("ps", "--status", "running", "--quiet", "aria2").trim() !== "";
  compose("up", "--detach", "--wait", "--build", "aria2");
  return () => {
    if (!alreadyRunning) {
      compose("down");
    }
  };
}
