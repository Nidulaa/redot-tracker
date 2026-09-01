import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ConfirmContext = createContext(() => Promise.resolve(false));

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts) => {
    const options = typeof opts === 'string' ? { message: opts } : opts;
    setDialog(options);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(result) {
    setDialog(null);
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="dialog-backdrop" onClick={() => close(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            {dialog.title && <h3>{dialog.title}</h3>}
            <p>{dialog.message}</p>
            <div className="dialog-actions">
              <button className="btn secondary" onClick={() => close(false)}>Cancel</button>
              <button className="btn danger" onClick={() => close(true)}>{dialog.confirmLabel || 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
