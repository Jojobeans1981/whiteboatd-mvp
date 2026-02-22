import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type NotificationVariant = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  message: string;
  variant: NotificationVariant;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, variant: NotificationVariant) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {},
});

export const useNotification = () => useContext(NotificationContext);

let notifCounter = 0;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addNotification = useCallback((message: string, variant: NotificationVariant) => {
    const id = `notif-${++notifCounter}`;
    setNotifications(prev => {
      const next = [...prev, { id, message, variant }];
      return next.length > 5 ? next.slice(-5) : next;
    });
    const timer = setTimeout(() => removeNotification(id), 4000);
    timersRef.current.set(id, timer);
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
