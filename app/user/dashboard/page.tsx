"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Cat,
  LogOut,
  Droplets,
  Wind,
  Thermometer,
  RefreshCw,
  AlertCircle,
  Play,
  Download,
  Edit,
  Loader2,
  Square,
  Clock,
  CheckCircle2,
  Cpu,
  Lightbulb,
  Camera,
} from "lucide-react";
import {
  getSession,
  logout,
  getBathingSessions,
  getDryingSessions,
  type User,
} from "@/lib/auth";
import {
  createBathingSessionFirestore,
  createDryingSessionFirestore,
  addTemperatureLogFirestore,
  getActiveBathingSession,
  getActiveDryingSession,
  endBathingSessionFirestore,
  endDryingSessionFirestore,
} from "@/lib/firestore-service";
import { useToast } from "@/hooks/use-toast";

// Age helper: convert to months
function getAgeInMonths(age: number, ageUnit: "weeks" | "months" | "years"): number {
  if (ageUnit === "weeks") return age / 4;
  if (ageUnit === "months") return age;
  return age * 12;
}

// Guideline-based weight range from the shared image (kg)
// - 1–2 bulan: 0.5–1.5
// - 3 bulan: 1.5–2.5
// - 4–6 bulan: 2.5–3.5
// - 7–12 bulan: 3.5–4.5
// - 1–7 tahun: 3.5–5.5
function getGuidelineWeightRange(
  age: number,
  ageUnit: "weeks" | "months" | "years",
): { min: number; max: number } {
  const m = getAgeInMonths(age, ageUnit);

  if (m <= 2) return { min: 0.5, max: 1.5 };
  if (Math.round(m) === 3) return { min: 1.5, max: 2.5 };
  if (m >= 4 && m <= 6) return { min: 2.5, max: 3.5 };
  if (m >= 7 && m <= 12) return { min: 3.5, max: 4.5 };
  // > 12 months (1–7 years)
  return { min: 3.5, max: 5.5 };
}

// Ideal weight as midpoint of guideline range
function calculateIdealWeight(
  age: number,
  ageUnit: "weeks" | "months" | "years",
): number {
  const { min, max } = getGuidelineWeightRange(age, ageUnit);
  return (min + max) / 2;
}

// Obesity check: > 120% of guideline max for the age
function isObeseByGuideline(
  age: number,
  ageUnit: "weeks" | "months" | "years",
  weightGrams: number,
): boolean {
  const { max } = getGuidelineWeightRange(age, ageUnit);
  const weightKg = weightGrams / 1000;
  return weightKg > max * 1.2;
}

