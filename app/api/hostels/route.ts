import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Hostel } from "@/models/Hostel";
import { Room } from "@/models/Room";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Fetch all active hostels
    const hostels = await Hostel.find({ isActive: true }).lean();

    // Fetch all available rooms
    const rooms = await Room.find({ isAvailable: true }).lean();

    // Map the relational data to the nested structure expected by the UI.
    const normalizedHostels = hostels.map((hostel) => {
      // Find rooms specifically for this hostel
      const hostelRooms = rooms.filter(
        (room) => room.hostel.toString() === hostel._id.toString()
      );

      // Map rooms into their corresponding floors
      const floorsWithRooms = hostel.floors.map((floor) => {
        const floorRooms = hostelRooms.filter(
          (room) => room.floor.toString() === floor._id.toString()
        );

        // Format each room exactly how the UI expects
        const uiRooms = floorRooms.map((r) => ({
          ...r,
          id: r._id.toString(),
          floorName: floor.name,
          hostelName: hostel.name,
          // ensure floor string is present for the UI type match
          floor: floor.number
        }));

        return {
          ...floor,
          id: floor._id.toString(),
          rooms: uiRooms,
        };
      });

      return {
        ...hostel,
        id: hostel._id.toString(),
        floors: floorsWithRooms,
      };
    });

    return NextResponse.json(normalizedHostels);
  } catch (error) {
    console.error("Error fetching hostels:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();

    const { name } = body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Hostel name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existingHostel = await Hostel.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    }).lean();

    if (existingHostel) {
      return NextResponse.json(
        { error: `A hostel with the name "${trimmedName}" already exists.` },
        { status: 400 }
      );
    }

    const newHostel = await Hostel.create({ ...body, name: trimmedName });

    return NextResponse.json({ id: newHostel._id.toString(), ...newHostel.toObject() }, { status: 201 });
  } catch (error) {
    console.error("Error creating hostel:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
