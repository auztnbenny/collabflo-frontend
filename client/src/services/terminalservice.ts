import { FileSystemItem, Id } from "@/types/file"
import { findParentDirectory, getFileById } from "@/utils/file"
import { io, Socket } from "socket.io-client";

interface FileContextActions {
    createDirectory: (parentDirId: Id, name: string) => Id
    createFile: (parentDirId: Id, name: string) => Id
    deleteDirectory: (dirId: Id) => void
    deleteFile: (fileId: Id) => void
}

interface LocationState {
    dirId: Id;
    fileId: Id | null;
    path: string;
}

export class TerminalService {
    private locationState: LocationState;
    private fileSystem: FileSystemItem;
    private fileContextActions: FileContextActions;
    private socket: Socket;
    private onOutput: ((output: string) => void) | null = null;

    constructor(fileSystem: FileSystemItem, fileContextActions: FileContextActions) {
        this.fileSystem = fileSystem;
        this.fileContextActions = fileContextActions;
        this.locationState = {
            dirId: fileSystem.id,
            fileId: null,
            path: "/"
        };
    
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        this.socket = io(backendUrl);
    
        // Track last output to prevent duplicates
        let lastOutput = "";
    
        // Single terminal:output handler
        this.socket.on("terminal:output", ({ data }) => {
            // Prevent duplicate output
            if (data === lastOutput) return;
            lastOutput = data;
    
            console.log("Terminal output received:", data);
            
            if (this.onOutput) {
                this.onOutput(data);
                
                // Make URLs clickable
                if (data.includes("http://") || data.includes("https://")) {
                    const urls: RegExpMatchArray | null = data.match(/(https?:\/\/[^\s]+)/g);
                    if (urls !== null) {
                        urls.forEach((url: string) => {
                            // Add clickable link with special formatting
                            const clickableUrl = `\r\n\x1b[34m${url}\x1b[0m\r\n`;
                            if (this.onOutput) {
                                this.onOutput(clickableUrl);
                            }
                        });
                    }
                }
            }
        });
    
        // Error handler
        this.socket.on("terminal:error", ({ error }) => {
            console.log("Terminal error received:", error);
            if (this.onOutput) {
                this.onOutput(`\x1b[31mError: ${error}\x1b[0m\n`);
            }
        });
    
        // File structure update handler
        this.socket.on("file:structure:update", (data) => {
            console.log("Received file structure update:", data);
        });
    }

    async executeCommand(command: string): Promise<string> {
        const [cmd, ...args] = command.trim().split(" ");
    
       
        if (cmd === "npm") {
            return new Promise((resolve) => {
                // Send the original command instead of converting to npx vite
                this.socket.emit("terminal:command", { 
                    command: command,    // Use original command instead of converting
                    cwd: this.locationState.path
                });
    
                const handleOutput = ({ data }: { data: string }) => {
                    if (this.onOutput) {
                        this.onOutput(data);
                    }
                };
    
                const handleReady = () => {
                    this.socket.off("terminal:output", handleOutput);
                    this.socket.off("terminal:ready", handleReady);
                    resolve("");
                };
    
                this.socket.on("terminal:output", handleOutput);
                this.socket.on("terminal:ready", handleReady);
            });
        }
    
    


        // First check if it's a virtual filesystem command
        if (["ls", "cd", "pwd", "help", "clear"].includes(cmd.toLowerCase())) {
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

        // If not a virtual command, send to server
        return new Promise((resolve) => {
            this.socket.emit("terminal:command", {
                command,
                cwd: this.locationState.path
            });

            const handleReady = () => {
                this.socket.off("terminal:ready", handleReady);
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
        // If in a file, just remove the file part
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

    private handlePWD(): string {
    return this.locationState.path + "\r\n";
}
setOutputHandler(handler: (output: string) => void): void {
    this.onOutput = handler;
}

getCurrentPath(): string {
    return this.locationState.path;
}
dispose(): void {
    if(this.socket) {
    this.socket.disconnect();
}
    }
}