import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Coffee, AlertCircle, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Access attempted on invalid route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-6 selection:bg-orange-200">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-400 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-400 rounded-full blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center relative z-10"
      >
        <div className="mb-8 relative inline-block">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="h-32 w-32 rounded-[2.5rem] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-2xl mx-auto border-4 border-white dark:border-slate-800"
          >
            <UtensilsCrossed className="h-16 w-16 text-white" />
          </motion.div>
          <div className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg">
            NOT FOUND
          </div>
        </div>

        <h1 className="text-8xl font-black text-slate-800 dark:text-white mb-2 tracking-tighter">404</h1>
        <h2 className="text-2xl font-black text-orange-600 uppercase tracking-widest mb-6 italic">Kitchen Closed!</h2>

        <p className="text-slate-600 dark:text-slate-400 font-bold mb-10 leading-relaxed px-4">
          Oops! It looks like <span className="text-orange-600 font-marker px-1">"{location.pathname}"</span> isn't on the menu today. Let's get you back to the main counter.
        </p>

        <Link to="/">
          <Button className="h-16 px-10 rounded-[1.5rem] bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xl shadow-2xl shadow-orange-500/30 group">
            <Home className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />
            GO HOME
          </Button>
        </Link>

        <div className="mt-12 flex items-center justify-center gap-2 opacity-40">
          <Coffee className="h-4 w-4 text-orange-400" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vaishali Snacks Admin Panel</p>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
