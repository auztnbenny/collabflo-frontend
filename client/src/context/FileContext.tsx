import {
    FileContent,
    FileContext as FileContextType,
    FileName,
    FileSystemItem,
    Id,
} from "@/types/file"
import { FileStructureUpdateData, SocketEvent } from "@/types/socket"
import { RemoteUser } from "@/types/user"
import {
    findParentDirectory,
    getFileById,
    initialFileStructure,
    isFileExist,
} from "@/utils/file"
import { saveAs } from "file-saver"
import JSZip from "jszip"
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react"
import { toast } from "react-hot-toast"
import { v4 as uuidv4 } from "uuid"
import { useAppContext } from "./AppContext"
import { useSocket } from "./SocketContext"
import { reactTemplate } from "../utils/reacttemplate";

console.log("Available templates:", reactTemplate);
const FileContext = createContext<FileContextType | null>(null)

export const useFileSystem = (): FileContextType => {
    const context = useContext(FileContext)
    if (!context) {
        throw new Error("useFileSystem must be used within FileContextProvider")
    }
    return context
}

function FileContextProvider({ children }: { children: ReactNode }) {
    const { socket } = useSocket()
    const { setUsers, drawingData } = useAppContext()

    const [fileStructure, setFileStructure] =
        useState<FileSystemItem>(initialFileStructure)
    const initialOpenFiles = fileStructure.children
        ? fileStructure.children
        : []
    const [openFiles, setOpenFiles] =
        useState<FileSystemItem[]>(initialOpenFiles)
    const [activeFile, setActiveFile] = useState<FileSystemItem | null>(
        openFiles[0],
    )

    // Function to toggle the isOpen property of a directory (Directory Open/Close)
    const toggleDirectory = (dirId: Id) => {
        const toggleDir = (directory: FileSystemItem): FileSystemItem => {
            if (directory.id === dirId) {
                return {
                    ...directory,
                    isOpen: !directory.isOpen,
                }
            } else if (directory.children) {
                return {
                    ...directory,
                    children: directory.children.map(toggleDir),
                }
            } else {
                return directory
            }
        }

        // Update fileStructure with the opened directory
        setFileStructure((prevFileStructure) => toggleDir(prevFileStructure))
    }

    const collapseDirectories = () => {
        const collapseDir = (directory: FileSystemItem): FileSystemItem => {
            return {
                ...directory,
                isOpen: false,
                children: directory.children?.map(collapseDir),
            }
        }

        setFileStructure((prevFileStructure) => collapseDir(prevFileStructure))
    }

    const createDirectory = useCallback(
        (
            parentDirId: string,
            newDir: string | FileSystemItem,
            sendToSocket: boolean = true,
        ) => {
            console.log("createDirectory called with:", { parentDirId, newDir, sendToSocket });
            let newDirectory: FileSystemItem;

            if (typeof newDir === "string") {
                newDirectory = {
                    id: uuidv4(),
                    name: newDir,
                    type: "directory",
                    children: [],
                    isOpen: false,
                };
            } else {
                newDirectory = newDir;
            }

            setFileStructure((prevFileStructure) => {
                console.log("Previous file structure:", prevFileStructure);
                const updated = {
                    ...prevFileStructure,
                    children: [...(prevFileStructure.children || []), newDirectory],
                };
                console.log("Updated file structure:", updated);
                return updated;
            });

            if (!sendToSocket) return newDirectory.id;

            socket.emit(SocketEvent.DIRECTORY_CREATED, {
                parentDirId,
                newDirectory,
            });

            return newDirectory.id;
        },
        [fileStructure.id, socket]
    );

    const updateDirectory = useCallback(
        (
            dirId: string,
            children: FileSystemItem[],
            sendToSocket: boolean = true,
        ) => {
            if (!dirId) dirId = fileStructure.id

            const updateChildren = (
                directory: FileSystemItem,
            ): FileSystemItem => {
                if (directory.id === dirId) {
                    return {
                        ...directory,
                        children,
                    }
                } else if (directory.children) {
                    return {
                        ...directory,
                        children: directory.children.map(updateChildren),
                    }
                } else {
                    return directory
                }
            }

            setFileStructure((prevFileStructure) =>
                updateChildren(prevFileStructure),
            )

            // Close all open files in the directory being updated
            setOpenFiles([])

            // Set the active file to null if it's in the directory being updated
            setActiveFile(null)

            if (dirId === fileStructure.id) {
                toast.dismiss()
                toast.success("Files and folders updated")
            }

            if (!sendToSocket) return
            socket.emit(SocketEvent.DIRECTORY_UPDATED, {
                dirId,
                children,
            })
        },
        [fileStructure.id, socket],
    )

    const renameDirectory = useCallback(
        (
            dirId: string,
            newDirName: string,
            sendToSocket: boolean = true,
        ): boolean => {
            const renameInDirectory = (
                directory: FileSystemItem,
            ): FileSystemItem | null => {
                if (directory.type === "directory" && directory.children) {
                    // Check if a directory with the new name already exists
                    const isNameTaken = directory.children.some(
                        (item) =>
                            item.type === "directory" &&
                            item.name === newDirName &&
                            item.id !== dirId,
                    )

                    if (isNameTaken) {
                        return null // Name is already taken
                    }

                    return {
                        ...directory,
                        children: directory.children.map((item) => {
                            if (item.id === dirId) {
                                return {
                                    ...item,
                                    name: newDirName,
                                }
                            } else if (item.type === "directory") {
                                // Recursively update nested directories
                                const updatedNestedDir = renameInDirectory(item)
                                return updatedNestedDir !== null
                                    ? updatedNestedDir
                                    : item
                            } else {
                                return item
                            }
                        }),
                    }
                } else {
                    return directory
                }
            }

            const updatedFileStructure = renameInDirectory(fileStructure)

            if (updatedFileStructure === null) {
                return false
            }

            setFileStructure(updatedFileStructure)

            if (!sendToSocket) return true
            socket.emit(SocketEvent.DIRECTORY_RENAMED, {
                dirId,
                newDirName,
            })

            return true
        },
        [socket, setFileStructure, fileStructure],
    )

    const deleteDirectory = useCallback(
        (dirId: string, sendToSocket: boolean = true) => {
            const deleteFromDirectory = (
                directory: FileSystemItem,
            ): FileSystemItem | null => {
                if (directory.type === "directory" && directory.id === dirId) {
                    // If the current directory matches the one to delete, return null (remove it)
                    return null
                } else if (directory.children) {
                    // If it's not the directory to delete, recursively update children
                    const updatedChildren = directory.children
                        .map(deleteFromDirectory)
                        .filter((item) => item !== null) as FileSystemItem[]
                    return {
                        ...directory,
                        children: updatedChildren,
                    }
                } else {
                    // Return the directory as is if it has no children
                    return directory
                }
            }

            setFileStructure(
                (prevFileStructure) => deleteFromDirectory(prevFileStructure)!,
            )

            if (!sendToSocket) return
            socket.emit(SocketEvent.DIRECTORY_DELETED, { dirId })
        },
        [socket],
    )

    const openFile = (fileId: Id) => {
        const file = getFileById(fileStructure, fileId)

        if (file) {
            updateFileContent(activeFile?.id || "", activeFile?.content || "") // Save the content of the previously active file

            // Add the file to openFiles if it's not already open
            if (!openFiles.some((file) => file.id === fileId)) {
                setOpenFiles((prevOpenFiles) => [...prevOpenFiles, file])
            }

            // Update content in openFiles
            setOpenFiles((prevOpenFiles) =>
                prevOpenFiles.map((file) => {
                    if (file.id === activeFile?.id) {
                        return {
                            ...file,
                            content: activeFile.content || "",
                        }
                    } else {
                        return file
                    }
                }),
            )

            setActiveFile(file)
        }
    }

    const closeFile = (fileId: Id) => {
        // Set the active file to next file if there is one
        if (fileId === activeFile?.id) {
            // Save the content of the active file before closing
            updateFileContent(activeFile.id, activeFile.content || "")
            const fileIndex = openFiles.findIndex((file) => file.id === fileId)

            if (fileIndex !== -1 && openFiles.length > 1) {
                if (fileIndex > 0) {
                    setActiveFile(openFiles[fileIndex - 1])
                } else {
                    setActiveFile(openFiles[fileIndex + 1])
                }
            } else {
                setActiveFile(null)
            }
        }

        // Remove the file from openFiles
        setOpenFiles((prevOpenFiles) =>
            prevOpenFiles.filter((openFile) => openFile.id !== fileId),
        )
    }

    const createFile = useCallback(
        (
            parentDirId: string,
            file: FileName | FileSystemItem,
            sendToSocket: boolean = true,
        ): Id => {
            // Check if file with same name already exists
            let num = 1

            if (!parentDirId) parentDirId = fileStructure.id

            const parentDir = findParentDirectory(fileStructure, parentDirId)
            if (!parentDir) throw new Error("Parent directory not found")

            let newFile: FileSystemItem

            if (typeof file === "string") {
                let name = file
                let fileExists = isFileExist(parentDir, name)
                while (fileExists) {
                    name = `${name.split(".")[0]}(${num}).${name.split(".")[1]}`
                    fileExists = isFileExist(parentDir, name)
                    num++
                }

                newFile = {
                    id: uuidv4(),
                    name,
                    type: "file",
                    content: "",
                }
            } else {
                newFile = file
            }

            const updateDirectory = (
                directory: FileSystemItem,
            ): FileSystemItem => {
                if (directory.id === parentDir.id) {
                    // If directory matches parentDir, return updated directory with new file
                    return {
                        ...directory,
                        children: [...(directory.children || []), newFile],
                        isOpen: true,
                    }
                } else if (directory.children) {
                    // If directory has children, recursively update each child
                    return {
                        ...directory,
                        children: directory.children.map(updateDirectory),
                    }
                } else {
                    // Otherwise, return unchanged directory
                    return directory
                }
            }

            // Update fileStructure with the updated parentDir
            setFileStructure((prevFileStructure) =>
                updateDirectory(prevFileStructure),
            )

            // Add the new file to openFiles
            setOpenFiles((prevOpenFiles) => [...prevOpenFiles, newFile])

            // Set the new file as active file
            setActiveFile(newFile)

            if (!sendToSocket) return newFile.id
            socket.emit(SocketEvent.FILE_CREATED, {
                parentDirId,
                newFile,
            })

            return newFile.id
        },
        [fileStructure, socket],
    )
    

    // const createProjectStructure = (projectName: string, rootId: string): FileSystemItem => {
    //     console.log("Creating project structure with name:", projectName);
        
    //     // Create src directory files
    //     const srcFiles: FileSystemItem[] = [
    //         {
    //             id: uuidv4(),
    //             name: "App.tsx",
    //             type: "file",
    //             content: reactTemplate["src/App.tsx"]
    //         },
    //         {
    //             id: uuidv4(),
    //             name: "main.tsx",
    //             type: "file",
    //             content: reactTemplate["src/main.tsx"]
    //         }
    //     ];
    
    //     // Create src directory
    //     const srcDir: FileSystemItem = {
    //         id: uuidv4(),
    //         name: "src",
    //         type: "directory",
    //         children: srcFiles,
    //         isOpen: true
    //     };
    
    //     // Create root files
    //     const rootFiles: FileSystemItem[] = [
    //         {
    //             id: uuidv4(),
    //             name: "package.json",
    //             type: "file",
    //             content: JSON.stringify(reactTemplate["package.json"], null, 2)
    //         },
    //         {
    //             id: uuidv4(),
    //             name: "vite.config.ts",
    //             type: "file",
    //             content: reactTemplate["vite.config.ts"]
    //         }
    //     ];
    
    //     // Create project structure
    //     const projectDir: FileSystemItem = {
    //         id: rootId,
    //         name: projectName,
    //         type: "directory",
    //         children: [...rootFiles, srcDir],
    //         isOpen: true
    //     };
    
    //     console.log("Created project structure with files:", 
    //         projectDir.children?.map(child => child.name)
    //     );
    
    //     return projectDir;
    // };

    const updateFileContent = useCallback(
        (fileId: string, newContent: string) => {
            // Get file before updating
            const file = getFileById(fileStructure, fileId);
            if (!file) return;
    
            // Recursive function to update the file
            const updateFile = (directory: FileSystemItem): FileSystemItem => {
                if (directory.type === "file" && directory.id === fileId) {
                    return {
                        ...directory,
                        content: newContent,
                    }
                } else if (directory.children) {
                    return {
                        ...directory,
                        children: directory.children.map(updateFile),
                    }
                } else {
                    return directory
                }
            }
    
            // Update virtual file structure
            setFileStructure((prevFileStructure) =>
                updateFile(prevFileStructure),
            )
    
            // Update open files
            if (openFiles.some((f) => f.id === fileId)) {
                setOpenFiles((prevOpenFiles) =>
                    prevOpenFiles.map((f) => {
                        if (f.id === fileId) {
                            return {
                                ...f,
                                content: newContent,
                            }
                        } else {
                            return f
                        }
                    }),
                )
            }
    
            // Emit socket event with filename for real file update
            socket.emit(SocketEvent.FILE_UPDATED, {
                fileId,
                content: newContent,
                fileName: file.name
            });
        },
        [openFiles, socket, fileStructure],
    );

    const renameFile = useCallback(
        (
            fileId: string,
            newName: string,
            sendToSocket: boolean = true,
        ): boolean => {
            const renameInDirectory = (
                directory: FileSystemItem,
            ): FileSystemItem => {
                if (directory.type === "directory" && directory.children) {
                    return {
                        ...directory,
                        children: directory.children.map((item) => {
                            if (item.type === "file" && item.id === fileId) {
                                return {
                                    ...item,
                                    name: newName,
                                }
                            } else {
                                return item
                            }
                        }),
                    }
                } else {
                    return directory
                }
            }

            setFileStructure((prevFileStructure) =>
                renameInDirectory(prevFileStructure),
            )

            // Update Open Files
            setOpenFiles((prevOpenFiles) =>
                prevOpenFiles.map((file) => {
                    if (file.id === fileId) {
                        return {
                            ...file,
                            name: newName,
                        }
                    } else {
                        return file
                    }
                }),
            )

            // Update Active File
            if (fileId === activeFile?.id) {
                setActiveFile((prevActiveFile) => {
                    if (prevActiveFile) {
                        return {
                            ...prevActiveFile,
                            name: newName,
                        }
                    } else {
                        return null
                    }
                })
            }

            if (!sendToSocket) return true
            socket.emit(SocketEvent.FILE_RENAMED, {
                fileId,
                newName,
            })

            return true
        },
        [activeFile?.id, socket],
    )

    const deleteFile = useCallback(
        (fileId: string, sendToSocket: boolean = true) => {
            // Get file before deleting it
            const file = getFileById(fileStructure, fileId);
            if (!file) return;
    
            // Recursive function to find and delete the file
            const deleteFileFromDirectory = (
                directory: FileSystemItem,
            ): FileSystemItem => {
                if (directory.type === "directory" && directory.children) {
                    const updatedChildren = directory.children
                        .map((child) => {
                            if (child.type === "directory") {
                                return deleteFileFromDirectory(child)
                            }
                            if (child.id !== fileId) {
                                return child
                            }
                            return null
                        })
                        .filter((child) => child !== null)
    
                    return {
                        ...directory,
                        children: updatedChildren as FileSystemItem[],
                    }
                } else {
                    return directory
                }
            }
    
            // Update virtual file structure
            setFileStructure((prevFileStructure) =>
                deleteFileFromDirectory(prevFileStructure),
            )
    
            // Clean up open files
            if (openFiles.some((f) => f.id === fileId)) {
                setOpenFiles((prevOpenFiles) =>
                    prevOpenFiles.filter((f) => f.id !== fileId),
                )
            }
    
            if (activeFile?.id === fileId) {
                setActiveFile(null)
            }
    
            toast.success("File deleted successfully")
    
            // Emit socket event with filename for real file deletion
            if (!sendToSocket) return
            socket.emit(SocketEvent.FILE_DELETED, { 
                fileId,
                fileName: file.name
            })
        },
        [activeFile?.id, openFiles, socket, fileStructure],
    );

    const downloadFilesAndFolders = () => {
        const zip = new JSZip()

        const downloadRecursive = (
            item: FileSystemItem,
            parentPath: string = "",
        ) => {
            const currentPath =
                parentPath + item.name + (item.type === "directory" ? "/" : "")

            if (item.type === "file") {
                zip.file(currentPath, item.content || "") // Add file to zip
            } else if (item.type === "directory" && item.children) {
                for (const child of item.children) {
                    downloadRecursive(child, currentPath) // Recursively process children
                }
            }
        }

        // Start downloading from the children of the root directory
        if (fileStructure.type === "directory" && fileStructure.children) {
            for (const child of fileStructure.children) {
                downloadRecursive(child)
            }
        }

        // Generate and save zip file
        zip.generateAsync({ type: "blob" }).then((content) => {
            saveAs(content, "download.zip")
        })
    }

    const handleUserJoined = useCallback(
        ({ user }: { user: RemoteUser }) => {
            toast.success(`${user.username} joined the room`)

            // Send the code and drawing data to the server
            socket.emit(SocketEvent.SYNC_FILE_STRUCTURE, {
                fileStructure,
                openFiles,
                activeFile,
                socketId: user.socketId,
            })

            socket.emit(SocketEvent.SYNC_DRAWING, {
                drawingData,
                socketId: user.socketId,
            })

            setUsers((prev) => [...prev, user])
        },
        [activeFile, drawingData, fileStructure, openFiles, setUsers, socket],
    )

    const handleFileStructureSync = useCallback(
        ({
            fileStructure,
            openFiles,
            activeFile,
        }: {
            fileStructure: FileSystemItem
            openFiles: FileSystemItem[]
            activeFile: FileSystemItem | null
        }) => {
            setFileStructure(fileStructure)
            setOpenFiles(openFiles)
            setActiveFile(activeFile)
            toast.dismiss()
        },
        [],
    )

    const handleDirCreated = useCallback(
        ({ parentDirId, newDirectory }: { parentDirId: Id; newDirectory: FileSystemItem }) => {
            console.log("handleDirCreated called with:", { parentDirId, newDirectory });
            createDirectory(parentDirId, newDirectory, false);
            setFileStructure(prevFileStructure => ({ ...prevFileStructure }));
        },
        [createDirectory, fileStructure, setFileStructure]
    );

    const handleDirUpdated = useCallback(
        ({ dirId, children }: { dirId: string; children: string[] }) => {
            console.log("Handling directory update for:", dirId, "with children:", children);
            
            setFileStructure(prev => {
                const updateDir = (dir: FileSystemItem): FileSystemItem => {
                    // Check if this is the directory we want to update
                    // It could be either by ID or by name (for path-style IDs)
                    const isTargetDir = dir.id === dirId || 
                                      dir.name === dirId.replace("/", "") ||
                                      `/${dir.name}` === dirId;
                    
                    if (isTargetDir) {
                        console.log("Found directory to update:", dir.name);
                        
                        // Keep existing children that aren't in the new children list
                        const existingChildren = (dir.children || []).filter(child => 
                            !children.includes(child.name)
                        );
    
                        // Create new children for the new files/directories
                        const newChildren = children.map(childName => {
                            // Check if child already exists
                            const existingChild = (dir.children || []).find(c => c.name === childName);
                            if (existingChild) {
                                return existingChild;
                            }
    
                            // Create new child if it doesn't exist
                            return {
                                id: uuidv4(),
                                name: childName,
                                type: childName === "node_modules" ? "directory" as const : "file" as const,
                                children: childName === "node_modules" ? [] : undefined,
                                content: "",
                                isOpen: false
                            };
                        });
    
                        return {
                            ...dir,
                            children: [...existingChildren, ...newChildren]
                        };
                    }
                    
                    // Recursively update children
                    if (dir.children) {
                        return {
                            ...dir,
                            children: dir.children.map(updateDir)
                        };
                    }
                    
                    return dir;
                };
    
                const newStructure = updateDir(prev);
                console.log("Updated file structure:", newStructure);
                return newStructure;
            });
        },
        []
    );

    const handleDirRenamed = useCallback(
        ({ dirId, newName }: { dirId: Id; newName: FileName }) => {
            renameDirectory(dirId, newName, false)
        },
        [renameDirectory],
    )

    const handleDirDeleted = useCallback(
        ({ dirId }: { dirId: Id }) => {
            deleteDirectory(dirId, false)
        },
        [deleteDirectory],
    )

    const handleFileCreated = useCallback(
        ({
            parentDirId,
            newFile,
        }: {
            parentDirId: Id
            newFile: FileSystemItem
        }) => {
            createFile(parentDirId, newFile, false)
        },
        [createFile],
    )

    const handleFileUpdated = useCallback(
        ({ fileId, newContent }: { fileId: Id; newContent: FileContent }) => {
            updateFileContent(fileId, newContent)
            // Update the content of the active file if it's the same file
            if (activeFile?.id === fileId) {
                setActiveFile({ ...activeFile, content: newContent })
            }
        },
        [activeFile, updateFileContent],
    )

    const handleFileRenamed = useCallback(
        ({ fileId, newName }: { fileId: string; newName: FileName }) => {
            renameFile(fileId, newName, false)
        },
        [renameFile],
    )

    const handleFileDeleted = useCallback(
        ({ fileId }: { fileId: Id }) => {
            deleteFile(fileId, false)
        },
        [deleteFile],
    )
    if (!reactTemplate) {
        console.error("React template is not loaded!");
    }
    
    useEffect(() => {
        console.log("Setting up socket listeners");
        socket.off("file:structure:update");
        if (!socket.connected) {
            console.log("Socket not connected, attempting to connect");
            socket.connect();
        }
        socket.once(SocketEvent.SYNC_FILE_STRUCTURE, handleFileStructureSync);
        socket.on(SocketEvent.USER_JOINED, handleUserJoined);
        socket.on(SocketEvent.DIRECTORY_CREATED, handleDirCreated);
        socket.on(SocketEvent.DIRECTORY_RENAMED, handleDirRenamed);
        socket.on(SocketEvent.DIRECTORY_DELETED, handleDirDeleted);
        socket.on(SocketEvent.FILE_CREATED, handleFileCreated);
        socket.on(SocketEvent.FILE_RENAMED, handleFileRenamed);
        socket.on(SocketEvent.FILE_DELETED, handleFileDeleted);
        console.log("About to set up file:structure:update listener");
        socket.on("file:structure:update", async (data: FileStructureUpdateData) => {
            console.log("File structure update event received:", data);
            
            if (data.type === "project:created" && data.templates) {
                try {
                    // First create the directory
                    console.log("Creating root directory:", data.path);
                    const rootDir: FileSystemItem = {
                        id: data.rootId,
                        name: data.path,
                        type: "directory",
                        children: [],
                        isOpen: true
                    };
                    
                    // Update with root directory
                    setFileStructure(prev => ({
                        ...prev,
                        children: [...(prev.children || []), rootDir]
                    }));
        
                    // Wait for directory to be created
                    await new Promise(resolve => setTimeout(resolve, 100));
        
                    // Add all files
                    setFileStructure(prev => {
                        const updateDirectory = (dir: FileSystemItem): FileSystemItem => {
                            if (dir.id === data.rootId) {
                                console.log("Found target directory, adding files");
                                
                                // Create src directory with files
                                const srcDir: FileSystemItem = {
                                    id: uuidv4(),
                                    name: "src",
                                    type: "directory",
                                    children: [
                                        {
                                            id: uuidv4(),
                                            name: "App.tsx",
                                            type: "file",
                                            content: String(data.templates["src/App.tsx"])
                                        },
                                        {
                                            id: uuidv4(),
                                            name: "main.tsx",
                                            type: "file",
                                            content: String(data.templates["src/main.tsx"])
                                        }
                                    ],
                                    isOpen: true
                                };
        
                                // Create root files
                                const rootFiles: FileSystemItem[] = [
                                    {
                                        id: uuidv4(),
                                        name: "package.json",
                                        type: "file",
                                        content: typeof data.templates["package.json"] === "object" 
                                            ? JSON.stringify(data.templates["package.json"], null, 2)
                                            : String(data.templates["package.json"])
                                    },
                                    {
                                        id: uuidv4(),
                                        name: "vite.config.ts",
                                        type: "file",
                                        content: String(data.templates["vite.config.ts"])
                                    },
                                    {
                                        id: uuidv4(),
                                        name: "tsconfig.json",
                                        type: "file",
                                        content: String(data.templates["tsconfig.json"])
                                    }
                                ];
        
                                return {
                                    ...dir,
                                    children: [...rootFiles, srcDir]
                                };
                            }
                            if (dir.children) {
                                return {
                                    ...dir,
                                    children: dir.children.map(updateDirectory)
                                };
                            }
                            return dir;
                        };
        
                        console.log("Updating directory structure");
                        const newStructure = updateDirectory(prev);
                        console.log("Updated structure:", newStructure);
                        return newStructure;
                    });
        
                } catch (error) {
                    console.error("Error in project creation:", error instanceof Error ? error.message : error);
                }
            }
            else if (data.type === "file:updated") {
                console.log("Updating file content:", data.path);
                try {
                    setFileStructure(prev => {
                        const updateFileInStructure = (dir: FileSystemItem): FileSystemItem => {
                            if (dir.type === "file" && dir.name === data.path) {
                                console.log("Found file to update:", dir.name);
                                return {
                                    ...dir,
                                    content: data.content
                                };
                            }
                            if (dir.children) {
                                return {
                                    ...dir,
                                    children: dir.children.map(updateFileInStructure)
                                };
                            }
                            return dir;
                        };
        
                        const updated = updateFileInStructure(prev);
                        console.log("Updated structure with new file content");
                        return updated;
                    });
        
                    // Update open files if necessary
                    const openFile = openFiles.find(f => f.name === data.path);
                    if (openFile) {
                        setOpenFiles(prev => prev.map(f => 
                            f.name === data.path ? { ...f, content: data.content } : f
                        ));
                        
                        if (activeFile?.name === data.path) {
                            setActiveFile(prev => prev ? { ...prev, content: data.content } : null);
                        }
                        console.log("Updated open file content");
                    }
        
                } catch (error) {
                    console.error("Error updating file:", error instanceof Error ? error.message : error);
                }
            }
            else if (data.type === "directory:updated") {
                setFileStructure(prev => {
                    const updateDirectory = (dir: FileSystemItem): FileSystemItem => {
                        // Check if this is the directory we want to update
                        if (dir.name === data.path.replace("/", "")) {
                            console.log("Found directory to update:", dir.name);
                            
                            // Keep existing children that still exist in the new file list
                            const existingChildren = (dir.children || []).filter(child => 
                                data.children.includes(child.name)
                            );
            
                            // Add new children that don't exist yet
                            const newChildren = data.children
                                .filter(childName => !dir.children?.find(c => c.name === childName))
                                .map((childName: string) => ({
                                    id: uuidv4(),
                                    name: childName,
                                    type: childName === "node_modules" ? "directory" as const : "file" as const,
                                    children: childName === "node_modules" ? [] : undefined,
                                    content: "",
                                    isOpen: false
                                }));
            
                            return {
                                ...dir,
                                children: [...existingChildren, ...newChildren]
                            };
                        }
            
                        // Recurse through children
                        if (dir.children) {
                            return {
                                ...dir,
                                children: dir.children.map(updateDirectory)
                            };
                        }
            
                        return dir;
                    };
            
                    const newStructure = updateDirectory(prev);
                    console.log("New file structure:", newStructure);
                    return newStructure;
                });
            }
        });
        
        socket.on(SocketEvent.FILE_UPDATED, ({ type, path, content }) => {
            if (type === "file:updated") {
                // Update the virtual file content
                updateFileContent(path, content);
            }
        });
        
    
        socket.on("connect", () => {
            console.log("Socket connected in FileContext");
        });
    
        socket.on("disconnect", () => {
            console.log("Socket disconnected in FileContext");
        });
        
        console.log("Available templates:", Object.keys(reactTemplate));
        console.log("Available templates on load:", Object.keys(reactTemplate));
    
        return () => {
            console.log("Cleaning up socket listeners");
            socket.off(SocketEvent.USER_JOINED);
            socket.off(SocketEvent.DIRECTORY_CREATED);
            socket.off(SocketEvent.DIRECTORY_UPDATED);
            socket.off(SocketEvent.DIRECTORY_RENAMED);
            socket.off(SocketEvent.DIRECTORY_DELETED);
            socket.off(SocketEvent.FILE_CREATED);
            socket.off(SocketEvent.FILE_UPDATED);
            socket.off(SocketEvent.FILE_RENAMED);
            socket.off(SocketEvent.FILE_DELETED);
            socket.off("file:structure:update");
        }
    },[socket, handleDirCreated, handleDirDeleted, handleDirRenamed, handleDirUpdated, handleFileCreated, handleFileDeleted, handleFileRenamed, handleFileUpdated, handleFileStructureSync, handleUserJoined, fileStructure, updateFileContent, openFiles, activeFile?.name, updateDirectory]);

    return (
        <FileContext.Provider
            value={{
                fileStructure,
                openFiles,
                activeFile,
                setActiveFile,
                closeFile,
                toggleDirectory,
                collapseDirectories,
                createDirectory,
                updateDirectory,
                renameDirectory,
                deleteDirectory,
                openFile,
                createFile,
                updateFileContent,
                renameFile,
                deleteFile,
                downloadFilesAndFolders,
            }}
        >
            {children}
        </FileContext.Provider>
    )

}

export { FileContextProvider }
export default FileContext


