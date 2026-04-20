"use client";

import { Accordion, AccordionItem, Button, Modal } from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { usePress } from "@react-aria/interactions";

import { donationAddresses } from "@/src/core/config";
import useQrCode from "@/src/hooks/use-qr-code";

interface Props {
    disclosure: {
        isOpen: boolean;
        onOpenChange: (open: boolean) => void;
    };
}

function DummyPressable() {
    // usePress is registered in the parent PressResponder (from DialogTrigger)
    usePress({});

    // Return a hidden div that doesn't affect layout
    return <div style={{ display: "none" }} />;
}

export default function DonationModal({ disclosure }: Props) {
    // Use hardcoded donation addresses from config
    const validDonations = Object.entries(donationAddresses).filter(([, address]) => address && address.trim() !== "");

    const hasDonations = validDonations.length > 0;

    return (
        <Modal isOpen={disclosure.isOpen} onOpenChange={disclosure.onOpenChange}>
            <DummyPressable />
            <Modal.Backdrop>
                <Modal.Container>
                    <Modal.Dialog className="bg-gray-50 dark:bg-gray-800">
                        <Modal.Header className="border-b border-gray-400 dark:border-gray-600 dark:text-white p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span>💗</span>
                                <span className="text-lg font-semibold">Donation</span>
                            </div>
                            <Modal.CloseTrigger className="rounded-full p-3 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <XMarkIcon className="h-5 w-5" />
                            </Modal.CloseTrigger>
                        </Modal.Header>
                        <Modal.Body className="p-6">
                            {hasDonations ? (
                                <>
                                    <div className="mb-4">
                                        If you find this project useful and would like to support its development, you
                                        can make a donation.
                                    </div>

                                    <Accordion variant="default">
                                        {validDonations.map(([name, address]) => (
                                            <AccordionItem key={name}>
                                                <Accordion.Heading>
                                                    <Accordion.Trigger>
                                                        <span className="font-medium">{name}</span>
                                                        <Accordion.Indicator />
                                                    </Accordion.Trigger>
                                                </Accordion.Heading>
                                                <Accordion.Panel>
                                                    <Accordion.Body>
                                                        <CryptoItem address={address!} name={name} />
                                                    </Accordion.Body>
                                                </Accordion.Panel>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </>
                            ) : (
                                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                    No donation addresses configured yet.
                                </div>
                            )}
                        </Modal.Body>
                        <Modal.Footer className="flex justify-end border-t border-gray-400 dark:border-gray-600 py-3">
                            <Button
                                className="rounded-full px-3 py-3 mt-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                size="md"
                                onPress={() => disclosure.onOpenChange(false)}
                            >
                                Close
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
}

function CryptoItem({ _name, address }: { _name: string; address: string }) {
    const qrCodeContainerRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    const qrCode = useQrCode(qrCodeContainerRef);

    useEffect(() => {
        qrCode(address);
    }, [address, qrCode]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="flex flex-col items-center overflow-hidden">
            <div className="flex justify-center mb-6 rounded-xl">
                <div ref={qrCodeContainerRef} className="rounded-xl overflow-hidden bg-white dark:bg-gray-700" />
            </div>
            <div className="flex items-center gap-2 w-full max-w-lg">
                <div className="flex-1 min-w-0 px-3 py-3 bg-gray-200 dark:bg-gray-700 rounded-full text-sm">
                    <span className="font-mono text-gray-900 dark:text-white block truncate max-w-full">{address}</span>
                </div>
                <Button
                    className="rounded-full px-3 py-3 bg-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                    size="md"
                    variant="outline"
                    onPress={handleCopy}
                >
                    {copied ? "✓" : "⧉"}
                </Button>
            </div>
        </div>
    );
}
