import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Room } from "@/models/Room";
import { Hostel } from "@/models/Hostel";
import { Allocation } from "@/models/Allocation";
import { Session } from "@/models/Session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentRegNumber = searchParams.get("studentRegNumber");
    const studentGender = searchParams.get("gender");
    const isAdminAction = searchParams.get("isAdminAction") === "true";

    if (!studentRegNumber || !studentGender) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the active session
    const activeSession = await Session.findOne({ isActive: true });
    let sessionFilter = {};
    if (activeSession) {
      sessionFilter = { session: activeSession._id };
    }

    // Get current allocation
    const currentAllocation = await Allocation.findOne({
      studentRegNumber,
      ...sessionFilter
    }).populate('hostel');

    if (!currentAllocation) {
       return NextResponse.json({ error: "No existing allocation found" }, { status: 404 });
    }

    const currentHostelId = (currentAllocation.hostel as any)._id.toString();
    const currentRoomPrice = (currentAllocation.hostel as any).pricePerSemester;

    // Fetch rooms matching criteria
    let roomQuery: any = {
       isAvailable: true,
       isReserved: false,
       _id: { $ne: currentAllocation.room } // exclude current room
    };

    if (studentGender !== 'Mixed') {
       roomQuery.gender = { $in: [studentGender, 'Mixed'] };
    }

    const availableRooms = await Room.find(roomQuery)
      .populate('hostel')
      .populate('floor')
      .lean();

    const formattedRooms = [];

    for (const room of availableRooms) {
       const roomHostelId = (room.hostel as any)._id.toString();
       const roomPrice = (room.hostel as any).pricePerSemester;

       // Filter based on admin rules
       if (!isAdminAction && roomHostelId !== currentHostelId) continue;
       if (!isAdminAction && roomPrice !== currentRoomPrice) continue;

       formattedRooms.push({
          ...room,
          id: room._id.toString(),
          hostelId: roomHostelId,
          hostelName: (room.hostel as any).name,
          floorName: (room.floor as any).name,
          price: roomPrice
       });
    }

    return NextResponse.json(formattedRooms);
  } catch (error) {
    console.error("Error fetching available rooms:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
