import { useSocket } from "../../../context/SocketProvider";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useState } from "react";
import peer from "../../../service/peer";
import CallIcon from "@mui/icons-material/Call";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import VideoPlayer from "../../../components/VideoPlayer";
import CallHandleButtons from "../../../components/CallHandleButtons";

const RoomPage: React.FC = () => {
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
  const { slug } = router.query;

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen overflow-hidden">
      <title>Room No. {slug}</title>
      <h1 className="absolute top-0 left-0 text-5xl text-center font-josefin tracking-tighter mt-5 ml-5 mmd:text-xl mxs:text-sm">
        Video
        <VideoCallIcon sx={{ fontSize: 50, color: "rgb(30,220,30)" }} />
        Peers
      </h1>
      <h4 className="font-bold text-xl md:text-2xl mmd:text-sm mt-5 mb-4 msm:max-w-[100px] text-center">
        {remoteSocketId ? "Connected With Remote User!" : "No One In Room"}
      </h4>
      {remoteStream && remoteSocketId && isSendButtonVisible && (
        <button
          className="bg-green-500 hover:bg-green-600"
          onClick={sendStreams}
        >
          Send Stream
        </button>
      )}
      {remoteSocketId && callButton && (
        <button
          className="text-xl bg-green-500 hover:bg-green-600 rounded-3xl"
          onClick={handleCallUser}
          style={{ display: !remoteStream ? "block" : "none" }}
        >
          Call{" "}
          <CallIcon fontSize="medium" className="animate-pulse scale-125" />
        </button>
      )}
      <div className="flex flex-col w-full items-center justify-center overflow-hidden">
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
      </div>
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
  );
};

export default RoomPage;
