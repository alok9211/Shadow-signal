'use client';

import { use } from 'react';
import Lobby from "@/components/Lobby";

export default function LobbyPage(props: { 
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Unwrap params and searchParams immediately to prevent enumeration warnings
  const params = use(props.params);
  const searchParams = props.searchParams ? use(props.searchParams) : undefined;
  
  return <Lobby roomCode={params.id} />;
}
