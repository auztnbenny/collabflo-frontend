import { FileSystemItem, Id } from "@/types/file";
import { findParentDirectory, getFileById } from "@/utils/file";
import { io, Socket } from "socket.io-client";

interface FileContextActions {
    createDirectory: (parentDirId: Id, name: string) => Id;
    createFile: (parentDirId: Id, name: string) => Id;
    deleteDirectory: (dirId: Id) => void;
    deleteFile: (fileId: Id) => void;
}

interface LocationState {
    dirId: Id;
    fileId: Id | null;
    path: string;
}

export class TerminalService {
    private locationState!: LocationState;
    private fileSystem!: FileSystemItem;
    private fileContextActions: FileContextActions;
    private socket!: Socket;
    private onOutput: ((output: string) => void) | null = null;
    private outputCache: Set<string> = new Set();
    private static instance: TerminalService | null = null;
    private isProcessing: boolean = false;
    private onReady: (() => void) | null = null;

    constructor(fileSystem: FileSystemItem, fileContextActions: FileContextActions) {
        if (TerminalService.instance instanceof TerminalService) {
            Object.assign(this, TerminalService.instance);
            return this;
        }

        this.fileContextActions = fileContextActions;
        this.fileSystem = fileSystem;
        this.locationState = {
            dirId: fileSystem.id,
            fileId: null,
            path: "/"
        };

        this.initializeSocket();
        this.setupSocketEventHandlers();

        TerminalService.instance = this;
    }

    private initializeSocket(): void {
        if (this.socket?.connected) {
            this.socket.disconnect();
        }

        this.socket = io("http://localhost:3000", {
            transports: ["websocket"],
            reconnection: true,
            forceNew: true
        });
    }

    private setupSocketEventHandlers(): void {
        this.socket.on("terminal:output", ({ data }) => {
            if (this.outputCache.has(data)) return;
            
            this.outputCache.add(data);
            if (this.onOutput) {
                this.onOutput(data);
            }

            setTimeout(() => {
                this.outputCache.delete(data);
            }, 500);
        });

        this.socket.on("terminal:ready", () => {
            this.isProcessing = false;
            if (this.onReady) {
                this.onReady();
            }
        });

        this.socket.on("terminal:error", ({ error }) => {
            console.log("Terminal error received:", error);
            const errorMessage = `\x1b[31mError: ${error}\x1b[0m\n`;
            if (!this.outputCache.has(errorMessage) && this.onOutput) {
                this.outputCache.add(errorMessage);
                this.onOutput(errorMessage);
            }
        });


        this.socket.on("file:structure:update", (data) => {
            console.log("Received file structure update:", data);
        });
    }

    private handleUrlsInOutput(data: string): void {
        if (!this.onOutput) return;

        if (data.includes("http://") || data.includes("https://")) {
            const urls = data.match(/(https?:\/\/[^\s]+)/g);
            if (urls) {
                const outputHandler = this.onOutput;
                urls.forEach((url: string) => {
                    const clickableUrl = `\r\n\x1b[34m${url}\x1b[0m\r\n`;
                    if (!this.outputCache.has(clickableUrl)) {
                        this.outputCache.add(clickableUrl);
                        outputHandler(clickableUrl);
                    }
                });
            }
        }
    }

    async executeCommand(command: string): Promise<string> {
        if (this.isProcessing) return "";
        
        try {
            this.isProcessing = true;
            const [cmd, ...args] = command.trim().split(" ");
    
            if (cmd === "npm") {
                const result = await this.executeNpmCommand(command);
                // Don't set isProcessing to false here - wait for terminal:ready event
                return result;
            }
    
            if (["ls", "cd", "pwd", "help", "clear"].includes(cmd.toLowerCase())) {
                const result = this.executeVirtualCommand(cmd, args);
                this.isProcessing = false;  // Reset for virtual commands
                return result;
            }
    
            return await this.executeSocketCommand(command);
        } catch (error) {
            this.isProcessing = false;
            return `Error: ${error instanceof Error ? error.message : String(error)}\r\n`;
        }
    }

    private executeNpmCommand(command: string): Promise<string> {
        return new Promise((resolve) => {
            const cleanup = () => {
                this.socket.off("terminal:output", handleOutput);
                this.socket.off("terminal:ready", handleReady);
                this.isProcessing = false;  // Make sure to reset processing state
                if (this.onReady) {
                    this.onReady(); // Call onReady callback
                }
                resolve("");
            };
    
            const handleOutput = ({ data }: { data: string }) => {
                if (this.onOutput) {
                    this.onOutput(data);
                }
            };
    
            const handleReady = () => {
                cleanup();
            };
    
            this.socket.on("terminal:output", handleOutput);
            this.socket.on("terminal:ready", handleReady);
    
            this.socket.emit("terminal:command", { 
                command,
                cwd: this.locationState.path
            });
        });
    }
    
