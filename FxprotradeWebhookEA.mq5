#property strict
#property version   "1.00"
#property description "Send MT5 trades + account snapshots to Fxprotrade webhook"

input string WebhookURL = "https://getfxpro.space/api/webhook/mt5";
input string WebhookBaseUrl = "";
input string SecretKey      = "";
input int    SnapshotIntervalSec = 10;
input int    ClosedDealsLookbackHours = 24;
input int    ClosedDealsMaxCount = 30;

datetime g_lastSnapshotSent = 0;
datetime g_nextRetryAt = 0;
int      g_retryDelaySec = 5;

string JsonEscape(string s)
{
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   StringReplace(s, "\r", "\\r");
   StringReplace(s, "\n", "\\n");
   StringReplace(s, "\t", "\\t");
   return s;
}

string BuildUrl()
{
   string url = WebhookURL;
   if(url == "") url = WebhookBaseUrl;

   if(url == "")
      return "";

   if(SecretKey == "")
      return url;

   if(StringFind(url, "key=", 0) >= 0)
      return url;

   if(StringFind(url, "?", 0) >= 0)
      url += "&key=" + SecretKey;
   else
      url += "?key=" + SecretKey;
   return url;
}

bool HttpPostJson(const string url, const string json, int &statusCode, string &responseText)
{
   char data[];
   StringToCharArray(json, data, 0, WHOLE_ARRAY, CP_UTF8);

   string headers = "Content-Type: application/json\r\n";
   char result[];
   string result_headers;

   ResetLastError();
   int timeoutMs = 8000;

   statusCode = WebRequest("POST", url, headers, timeoutMs, data, result, result_headers);
   if(statusCode == -1)
   {
      int err = GetLastError();
      responseText = "WebRequest failed. Error=" + IntegerToString(err) +
                     " (Tip: Add URL to Tools->Options->Expert Advisors->Allow WebRequest)";
      return false;
   }

   responseText = CharArrayToString(result, 0, -1, CP_UTF8);
   return true;
}

string BuildAccountJson()
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   string currency = AccountInfoString(ACCOUNT_CURRENCY);

   string ts = TimeToString(TimeGMT(), TIME_DATE|TIME_SECONDS);

   string json =
      "{" 
        "\"balance\":" + DoubleToString(balance, 2) + "," 
        "\"equity\":"  + DoubleToString(equity, 2)  + "," 
        "\"currency\":\"" + JsonEscape(currency) + "\"," 
        "\"timestamp\":\"" + JsonEscape(ts) + "\"" 
      "}";
   return json;
}

string BuildOpenPositionsJsonArray()
{
   string out = "[";
   int count = PositionsTotal();
   bool first = true;

   for(int i = 0; i < count; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;

      string symbol = PositionGetString(POSITION_SYMBOL);
      long type = (long)PositionGetInteger(POSITION_TYPE);
      double volume = PositionGetDouble(POSITION_VOLUME);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double sl = PositionGetDouble(POSITION_SL);
      double tp = PositionGetDouble(POSITION_TP);
      double profit = PositionGetDouble(POSITION_PROFIT);
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      double currentPrice = (type == POSITION_TYPE_BUY)
                           ? SymbolInfoDouble(symbol, SYMBOL_BID)
                           : SymbolInfoDouble(symbol, SYMBOL_ASK);

      string side = (type == POSITION_TYPE_BUY) ? "Buy" : "Sell";

      if(!first) out += ",";
      first = false;

      out +=
         "{" 
           "\"ticket\":\"" + JsonEscape(IntegerToString((int)ticket)) + "\"," 
           "\"symbol\":\"" + JsonEscape(symbol) + "\"," 
           "\"type\":\"" + JsonEscape(side) + "\"," 
           "\"lot\":" + DoubleToString(volume, 2) + "," 
           "\"openPrice\":" + DoubleToString(openPrice, digits) + "," 
           "\"currentPrice\":" + DoubleToString(currentPrice, digits) + "," 
           "\"sl\":" + DoubleToString(sl, digits) + "," 
           "\"tp\":" + DoubleToString(tp, digits) + "," 
           "\"profit\":" + DoubleToString(profit, 2) + "," 
           "\"status\":\"Open\"" 
         "}";
   }

   out += "]";
   return out;
}

