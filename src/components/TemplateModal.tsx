import React, { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { UserTemplate } from '../hooks/useUserTemplates';
import { BoardObject } from '../types';

interface Template {
  id: string;
  icon: string;
  title: string;
  description: string;
  prompt: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'swot',
    icon: '📊',
    title: 'SWOT Analysis',
    description: '2x2 grid: Strengths, Weaknesses, Opportunities, Threats',
    prompt: 'Create a SWOT analysis template',
  },
  {
    id: 'kanban',
    icon: '📋',
    title: 'Kanban Board',
    description: 'Columns: To Do, In Progress, Done with sample tasks',
    prompt: 'Create a Kanban board with To Do, In Progress, and Done columns with sample tasks',
  },
  {
    id: 'retro',
    icon: '🔄',
    title: 'Retrospective',
    description: 'What Went Well, What To Improve, Action Items',
    prompt: 'Create a retrospective board with What Went Well, What To Improve, and Action Items columns',
  },
  {
    id: 'journey',
    icon: '🗺️',
    title: 'User Journey Map',
    description: 'Horizontal stages from Awareness to Retention',
    prompt: 'Create a user journey map with Awareness, Consideration, Decision, Onboarding, and Retention stages',
  },
  {
    id: 'mindmap',
    icon: '🧠',
    title: 'Mind Map',
    description: 'Central topic with branching ideas and connectors',
    prompt: 'Create a mind map with a central topic and 5 branching ideas using sticky notes and connectors',
  },
  {
    id: 'eisenhower',
    icon: '🎯',
    title: 'Eisenhower Matrix',
    description: '4 quadrants: Urgent/Important priority grid',
    prompt: 'Create an Eisenhower Matrix with 4 quadrant frames labeled "Urgent & Important (Do)", "Not Urgent & Important (Schedule)", "Urgent & Not Important (Delegate)", "Not Urgent & Not Important (Eliminate)" with 2 sample sticky notes in each quadrant',
  },
  {
    id: 'proscons',
    icon: '⚖️',
    title: 'Pros & Cons',
    description: 'Two side-by-side columns for comparison',
    prompt: 'Create a Pros and Cons comparison with two side-by-side frames labeled "Pros" and "Cons" with 3 sample sticky notes in each frame',
  },
  {
    id: 'bmc',
    icon: '🏢',
    title: 'Business Model Canvas',
    description: '9-section standard BMC layout',
    prompt: 'Create a Business Model Canvas with 9 frames: Key Partners, Key Activities, Key Resources, Value Propositions, Customer Relationships, Channels, Customer Segments, Cost Structure, and Revenue Streams. Add 1 sample sticky note in each section',
  },
  {
    id: 'sprint',
    icon: '🏃',
    title: 'Sprint Planning',
    description: 'Sprint Goal + Backlog/InProgress/Done columns',
    prompt: 'Create a Sprint Planning board with a "Sprint Goal" frame at top and three columns: "Backlog", "In Progress", "Done" with sample task sticky notes in each column',
  },
  {
    id: 'brainstorm',
    icon: '💡',
    title: 'Brainstorming',
    description: 'Central topic with radial idea clusters',
    prompt: 'Create a brainstorming board with a central topic sticky note labeled "Main Topic" and 6 idea cluster sticky notes arranged in a circle around it, connected with connectors',
  },
  {
    id: 'flowchart',
    icon: '🔀',
    title: 'Flowchart',
    description: 'Start/process/decision/end flow diagram',
    prompt: 'Create a flowchart with a Start node, 3 process steps, 1 decision diamond, and an End node, connected with connectors in a top-to-bottom flow',
  },
];

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prompt: string) => void;
  isLoading: boolean;
  userTemplates?: UserTemplate[];
  onApplyUserTemplate?: (objects: Omit<BoardObject, 'id'>[]) => void;
  onDeleteUserTemplate?: (id: string) => void;
  onSaveTemplate?: () => void;
  hasObjects?: boolean;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen, onClose, onSelect, isLoading,
  userTemplates, onApplyUserTemplate, onDeleteUserTemplate, onSaveTemplate, hasObjects,
}) => {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  const handleSelect = (template: Template) => {
    if (isLoading) return;
    setSelectedId(template.id);
    onSelect(template.prompt);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div style={styles.backdrop} className="animate-fadeIn" onClick={handleBackdropClick}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
        className="animate-popIn"
        style={{ ...styles.modal, background: theme.surface, boxShadow: theme.shadowHeavy }}
      >
        <div style={styles.header}>
          <h2 id="template-modal-title" style={{ ...styles.title, color: theme.text }}>Templates</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onSaveTemplate && hasObjects && (
              <button
                onClick={onSaveTemplate}
                disabled={isLoading}
                style={{ ...styles.saveBtn, background: theme.accent }}
              >
                Save Current Board
              </button>
            )}
            <button
              style={{ ...styles.closeBtn, color: theme.textMuted }}
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close templates"
            >
              ×
            </button>
          </div>
        </div>
        <p style={{ ...styles.subtitle, color: theme.textSecondary }}>
          Choose a template to generate on your board
        </p>
        <div style={styles.grid}>
          {TEMPLATES.map((t) => {
            const isSelected = isLoading && selectedId === t.id;
            return (
              <button
                key={t.id}
                style={{
                  ...styles.card,
                  background: theme.bg,
                  borderColor: isSelected ? theme.accent : 'transparent',
                  ...(hovered === t.id && !isLoading ? { background: theme.surfaceHover, borderColor: theme.accent } : {}),
                  ...(isLoading && !isSelected ? { opacity: 0.5 } : {}),
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                onClick={() => handleSelect(t)}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                disabled={isLoading}
              >
                <span style={styles.cardIcon}>{t.icon}</span>
                <span style={{ ...styles.cardTitle, color: theme.text }}>{t.title}</span>
                <span style={{ ...styles.cardDesc, color: theme.textSecondary }}>{t.description}</span>
                {isSelected && (
                  <span style={{ ...styles.loadingBadge, background: theme.accent }}>Generating...</span>
                )}
              </button>
            );
          })}
        </div>

        {userTemplates && userTemplates.length > 0 && (
          <>
            <h3 style={{ ...styles.sectionTitle, color: theme.text, borderTopColor: theme.border }}>My Templates</h3>
            <div style={styles.grid}>
              {userTemplates.map((ut) => (
                <div
                  key={ut.id}
                  style={{
                    ...styles.card,
                    background: theme.bg,
                    ...(hovered === `ut-${ut.id}` ? { background: theme.surfaceHover, borderColor: theme.accent } : {}),
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHovered(`ut-${ut.id}`)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <button
                    style={{ ...styles.userTemplateBtn, color: theme.text }}
                    onClick={() => { onApplyUserTemplate?.(ut.objects as any); onClose(); }}
                    disabled={isLoading}
                  >
                    <span style={styles.cardTitle}>{ut.name}</span>
                    {ut.description && <span style={{ ...styles.cardDesc, color: theme.textSecondary }}>{ut.description}</span>}
                    <span style={{ ...styles.cardDesc, color: theme.textMuted }}>{ut.objects.length} objects</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteUserTemplate?.(ut.id); }}
                    style={{ ...styles.deleteUtBtn, color: theme.textMuted }}
                    aria-label={`Delete template ${ut.name}`}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '680px',
    width: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '22px',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  subtitle: {
    margin: '0 0 16px 0',
    fontSize: '13px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '6px',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left' as const,
    position: 'relative' as const,
  },
  cardIcon: {
    fontSize: '24px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
  },
  cardDesc: {
    fontSize: '12px',
    lineHeight: 1.4,
  },
  loadingBadge: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    color: 'white',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '6px',
  },
  saveBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  sectionTitle: {
    margin: '20px 0 12px',
    paddingTop: '16px',
    borderTop: '1px solid',
    fontSize: '15px',
    fontWeight: 600,
  },
  userTemplateBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    padding: 0,
    width: '100%',
  },
  deleteUtBtn: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
  },
};