export default function UserDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [waterTemperature, setWaterTemperature] = useState<number | null>(null);
  const [hardwareStatus, setHardwareStatus] = useState<any>({
    pompa1: "off",
    pompa2: "off",
    kipas: "off",
    lampu: "off",
    state: "IDLE",
    system: "ready"
  });
  const [roomTemperature, setRoomTemperature] = useState<number | null>(null);
  const [isLoadingTemp, setIsLoadingTemp] = useState(false);
  const [lastGrooming, setLastGrooming] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editAge, setEditAge] = useState(1);
  const [editAgeUnit, setEditAgeUnit] = useState<"weeks" | "months" | "years">(
    "months",
  );
  const [editWeight, setEditWeight] = useState(1);
  const [isStartingBathing, setIsStartingBathing] = useState(false);
  const [isStartingDrying, setIsStartingDrying] = useState(false);
  const [activeBathingSession, setActiveBathingSession] = useState<any>(null);
  const [activeDryingSession, setActiveDryingSession] = useState<any>(null);
  const [bathingDuration, setBathingDuration] = useState(0);
  const [dryingDuration, setDryingDuration] = useState(0);
  const [isStoppingBathing, setIsStoppingBathing] = useState(false);
  const [isStoppingDrying, setIsStoppingDrying] = useState(false);
  const [isFullProcessMode, setIsFullProcessMode] = useState(false); // Flag untuk membedakan proses lengkap vs pengeringan saja

  useEffect(() => {
    const session = getSession();
    if (!session || session.type !== "user") {
      router.push("/user/login");
      return;
    }

    // Fetch user data from database
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/user/me?id=${session.id}`);
        const result = await response.json();

        if (result.success && result.user) {
          setUser(result.user as User);
          loadLastGrooming(result.user.id);
          fetchTemperatures();
          checkActiveSessions(result.user.id);
        } else {
          router.push("/user/login");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/user/login");
      }
    };

    fetchUser();

    // Refresh temperatures and user profile every 5 seconds for real-time AI scan reactivity
    const interval = setInterval(() => {
      fetchUser();
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  // Timer untuk menghitung durasi proses
  useEffect(() => {
    let bathingInterval: NodeJS.Timeout | null = null;
    let dryingInterval: NodeJS.Timeout | null = null;

    if (activeBathingSession && activeBathingSession.startTime) {
      bathingInterval = setInterval(() => {
        const startTime = new Date(activeBathingSession.startTime).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setBathingDuration(elapsed);
      }, 1000);
    } else {
      setBathingDuration(0);
    }

    if (activeDryingSession && activeDryingSession.startTime) {
      dryingInterval = setInterval(() => {
        const startTime = new Date(activeDryingSession.startTime).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setDryingDuration(elapsed);
      }, 1000);
    } else {
      setDryingDuration(0);
    }

    return () => {
      if (bathingInterval) clearInterval(bathingInterval);
      if (dryingInterval) clearInterval(dryingInterval);
    };
  }, [activeBathingSession, activeDryingSession]);

  const loadLastGrooming = (userId: string) => {
    const bathingSessions = getBathingSessions().filter(
      (s) => s.userId === userId && s.status === "completed",
    );
    const dryingSessions = getDryingSessions().filter(
      (s) => s.userId === userId && s.status === "completed",
    );

    const allSessions = [
      ...bathingSessions.map((s) => ({ endTime: s.endTime, type: "bathing" })),
      ...dryingSessions.map((s) => ({ endTime: s.endTime, type: "drying" })),
    ]
      .filter((s) => s.endTime)
      .sort(
        (a, b) =>
          new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime(),
      );

    if (allSessions.length > 0 && allSessions[0].endTime) {
      setLastGrooming(allSessions[0].endTime);
    }
  };

  const fetchTemperatures = async () => {
    setIsLoadingTemp(true);
    try {
      const response = await fetch("/api/user/temperature");
      const result = await response.json();

      if (result.success) {
        setWaterTemperature(result.waterTemperature);
        setRoomTemperature(result.roomTemperature);
      }

      // Fetch status hardware realtime dari sensor API
      const sensorResponse = await fetch("/api/sensor");
      const sensorResult = await sensorResponse.json();
      if (sensorResult.success && sensorResult.status) {
        setHardwareStatus(sensorResult.status);
      }
    } catch (error) {
      console.error("Error fetching temperatures:", error);
    } finally {
      setIsLoadingTemp(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const checkActiveSessions = async (userId: string) => {
    try {
      const bathing = await getActiveBathingSession(userId);
      const drying = await getActiveDryingSession(userId);
      setActiveBathingSession(bathing);
      setActiveDryingSession(drying);
      
      // Jika ada bathing session, berarti full process mode
      if (bathing) {
        setIsFullProcessMode(true);
      } else {
        // Jangan memaksa set ke false saat drying aktif.
        // Biarkan isFullProcessMode tetap apa adanya agar drying hasil lanjutan pemandian
        // tidak dianggap sebagai "Pengeringan Saja".
        // Hanya reset ke false ketika tidak ada sesi aktif sama sekali.
        if (!drying) {
          setIsFullProcessMode(false);
        }
      }
      
      // Update duration jika ada sesi aktif
      if (bathing && bathing.startTime) {
        const startTime = new Date(bathing.startTime).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setBathingDuration(elapsed);
      }
      
      if (drying && drying.startTime) {
        const startTime = new Date(drying.startTime).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setDryingDuration(elapsed);
      }
    } catch (error) {
      console.error("Error checking active sessions:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStopBathing = async () => {
    if (!user || !activeBathingSession) return;
    
    setIsStoppingBathing(true);
    try {
      await endBathingSessionFirestore(activeBathingSession.id);
      setActiveBathingSession(null);
      setBathingDuration(0);
      setIsFullProcessMode(false); // Reset flag
      
      toast({
        title: "Proses Pemandian Dihentikan",
        description: "Proses pemandian telah dihentikan.",
      });
    } catch (error) {
      console.error("Error stopping bathing:", error);
      toast({
        title: "Gagal Menghentikan Proses",
        description: "Terjadi kesalahan saat menghentikan proses pemandian",
        variant: "destructive",
      });
    } finally {
      setIsStoppingBathing(false);
    }
  };

  const handleStopDrying = async () => {
    if (!user || !activeDryingSession) return;
    
    setIsStoppingDrying(true);
    try {
      await endDryingSessionFirestore(activeDryingSession.id);
      setActiveDryingSession(null);
      setDryingDuration(0);
      setIsFullProcessMode(false); // Reset flag
      
      toast({
        title: "Proses Pengeringan Dihentikan",
        description: "Proses pengeringan telah dihentikan.",
      });
    } catch (error) {
      console.error("Error stopping drying:", error);
      toast({
        title: "Gagal Menghentikan Proses",
        description: "Terjadi kesalahan saat menghentikan proses pengeringan",
        variant: "destructive",
      });
    } finally {
      setIsStoppingDrying(false);
    }
  };

  const handleStartFullProcess = async () => {
    if (!user) return;
    
    // Check if there's already an active drying session (from "Pengeringan Saja")
    const existingDrying = await getActiveDryingSession(user.id);
    if (existingDrying) {
      toast({
        title: "Proses Pengeringan Sedang Berjalan",
        description: "Proses pengeringan sedang aktif. Hentikan terlebih dahulu untuk memulai proses pemandian.",
        variant: "default",
      });
      return;
    }
    
    // Check if there's already an active bathing session
    const existingBathing = await getActiveBathingSession(user.id);
    if (existingBathing) {
      toast({
        title: "Proses Pemandian Sudah Berjalan",
        description: "Sesi pemandian sedang aktif. Silakan tunggu hingga selesai.",
        variant: "default",
      });
      return;
    }

    setIsStartingBathing(true);
    try {
      const sessionId = await createBathingSessionFirestore({
        userId: user.id,
        catName: user.catName,
        temperature: 35, // Default temperature
      });

      // Log initial temperature
      await addTemperatureLogFirestore({
        sessionId,
        sessionType: "bathing",
        userId: user.id,
        catName: user.catName,
        temperature: 35,
      });

      setActiveBathingSession({ id: sessionId, status: "active" });
        setIsFullProcessMode(true); // Proses lengkap dimulai (pemandian saja)
      
      toast({
          title: "Proses Pemandian Dimulai",
          description: "Proses pemandian telah dimulai.",
      });
        // Tidak ada auto-continue ke pengeringan
    } catch (error) {
      console.error("Error starting bathing:", error);
      toast({
        title: "Gagal Memulai Proses",
        description: "Terjadi kesalahan saat memulai proses pemandian",
        variant: "destructive",
      });
    } finally {
      setIsStartingBathing(false);
    }
  };

  // Auto-continue ke pengeringan DIHAPUS sesuai kebutuhan: Mode 1 tidak lanjut otomatis

  // Monitor drying completion
  useEffect(() => {
    if (!activeDryingSession || !user) return;

    const checkInterval = setInterval(async () => {
      try {
        const active = await getActiveDryingSession(user.id);
        if (!active) {
          // Drying completed
          clearInterval(checkInterval);
          setActiveDryingSession(null);
          setDryingDuration(0);
          
          toast({
            title: "Proses Pengeringan Selesai",
            description: "Proses pengeringan telah selesai.",
          });
        }
      } catch (error) {
        console.error("Error monitoring drying:", error);
        clearInterval(checkInterval);
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [activeDryingSession, user]);

  const handleStartDryingOnly = async () => {
    if (!user) return;
    
    // Check if there's already an active bathing session (from "Pemandian & Pengeringan")
    const existingBathing = await getActiveBathingSession(user.id);
    if (existingBathing) {
      toast({
        title: "Proses Pemandian Sedang Berjalan",
        description: "Proses pemandian sedang aktif. Hentikan terlebih dahulu untuk memulai proses pengeringan saja.",
        variant: "default",
      });
      return;
    }
    
    // Check if there's already an active drying session
    const existingDrying = await getActiveDryingSession(user.id);
    if (existingDrying) {
      toast({
        title: "Proses Pengeringan Sudah Berjalan",
        description: "Sesi pengeringan sedang aktif. Silakan tunggu hingga selesai.",
        variant: "default",
      });
      return;
    }

    setIsStartingDrying(true);
    try {
      const sessionId = await createDryingSessionFirestore({
        userId: user.id,
        catName: user.catName,
        temperature: 40, // Default temperature
      });

      // Log initial temperature
      await addTemperatureLogFirestore({
        sessionId,
        sessionType: "drying",
        userId: user.id,
        catName: user.catName,
        temperature: 40,
      });

      setActiveDryingSession({ id: sessionId, status: "active" });
      setIsFullProcessMode(false); // Set flag bahwa ini adalah pengeringan saja
      
      toast({
        title: "Proses Pengeringan Dimulai",
        description: "Proses pengeringan telah dimulai.",
      });
    } catch (error) {
      console.error("Error starting drying:", error);
      toast({
        title: "Gagal Memulai Proses",
        description: "Terjadi kesalahan saat memulai proses pengeringan",
        variant: "destructive",
      });
    } finally {
      setIsStartingDrying(false);
    }
  };

  const handleDownloadGroomingData = () => {
    if (!user) {
      toast({
        title: "Belum login",
        description: "Silakan login terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }
    // Trigger download CSV dari API export
    try {
      const url = `/api/user/grooming-export?userId=${encodeURIComponent(user.id)}`;
      // Buka di tab yang sama agar langsung mengunduh
      window.location.href = url;
    } catch (e) {
      console.error("Download error:", e);
      toast({
        title: "Gagal mengunduh",
        description: "Terjadi kesalahan saat menyiapkan file.",
        variant: "destructive",
      });
    }
  };

  const handleOpenEditDialog = () => {
    if (user) {
      setEditAge(user.age);
      setEditAgeUnit(user.ageUnit);
      setEditWeight(user.weight / 1000); // Convert from grams to kg
      setIsEditDialogOpen(true);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          age: editAge,
          ageUnit: editAgeUnit,
          weight: editWeight,
        }),
      });

      const result = await response.json();

      if (result.success && result.user) {
        setUser(result.user as User);
        setIsEditDialogOpen(false);
        toast({
          title: "Profil Berhasil Diperbarui",
          description: "Informasi kucing Anda telah diperbarui.",
        });
        // Recalculate ideal weight and obesity status
        loadLastGrooming(result.user.id);
      } else {
        toast({
          title: "Gagal Memperbarui Profil",
          description:
            result.message || "Terjadi kesalahan saat memperbarui profil",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Gagal Memperbarui Profil",
        description: "Terjadi kesalahan saat menghubungi server",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return null;
  }

  const guidelineRange = getGuidelineWeightRange(user.age, user.ageUnit);
  const idealWeight = calculateIdealWeight(user.age, user.ageUnit);
  const obese = isObeseByGuideline(user.age, user.ageUnit, user.weight);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center">
              <Cat className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{user.catName}</h1>
                {user.tipeBulu === 1 && (
                  <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-none shadow-md animate-pulse">
                    Bulu Panjang (Mode 1)
                  </Badge>
                )}
                {user.tipeBulu === 2 && (
                  <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-md animate-pulse">
                    Bulu Pendek (Mode 2)
                  </Badge>
                )}
                {!user.tipeBulu && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                    Belum Di-scan
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{user.catType}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Monitoring Suhu Real-time Section */}
        <Card className="border-2 border-cyan-200 bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-cyan-600" />
              <CardTitle>Monitoring Suhu Real-time</CardTitle>
            </div>
            <CardDescription>Data suhu dari temperature_logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              {/* Suhu Air Box */}
              <div className="flex-1 bg-white border-2 border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-5 h-5 text-cyan-600" />
                  <span className="font-semibold text-sm">Suhu Air</span>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {waterTemperature !== null
                    ? `${Math.round(waterTemperature)}°C`
                    : "--"}
                </div>
              </div>

              {/* Suhu Ruangan Box */}
              <div className="flex-1 bg-white border-2 border-gray-200 rounded-lg p-4 relative">
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-orange-500 text-white flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Menunggu Data
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 border-2 border-cyan-600 rounded flex items-center justify-center">
                    <Thermometer className="w-3 h-3 text-cyan-600" />
                  </div>
                  <span className="font-semibold text-sm">Suhu Ruangan</span>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {roomTemperature !== null
                    ? `${Math.round(roomTemperature)}°C`
                    : "--"}
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={() => router.push("/user/temperature-monitoring")}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Buka Halaman Pemantauan Suhu Lengkap
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Lihat data suhu realtime dengan riwayat lengkap
            </p>
          </CardContent>
        </Card>

        {/* Status Hardware IoT Card */}
        {(() => {
          // Cek apakah ESP8266 terhubung secara online (aktif jika update < 15 detik)
          const isOnline = hardwareStatus?.is_online === true;

          const isPompa1On = isOnline && hardwareStatus?.pompa1 === "on";
          const isPompa2On = isOnline && hardwareStatus?.pompa2 === "on";
          const isKipasOn = isOnline && hardwareStatus?.kipas === "on";
          const isLampuOn = isOnline && hardwareStatus?.lampu === "on";

          // Parsing Status Deteksi Bulu
          const detBuluRaw = hardwareStatus?.deteksi_bulu || "Standby";
          let detBuluLabel = "Standby";
          let detBuluColor = "bg-gray-100 text-gray-400";
          let detBuluBadgeClass = "bg-gray-200 text-gray-500 font-bold";

          if (!isOnline) {
            detBuluLabel = "Offline";
            detBuluColor = "bg-red-50 text-red-400 border border-red-100";
            detBuluBadgeClass = "bg-red-100 text-red-600 font-bold";
          } else if (detBuluRaw === "scan_bulu" || detBuluRaw === "scanning" || detBuluRaw === "proses" || detBuluRaw === "aktif") {
            detBuluLabel = "Scanning...";
            detBuluColor = "bg-amber-100 text-amber-600 animate-pulse";
            detBuluBadgeClass = "bg-amber-500 hover:bg-amber-600 text-white font-bold animate-pulse";
          } else if (detBuluRaw === "bulu_panjang" || detBuluRaw === "Panjang" || detBuluRaw.toLowerCase().includes("panjang")) {
            detBuluLabel = "Panjang";
            detBuluColor = "bg-cyan-100 text-cyan-600";
            detBuluBadgeClass = "bg-cyan-600 hover:bg-cyan-700 text-white font-bold animate-pulse";
          } else if (detBuluRaw === "bulu_pendek" || detBuluRaw === "Pendek" || detBuluRaw.toLowerCase().includes("pendek")) {
            detBuluLabel = "Pendek";
            detBuluColor = "bg-emerald-100 text-emerald-600";
            detBuluBadgeClass = "bg-emerald-600 hover:bg-emerald-700 text-white font-bold animate-pulse";
          }

          // Parsing Status Alat (System & State)
          const stateRaw = hardwareStatus?.state || "IDLE";
          const systemRaw = hardwareStatus?.system || "ready";
          let statusAlatLabel = "Standby";
          let statusAlatColor = "bg-emerald-100 text-emerald-600";
          let statusAlatBadgeClass = "bg-emerald-600 hover:bg-emerald-700 text-white font-bold";

          if (!isOnline) {
            statusAlatLabel = "Offline";
            statusAlatColor = "bg-red-50 text-red-500 border border-red-100 animate-pulse";
            statusAlatBadgeClass = "bg-red-500 text-white font-bold animate-pulse border-none";
          } else if (stateRaw === "IDLE" && systemRaw === "ready") {
            statusAlatLabel = "Ready";
            statusAlatColor = "bg-emerald-100 text-emerald-600";
            statusAlatBadgeClass = "bg-emerald-600 hover:bg-emerald-700 text-white font-bold";
          } else {
            statusAlatLabel = `${stateRaw === "IDLE" ? "Idle" : stateRaw}`;
            statusAlatColor = "bg-blue-100 text-blue-600 animate-pulse";
            statusAlatBadgeClass = "bg-blue-600 hover:bg-blue-700 text-white font-bold animate-pulse";
          }

          return (
            <Card className="border-2 border-emerald-200 bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-emerald-600 animate-pulse" />
                  <div>
                    <CardTitle className="text-lg">Status Hardware IoT</CardTitle>
                    <CardDescription className="text-xs">Status komponen alat yang terhubung dengan ESP8266</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                  {/* Pompa 1 */}
                  <div className="flex flex-col items-center justify-center border-2 border-gray-100 rounded-xl p-4 transition-all hover:shadow-md bg-gradient-to-b from-white to-gray-50/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isPompa1On ? 'bg-cyan-100 text-cyan-600 animate-bounce' : 'bg-gray-100 text-gray-400'}`}>
                      <Droplets className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-xs text-gray-700 mb-2">Pompa 1</span>
                    <Badge variant={isPompa1On ? "default" : "secondary"} className={isPompa1On ? "bg-cyan-600 hover:bg-cyan-700 text-white font-bold animate-pulse" : "bg-gray-200 text-gray-500 font-bold"}>
                      {isPompa1On ? "ON" : "OFF"}
                    </Badge>
                  </div>

                  {/* Pompa 2 */}
                  <div className="flex flex-col items-center justify-center border-2 border-gray-100 rounded-xl p-4 transition-all hover:shadow-md bg-gradient-to-b from-white to-gray-50/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isPompa2On ? 'bg-blue-100 text-blue-600 animate-bounce' : 'bg-gray-100 text-gray-400'}`}>
                      <Droplets className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-xs text-gray-700 mb-2">Pompa 2</span>
                    <Badge variant={isPompa2On ? "default" : "secondary"} className={isPompa2On ? "bg-blue-600 hover:bg-blue-700 text-white font-bold animate-pulse" : "bg-gray-200 text-gray-500 font-bold"}>
                      {isPompa2On ? "ON" : "OFF"}
                    </Badge>
                  </div>

                  {/* Kipas */}
                  <div className="flex flex-col items-center justify-center border-2 border-gray-100 rounded-xl p-4 transition-all hover:shadow-md bg-gradient-to-b from-white to-gray-50/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isKipasOn ? 'bg-teal-100 text-teal-600 animate-spin' : 'bg-gray-100 text-gray-400'}`}>
                      <Wind className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-xs text-gray-700 mb-2">Kipas</span>
                    <Badge variant={isKipasOn ? "default" : "secondary"} className={isKipasOn ? "bg-teal-600 hover:bg-teal-700 text-white font-bold animate-pulse" : "bg-gray-200 text-gray-500 font-bold"}>
                      {isKipasOn ? "ON" : "OFF"}
                    </Badge>
                  </div>

                  {/* Lampu */}
                  <div className="flex flex-col items-center justify-center border-2 border-gray-100 rounded-xl p-4 transition-all hover:shadow-md bg-gradient-to-b from-white to-gray-50/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isLampuOn ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-xs text-gray-700 mb-2">Lampu</span>
                    <Badge variant={isLampuOn ? "default" : "secondary"} className={isLampuOn ? "bg-amber-500 hover:bg-amber-600 text-white font-bold animate-pulse" : "bg-gray-200 text-gray-500 font-bold"}>
                      {isLampuOn ? "ON" : "OFF"}
                    </Badge>
                  </div>

                  {/* Deteksi Bulu */}
                  <div className="flex flex-col items-center justify-center border-2 border-gray-100 rounded-xl p-4 transition-all hover:shadow-md bg-gradient-to-b from-white to-gray-50/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${detBuluColor}`}>
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-xs text-gray-700 mb-2 text-center">Deteksi Bulu</span>
                    <Badge className={detBuluBadgeClass}>
                      {detBuluLabel}
                    </Badge>
                  </div>

                  {/* Status Alat */}
                  <div className="flex flex-col items-center justify-center border-2 border-gray-100 rounded-xl p-4 transition-all hover:shadow-md bg-gradient-to-b from-white to-gray-50/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${statusAlatColor}`}>
                      <Cpu className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-xs text-gray-700 mb-2 text-center">Status Alat</span>
                    <Badge className={statusAlatBadgeClass}>
                      {statusAlatLabel}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Proses Grooming Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pemandian & Pengeringan Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center">
                  <Droplets className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <CardTitle>Pemandian & Pengeringan</CardTitle>
                  <CardDescription>
                    Mulai proses pemandian dilanjutkan pengeringan
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeBathingSession ? (
                <div className="space-y-3">
                  <div className="bg-cyan-50 border-2 border-cyan-500 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-cyan-600 rounded-full animate-pulse"></div>
                        <span className="font-semibold text-cyan-700">Proses Pemandian Sedang Berjalan</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-cyan-600" />
                      <span className="text-lg font-bold text-cyan-700">
                        {formatDuration(bathingDuration)}
                      </span>
                      <span className="text-sm text-cyan-600">/ ~10 menit</span>
                    </div>
                    <p className="text-sm text-cyan-600 mb-3">
                      Proses pemandian sedang aktif. Setelah selesai, akan otomatis dilanjutkan dengan pengeringan.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleStopBathing}
                      disabled={isStoppingBathing}
                    >
                      {isStoppingBathing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Menghentikan...
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          Hentikan Pemandian
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : activeDryingSession && isFullProcessMode ? (
                <div className="space-y-3">
                  <div className="bg-cyan-50 border-2 border-cyan-500 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-cyan-600 rounded-full animate-pulse"></div>
                        <span className="font-semibold text-cyan-700">Proses Pengeringan (Lanjutan)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-cyan-600" />
                      <span className="text-lg font-bold text-cyan-700">
                        {formatDuration(dryingDuration)}
                      </span>
                      <span className="text-sm text-cyan-600">/ ~15 menit</span>
                    </div>
                    <p className="text-sm text-cyan-600 mb-3">
                      Pemandian selesai. Proses pengeringan sedang berjalan sebagai lanjutan dari proses pemandian.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleStopDrying}
                      disabled={isStoppingDrying}
                    >
                      {isStoppingDrying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Menghentikan...
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          Hentikan Pengeringan
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleStartFullProcess}
                    disabled={isStartingBathing || isStartingDrying || !!activeDryingSession || !!activeBathingSession}
                  >
                    {isStartingBathing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memulai Proses...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Proses Lengkap
                      </>
                    )}
                  </Button>
                  {activeDryingSession || activeBathingSession ? (
                    <p className="text-sm text-amber-600 font-medium">
                      ⚠️ Proses sedang berjalan. Hentikan terlebih dahulu untuk memulai proses ini.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Proses akan dimulai dengan pemandian (~10 menit), kemudian otomatis
                      dilanjutkan dengan pengeringan (~15 menit)
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Pengeringan Saja Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Wind className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Pengeringan Saja</CardTitle>
                  <CardDescription>
                    Mulai proses pengeringan tanpa pemandian
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeDryingSession && !isFullProcessMode ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="font-semibold text-blue-700">Proses Pengeringan Sedang Berjalan</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-lg font-bold text-blue-700">
                        {formatDuration(dryingDuration)}
                      </span>
                      <span className="text-sm text-blue-600">/ ~15 menit</span>
                    </div>
                    <p className="text-sm text-blue-600 mb-3">
                      Proses pengeringan sedang aktif.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleStopDrying}
                      disabled={isStoppingDrying}
                    >
                      {isStoppingDrying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Menghentikan...
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          Hentikan Pengeringan
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleStartDryingOnly}
                    disabled={isStartingBathing || isStartingDrying || !!activeBathingSession || (!!activeDryingSession && isFullProcessMode)}
                  >
                    {isStartingDrying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memulai Proses...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Pengeringan
                      </>
                    )}
                  </Button>
                  {activeBathingSession || (activeDryingSession && isFullProcessMode) ? (
                    <p className="text-sm text-amber-600 font-medium">
                      ⚠️ Proses pemandian & pengeringan sedang berjalan. Hentikan terlebih dahulu untuk memulai proses ini.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Hanya proses pengeringan (~15 menit), tanpa pemandian terlebih dahulu
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profil Kucing Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profil Kucing</CardTitle>
                <CardDescription>Informasi kucing Anda</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditDialog}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profil
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nama:</span>
                <span className="font-medium">{user.catName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Jenis:</span>
                <Badge variant="secondary">{user.catType}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Umur:</span>
                <span className="font-medium">
                  {user.age}{" "}
                  {user.ageUnit === "weeks"
                    ? "minggu"
                    : user.ageUnit === "months"
                      ? "bulan"
                      : "tahun"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Berat Badan:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {(user.weight / 1000).toFixed(1)} kg
                  </span>
                  {obese && (
                    <Badge className="bg-red-500 text-white">Obesitas</Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  Rentang Berat Ideal (panduan usia):
                </span>
                <span className="font-medium">
                  {guidelineRange.min.toFixed(1)}–{guidelineRange.max.toFixed(1)} kg
                </span>
              </div>
              {obese && (
                <div className="md:col-span-2">
                  <div className="w-full border border-red-300 bg-red-50 text-red-700 rounded px-3 py-2 text-sm">
                    Peringatan: Kucing terindikasi obesitas. Berat saat ini melebihi 120% dari batas atas
                    rentang berat ideal untuk usianya.
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Terdaftar:</span>
                <span className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  Terakhir Grooming:
                </span>
                <span className="font-medium">
                  {lastGrooming
                    ? new Date(lastGrooming).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "Belum ada data"}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownloadGroomingData}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Data Grooming
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Data grooming akan tersedia setelah sesi grooming selesai.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profil Kucing</DialogTitle>
            <DialogDescription>
              Perbarui informasi umur dan berat badan kucing Anda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editAge">Umur</Label>
                <Input
                  id="editAge"
                  type="number"
                  min="1"
                  max="30"
                  value={editAge}
                  onChange={(e) => setEditAge(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAgeUnit">Satuan Umur</Label>
                <Select
                  value={editAgeUnit}
                  onValueChange={(value: "weeks" | "months" | "years") =>
                    setEditAgeUnit(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weeks">Minggu</SelectItem>
                    <SelectItem value="months">Bulan</SelectItem>
                    <SelectItem value="years">Tahun</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editWeight">Berat Badan (kg)</Label>
              <Input
                id="editWeight"
                type="number"
                step="0.1"
                min="0.1"
                max="20"
                value={editWeight}
                onChange={(e) => setEditWeight(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Masukkan berat badan dalam kilogram (contoh: 1.3 untuk 1.3 kg)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isUpdating}
            >
              Batal
            </Button>
            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdating}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