string BuildClosedDealsJsonArray()
{
   datetime toTime = TimeCurrent();
   datetime fromTime = toTime - (ClosedDealsLookbackHours * 3600);
   HistorySelect(fromTime, toTime);

   string out = "[";
   bool first = true;
   int added = 0;

   int deals = HistoryDealsTotal();
   for(int i = deals - 1; i >= 0; i--)
   {
      if(added >= ClosedDealsMaxCount) break;
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0) continue;
      if(!HistoryDealSelect(dealTicket)) continue;

      long entry = (long)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY) continue;

      string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      long dealType = (long)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double price  = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      datetime t    = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      string side = (dealType == DEAL_TYPE_SELL) ? "Sell" : "Buy";
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

      if(!first) out += ",";
      first = false;
      added++;

      out +=
         "{" 
           "\"ticket\":\"" + JsonEscape(IntegerToString((int)dealTicket)) + "\"," 
           "\"symbol\":\"" + JsonEscape(symbol) + "\"," 
           "\"type\":\"" + JsonEscape(side) + "\"," 
           "\"lot\":" + DoubleToString(volume, 2) + "," 
           "\"closePrice\":" + DoubleToString(price, digits) + "," 
           "\"profit\":" + DoubleToString(profit, 2) + "," 
           "\"status\":\"Closed\"," 
           "\"closedAt\":\"" + JsonEscape(TimeToString(t, TIME_DATE|TIME_SECONDS)) + "\"" 
         "}";
   }

   out += "]";
   return out;
}

string BuildFullPayloadJson()
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   string currency = AccountInfoString(ACCOUNT_CURRENCY);
   string ts = TimeToString(TimeGMT(), TIME_DATE|TIME_SECONDS);

   string json =
      "{" 
        "\"balance\":" + DoubleToString(balance, 2) + "," 
        "\"equity\":"  + DoubleToString(equity, 2)  + "," 
        "\"currency\":\"" + JsonEscape(currency) + "\"," 
        "\"timestamp\":\"" + JsonEscape(ts) + "\"," 
        "\"trades\":" + BuildOpenPositionsJsonArray() + "," 
        "\"closedTrades\":" + BuildClosedDealsJsonArray() +
      "}";

   return json;
}

string BuildTradeJsonFromDeal(ulong dealTicket)
{
   if(!HistoryDealSelect(dealTicket))
      return "";

   string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   long   dealType = (long)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   double price  = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   datetime t    = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

   string side = "Buy";
   if(dealType == DEAL_TYPE_SELL) side = "Sell";

   long entry = (long)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   string status = (entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY) ? "Closed" : "Open";

   string openedAt = TimeToString(t, TIME_DATE|TIME_SECONDS);

   string id = IntegerToString((int)dealTicket);

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   string json =
      "{" 
        "\"trade\":{" 
          "\"ticket\":\"" + JsonEscape(id) + "\"," 
          "\"symbol\":\"" + JsonEscape(symbol) + "\"," 
          "\"type\":\"" + JsonEscape(side) + "\"," 
          "\"lot\":" + DoubleToString(volume, 2) + "," 
          "\"openPrice\":" + DoubleToString(price, digits) + "," 
          "\"currentPrice\":" + DoubleToString(SymbolInfoDouble(symbol, SYMBOL_BID), digits) + "," 
          "\"profit\":" + DoubleToString(profit, 2) + "," 
          "\"status\":\"" + JsonEscape(status) + "\"," 
          "\"openedAt\":\"" + JsonEscape(openedAt) + "\"" 
        "}," 
        "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + "," 
        "\"equity\":"  + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2)  + "," 
        "\"currency\":\"" + JsonEscape(AccountInfoString(ACCOUNT_CURRENCY)) + "\"" 
      "}";

   return json;
}

void SendAccountSnapshot()
{
   if(g_nextRetryAt > 0 && TimeCurrent() < g_nextRetryAt)
      return;

   int code;
   string resp;
   string url = BuildUrl();
   if(url == "")
   {
      Print("[Webhook] Webhook URL is empty");
      return;
   }

   string json = BuildFullPayloadJson();

   bool ok = HttpPostJson(url, json, code, resp);
   if(!ok)
   {
      Print("[Webhook] Error sending webhook: ", resp);
      g_nextRetryAt = TimeCurrent() + g_retryDelaySec;
      if(g_retryDelaySec < 60) g_retryDelaySec *= 2;
   }
   else
   {
      Print("[Webhook] Webhook sent successfully. HTTP=", code);
      g_nextRetryAt = 0;
      g_retryDelaySec = 5;
   }
}

void SendDeal(ulong dealTicket)
{
   string json = BuildTradeJsonFromDeal(dealTicket);
   if(json == "")
   {
      Print("[Webhook] Could not build deal JSON for ticket=", dealTicket);
      return;
   }

   int code;
   string resp;
   string url = BuildUrl();

   bool ok = HttpPostJson(url, json, code, resp);
   if(!ok)
      Print("[Webhook] Deal send failed: ", resp);
   else
      Print("[Webhook] Deal sent. Deal=", dealTicket, " HTTP=", code, " Resp=", resp);
}

int OnInit()
{
   EventSetTimer(SnapshotIntervalSec);
   Print("FxprotradeWebhookEA initialized. Webhook=", BuildUrl());
   SendAccountSnapshot();
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   datetime now = TimeCurrent();
   if(g_lastSnapshotSent == 0 || (now - g_lastSnapshotSent) >= SnapshotIntervalSec)
   {
      g_lastSnapshotSent = now;
      SendAccountSnapshot();
   }
}

void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      SendAccountSnapshot();
   }
}
