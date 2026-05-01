import time

class TrendAnalyzer:
    """
    SHAD-CSA Trend Analyzer.
    Performs basic trend analysis on failure events to predict system degradation.
    """
    
    @staticmethod
    def calculate_failure_density(events: list, window_seconds: int = 60):
        """
        Calculates how many failures occurred within a specific time window.
        """
        now = time.time()
        failures = [e for e in events if e["type"] == "HEALTH" and e["value"] == 0]
        recent_failures = [e for e in failures if now - e["timestamp"] < window_seconds]
        
        return len(recent_failures)

    @staticmethod
    def is_accelerating(events: list, short_window: int = 30, long_window: int = 120):
        """
        Detects if failure rate is increasing by comparing density in two windows.
        """
        short_density = TrendAnalyzer.calculate_failure_density(events, short_window)
        long_density = TrendAnalyzer.calculate_failure_density(events, long_window)
        
        # Normalize densities (failures per second)
        short_rate = short_density / short_window
        long_rate = long_density / long_window
        
        # If the failure rate in the short window is significantly higher than long window,
        # it means the failure is accelerating (Danger).
        return short_rate > (long_rate * 1.5) and short_density >= 2

trend_analyzer = TrendAnalyzer()
