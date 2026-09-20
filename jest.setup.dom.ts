// jsdom-specific setup
import "@testing-library/jest-dom";

// Mock matchMedia for components that use Tailwind CSS
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
    })
});

// Component mocks for jsdom environment (no JSX to avoid TS parsing issues)
jest.mock("next-themes", () => ({
    useTheme: () => ({
        theme: "light",
        setTheme: jest.fn()
    })
}));

jest.mock("next/image", () => ({
    __esModule: true,
    default: (_props: Record<string, unknown>) => null
}));

jest.mock("@heroicons/react/24/outline", () => ({
    EyeIcon: () => null,
    EyeSlashIcon: () => null,
    ArrowPathIcon: () => null,
    ChevronDownIcon: () => null,
    CircleStackIcon: () => null,
    FunnelIcon: () => null,
    PencilIcon: () => null,
    PlayIcon: () => null,
    PlusIcon: () => null,
    ShareIcon: () => null,
    SignalIcon: () => null,
    TrashIcon: () => null,
    XMarkIcon: () => null,
    MagnifyingGlassIcon: () => null,
    BellIcon: () => null,
    UserIcon: () => null,
    UsersIcon: () => null
}));

jest.mock("lucide-react", () => ({
    Infinity: () => null,
    MoreHorizontal: () => null,
    Search: () => null,
    Loader2: () => null,
    Trash2: () => null,
    Edit: () => null,
    Copy: () => null,
    Check: () => null,
    AlertCircle: () => null,
    AlertTriangle: () => null,
    RefreshCw: () => null,
    Filter: () => null,
    BarChart3: () => null,
    Shield: () => null,
    TrendingUp: () => null,
    Clock: () => null,
    Calendar: () => null,
    Settings: () => null,
    UserCheck: () => null,
    UserX: () => null,
    PauseCircle: () => null
}));

jest.mock("@/src/core/toast-utils", () => ({
    showToast: jest.fn()
}));
