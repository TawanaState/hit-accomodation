import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Room } from "@/models/Room";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hostelId = params.id;
    await dbConnect();

    // Fetch rooms for a specific hostel and populate the required data if needed
    const rooms = await Room.find({ hostel: hostelId, isAvailable: true }).lean();
    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
