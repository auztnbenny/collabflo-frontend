import { useFileSystem } from "@/context/FileContext"
import useResponsive from "@/hooks/useResponsive"
import cn from "classnames"
import Editor from "./Editor"
import FileTab from "./FileTab"
import { FaUsers, FaCode, FaPencilAlt } from "react-icons/fa"
import { BsRobot } from "react-icons/bs"
import { TbFileUpload } from "react-icons/tb"
// import { BiArchiveIn } from "react-icons/bi"
import { toast } from "react-hot-toast"
import { v4 as uuidV4 } from "uuid"
import { FileSystemItem } from "@/types/file"
// import EditorHeader from "./EditorHeader"

function EditorComponent() {
    const { openFiles } = useFileSystem()
    const { minHeightReached } = useResponsive()
    const { updateDirectory } = useFileSystem()

    const handleOpenDirectory = async () => {
        if ("showDirectoryPicker" in window) {
            try {
                const directoryHandle = await window.showDirectoryPicker()
                toast.loading("Getting files and folders...")
                const structure = await readDirectory(directoryHandle)
                updateDirectory("", structure)
            } catch (error) {
                console.error("Error opening directory:", error)
            }
        } else {
            alert("The File System Access API is not supported in this browser.")
        }
    }

    const readDirectory = async (
        directoryHandle: FileSystemDirectoryHandle,
    ): Promise<FileSystemItem[]> => {
        const children: FileSystemItem[] = []
        const blackList = ["node_modules", ".git", ".vscode", ".next"]

        for await (const entry of directoryHandle.values()) {
            if (entry.kind === "file") {
                const file = await entry.getFile()
                const newFile: FileSystemItem = {
                    id: uuidV4(),
                    name: entry.name,
                    type: "file",
                    content: await file.text(),
                }
                children.push(newFile)
            } else if (entry.kind === "directory") {
                if (blackList.includes(entry.name)) continue

                const newDirectory: FileSystemItem = {
                    id: uuidV4(),
                    name: entry.name,
                    type: "directory",
                    children: await readDirectory(entry),
                    isOpen: false,
                }
                children.push(newDirectory)
            }
        }
        return children
    }

    if (openFiles.length <= 0) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 bg-black">
                <div className="max-w-3xl text-center space-y-8">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Welcome to CollabFlo
                    </h1>
                    <p className="text-xl text-gray-300 mb-8">
                        Real-time collaborative coding environment for teams
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <div className="p-6 bg-opacity-20 bg-white rounded-lg">
                            <div className="flex items-center mb-4">
                                <FaUsers className="text-2xl text-blue-400 mr-3" />
                                <h2 className="text-xl font-semibold text-white">Real-time Collaboration</h2>
                            </div>
                            <p className="text-gray-300">Code together with your team in real-time with live cursors and instant updates</p>
                        </div>

                        <div className="p-6 bg-opacity-20 bg-white rounded-lg">
                            <div className="flex items-center mb-4">
                                <FaCode className="text-2xl text-green-400 mr-3" />
                                <h2 className="text-xl font-semibold text-white">Smart Code Editor</h2>
                            </div>
                            <p className="text-gray-300">Powerful code editing with syntax highlighting and multiple language support</p>
                        </div>

                        <div className="p-6 bg-opacity-20 bg-white rounded-lg">
                            <div className="flex items-center mb-4">
                                <FaPencilAlt className="text-2xl text-yellow-400 mr-3" />
                                <h2 className="text-xl font-semibold text-white">Drawing Tools</h2>
                            </div>
                            <p className="text-gray-300">Switch to drawing mode for quick sketches and visual explanations</p>
                        </div>

                        <div className="p-6 bg-opacity-20 bg-white rounded-lg">
                            <div className="flex items-center mb-4">
                                <BsRobot className="text-2xl text-purple-400 mr-3" />
                                <h2 className="text-xl font-semibold text-white">AI Assistant</h2>
                            </div>
                            <p className="text-gray-300">Get instant help with coding queries using our integrated AI assistant</p>
                        </div>
                    </div>

                    {/* <div className="mt-8 text-gray-300">
                        <p>Start by opening a file from the sidebar or creating a new one</p>
                    </div> */}

                    <div className="mt-12 flex gap-4">
                        <button
                            onClick={handleOpenDirectory}
                            className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition-colors"
                        >
                            <TbFileUpload size={24} />
                            Open Directory
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <main
            className={cn("flex w-full flex-col overflow-x-auto md:h-screen bg-black", {
                "h-[calc(100vh-50px)]": !minHeightReached,
                "h-full": minHeightReached,
            })}
        > 
        {/* <EditorHeader /> */}
            <FileTab />
            <Editor />
        </main>
    )
}

export default EditorComponent