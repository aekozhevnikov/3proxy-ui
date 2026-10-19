/**
 * Thrown for input the caller can correct. Routes map it to 400 so a typo is
 * not reported as a server fault, which buries the real ones in the logs.
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

export function isValidationError(error: unknown): boolean {
    return error instanceof Error && error.name === "ValidationError";
}
