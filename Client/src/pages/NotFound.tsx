import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Coffee, AlertCircle, UtensilsCrossed, ChefHat, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Access attempted on invalid route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F9] dark:bg-[#0B0C10] p-6 selection:bg-orange-200">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-orange-500 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[25rem] h-[25rem] bg-amber-500 rounded-full blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center relative z-10"
      >
        <div className="mb-8 relative inline-block">
          <motion.div
            layoutId="logo"
            className="h-20 w-20 rounded-[2.5rem] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/20 mx-auto"
          >
            <ChefHat className="h-10 w-10 text-white" />
          </motion.div>
          <div className="absolute -top-4 -right-4 bg-orange-600 text-white font-black text-xs px-4 py-1.5 rounded-full shadow-2xl border-4 border-white dark:border-[#1C1D21] tracking-widest uppercase">
            NOT FOUND
          </div>
        </div>

        <h1 className="text-[10rem] font-black text-slate-900 dark:text-white mb-2 tracking-tighter leading-none opacity-10">404</h1>
        <h2 className="text-4xl font-black text-orange-600 uppercase tracking-tighter mb-8 italic">Kitchen Closed!</h2>

        <p className="text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mb-12 leading-loose px-8">
          Oops! It looks like <span className="text-orange-600 px-2">"{location.pathname}"</span> isn't on the menu today. Let's get you back to the main counter.
        </p>

        <Button
          asChild
          className="h-14 px-10 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-orange-500/20 group"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </Button>

        <div className="mt-16 flex items-center justify-center gap-3 opacity-30">
          <Coffee className="h-5 w-5 text-orange-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Vaishali Snacks Core System</p>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
