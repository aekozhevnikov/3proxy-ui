"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckIcon, ClipboardIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

import { generateHttpConfig, generateSocksConfig, generateTelegramLink } from "@/src/core/proxy-config";
import { showToast } from "@/src/core/toast-utils";

interface ShareModalProps {
    username: string;
    password: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ShareModal({ username, password, isOpen, onClose }: ShareModalProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
    const [copied, setCopied] = useState<{ http: boolean; telegram: boolean; socks: boolean }>({
        http: false,
        telegram: false,
        socks: false
    });
    const modalRef = useRef<HTMLDivElement>(null);

    const [links, setLinks] = useState<{
        telegram?: string;
        http?: string;
        socks?: string;
    }>({});

    useEffect(() => {
        if (isOpen && username && password) {
            // Generate links with runtime config
            Promise.all([
                generateTelegramLink(username, password),
                generateHttpConfig(username, password),
                generateSocksConfig(username, password)
            ]).then(([telegram, http, socks]) => {
                setLinks({ telegram, http, socks });

                // Generate QR code for Telegram link
                QRCode.toDataURL(telegram, {
                    width: 256,
                    margin: 4,
                    color: {
                        dark: "#000000",
                        light: "#FFFFFF"
                    }
                })
                    .then((url: string) => {
                        setQrCodeUrl(url);
                    })
                    .catch(() => {
                        // Silently fail - QR code will just not show
                    });
            });
        }
    }, [isOpen, username, password]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
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

    const copyToClipboard = async (text: string, type: "http" | "telegram" | "socks") => {
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div
                ref={modalRef}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Share Proxy Configuration</h2>
                    <button
                        className="rounded-full px-3 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={onClose}
                    >
                        <XMarkIcon className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* QR Code Section */}
                    <div className="flex flex-col items-center space-y-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Telegram QR Code</h3>
                        {qrCodeUrl ? (
                            <Image
                                alt="Telegram QR Code"
                                className="border border-gray-200 dark:border-gray-700 rounded-xl max-w-full h-auto"
                                height={256}
                                src={qrCodeUrl}
                                width={256}
                            />
                        ) : (
                            <div className="h-64 w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded">
                                <p className="text-gray-500">Generating QR code...</p>
                            </div>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                            Scan to open Telegram with proxy configured
                        </p>
                    </div>

                    {/* Configuration Links */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 overflow-hidden">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">Telegram Link</h4>
                                <button
                                    className="flex items-center gap-2 px-3 py-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full transition-colors text-sm whitespace-nowrap"
                                    disabled={!links.telegram}
                                    onClick={() => links.telegram && copyToClipboard(links.telegram, "telegram")}
                                >
                                    {copied.telegram ? (
                                        <CheckIcon className="h-4 w-4" />
                                    ) : (
                                        <ClipboardIcon className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 overflow-hidden">
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

                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 overflow-hidden">
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
                    </div>
                </div>
            </div>
        </div>
    );
}
