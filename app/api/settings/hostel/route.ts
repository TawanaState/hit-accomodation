import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// Mock for now or read from Settings collection once it exists
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Default settings
    const settings = {
      paymentGracePeriod: 168, // 168 hours = 7 days
      autoRevokeUnpaidAllocations: true,
      maxRoomCapacity: 4,
      allowMixedGender: false,
      allowRoomChanges: true
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
