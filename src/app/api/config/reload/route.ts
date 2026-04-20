import { exec as execCb } from "child_process";

import { NextResponse } from "next/server";

const exec = (cmd: string): Promise<{ stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
        execCb(cmd, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
        });
    });
};

export async function POST(): Promise<Response> {
    try {
        // Try to find 3proxy container and restart it
        let containerId = null;

        try {
            const { stdout } = await exec("docker ps --filter 'name=3proxy' --format '{{.ID}}' | head -1");

            containerId = stdout.trim();

            if (!containerId) {
                const { stdout: stdout2 } = await exec(
                    "docker ps --filter 'name=vpn-3proxy' --format '{{.ID}}' | head -1"
                );

                containerId = stdout2.trim();
            }
        } catch {
            // No container found
        }

        if (containerId) {
            // Restart the container to actively disconnect existing connections
            const result = await exec(`docker restart ${containerId}`);

            return NextResponse.json({
                success: true,
                message: "Configuration reloaded and container restarted",
                output: result.stdout || "Container restarted"
            });
        } else {
            // No container - config file is updated by other endpoints, no action needed
            return NextResponse.json({
                success: true,
                message: "Configuration updated (no container to restart)",
                output: "File system updated"
            });
        }
    } catch (e) {
        console.error("Config reload error:", e);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to reload configuration",
                error: e instanceof Error ? e.message : "unknown error"
            },
            { status: 500 }
        );
    }
}
