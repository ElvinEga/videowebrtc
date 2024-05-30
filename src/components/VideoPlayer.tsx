import React from "react";
import ReactPlayer from "react-player";

const VideoPlayer = ({
  stream,
  isAudioMute,
  name,
}: {
  stream: MediaStream;
  isAudioMute: boolean;
  name: string;
}) => {
  const myStream = name === "My Stream" ? true : false;
  return (
    <div>
      <div
        className={`${
          name === "My Stream"
            ? "flex flex-col items-center justify-center absolute top-2 right-3 z-10"
            : "px-2"
        }`}
      >
        <div
          className={`relative rounded-xl overflow-hidden
                 ${
                   myStream
                     ? " mxs:w-[80px] mxs:h-[120px] msm:w-[100px] msm:rounded-md msm:h-[140px] mmd:w-[140px] md:w-[200px] lg:w-[280px] mt-1"
                     : "w-full mxs:h-[450px] mss:h-[500px] mmd:h-[600px] h-[788px] mt-16"
                 }`}
        >
          <ReactPlayer
            url={stream}
            playing
            muted={isAudioMute}
            height="100%"
            width="100%"
            style={{ transform: "scaleX(-1)" }}
          />
          <div className="absolute bottom-2 left-2 bg-black/50 rounded-md px-4 py-2 text-white">
            <div className="font-semibold text-xs">{name}</div>
            <div className=" text-gray-300 text-xs">Host</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
