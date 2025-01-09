import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
import axios from "axios"
import LoadingAnimation from "../../pages/loadingpage"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

interface FormComponentProps {
  userFullName?: string | null;
  prefilledRoomId?: string;
}

const FormComponent: React.FC<FormComponentProps> = ({ userFullName, prefilledRoomId }) => {
  const location = useLocation()
  const { currentUser, setCurrentUser, status, setStatus } = useAppContext()
  const { socket } = useSocket()
  const usernameRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const createNewRoomId = () => {
    setCurrentUser({ ...currentUser, roomId: uuidv4() })
    toast.success("Created a new Room Id")
    usernameRef.current?.focus()
  }

  const handleInputChanges = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name
    const value = e.target.value
    setCurrentUser({ ...currentUser, [name]: value })
  }

  const validateForm = () => {
    if (currentUser.username.length === 0) {
      toast.error("Enter your username")
      return false
    } else if (currentUser.roomId.length === 0) {
      toast.error("Enter a room id")
      return false
    } else if (currentUser.roomId.length < 5) {
      toast.error("Room Id must be at least 5 characters long")
      return false
    } else if (currentUser.username.length < 3) {
      toast.error("Username must be at least 3 characters long")
      return false
    }
    return true
  }

  const joinRoom = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === USER_STATUS.ATTEMPTING_JOIN) return;
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      toast.loading("Saving room data...");
      const response = await axios.post(
        `${BACKEND_URL}/api/room/saveRoom`,
        {
          username: currentUser.username,
          roomId: currentUser.roomId
        },
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.data.success) {
        setIsLoading(false);
        toast.error("Failed to save room data");
        return;
      }

      console.log("Room data added to database");
      setStatus(USER_STATUS.ATTEMPTING_JOIN);
      socket.emit(SocketEvent.JOIN_REQUEST, currentUser);
      
    } catch (error) {
      console.error("Error in join process:", error);
      toast.error("Failed to join room");
      setStatus(USER_STATUS.DISCONNECTED);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser.roomId.length > 0) return
    if (location.state?.roomId) {
      setCurrentUser({ ...currentUser, roomId: location.state.roomId })
      if (currentUser.username.length === 0) {
        toast.success("Enter your username")
      }
    }
  }, [currentUser, location.state?.roomId, setCurrentUser])

  useEffect(() => {
    if (prefilledRoomId) {
      setCurrentUser((prev) => ({
        ...prev,
        roomId: prefilledRoomId,
      }));
    }
  }, [prefilledRoomId, setCurrentUser]);
  
  useEffect(() => {
    if (userFullName) {
      setCurrentUser((prev) => ({
        ...prev,
        username: userFullName,
      }));
    }
  }, [userFullName, setCurrentUser]);

  useEffect(() => {
    if (status === USER_STATUS.DISCONNECTED && !socket.connected) {
      socket.connect()
      return
    }

    const isRedirect = sessionStorage.getItem("redirect") || false

    if (status === USER_STATUS.JOINED && !isRedirect) {
      sessionStorage.setItem("redirect", "true")
      setIsLoading(true)
    } else if (status === USER_STATUS.JOINED && isRedirect) {
      sessionStorage.removeItem("redirect")
      setStatus(USER_STATUS.DISCONNECTED)
      socket.disconnect()
      socket.connect()
    }
  }, [
    currentUser,
    location.state?.redirect,
    navigate,
    setStatus,
    socket,
    status,
  ])

  if (isLoading) {
    return <LoadingAnimation roomId={currentUser.roomId} />;
  }

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-4">
      <form onSubmit={joinRoom} className="flex flex-col gap-4">
        <input
          type="text"
          name="roomId"
          placeholder="Room Id"
          className="rounded-md border border-gray-300 px-3 py-2 focus:outline-primary"
          onChange={handleInputChanges}
          value={currentUser.roomId}
          readOnly={!!prefilledRoomId}
        />
        <input
          type="text"
          name="username"
          placeholder="Username"
          className="rounded-md border border-gray-300 px-3 py-2 focus:outline-primary"
          onChange={handleInputChanges}
          value={currentUser.username}
          ref={usernameRef}
          readOnly
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-dark"
        >
          Join
        </button>
      </form>
      {!prefilledRoomId && (
        <button
          className="text-sm text-blue-600 underline hover:text-blue-800"
          onClick={createNewRoomId}
        >
          Generate Unique Room Id
        </button>
      )}
    </div>
  );
}

export default FormComponent