import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SplashScreen } from "@/components/splash-screen";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import OpenTrades from "@/pages/open-trades";
import ClosedTrades from "@/pages/closed-trades";
import WhatsAppTemplateSettings from "@/pages/whatsapp-template-settings";
import WhatsAppAutomationPage from "@/pages/whatsapp-automation";
import SettingsPage from "@/pages/settings";
import TradingToolsPage from "@/pages/trading-tools";
import PipConfigPage from "@/pages/pip-config";
import SignalsHubPage from "@/pages/signals-hub";
import PendingOrdersPage from "@/pages/pending-orders";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/open-trades" component={OpenTrades} />
      <Route path="/closed-trades" component={ClosedTrades} />
      <Route path="/whatsapp-template" component={WhatsAppTemplateSettings} />
      <Route path="/whatsapp-automation" component={WhatsAppAutomationPage} />
      <Route path="/signals-hub" component={SignalsHubPage} />
      <Route path="/pending-orders" component={PendingOrdersPage} />
      <Route path="/trading-tools" component={TradingToolsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/settings/pip-config" component={PipConfigPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SplashScreen />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
