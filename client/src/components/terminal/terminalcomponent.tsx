import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useFileSystem } from "@/context/FileContext";
import { TerminalService } from "@/services/terminalservice";
import { Minimize2, Maximize2, RotateCcw } from "lucide-react";

type DebouncedFunction = (...args: unknown[]) => void;

const TerminalComponent: React.FC = () => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const terminalServiceRef = useRef<TerminalService | null>(null);
    const commandBufferRef = useRef("");
    const outputBufferRef = useRef<Set<string>>(new Set());
    const [isMaximized, setIsMaximized] = useState(false);
    const isProcessingCommandRef = useRef(false);
    const [terminalHeight, setTerminalHeight] = useState(250);
    const isDraggingRef = useRef(false);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);

    const { fileStructure } = useFileSystem();

    const handleSelection = () => {
        if (!xtermRef.current) return;
        const selection = xtermRef.current.getSelection();
        if (selection) {
            navigator.clipboard.writeText(selection).then(() => {
                const currentBg = xtermRef.current?.options.theme?.background;
                if (xtermRef.current && currentBg) {
                    xtermRef.current.options.theme = {
                        ...xtermRef.current.options.theme,
                        background: "#2c313c"
                    };
                    setTimeout(() => {
                        if (xtermRef.current) {
                            xtermRef.current.options.theme = {
                                ...xtermRef.current.options.theme,
                                background: currentBg
                            };
                        }
                    }, 200);
                }
            }).catch(console.error);
        }
    };
    const handleDrag = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        
        const delta = startYRef.current - e.clientY;
        const newHeight = Math.min(Math.max(startHeightRef.current + delta, 150), window.innerHeight * 0.8);
        setTerminalHeight(newHeight);
        
        // Refit the terminal to the new size
        if (xtermRef.current) {
            const fitAddon = new FitAddon();
            xtermRef.current.loadAddon(fitAddon);
            fitAddon.fit();
        }
    }, []);
    const handleDragEnd = useCallback(() => {
        isDraggingRef.current = false;
        document.removeEventListener("mousemove", handleDrag);
        document.removeEventListener("mouseup", handleDragEnd);
    }, []);
    
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        isDraggingRef.current = true;
        startYRef.current = e.clientY;
        startHeightRef.current = terminalHeight;
        
        // Add event listeners for drag and release
        document.addEventListener("mousemove", handleDrag);
        document.addEventListener("mouseup", handleDragEnd);
    }, [terminalHeight]);

    

    const formatPrompt = (path: string): string => {
        return path === "/" ? "$ > " : `$ ${path.slice(1)} > `;
    };

    const writeToTerminal = (text: string, addNewLine = false) => {
        if (!xtermRef.current) return;

        // Clean the text and ensure proper spacing
        const cleanText = text
            .replace(/\r\n/g, "\n")
            .replace(/\n+/g, "\n")
            .replace(/\s+/g, " "); // Normalize spaces

        if (outputBufferRef.current.has(cleanText)) {
            return;
        }

        outputBufferRef.current.add(cleanText);
        setTimeout(() => {
            outputBufferRef.current.delete(cleanText);
        }, 500);

        // Ensure proper formatting for commands
        const formattedText = text.startsWith("$") ? `\r${text}` : text;

        requestAnimationFrame(() => {
            if (xtermRef.current) {
                if (addNewLine) {
                    xtermRef.current.writeln(formattedText);
                } else {
                    xtermRef.current.write(formattedText);
                }
            }
        });
    };

    const showPrompt = useCallback(() => {
        if (!terminalServiceRef.current) return;
        requestAnimationFrame(() => {
            writeToTerminal(`\r\n${formatPrompt(terminalServiceRef.current!.getCurrentPath())}`);
        });
    }, []);

    const executeCommand = useCallback(async (command: string) => {
        if (!terminalServiceRef.current) return;
        
        try {
            isProcessingCommandRef.current = true;  // Set processing flag
            const output = await terminalServiceRef.current.executeCommand(command);
            
            if (output && output.trim()) {
                writeToTerminal(output);
            }
    
            // Reset processing state and show prompt for specific commands
            if (command.startsWith("npm init") || command.startsWith("mkdir")) {
                // Delay the reset slightly to ensure all outputs are processed
                setTimeout(() => {
                    isProcessingCommandRef.current = false;
                    if (xtermRef.current) {
                        xtermRef.current.focus();
                        showPrompt();
                    }
                }, 100);
            } else if (!command.startsWith("npm ")) {
                // For non-npm commands, show prompt immediately
                showPrompt();
            }
    
            // Reset the command buffer
            commandBufferRef.current = "";
            
            // Reset processing flag
            isProcessingCommandRef.current = false;
            if (xtermRef.current) {
                xtermRef.current.focus();
            }
        } catch (error) {
            writeToTerminal(`Error: ${error instanceof Error ? error.message : String(error)}`, true);
            showPrompt();
            isProcessingCommandRef.current = false;  // Reset flag on error
            commandBufferRef.current = "";  // Clear command buffer on error
        }
    }, [showPrompt]);

    const toggleMaximize = () => {
        setIsMaximized(!isMaximized);
        setTimeout(() => {
            if (xtermRef.current) {
                const fitAddon = new FitAddon();
                xtermRef.current.loadAddon(fitAddon);
                fitAddon.fit();
            }
        }, 100);
    };

    const clearTerminal = () => {
        if (xtermRef.current) {
            xtermRef.current.clear();
            outputBufferRef.current.clear();
            showPrompt();
        }
    };

    useEffect(() => {
        if (!terminalRef.current) return;

        terminalServiceRef.current = new TerminalService(fileStructure, {
            createDirectory: () => "",
            createFile: () => "",
            deleteDirectory: () => { },
            deleteFile: () => { }
        });

        if (terminalServiceRef.current) {
            terminalServiceRef.current.setReadyHandler(() => {
                isProcessingCommandRef.current = false;
                commandBufferRef.current = "";
                if (xtermRef.current) {
                    xtermRef.current.focus();
                    // Force a re-render of the terminal
                    requestAnimationFrame(() => {
                        xtermRef.current?.write("");
                        showPrompt();
                    });
                }
            });
        }

        // Handle all terminal input (typing and pasting)
        const handleTerminalData = (data: string) => {
            if (!isProcessingCommandRef.current && xtermRef.current) {
                if (data === "\r") { // Enter key
                    const command = commandBufferRef.current.trim();
                    writeToTerminal("\r\n");
                    if (command) {
                        void executeCommand(command);
                    } else {
                        showPrompt();
                    }
                    commandBufferRef.current = "";
                } else if (data === "\u007F" || data === "\b") { // Backspace
                    if (commandBufferRef.current.length > 0) {
                        commandBufferRef.current = commandBufferRef.current.slice(0, -1);
                        xtermRef.current.write("\b \b");
                    }
                } else { // Regular input
                    commandBufferRef.current += data;
                    xtermRef.current.write(data);
                }
            }
        }

        const term = new XTerm({
            allowTransparency: true,
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "JetBrains Mono, Menlo, Monaco, 'Courier New', monospace",
            theme: {
                background: "#1a1b26",
                foreground: "#c0caf5",
                cursor: "#c0caf5",
                cursorAccent: "#1a1b26",
                selectionBackground: "#33467C",
                black: "#15161E",
                red: "#f7768e",
                green: "#9ece6a",
                yellow: "#e0af68",
                blue: "#7aa2f7",
                magenta: "#bb9af7",
                cyan: "#7dcfff",
                white: "#a9b1d6",
                brightBlack: "#414868",
                brightRed: "#f7768e",
                brightGreen: "#9ece6a",
                brightYellow: "#e0af68",
                brightBlue: "#7aa2f7",
                brightMagenta: "#bb9af7",
                brightCyan: "#7dcfff",
                brightWhite: "#c0caf5"
            },
            windowsMode: true,
            scrollback: 1000,
            rightClickSelectsWord: true,
            allowProposedApi: true,
            convertEol: true,
            macOptionClickForcesSelection: true,
        });

        xtermRef.current = term;
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        // Set up input handler for all terminal input
        term.onData(handleTerminalData);
        
        // Add selection handler
        terminalRef.current.addEventListener("mouseup", handleSelection);

        // Set up output handler with debouncing
        let outputTimeout: NodeJS.Timeout;
        if (terminalServiceRef.current) {
            terminalServiceRef.current.setOutputHandler((output) => {
                clearTimeout(outputTimeout);
                outputTimeout = setTimeout(() => {
                    writeToTerminal(output);
                }, 10);
            });
        }

        // Handle key input
        const handleKey = ({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
            // Only handle special keys here
            if (domEvent.ctrlKey && (key.toLowerCase() === "c")) {
                console.log("Ctrl+C detected");
                writeToTerminal("^C\r\n");
                if (terminalServiceRef.current) {
                    terminalServiceRef.current.sendSignal("SIGINT");
                    isProcessingCommandRef.current = false;
                    commandBufferRef.current = "";
                    showPrompt();
                }
                return;
            }
        
            if (isProcessingCommandRef.current) {
                return;
            }
        
            if (domEvent.keyCode === 13) { // Enter
                const command = commandBufferRef.current.trim();
                if (command) {
                    void executeCommand(command);
                } else {
                    showPrompt();
                }
                commandBufferRef.current = "";
            }
            // Remove the else-if blocks for backspace and regular typing
            // Let handleTerminalData handle those
        };
        

        term.onKey(handleKey);

        // Optimized resize handling
        const debouncedFit = debounce(() => fitAddon.fit(), 100);
        const resizeObserver = new ResizeObserver(debouncedFit);
        resizeObserver.observe(terminalRef.current);

        // Initial terminal message
        writeToTerminal("\x1b[34m=== Terminal Initialized ===\x1b[0m\r\n", true);
        writeToTerminal("\x1b[90mType 'help' for available commands\x1b[0m\r\n", true);
        showPrompt();

        return () => {
            terminalRef.current?.removeEventListener("mouseup", handleSelection);
            term.dispose();
            resizeObserver.disconnect();
            clearTimeout(outputTimeout);
            if (terminalServiceRef.current) {
                terminalServiceRef.current.dispose();
            }
            document.removeEventListener("mousemove", handleDrag);
            document.removeEventListener("mouseup", handleDragEnd);
        };
    }, [fileStructure, handleDrag, handleDragEnd, executeCommand, showPrompt]);

    return (
        <div
            className={`flex flex-col ${
                isMaximized
                    ? "fixed bottom-0 left-0 right-0 h-[60vh] max-h-[60vh] z-50 bg-[#1a1b26]"
                    : "absolute bottom-0 left-0 right-0 bg-[#1a1b26] rounded-lg overflow-hidden border border-gray-700"
            }`}
            style={{ 
                height: isMaximized ? "60vh" : `${terminalHeight}px`,
                minHeight: "150px",
                transition: isMaximized ? "height 0.2s ease-in-out" : "none"
            }}
        >
            {/* Resize handle */}
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-row-resize bg-transparent hover:bg-gray-600/50 transition-colors"
                onMouseDown={handleDragStart}
                style={{ zIndex: 60 }}
            />

            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#24283b] border-b border-gray-700">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-300 font-semibold">Terminal</span>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={clearTerminal}
                        className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                        title="Clear"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        onClick={toggleMaximize}
                        className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                        title={isMaximized ? "Minimize" : "Maximize"}
                    >
                        {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            {/* Terminal content */}
            <div
                ref={terminalRef}
                className="flex-1 overflow-hidden"
                style={{ padding: "12px" }}
            />
        </div>
    );
};

function debounce(func: DebouncedFunction, wait: number): DebouncedFunction {
    let timeout: NodeJS.Timeout;

    return function debounced(...args: unknown[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default TerminalComponent;