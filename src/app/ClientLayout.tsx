"use client";

import SocketProvider from "@/context/SocketProvider";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SocketProvider>{children} </SocketProvider>;
}
