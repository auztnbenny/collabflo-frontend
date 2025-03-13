
// import { useAppContext } from "@/context/AppContext"
import React from "react";
import { useUser } from "@clerk/clerk-react"
import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"

export default function JoinRedirect() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();

    useEffect(() => {
        if (user && roomId) {
            navigate(`/editor/${roomId}`, {
                state: { 
                    username: user.emailAddresses[0].emailAddress,
                    roomId: roomId
                }
            });
        }
    }, [user, roomId, navigate]);

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="text-center">
                <h2>Joining room...</h2>
            </div>
        </div>
    );
}