/** Shared process launcher for every command-line driver. */

export interface ProcResult {
  code: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export async function exec(binary: string, args: string[], timeoutSeconds: number, env?: Record<string, string | undefined>): Promise<ProcResult> {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(binary, args, { windowsHide: true, env: env ?? process.env });
    } catch (e) {
      resolve({ code: -1, stdout: "", stderr: String(e), timedOut: false });
      return;
    }
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const killer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutSeconds * 1000);
    child.stdout?.on("data", (b: Buffer) => (stdout += b.toString()));
    child.stderr?.on("data", (b: Buffer) => (stderr += b.toString()));
    child.on("error", (e) => {
      clearTimeout(killer);
      resolve({ code: -1, stdout, stderr: String(e), timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(killer);
      resolve({ code: code ?? -1, stdout, stderr, timedOut });
    });
  });
}

export function firstLine(s: string): string {
  return (s.split("\n")[0] ?? "").trim();
}

export function tail(s: string, n: number): string {
  return s.slice(-n);
}
