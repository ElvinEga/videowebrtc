// components/CallButtons.tsx
import MicOffIcon from "@mui/icons-material/MicOff";
import KeyboardVoiceIcon from "@mui/icons-material/KeyboardVoice";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import React from "react";

interface CallHandleButtonsProps {
  isAudioMute: boolean;
  isVideoOnHold: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

const CallHandleButtons: React.FC<CallHandleButtonsProps> = ({
  isAudioMute,
  isVideoOnHold,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
}) => (
  <div className="absolute bottom-0 flex w-full space-x-4 h-[80px] items-center justify-center rounded-md">
    <div className="bg-[#2c3e508b] rounded-md flex px-4 py-2 justify-center gap-10">
      <button
        className="callButtons text-white bg-blue-500 hover:bg-white hover:text-blue-700 p-2 rounded-full
        focus:ring-4 focus:ring-blue-300"
        onClick={onToggleAudio}
      >
        {isAudioMute ? (
          <MicOffIcon fontSize="large" />
        ) : (
          <KeyboardVoiceIcon fontSize="large" />
        )}
      </button>
      <button
        className="callButtons text-white bg-green-500 hover:bg-white hover:text-green-700 p-2 rounded-full
        focus:ring-4 focus:ring-blue-300"
        onClick={onToggleVideo}
      >
        {isVideoOnHold ? (
          <VideocamOffIcon fontSize="large" />
        ) : (
          <VideocamIcon fontSize="large" />
        )}
      </button>
      <button
        className="callButtons text-white bg-red-600 hover:text-red-700 hover:bg-white p-2 rounded-full
        focus:ring-4 focus:ring-white"
        onClick={onEndCall}
      >
        <CallEndIcon fontSize="large" />
      </button>
    </div>
  </div>
);

export default CallHandleButtons;
