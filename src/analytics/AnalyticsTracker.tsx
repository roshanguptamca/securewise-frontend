import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "./ga4";

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    void trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}
