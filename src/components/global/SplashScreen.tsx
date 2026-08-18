import { useEffect, useState } from 'react';
import kvLogo from '/logos/kv.png';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setFade(true), 2000);
    const timer2 = setTimeout(() => onComplete(), 2500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-indigo-900 transition-opacity duration-500 ${fade ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex flex-col items-center animate-in zoom-in duration-700">
        <img src={kvLogo} alt="KV Logo" className="w-32 h-32 md:w-48 md:h-48 mb-8 drop-shadow-2xl" />
        <h1 className="text-2xl md:text-4xl font-bold text-white text-center max-w-2xl px-4 leading-tight">
          Welcome to India's First Student Centric DLMS
        </h1>
        <h2 className="text-xl md:text-2xl text-indigo-200 mt-4 font-semibold text-center">
          PM SHRI KV SULUR DLMS
        </h2>
        <div className="mt-12 flex space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};
