// src/components/Terminal.tsx
import React, { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useFileSystem } from "@/context/FileContext";
import { TerminalService } from "@/services/terminalservice";

const TerminalComponent: React.FC = () => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const terminalServiceRef = useRef<TerminalService | null>(null);
    const commandBufferRef = useRef("");
    
    const { fileStructure } = useFileSystem();

    const formatPrompt = (path: string): string => {
        return path === '/' ? '$ > ' : `$ ${path.slice(1)} > `;
    };

    const writeToTerminal = (text: string, addNewLine = false) => {
        if (!xtermRef.current) return;
        if (addNewLine) {
            xtermRef.current.writeln(text);
        } else {
            xtermRef.current.write(text);
        }
    };

    const showPrompt = () => {
        if (!terminalServiceRef.current) return;
        writeToTerminal(`\r\n${formatPrompt(terminalServiceRef.current.getCurrentPath())}`);
    };

    const executeCommand = async (command: string) => {
        if (!terminalServiceRef.current) return;
        
        try {
            writeToTerminal(`${command}\n`);
            const output = await terminalServiceRef.current.executeCommand(command);
            if (output && output.trim()) {
                writeToTerminal(output);
            }
            if (!command.includes("npm run dev")) {
                showPrompt();
            }
        } catch (error) {
            writeToTerminal(`Error: ${error instanceof Error ? error.message : String(error)}`, true);
            showPrompt();
        }
    };

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize terminal service
        terminalServiceRef.current = new TerminalService(fileStructure, {
            createDirectory: () => "",
            createFile: () => "",
            deleteDirectory: () => {},
            deleteFile: () => {}
        });

        // Initialize xterm
        const term = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "Menlo, Monaco, \"Courier New\", monospace",
            theme: {
                background: "#1e1e1e",
                foreground: "#ffffff",
                cursor: "#ffffff"
            },
            convertEol: true,
            allowTransparency: true,
            windowsMode: true,
             // Add these options
            screenReaderMode: true,
            linkHandler: {
            activate: (_event: MouseEvent, uri: string) => {
                window.open(uri, "_blank");
            }
        }
        });

        xtermRef.current = term;
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();
        terminalServiceRef.current.setOutputHandler((output) => {
            writeToTerminal(output);
        });

        writeToTerminal("Terminal initialized. Type \"help\" for commands.", true);
        writeToTerminal(formatPrompt("/"));

        const handleKey = ({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
            if (domEvent.keyCode === 13) { // Enter
                const command = commandBufferRef.current.trim();
                if (command) {
                    void executeCommand(command);
                } else {
                    showPrompt();
                }
                commandBufferRef.current = "";
            } else if (domEvent.keyCode === 8) { // Backspace
                if (commandBufferRef.current.length > 0) {
                    commandBufferRef.current = commandBufferRef.current.slice(0, -1);
                    term.write("\b \b");
                }
            } else if (!domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey) {
                commandBufferRef.current += key;
                term.write(key);
            }
        };

        term.onKey(handleKey);

        return () => {
            term.dispose();
            if (terminalServiceRef.current) {
                terminalServiceRef.current.dispose();
            }
        };
    }, [fileStructure]);

    return (
        <div className="w-full h-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-700">
            <div className="flex items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-sm text-gray-300">Terminal</span>
            </div>
            <div 
                ref={terminalRef} 
                className="h-[calc(100%-40px)] w-full" 
                style={{ padding: "12px" }}
            />
        </div>
    );
};

export default TerminalComponent;