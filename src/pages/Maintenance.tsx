import { useState, useEffect } from "react";
import { Clock, Wrench } from "lucide-react";

export default function Maintenance() {
  const calculateTimeLeft = () => {
    // Set target date for maintenance to end (e.g. 24 hours from now)
    const difference = +new Date(Date.now() + 24 * 60 * 60 * 1000) - +new Date();
    let timeLeft = {
      hours: 24,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="max-w-2xl w-full backdrop-blur-xl bg-slate-900/50 p-8 md:p-12 rounded-3xl border border-slate-800 shadow-2xl relative z-10 text-center space-y-8">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 rounded-full"></div>
            <div className="bg-slate-800 p-4 rounded-2xl relative">
              <Wrench className="w-12 h-12 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Site Under Maintenance
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
            We are currently upgrading our systems to serve you better. We'll be back online shortly!
          </p>
        </div>

        <div className="pt-8 border-t border-slate-800">
          <div className="flex items-center justify-center gap-2 mb-4 text-slate-400">
            <Clock className="w-5 h-5" />
            <span className="font-medium tracking-wider uppercase text-sm">Estimated Time Remaining</span>
          </div>
          
          <div className="flex justify-center gap-4 sm:gap-6">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-center shadow-inner mb-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-blue-400">
                  {timeLeft.hours.toString().padStart(2, '0')}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Hours</span>
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-slate-700 mt-4 sm:mt-6 animate-pulse">:</div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-center shadow-inner mb-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-blue-400">
                  {timeLeft.minutes.toString().padStart(2, '0')}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Minutes</span>
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-slate-700 mt-4 sm:mt-6 animate-pulse">:</div>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-center shadow-inner mb-2">
                <span className="text-3xl sm:text-4xl font-mono font-bold text-purple-400">
                  {timeLeft.seconds.toString().padStart(2, '0')}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Seconds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
