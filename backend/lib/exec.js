import { spawn } from "node:child_process";

export function run(bin, args, { onStderr, stallMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let timer;

    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`${bin} produced no output for ${stallMs}ms — killed`));
      }, stallMs);
    };
    bump();

    child.stdout.on("data", (d) => { stdout += d; bump(); });
    child.stderr.on("data", (d) => { stderr += d; bump(); onStderr?.(String(d)); });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`${bin} failed to start: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${bin} exited ${code}: ${stderr.slice(-800)}`));
    });
  });
}