'use client';

import { use } from 'react';
import GameBoard from '@/components/GameBoard';

export default function GamePage(props: { 
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Unwrap params and searchParams immediately to prevent enumeration warnings
  const params = use(props.params);
  const searchParams = props.searchParams ? use(props.searchParams) : undefined;
  
  return <GameBoard roomCode={params.id} />;
}
