"use client";

import { ArrowPathIcon, ChevronDownIcon, FunnelIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button, ButtonGroup, Dropdown, Label } from "@heroui/react";

import { ProxyUser } from "@/src/core/definitions";

type StatusFilter = "all" | "active" | "deactivated";

interface UserHeaderProps {
    filteredUsers: ProxyUser[];
    statusFilter: StatusFilter;
    expandedUserIds: Set<number>;
    isReloading: boolean;
    onStatusFilterChange: (filter: StatusFilter) => void;
    onToggleExpandAll: () => void;
    onReloadConfig: () => Promise<void>;
    onOpenCreateModal: () => void;
}

export default function UserHeader({
    filteredUsers,
    statusFilter,
    expandedUserIds,
    isReloading,
    onStatusFilterChange,
    onToggleExpandAll,
    onReloadConfig,
    onOpenCreateModal
}: UserHeaderProps) {
    return (
        <div className="flex justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Proxy Users</h1>
            </div>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors disabled:opacity-50"
                        disabled={isReloading}
                        title="Reload 3proxy configuration"
                        onClick={onReloadConfig}
                    >
                        {isReloading ? (
                            <div className="h-4 w-4 border-2 border-gray-700 dark:border-gray-300 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ArrowPathIcon className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">{isReloading ? "Reloading..." : "Reload Config"}</span>
                    </button>

                    <button
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors lg:hidden"
                        title={expandedUserIds.size === filteredUsers.length ? "Collapse all" : "Expand all"}
                        onClick={onToggleExpandAll}
                    >
                        {expandedUserIds.size === filteredUsers.length ? (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        d="M5 15l7-7 7 7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                    />
                                </svg>
                                <span>Collapse</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        d="M19 9l-7 7-7-7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                    />
                                </svg>
                                <span>Expand</span>
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-2">
                        <ButtonGroup size="sm" variant="tertiary">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-2.5 py-1.5 sm:px-4 sm:py-2">
                                <FunnelIcon />
                                {statusFilter}
                            </Button>
                            <Dropdown>
                                <Button
                                    isIconOnly
                                    className="bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 sm:px-4 sm:py-2"
                                    size="sm"
                                >
                                    <ChevronDownIcon />
                                </Button>
                                <Dropdown.Popover className="max-w-[290px]" placement="bottom end">
                                    <Dropdown.Menu>
                                        <Dropdown.Item
                                            className="flex flex-col items-start gap-1"
                                            id="All"
                                            textValue="All"
                                            onClick={() => onStatusFilterChange("all")}
                                        >
                                            <Label>All</Label>
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                            className="flex flex-col items-start gap-1"
                                            id="active"
                                            textValue="Active"
                                            onClick={() => onStatusFilterChange("active")}
                                        >
                                            <Label>Active</Label>
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                            className="flex flex-col items-start gap-1"
                                            id="deactivated"
                                            textValue="Deactivated"
                                            onClick={() => onStatusFilterChange("deactivated")}
                                        >
                                            <Label>Deactivated</Label>
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown.Popover>
                            </Dropdown>
                        </ButtonGroup>

                        <button
                            className="flex items-center gap-1.5 px-2 py-1 sm:px-4 sm:py-2 text-[10px] sm:text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-colors"
                            onClick={onOpenCreateModal}
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span className="hidden sm:inline">Add User</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
