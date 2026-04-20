import { spawn } from "child_process";

export async function runCommand(command: string, args: string[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: "inherit" });

        child.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });

        child.on("error", (err) => {
            reject(err);
        });
    });
}
