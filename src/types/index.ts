// src/types/index.ts

export interface BoardObject {
  id: string;
  type: 'sticky' | 'rectangle' | 'circle' | 'frame' | 'connector' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  label?: string;
  fromId?: string;
  toId?: string;
  color: string;
  fontSize?: number;
  rotation?: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  commentCount?: number;
  reactions?: Record<string, number>;
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

export interface FrameObject extends BoardObject {
  type: 'frame';
  width: number;
  height: number;
  label: string;
}

export interface ConnectorObject extends BoardObject {
  type: 'connector';
  fromId: string;
  toId: string;
}

export interface TextObject extends BoardObject {
  type: 'text';
  text: string;
  fontSize: number;
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

export interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  createdAt: number;
}

export type BoardRole = 'owner' | 'editor' | 'viewer';

export interface BoardMember {
  role: BoardRole;
  name: string;
  email: string;
  addedAt: number;
}

export interface BoardMetadata {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
  members: Record<string, BoardMember>;
}
