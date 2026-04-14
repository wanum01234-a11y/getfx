import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Activity, History, Settings, Bell, Search, User, MessageCircle, Calculator, Sun, Moon, Menu, X, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  const isDark = theme !== "light";

  React.useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    const previousOverflow = document.body.style.overflow;
    if (isMobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Open Trades", href: "/open-trades", icon: Activity },
    { name: "Pending Orders", href: "/pending-orders", icon: Activity },
    { name: "Closed Trades", href: "/closed-trades", icon: History },
    { name: "Trading Tools", href: "/trading-tools", icon: Calculator },
    { name: "WhatsApp Template", href: "/whatsapp-template", icon: MessageCircle },
    { name: "WhatsApp Automation", href: "/whatsapp-automation", icon: MessageCircle },
    { name: "Signals Hub", href: "/signals-hub", icon: Radio },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Pip Configuration", href: "/settings/pip-config", icon: Settings },
  ];

  return (
    <div
      className={cn(
        "min-h-[100dvh] text-foreground flex flex-col md:flex-row relative overflow-x-hidden",
        isDark ? "bg-animated-gradient" : "bg-gradient-to-br from-slate-50 via-white to-slate-100"
      )}
    >
      {/* Decorative background grid/glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-primary/5 blur-[120px] rounded-full transform -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-destructive/5 blur-[120px] rounded-full transform translate-x-1/3 translate-y-1/3"></div>
        <div className={cn(
          "absolute inset-0 bg-[size:40px_40px]",
          isDark
            ? "bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)]"
            : "bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)]"
        )}></div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] transition-opacity duration-200 md:hidden",
          isMobileSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileSidebarOpen(false)}
        aria-hidden
      />

      {/* Mobile Sidebar (off-canvas) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[18rem] max-w-[88vw] glass-card border-r border-white/10 flex flex-col md:hidden",
          "transform transition-transform duration-300 ease-out",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,191,255,0.5)]">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">FXPRO<span className="text-primary">.space</span></span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="w-9 h-9 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group hover:bg-white/5",
                    isActive ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,191,255,0.8)]"></div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Trader Pro</div>
              <div className="text-xs text-primary">Live Account</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 glass-card border-r border-white/10 md:h-[100dvh] flex-col z-10 sticky top-0 flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,191,255,0.5)]">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">FXPRO<span className="text-primary">.space</span></span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer group hover:bg-white/5",
                    isActive ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,191,255,0.8)]"></div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Trader Pro</div>
              <div className="text-xs text-primary">Live Account</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-[100dvh] z-10">
        <header className="h-20 glass-card border-b border-white/10 flex items-center justify-between px-4 md:px-8 flex-shrink-0">
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="font-semibold tracking-tight text-white">
              FXPRO<span className="text-primary">.space</span>
            </div>
          </div>

          <div className="relative w-64 hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search symbols..." 
              className="w-full bg-black/40 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <button className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,191,255,0.8)]"></span>
            </button>

            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
              aria-label="Toggle theme"
              title={isDark ? "Switch to light" : "Switch to dark"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link href="/settings">
              <button className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
