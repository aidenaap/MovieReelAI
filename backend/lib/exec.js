import { spawn } from "node:child_process";

export function run(bin, args, { onStderr } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => {
      stderr += d;
      onStderr?.(String(d));
    });
    child.on("error", (err) =>
      reject(new Error(`${bin} failed to start: ${err.message}`))
    );
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${bin} exited ${code}: ${stderr.slice(-800)}`));
    });
  });
}