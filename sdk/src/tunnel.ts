import { spawn } from "node:child_process";

/**
 * Opens a Cloudflare quick tunnel for the given port.
 * Returns the public https URL.
 * Requires `cloudflared` to be installed: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
 */
export async function openTunnel(port: number, timeoutMs = 15_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`, "--no-autoupdate"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Tunnel timeout after ${timeoutMs}ms — is cloudflared installed?`));
    }, timeoutMs);

    const onData = (data: Buffer) => {
      const line = data.toString();
      const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    };

    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("error", (err) => { clearTimeout(timer); reject(err); });

    // keep process alive after promise resolves
    proc.on("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error(`cloudflared exited with code ${code}`));
    });
  });
}
