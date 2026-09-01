import { useEffect, useState, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(() => {});

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'add') => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, msg, type, leaving: false }]);
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 250);
    }, 2200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div id="toastHost">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={'toast' + (t.type === 'remove' ? ' remove' : '')}
            style={t.leaving ? { transition: 'opacity 0.25s', opacity: 0 } : undefined}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
