import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

async function handleUpdate(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId: userIdStr, age, ageUnit, weight } = body;

    // Validate input
    if (!userIdStr) {
      return NextResponse.json(
        { success: false, message: "User ID diperlukan" },
        { status: 400 }
      );
    }

    if (age === undefined || !ageUnit || weight === undefined) {
      return NextResponse.json(
        { success: false, message: "Semua field harus diisi" },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdStr);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: "User ID tidak valid" },
        { status: 400 }
      );
    }

    // Weight is stored as integer (in grams), so multiply by 1000
    const weightInGrams = Math.round(parseFloat(weight.toString()) * 1000);

    // Check if user exists in PostgreSQL
    const checkResult = await query("SELECT id FROM users WHERE id = $1 LIMIT 1", [userId]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // Update user in PostgreSQL
    const updateResult = await query(
      `UPDATE users
       SET age = $1, age_unit = $2, weight = $3
       WHERE id = $4
       RETURNING id, email, cat_name, cat_type, age, age_unit, weight, fur_type, created_at, tipe_bulu`,
      [parseInt(age.toString()), ageUnit, weightInGrams, userId]
    );

    const updatedUser = updateResult.rows[0];

    console.log("[Update API] Successfully updated user:", updatedUser.cat_name);

    return NextResponse.json(
      {
        success: true,
        message: "Profil berhasil diperbarui",
        user: {
          id: updatedUser.id.toString(), // Convert to string for client compatibility
          email: updatedUser.email,
          catName: updatedUser.cat_name,
          catType: updatedUser.cat_type,
          age: updatedUser.age,
          ageUnit: updatedUser.age_unit,
          weight: updatedUser.weight,
          furType: updatedUser.fur_type,
          createdAt: updatedUser.created_at,
          tipeBulu: updatedUser.tipe_bulu,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Terjadi kesalahan saat memperbarui profil",
      },
      { status: 500 }
    );
  }
}

// Support both PUT and POST for robustness
export async function PUT(request: NextRequest) {
  return handleUpdate(request);
}

export async function POST(request: NextRequest) {
  return handleUpdate(request);
}
