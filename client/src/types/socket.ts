import { Socket } from "socket.io-client"

type SocketId = string
interface ProjectCreationData {
    structure: boolean;
    type: "project:created";
    path: string;
    parentPath: string;
    rootId: string;
    templates: {
        [key: string]: string | Record<string, unknown>;
    };
    debug?: boolean;
}

interface FileUpdateData {
    type: "file:updated";
    path: string;
    parentPath: string;
    content: string;
}

interface DirectoryUpdateData {
    type: "directory:updated";
    path: string;
    children: string[];
}

type FileStructureUpdateData = ProjectCreationData | FileUpdateData | DirectoryUpdateData;

enum SocketEvent {
    JOIN_REQUEST = "join-request",
    JOIN_ACCEPTED = "join-accepted",
    USER_JOINED = "user-joined",
    USER_DISCONNECTED = "user-disconnected",
    SYNC_FILE_STRUCTURE = "sync-file-structure",
    DIRECTORY_CREATED = "directory-created",
    DIRECTORY_UPDATED = "directory-updated",
    DIRECTORY_RENAMED = "directory-renamed",
    DIRECTORY_DELETED = "directory-deleted",
    FILE_CREATED = "file-created",
    FILE_UPDATED = "file-updated",
    FILE_RENAMED = "file-renamed",
    FILE_DELETED = "file-deleted",
    USER_OFFLINE = "offline",
    USER_ONLINE = "online",
    SEND_MESSAGE = "send-message",
    RECEIVE_MESSAGE = "receive-message",
    TYPING_START = "typing-start",
    TYPING_PAUSE = "typing-pause",
    USERNAME_EXISTS = "username-exists",
    REQUEST_DRAWING = "request-drawing",
    SYNC_DRAWING = "sync-drawing",
    DRAWING_UPDATE = "drawing-update",
    AI_CHAT_RESPONSE = "AI_CHAT_RESPONSE",
    AI_CHAT_MESSAGE = "AI_CHAT_MESSAGE",
    CHATBOT_RESPONSE = "CHATBOT_RESPONSE",
    CHATBOT_ERROR = "CHATBOT_ERROR",
    CHATBOT_MESSAGE = "CHATBOT_MESSAGE",
    ROOM_JOINED = "ROOM_JOINED",
    JOIN_ROOM = "JOIN_ROOM",
    FILE_STRUCTURE_UPDATE = "file:structure:update",
    FILE_SYSTEM_ERROR = "file:system:error",
    WORKSPACE_CREATED = "workspace:created"

}

interface SocketContext {
    socket: Socket
}

export { SocketEvent }
export type { 
    SocketContext, 
    SocketId, 
    FileStructureUpdateData,
    ProjectCreationData,
    FileUpdateData,
    DirectoryUpdateData 
}