    // Update setReadyHandler method
    setReadyHandler(handler: () => void): void {
        this.onReady = handler;
    }

    private executeVirtualCommand(cmd: string, args: string[]): string {
        try {
            switch (cmd.toLowerCase()) {
                case "ls":
                    return this.handleLS();
                case "cd":
                    return this.handleCD(args.join(" "));
                case "pwd":
                    return this.handlePWD();
                case "help":
                    return this.handleHelp();
                case "clear":
                    return "\x1bc";
                default:
                    return `Command not found: ${cmd}\r\n`;
            }
        } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}\r\n`;
        }
    }

    private executeSocketCommand(command: string): Promise<string> {
        return new Promise((resolve) => {
            this.socket.emit("terminal:command", {
                command,
                cwd: this.locationState.path
            });

            const handleReady = () => {
                this.socket.off("terminal:ready", handleReady);
                this.isProcessing = false;
                resolve("");
            };

            this.socket.on("terminal:ready", handleReady);
        });
    }

    private handleHelp(): string {
        return `Available commands:
  Virtual File System:
    ls              - List directory contents
    cd <path>       - Change directory or navigate to file
    pwd             - Print working directory
    clear           - Clear terminal screen
    help            - Show this help message

  NPM Commands:
    npm init        - Initialize a new Node.js project
    npm install     - Install dependencies
    npm run         - Run scripts

  Git Commands:
    git init        - Initialize a repository
    git add         - Add files to staging
    git commit      - Commit changes
    git push        - Push to remote repository
    git status      - Check repository status
\r\n`;
    }

    private handleLS(): string {
        const currentDir = findParentDirectory(this.fileSystem, this.locationState.dirId);
        if (!currentDir || !currentDir.children) {
            throw new Error("Invalid directory");
        }

        return currentDir.children
            .map(item => item.type === "directory" ?
                `\x1b[34m${item.name}/\x1b[0m` :
                `\x1b[32m${item.name}\x1b[0m`)
            .join("  ") + "\r\n";
    }

    private handleCD(targetPath: string): string {
        if (!targetPath || targetPath === ".") return "";

        if (targetPath === "..") {
            return this.handleCDParent();
        }

        const currentDir = findParentDirectory(this.fileSystem, this.locationState.dirId);
        if (!currentDir || !currentDir.children) {
            throw new Error("Invalid directory");
        }

        const target = currentDir.children.find(item => item.name === targetPath);
        if (!target) {
            throw new Error(`No such file or directory: ${targetPath}`);
        }

        if (target.type === "directory") {
            this.locationState = {
                dirId: target.id,
                fileId: null,
                path: this.locationState.path === "/" ?
                    `/${target.name}` :
                    `${this.locationState.path}/${target.name}`
            };
        }

        return "";
    }

    private handleCDParent(): string {
        if (this.locationState.fileId !== null) {
            const lastSlashIndex = this.locationState.path.lastIndexOf("/");
            this.locationState = {
                dirId: this.locationState.dirId,
                fileId: null,
                path: lastSlashIndex === 0 ? "/" : this.locationState.path.slice(0, lastSlashIndex)
            };
            return "";
        }

        if (this.locationState.dirId === this.fileSystem.id) {
            return ""; // Already at root
        }

        const currentDir = findParentDirectory(this.fileSystem, this.locationState.dirId);
        if (!currentDir) return "";

        const parent = findParentDirectory(this.fileSystem, currentDir.id);
        if (parent) {
            const lastSlashIndex = this.locationState.path.lastIndexOf("/");
            this.locationState = {
                dirId: parent.id,
                fileId: null,
                path: lastSlashIndex === 0 ? "/" : this.locationState.path.slice(0, lastSlashIndex)
            };
        }

        return "";
    }
    public sendSignal(signal: string): void {
        this.socket.emit("terminal:signal", { 
            signal,
            projectPath: this.locationState.path
        });
        if (signal === "SIGINT") {
            this.isProcessing = false;
        }
    }
    

    private handlePWD(): string {
        return this.locationState.path + "\r\n";
    }

    setOutputHandler(handler: (output: string) => void): void {
        this.onOutput = handler;
    }

    getCurrentPath(): string {
        return this.locationState.path;
    }
    isCommandProcessing(): boolean {
        return this.isProcessing;
    }

    dispose(): void {
        if (this.socket?.connected) {
            this.socket.disconnect();
        }
        this.outputCache.clear();
        this.isProcessing = false;
        TerminalService.instance = null;
    }
}