"use client";

import { useState, useEffect, useCallback } from "react";

interface SensorData {
  waterTemperature: number | null;
  roomTemperature: number | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseSensorDataOptions {
  pollingInterval?: number; // in milliseconds, default 5000 (5 seconds)
  enabled?: boolean; // whether to enable polling
}

export function useSensorData(options: UseSensorDataOptions = {}) {
  const { pollingInterval = 5000, enabled = true } = options;

  const [data, setData] = useState<SensorData>({
    waterTemperature: null,
    roomTemperature: null,
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchSensorData = useCallback(async () => {
    try {
      const response = await fetch("/api/user/temperature");
      const result = await response.json();

      if (result.success) {
        setData({
          waterTemperature: result.waterTemperature,
          roomTemperature: result.roomTemperature,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
        });
      } else {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: result.message || "Failed to fetch sensor data",
        }));
      }
    } catch (error: any) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Network error",
      }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Fetch immediately on mount
    fetchSensorData();

    // Set up polling interval (every 5 seconds by default)
    const intervalId = setInterval(fetchSensorData, pollingInterval);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [enabled, pollingInterval, fetchSensorData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setData((prev) => ({ ...prev, isLoading: true }));
    fetchSensorData();
  }, [fetchSensorData]);

  return {
    ...data,
    refresh,
  };
}
