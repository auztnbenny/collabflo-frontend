import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import io from "socket.io-client";

// Socket.io connection to backend
const socket = io("https://collaborative-ide-ynie.onrender.com"); // Replace with your backend URL

const TerminalComponent = () => {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddonInstance = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (terminalRef.current) {
      const term = new Terminal({
        rows: 20,
        cursorBlink: true,
        theme: {
          background: "#1e1e1e",
          foreground: "#ffffff",
          cursor: "#ffffff",
          cursorAccent: "#000000",
        },
        fontSize: 14,
        fontFamily: "Menlo, Monaco, 'Courier New', monospace",
        scrollback: 1000, // Increase scrollback buffer
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      terminalInstance.current = term;
      fitAddonInstance.current = fitAddon;

      term.open(terminalRef.current);
      fitAddon.fit();
      term.focus();

      term.writeln("\x1b[1;32mWelcome to the Terminal\x1b[0m");

      // Listen for terminal input commands
      const prompt = () => term.write("\r\n$ ");
      prompt();

      term.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

        if (domEvent.key === "Enter") {
          // Get the full line input from the terminal's active buffer
          const currentLine = term.buffer.active.getLine(term.buffer.active.cursorY);
          const lineText = currentLine ? currentLine.translateToString() : ""; // Get the current line text

          // Remove the prompt symbol "$ " from the beginning of the command
          const command = lineText.startsWith("$ ") ? lineText.substring(2).trim() : lineText.trim();

          // Send terminal command prefixed with "terminal:" to backend
          socket.emit("message", `terminal: ${command}`); // Send full line of input without prompt symbol
          prompt(); // Display the prompt after sending the command
        } else if (domEvent.key === "Backspace") {
          term.write("\b \b"); // Handle backspace
        } else if (printable) {
          term.write(key); // Handle printable characters
        }
      });

      // Handle terminal output from the backend
      socket.on("terminalOutput", (output: string) => {
        term.writeln(output); // Output from backend
        prompt(); // After output is displayed, show prompt again
        term.scrollToBottom(); // Ensure terminal scrolls to the bottom after output
      });

      // Handle errors in AI responses (optional)
      socket.on("CHATBOT_ERROR", (errorMessage: string) => {
        term.writeln(`\x1b[1;31m${errorMessage}\x1b[0m`); // Show error in red
        prompt();
      });
    }

    return () => {
      terminalInstance.current?.dispose();
    };
  }, []);

  // Fit terminal on window resize
  useEffect(() => {
    const handleResize = () => fitAddonInstance.current?.fit();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      ref={terminalRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "200px",
        padding: "8px",
        backgroundColor: "#1e1e1e",
        position: "relative",
        overflow: "hidden",
        overflowY: "auto", // Ensure vertical scrolling if terminal content exceeds
      }}
      tabIndex={0} // Ensure terminal can receive focus
    />
  );
};

export default TerminalComponent;
