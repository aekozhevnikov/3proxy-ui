"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ClipboardIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { generateHttpConfig, generateHttpsConfig, generateSocksConfig } from "@/src/core/proxy-config";
import { showToast } from "@/src/core/toast-utils";

interface ShareModalProps {
    username: string;
    password: string;
    isOpen: boolean;
    onClose: () => void;
}

type CopyType = "http" | "https" | "socks" | "all" | "proxy-data";

export default function ShareModal({ username, password, isOpen, onClose }: ShareModalProps) {
    const [copied, setCopied] = useState<Record<CopyType, boolean>>({
        http: false,
        https: false,
        socks: false,
        all: false,
        "proxy-data": false
    });
    const modalRef = useRef<HTMLDivElement>(null);

    const [links, setLinks] = useState<{
        https?: string;
        http?: string;
        socks?: string;
    }>({});

    useEffect(() => {
        if (isOpen && username && password) {
            Promise.all([
                generateHttpsConfig(username, password),
                generateHttpConfig(username, password),
                generateSocksConfig(username, password)
            ]).then(([https, http, socks]) => {
                setLinks({ https, http, socks });
            });
        }
    }, [isOpen, username, password]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as EventTarget & Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    const copyToClipboard = async (text: string, type: CopyType) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied((prev) => ({ ...prev, [type]: true }));
            showToast("Copied to clipboard!", "success");
            setTimeout(() => {
                setCopied((prev) => ({ ...prev, [type]: false }));
            }, 2000);
        } catch {
            showToast("Failed to copy", "error");
        }
    };

    const copyAllConfigs = async () => {
        if (!links.https || !links.http || !links.socks) return;
        const allText = [
            "=== HTTPS Configuration ===",
            links.https,
            "",
            "=== HTTP Configuration ===",
            links.http,
            "",
            "=== SOCKS5 Configuration ===",
            links.socks
        ].join("\n");
        await copyToClipboard(allText, "all");
    };

    const copyProxyData = async () => {
        const proxyData = [
            "IP: ",
            "PORTS: HTTP: 3128, HTTPS: 3128, SOCKS5: 1080",
            `USERNAME: ${username}`,
            `PASSWORD: ${password}`
        ].join("\n");
        await copyToClipboard(proxyData, "proxy-data");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div
                ref={modalRef}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="sticky top-0 bg-grey-200 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Share Proxy Configuration</h2>
                    <button
                        className="rounded-full px-3 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={onClose}
                    >
                        <XMarkIcon className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* HTTPS Configuration */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 overflow-hidden">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">HTTPS Configuration</h4>
                            <button
                                className="flex items-center gap-2 px-3 py-3 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full transition-colors text-sm whitespace-nowrap"
                                disabled={!links.https}
                                onClick={() => links.https && copyToClipboard(links.https, "https")}
                            >
                                {copied.https ? (
                                    <CheckIcon className="h-4 w-4" />
                                ) : (
                                    <ClipboardIcon className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* HTTP Configuration */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 overflow-hidden">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">HTTP Configuration</h4>
                            <button
                                className="flex items-center gap-2 px-3 py-3 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full transition-colors text-sm whitespace-nowrap"
                                disabled={!links.http}
                                onClick={() => links.http && copyToClipboard(links.http, "http")}
                            >
                                {copied.http ? (
                                    <CheckIcon className="h-4 w-4" />
                                ) : (
                                    <ClipboardIcon className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* SOCKS5 Configuration */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 overflow-hidden">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">SOCKS5 Configuration</h4>
                            <button
                                className="flex items-center gap-2 px-3 py-3 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full transition-colors text-sm whitespace-nowrap"
                                disabled={!links.socks}
                                onClick={() => links.socks && copyToClipboard(links.socks, "socks")}
                            >
                                {copied.socks ? (
                                    <CheckIcon className="h-4 w-4" />
                                ) : (
                                    <ClipboardIcon className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Copy All Configs Button */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">All Configurations</h4>
                        <button
                            className="flex items-center gap-2 px-3 py-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full transition-colors text-sm whitespace-nowrap"
                            disabled={!links.https || !links.http || !links.socks}
                            onClick={copyAllConfigs}
                        >
                            {copied.all ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                        </button>
                    </div>

                    {/* Copy Proxy Data Button */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">Proxy Connection Data</h4>
                        <button
                            className="flex items-center gap-2 px-3 py-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full transition-colors text-sm whitespace-nowrap"
                            onClick={copyProxyData}
                        >
                            {copied["proxy-data"] ? (
                                <CheckIcon className="h-4 w-4" />
                            ) : (
                                <ClipboardIcon className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
