"use client";
import { useSocket } from "../../../context/SocketProvider";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import peer from "../../../service/peer";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import VideoPlayer from "../../../components/VideoPlayer";
import CallHandleButtons from "../../../components/CallHandleButtons";
import { AvatarImage, AvatarFallback, Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LogOutIcon,
  MicIcon,
  MicOffIcon,
  MoveHorizontalIcon,
  PhoneIcon,
  RefreshCwIcon,
  SettingsIcon,
  ShareIcon,
  UserRoundX,
  VideoIcon,
} from "lucide-react";

const RoomPage: React.FC<{ params: { slug: string } }> = ({ params }) => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMute, setIsAudioMute] = useState<boolean>(false);
  const [isVideoOnHold, setIsVideoOnHold] = useState<boolean>(false);
  const [callButton, setCallButton] = useState<boolean>(true);
  const [isSendButtonVisible, setIsSendButtonVisible] = useState<boolean>(true);

  const handleUserJoined = useCallback(
    ({ email, id }: { email: string; id: string }) => {
      setRemoteSocketId(id);
    },
    []
  );

  const handleIncomingCall = useCallback(
    async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      if (socket) {
        setRemoteSocketId(from);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);

        const ans = await peer.getAnswer(offer);
        socket.emit("call:accepted", { to: from, ans });
      }
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    if (myStream && peer.getPeer()) {
      for (const track of myStream.getTracks()) {
        peer.getPeer()!.addTrack(track, myStream);
      }
      setIsSendButtonVisible(false);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }: { from: string; ans: RTCSessionDescriptionInit }) => {
      if (peer.getPeer()) {
        peer.setLocalDescription(ans);
        sendStreams();
      }
    },
    [sendStreams]
  );

  const handleNegoNeededIncoming = useCallback(
    async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      if (socket) {
        const ans = await peer.getAnswer(offer);
        socket.emit("peer:nego:done", { to: from, ans });
      }
    },
    [socket]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    if (socket && remoteSocketId) {
      socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
    }
  }, [remoteSocketId, socket]);

  const handleNegoFinal = useCallback(
    async ({ ans }: { ans: RTCSessionDescriptionInit }) => {
      if (peer.getPeer()) {
        await peer.setLocalDescription(ans);
      }
    },
    []
  );

  useEffect(() => {
    if (peer.getPeer()) {
      peer.getPeer()!.addEventListener("negotiationneeded", handleNegoNeeded);

      return () => {
        peer
          .getPeer()!
          .removeEventListener("negotiationneeded", handleNegoNeeded);
      };
    }
  }, [handleNegoNeeded]);

  useEffect(() => {
    if (peer.getPeer()) {
      peer.getPeer()!.addEventListener("track", (ev: RTCTrackEvent) => {
        setRemoteStream(ev.streams[0]);
      });
    }
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("user:joined", handleUserJoined);
      socket.on("incoming:call", handleIncomingCall);
      socket.on("call:accepted", handleCallAccepted);
      socket.on("peer:nego:needed", handleNegoNeededIncoming);
      socket.on("peer:nego:final", handleNegoFinal);

      return () => {
        socket.off("user:joined", handleUserJoined);
        socket.off("incoming:call", handleIncomingCall);
        socket.off("call:accepted", handleCallAccepted);
        socket.off("peer:nego:needed", handleNegoNeededIncoming);
        socket.off("peer:nego:final", handleNegoFinal);
      };
    }
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleNegoNeededIncoming,
    handleNegoFinal,
  ]);

  useEffect(() => {
    if (socket) {
      socket.on("call:end", ({ from }: { from: string }) => {
        if (from === remoteSocketId && peer.getPeer()) {
          peer.getPeer()!.close();

          if (myStream) {
            myStream.getTracks().forEach((track) => track.stop());
            setMyStream(null);
          }

          setRemoteStream(null);
          setRemoteSocketId(null);
        }
      });

      return () => {
        socket.off("call:end");
      };
    }
  }, [remoteSocketId, myStream, socket]);

  useEffect(() => {
    if (socket) {
      socket.on("call:initiated", ({ from }: { from: string }) => {
        if (from === remoteSocketId) {
          setCallButton(false);
        }
      });

      return () => {
        socket.off("call:initiated");
      };
    }
  }, [socket, remoteSocketId]);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    if (isAudioMute) {
      stream.getAudioTracks().forEach((track) => (track.enabled = false));
    }

    if (isVideoOnHold) {
      stream.getVideoTracks().forEach((track) => (track.enabled = false));
    }

    const offer = await peer.getOffer();
    if (socket && remoteSocketId) {
      socket.emit("user:call", { to: remoteSocketId, offer });
      setMyStream(stream);
      setCallButton(false);
      socket.emit("call:initiated", { to: remoteSocketId });
    }
  }, [remoteSocketId, socket, isAudioMute, isVideoOnHold]);

  const handleToggleAudio = () => {
    peer.toggleAudio();
    setIsAudioMute(!isAudioMute);
  };

  const handleToggleVideo = () => {
    peer.toggleVideo();
    setIsVideoOnHold(!isVideoOnHold);
  };

  const handleEndCall = useCallback(() => {
    if (peer.getPeer()) {
      peer.getPeer()!.close();

      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
        setMyStream(null);
      }

      setRemoteStream(null);

      if (socket && remoteSocketId) {
        socket.emit("call:end", { to: remoteSocketId });
      }
      setRemoteSocketId(null);
    }
  }, [myStream, remoteSocketId, socket]);

  const router = useRouter();
  // const { slug } = router.query;
  const slug = params.slug;

  return (
    <div className="flex h-screen w-full">
      <div className="flex-1 relative">
        <title>Room No. {slug}</title>
        <h1 className="absolute top-0 left-0 text-3xl text-center font-josefin tracking-tighter mt-2 ml-2 mmd:text-xl mxs:text-sm">
          Video
          <VideoCallIcon sx={{ fontSize: 50, color: "rgb(30,220,30)" }} />
          Peers
        </h1>
        <div className="w-full h-full relative">
          {!remoteSocketId && (
            <h4 className="font-bold text-base text-gray-500 text-center justify-center absolute top-1/2 left-1/2">
              <UserRoundX className="w-6 h-6 mr-2" /> No One In Room
            </h4>
          )}
          {myStream && (
            <VideoPlayer
              stream={myStream}
              name={"My Stream"}
              isAudioMute={isAudioMute}
            />
          )}

          {remoteStream && (
            <VideoPlayer
              stream={remoteStream}
              name={"Remote Stream"}
              isAudioMute={isAudioMute}
            />
          )}
          {myStream && remoteStream && !isSendButtonVisible && (
            <CallHandleButtons
              isAudioMute={isAudioMute}
              isVideoOnHold={isVideoOnHold}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onEndCall={handleEndCall}
            />
          )}
        </div>

        <span className="w-full h-full object-cover rounded-md bg-muted" />
      </div>
      <div className="bg-gray-950 w-72 flex flex-col">
        {remoteSocketId && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage alt="John Doe" src="/placeholder-avatar.jpg" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-sm text-white">John Doe</div>
                <div className="text-gray-400 text-sm">Participant</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  className="text-gray-400 hover:text-gray-50"
                  size="icon"
                  variant="ghost"
                >
                  <MicIcon className="w-5 h-5" />
                </Button>
                <Button
                  className="text-gray-400 hover:text-gray-50"
                  size="icon"
                  variant="ghost"
                >
                  <VideoIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage alt="Jane Smith" src="/placeholder-avatar.jpg" />
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-sm text-white">
                  Jane Smith
                </div>
                <div className="text-gray-400 text-sm">Presenter</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  className="text-gray-400 hover:text-gray-50"
                  size="icon"
                  variant="ghost"
                >
                  <MicOffIcon className="w-5 h-5" />
                </Button>
                <Button
                  className="text-gray-400 hover:text-gray-50"
                  size="icon"
                  variant="ghost"
                >
                  <ShareIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage alt="Bob Johnson" src="/placeholder-avatar.jpg" />
                <AvatarFallback>BJ</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-sm text-white">
                  Bob Johnson
                </div>
                <div className="text-gray-400 text-sm">Participant</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  className="text-gray-400 hover:text-gray-50"
                  size="icon"
                  variant="ghost"
                >
                  <MicIcon className="w-5 h-5" />
                </Button>
                <Button
                  className="text-gray-400 hover:text-gray-50"
                  size="icon"
                  variant="ghost"
                >
                  <VideoIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage alt="Sarah Lee" src="/placeholder-avatar.jpg" />
                <AvatarFallback>SL</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-sm text-white">
                  Sarah Lee
                </div>
                <div className="text-gray-400 text-sm">Participant</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  className="text-gray-400 hover:text-gray-50"
                  size="icon"
                  variant="ghost"
                >
                  <MicOffIcon className="w-5 h-5" />
                </Button>
                <Button
                  className="text-gray-400 hover:text-gray-50"
                  size="icon"
                  variant="ghost"
                >
                  <VideoIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 p-4 space-y-4 justify-center items-center">
          <h4 className="font-bold  text-base text-gray-300 text-center">
            {remoteSocketId ? "Connected With Remote User!" : "No One In Room"}
          </h4>
          {remoteStream && remoteSocketId && isSendButtonVisible && (
            <Button
              className="bg-blue-500 hover:bg-green-600 w-full rounded-full"
              onClick={sendStreams}
            >
              <RefreshCwIcon className="w-6 h-6 mr-2" /> Connect
            </Button>
          )}
          {remoteSocketId && callButton && (
            <Button
              className=" bg-green-500 hover:bg-green-600 w-full rounded-full"
              onClick={handleCallUser}
              style={{ display: !remoteStream ? "flex" : "none" }}
            >
              <PhoneIcon className="w-6 h-6 mr-2" /> Call
            </Button>
          )}
        </div>
        <div className="bg-gray-800 p-4 flex items-center justify-between">
          <Button className="text-white" size="icon" variant="ghost">
            <MicIcon className="w-6 h-6" />
          </Button>
          <Button className="text-white" size="icon" variant="ghost">
            <VideoIcon className="w-6 h-6" />
          </Button>
          <Button className="text-white" size="icon" variant="ghost">
            <ShareIcon className="w-6 h-6" />
          </Button>
          <Button className="text-white" size="icon" variant="ghost">
            <MoveHorizontalIcon className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
