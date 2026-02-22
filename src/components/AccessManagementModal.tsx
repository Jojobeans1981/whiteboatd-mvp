import React, { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { BoardMetadata, BoardRole } from '../types';

interface AccessManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: BoardMetadata;
  currentUserId: string;
  onAddMember: (email: string, name: string, role: BoardRole) => Promise<void>;
  onRemoveMember: (memberKey: string) => Promise<void>;
  onChangeMemberRole: (memberKey: string, newRole: BoardRole) => Promise<void>;
}

export const AccessManagementModal: React.FC<AccessManagementModalProps> = ({
  isOpen, onClose, metadata, currentUserId, onAddMember, onRemoveMember, onChangeMemberRole,
}) => {
  const { theme } = useTheme();
  const modalRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviteRole, setInviteRole] = useState<BoardRole>('editor');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  const members = Object.entries(metadata.members || {});
  const isOwner = metadata.ownerId === currentUserId;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await onAddMember(email.trim(), name.trim() || email.trim(), inviteRole);
    setEmail('');
    setName('');
  };

  return (
    <div className="animate-fadeIn" style={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-modal-title"
        className="animate-popIn"
        style={{ ...styles.modal, background: theme.surface, boxShadow: theme.shadowHeavy }}
      >
        <div style={styles.header}>
          <h2 id="access-modal-title" style={{ ...styles.title, color: theme.text }}>Manage Access</h2>
          <button onClick={onClose} style={{ ...styles.closeBtn, color: theme.textMuted }} aria-label="Close access management">&times;</button>
        </div>

        {/* Members list */}
        <div style={styles.membersList}>
          {members.map(([key, member]) => {
            const isSelf = key === currentUserId || member.email === metadata.members?.[currentUserId]?.email;
            const isOwnerMember = member.role === 'owner';
            return (
              <div
                key={key}
                style={{
                  ...styles.memberRow,
                  borderBottomColor: theme.border,
                  ...(hoveredItem === key ? { background: theme.surfaceHover } : {}),
                }}
                onMouseEnter={() => setHoveredItem(key)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div style={styles.memberInfo}>
                  <div style={{ ...styles.memberAvatar, background: theme.accent }}>
                    {(member.name[0] || 'U').toUpperCase()}
                  </div>
                  <div>
                    <div style={{ ...styles.memberName, color: theme.text }}>
                      {member.name}{isSelf ? ' (you)' : ''}
                    </div>
                    <div style={{ ...styles.memberEmail, color: theme.textMuted }}>{member.email}</div>
                  </div>
                </div>
                <div style={styles.memberActions}>
                  {isOwner && !isOwnerMember ? (
                    <select
                      value={member.role}
                      onChange={(e) => onChangeMemberRole(key, e.target.value as BoardRole)}
                      style={{ ...styles.roleSelect, background: theme.bg, color: theme.text, borderColor: theme.border }}
                      aria-label={`Role for ${member.name}`}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span style={{ ...styles.roleBadge, color: theme.textSecondary }}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  )}
                  {isOwner && !isSelf && !isOwnerMember && (
                    <button
                      onClick={() => onRemoveMember(key)}
                      style={{ ...styles.removeBtn, color: theme.textMuted }}
                      aria-label={`Remove ${member.name}`}
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Invite form (owners only) */}
        {isOwner && (
          <form onSubmit={handleInvite} style={{ ...styles.inviteForm, borderTopColor: theme.border }}>
            <div style={styles.inviteTitle}>
              <strong style={{ color: theme.text, fontSize: 13 }}>Invite Member</strong>
            </div>
            <div style={styles.inviteRow}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Invite email address"
                required
                style={{ ...styles.inviteInput, color: theme.text, borderColor: theme.border, background: theme.bg }}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (optional)"
                aria-label="Invite member name"
                style={{ ...styles.inviteInput, color: theme.text, borderColor: theme.border, background: theme.bg, flex: 0.7 }}
              />
            </div>
            <div style={styles.inviteRow}>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as BoardRole)}
                style={{ ...styles.roleSelect, background: theme.bg, color: theme.text, borderColor: theme.border }}
                aria-label="Select role for new member"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={!email.trim()}
                style={{ ...styles.inviteBtn, background: theme.accent, opacity: email.trim() ? 1 : 0.5 }}
              >
                Invite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2500,
  },
  modal: {
    width: 'min(440px, calc(100vw - 32px))',
    maxHeight: '80vh',
    borderRadius: 14,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px 12px',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
  },
  membersList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 20px',
    maxHeight: 300,
  },
  memberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 4px',
    borderBottom: '1px solid',
    transition: 'background 0.1s',
    borderRadius: 6,
  },
  memberInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  memberName: {
    fontSize: 13,
    fontWeight: 600,
  },
  memberEmail: {
    fontSize: 11,
  },
  memberActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  roleSelect: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid',
    fontSize: 12,
    cursor: 'pointer',
  },
  roleBadge: {
    fontSize: 12,
    fontWeight: 500,
    padding: '4px 8px',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
  },
  inviteForm: {
    padding: '14px 20px',
    borderTop: '1px solid',
  },
  inviteTitle: {
    marginBottom: 8,
  },
  inviteRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 8,
  },
  inviteInput: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid',
    fontSize: 13,
    outline: 'none',
  },
  inviteBtn: {
    border: 'none',
    borderRadius: 8,
    color: 'white',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
};
