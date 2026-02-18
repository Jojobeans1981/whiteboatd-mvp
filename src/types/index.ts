// src/types/index.ts

export interface BoardObject {
  id: string;
  type: 'sticky' | 'rectangle' | 'circle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  color: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface StickyNote extends BoardObject {
  type: 'sticky';
  text: string;
  width: number;
  height: number;
}

export interface Shape extends BoardObject {
  type: 'rectangle' | 'circle';
  width?: number;
  height?: number;
  radius?: number;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
  updatedAt: number;
}

export interface UserPresence {
  userId: string;
  userName: string;
  email: string;
  online: boolean;
  color: string;
  lastSeen: number;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
