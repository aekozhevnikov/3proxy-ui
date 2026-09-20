// jsdom-specific setup
const React = require("react");
require("@testing-library/jest-dom");

// Polyfill TextEncoder/TextDecoder for React Server Components in jsdom
if (typeof global.TextEncoder === "undefined") {
    global.TextEncoder = require("util").TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
    global.TextDecoder = require("util").TextDecoder;
}
if (typeof global.Request === "undefined") {
    global.Request = class Request {};
}
if (typeof global.Response === "undefined") {
    global.Response = class Response {};
}
if (typeof global.Headers === "undefined") {
    global.Headers = class Headers {};
}

// Mock matchMedia for components that use Tailwind CSS
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: function(query) {
        return {
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn()
        };
    }
});

// Mock Next.js navigation (App Router)
jest.mock("next/navigation", () => ({
    useRouter: () => ({
        push: jest.fn(),
        refresh: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        replace: jest.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/",
    useParams: () => ({}),
    useHref: () => "/",
}));

// Component mocks for jsdom environment (no JSX to avoid parsing issues)
jest.mock("next-themes", () => ({
    useTheme: () => ({
        theme: "light",
        setTheme: jest.fn(),
    }),
}));

jest.mock("next/image", () => ({
    __esModule: true,
    default: (props) => null,
}));

const heroIconToTestId = {
    EyeIcon: "eye-icon",
    EyeSlashIcon: "eye-slash-icon",
    ArrowPathIcon: "arrow-path-icon",
    ChevronDownIcon: "chevron-down-icon",
    CircleStackIcon: "circle-stack-icon",
    FunnelIcon: "funnel-icon",
    PencilIcon: "pencil-icon",
    PlayIcon: "play-icon",
    PlusIcon: "plus-icon",
    ShareIcon: "share-icon",
    SignalIcon: "signal-icon",
    TrashIcon: "trash-icon",
    XMarkIcon: "xmark-icon",
    MagnifyingGlassIcon: "magnifying-glass-icon",
    BellIcon: "bell-icon",
    UserIcon: "user-icon",
    UsersIcon: "users-icon",
    UserGroupIcon: "user-group-icon",
    HomeIcon: "home-icon",
    ArrowRightStartOnRectangleIcon: "arrow-right-start-on-rectangle-icon",
    Bars3Icon: "bars3-icon",
};
const makeHeroIcon = (testId) => (props) => React.createElement("svg", { "data-testid": testId, ...props });
const heroIconEntries = Object.fromEntries(
    Object.entries(heroIconToTestId).map(([name, id]) => [name, makeHeroIcon(id)])
);
jest.mock("@heroicons/react/24/outline", () => heroIconEntries);

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
    PauseCircle: () => null,
}));

jest.mock("@/src/core/toast-utils", () => ({
    showToast: jest.fn(),
}));

jest.mock("@/src/components/custom-date-picker", () => {
    return function MockDatePicker({ label, value, onChange }) {
        return (
            React.createElement("div", { "data-testid": "date-picker-mock" },
                React.createElement("label", { htmlFor: "expiresAt" }, label),
                React.createElement("input", {
                    id: "expiresAt",
                    value: value || "",
                    onChange: (e) => onChange && onChange(e.target.value),
                })
            )
        );
    };
});

jest.mock("qr-code-styling", () => {
    const mockInstance = {
        append: jest.fn(),
        setModules: jest.fn(),
        render: jest.fn(),
    };
    return jest.fn().mockImplementation(() => mockInstance);
});

jest.mock("@/src/hooks/use-qr-code", () => {
    return jest.fn(() => jest.fn());
});


