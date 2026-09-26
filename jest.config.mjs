/** @type {import('jest').Config} */
export default {
    // Default setup - applies to all projects
    moduleNameMapper: {
        "^@heroui/react$": "<rootDir>/tests/__mocks__/heroui-react.js",
        "^@/(.*)$": "<rootDir>/$1",
        "^@src/(.*)$": "<rootDir>/src/$1"
    },
    testPathIgnorePatterns: ["/node_modules/", "/.next/", "/dist/", "/tests/e2e/"],
    testRegex: ["/tests/unit/.*\\.test\\.(ts|tsx)$", "/tests/integration/.*\\.db\\.test\\.(ts|tsx)$"],
    transform: {
        "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.json", diagnostics: false }]
    },
    projects: [
        {
            displayName: "jsdom",
            testEnvironment: "jsdom",
            setupFilesAfterEnv: ["<rootDir>/jest.setup.dom.js"],
            testMatch: [
                "<rootDir>/tests/unit/components/**/*.test.{ts,tsx}",
                "<rootDir>/tests/unit/pages/**/*.test.{ts,tsx}"
            ],
            moduleNameMapper: {
                "^@/(.*)$": "<rootDir>/$1",
                "^@src/(.*)$": "<rootDir>/src/$1",
                "^@heroui/react$": "<rootDir>/tests/__mocks__/heroui-react.js"
            },
            transform: {
                "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.json", diagnostics: false }]
            }
        },
        {
            displayName: "node",
            testEnvironment: "node",
            setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
            testMatch: [
                "<rootDir>/tests/unit/core/**/*.test.{ts,tsx}",
                "<rootDir>/tests/unit/api/**/*.test.{ts,tsx}",
                "<rootDir>/tests/unit/lib/**/*.test.{ts,tsx}",
                "<rootDir>/tests/unit/hooks/**/*.test.{ts,tsx}"
            ],
            moduleNameMapper: {
                "^@/(.*)$": "<rootDir>/$1",
                "^@src/(.*)$": "<rootDir>/src/$1",
                "^@heroui/react$": "<rootDir>/tests/__mocks__/heroui-react.js"
            },
            transform: {
                "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.json", diagnostics: false }]
            }
        },
        {
            displayName: "fail2ban",
            testEnvironment: "node",
            setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
            testMatch: ["<rootDir>/tests/fail2ban-test/**/*.test.ts"],
            moduleNameMapper: {
                "^@/(.*)$": "<rootDir>/$1",
                "^@src/(.*)$": "<rootDir>/src/$1",
                "^@heroui/react$": "<rootDir>/tests/__mocks__/heroui-react.js"
            },
            transform: {
                "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.json", diagnostics: false }]
            }
        },
        {
            displayName: "integration",
            testEnvironment: "node",
            setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
            testMatch: ["<rootDir>/tests/integration/**/*.db.test.ts"],
            moduleNameMapper: {
                "^@/(.*)$": "<rootDir>/$1",
                "^@src/(.*)$": "<rootDir>/src/$1"
            },
            transform: {
                "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.json", diagnostics: false }]
            }
        }
    ]
};
