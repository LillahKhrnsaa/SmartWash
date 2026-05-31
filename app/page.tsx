"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Cat } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">Sistem Kontrol Pemandian & Pengering Kucing</h1>
          <p className="text-muted-foreground text-lg">Kelola perawatan kucing Anda dengan mudah dan aman</p>
        </div>

        <Card className="border-2 hover:border-cyan-500 transition-colors">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4">
              <Cat className="w-8 h-8 text-cyan-600" />
            </div>
            <CardTitle className="text-2xl">Pengguna</CardTitle>
            <CardDescription>Kontrol pemandian dan pengering kucing Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-700"
              size="lg"
              onClick={() => router.push("/user/login")}
            >
              Login Pengguna
            </Button>
            <Button
              variant="outline"
              className="w-full border-cyan-600 text-cyan-600 hover:bg-cyan-50 bg-transparent"
              size="lg"
              onClick={() => router.push("/user/register")}
            >
              Register Pengguna
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
