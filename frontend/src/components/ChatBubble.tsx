import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isLoggedIn } from '../services/auth';
import AuthModal from './AuthModal';
import ChatPanel from './ChatPanel';

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  const handleBubbleClick = () => {
    if (!loggedIn) {
      setShowAuth(true);
    } else {
      setOpen(!open);
    }
  };

  const handleAuthSuccess = () => {
    setLoggedIn(true);
    setShowAuth(false);
    setOpen(true);
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setOpen(false);
  };

  return (
    <>
      {/* Floating bubble button */}
      <motion.button
        onClick={handleBubbleClick}
        className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 flex items-center justify-center transition-smooth"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 5.58 2 10c0 2.24 1.12 4.27 2.94 5.72L4 20l4.28-2.14C9.47 18.28 10.7 18.5 12 18.5c5.52 0 10-3.58 10-8S17.52 2 12 2zm-1 11H8v-2h3V8h2v3h3v2h-3v3h-2v-3z" />
          </svg>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && loggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 z-[90] w-[380px] h-[560px] bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden flex flex-col"
          >
            <ChatPanel onClose={() => setOpen(false)} onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth modal */}
      {showAuth && (
        <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />
      )}
    </>
  );
}
