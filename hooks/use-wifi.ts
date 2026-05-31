"use client";

import { useState, useEffect, useCallback } from "react";

interface WiFiNetwork {
  ssid: string;
  signal: number;
  security: string;
}

interface ESPDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  status: "connected" | "disconnected" | "connecting";
  lastSeen: Date;
  type: "bathing" | "drying" | "unknown";
}

interface WiFiState {
  isConnected: boolean;
  isConnecting: boolean;
  isScanning: boolean;
  currentNetwork: string | null;
  availableNetworks: WiFiNetwork[];
  espDevices: ESPDevice[];
  autoConnect: boolean;
}

export function useWiFi() {
  const [state, setState] = useState<WiFiState>({
    isConnected: false,
    isConnecting: false,
    isScanning: false,
    currentNetwork: null,
    availableNetworks: [],
    espDevices: [],
    autoConnect: true,
  });

  // Simulate WiFi connection
  const connectToWiFi = useCallback(
    async (ssid: string, password: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isConnecting: true }));

      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Simple validation - in real implementation, this would be actual WiFi connection
      const success =
        password.length >= 8 || password === "" || ssid.includes("ESP");

      if (success) {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          currentNetwork: ssid,
        }));

        // Auto scan ESP devices if enabled
        if (state.autoConnect) {
          await scanESPDevices();
        }
      } else {
        setState((prev) => ({ ...prev, isConnecting: false }));
      }

      return success;
    },
    [state.autoConnect]
  );

  const disconnectWiFi = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isConnected: false,
      currentNetwork: null,
      espDevices: [],
    }));
  }, []);

  const scanWiFiNetworks = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isScanning: true }));

    // Simulate network scanning delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock WiFi networks - in real implementation, this would scan actual networks
    const mockNetworks: WiFiNetwork[] = [
      { ssid: "HomeWiFi_5G", signal: 85, security: "WPA2" },
      { ssid: "HomeWiFi_2.4G", signal: 78, security: "WPA2" },
      { ssid: "Neighbor_WiFi", signal: 45, security: "WPA3" },
      { ssid: "ESP_CatGrooming", signal: 92, security: "WPA2" },
      { ssid: "Guest_Network", signal: 62, security: "Open" },
      { ssid: "CatBathing_Device", signal: 88, security: "WPA2" },
      { ssid: "CatDrying_Device", signal: 85, security: "WPA2" },
    ];

    setState((prev) => ({
      ...prev,
      availableNetworks: mockNetworks,
      isScanning: false,
    }));
  }, []);

  const scanESPDevices = useCallback(async (): Promise<void> => {
    // Simulate device scanning delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Mock ESP devices - in real implementation, this would scan for actual ESP devices
    const mockDevices: ESPDevice[] = [
      {
        id: "esp001",
        name: "Cat Bathing Device",
        ip: "192.168.1.100",
        port: 8080,
        status: "connected",
        lastSeen: new Date(),
        type: "bathing",
      },
      {
        id: "esp002",
        name: "Cat Drying Device",
        ip: "192.168.1.101",
        port: 8080,
        status: "connected",
        lastSeen: new Date(),
        type: "drying",
      },
    ];

    setState((prev) => ({
      ...prev,
      espDevices: mockDevices,
    }));
  }, []);

  const connectToESP = useCallback(
    async (deviceId: string): Promise<boolean> => {
      // Update device status to connecting
      setState((prev) => ({
        ...prev,
        espDevices: prev.espDevices.map((device) =>
          device.id === deviceId
            ? { ...device, status: "connecting" as const }
            : device
        ),
      }));

      // Simulate connection
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update device status to connected
      setState((prev) => ({
        ...prev,
        espDevices: prev.espDevices.map((device) =>
          device.id === deviceId
            ? { ...device, status: "connected" as const, lastSeen: new Date() }
            : device
        ),
      }));

      return true;
    },
    []
  );

  const disconnectESP = useCallback((deviceId: string) => {
    setState((prev) => ({
      ...prev,
      espDevices: prev.espDevices.map((device) =>
        device.id === deviceId
          ? { ...device, status: "disconnected" as const }
          : device
      ),
    }));
  }, []);

  const setAutoConnect = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, autoConnect: enabled }));
  }, []);

  const getConnectedESPDevice = useCallback(
    (type: "bathing" | "drying"): ESPDevice | null => {
      return (
        state.espDevices.find(
          (device) => device.type === type && device.status === "connected"
        ) || null
      );
    },
    [state.espDevices]
  );

  const sendCommandToESP = useCallback(
    async (
      deviceId: string,
      command: string,
      parameters?: Record<string, any>
    ): Promise<boolean> => {
      const device = state.espDevices.find((d) => d.id === deviceId);
      if (!device || device.status !== "connected") {
        return false;
      }

      // Simulate sending command to ESP device
      // In real implementation, this would make HTTP request to ESP device
      console.log(`Sending command to ${device.name}:`, command, parameters);

      // Simulate command processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return true;
    },
    [state.espDevices]
  );

  // Auto scan ESP devices when WiFi connects
  useEffect(() => {
    if (
      state.isConnected &&
      state.autoConnect &&
      state.espDevices.length === 0
    ) {
      scanESPDevices();
    }
  }, [
    state.isConnected,
    state.autoConnect,
    state.espDevices.length,
    scanESPDevices,
  ]);

  // Periodic ESP device status check
  useEffect(() => {
    if (state.isConnected && state.espDevices.length > 0) {
      const interval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          espDevices: prev.espDevices.map((device) => ({
            ...device,
            lastSeen: new Date(),
          })),
        }));
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [state.isConnected, state.espDevices.length]);

  return {
    ...state,
    connectToWiFi,
    disconnectWiFi,
    scanWiFiNetworks,
    scanESPDevices,
    connectToESP,
    disconnectESP,
    setAutoConnect,
    getConnectedESPDevice,
    sendCommandToESP,
  };
}


