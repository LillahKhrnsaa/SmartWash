import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { catName, password } = body;

    // Validate input
    if (!catName || !password) {
      return NextResponse.json(
        { success: false, message: "Nama kucing dan password harus diisi" },
        { status: 400 }
      );
    }

    // Find user by cat name in PostgreSQL
    const result = await query(
      "SELECT id, email, password, cat_name, cat_type, age, age_unit, weight, fur_type, created_at, tipe_bulu FROM users WHERE cat_name = $1 LIMIT 1",
      [catName]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nama kucing atau password salah" },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password (plain text match)
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, message: "Nama kucing atau password salah" },
        { status: 401 }
      );
    }

    console.log("[Login API] Successfully logged in:", user.cat_name);

    return NextResponse.json(
      {
        success: true,
        message: "Login berhasil",
        user: {
          id: user.id.toString(), // Convert to string for client-side localStorage/session compatibility
          email: user.email,
          catName: user.cat_name,
          catType: user.cat_type,
          age: user.age,
          ageUnit: user.age_unit,
          weight: user.weight,
          furType: user.fur_type,
          createdAt: user.created_at,
          tipeBulu: user.tipe_bulu,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Terjadi kesalahan saat login",
      },
      { status: 500 }
    );
  }
}
