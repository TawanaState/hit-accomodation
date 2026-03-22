import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Hostel } from "@/models/Hostel";
import { Room } from "@/models/Room";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = params;

    const hostel = await Hostel.findById(id).lean();
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const rooms = await Room.find({ hostel: id }).lean();

    const floorsWithRooms = hostel.floors.map((floor) => {
      const floorRooms = rooms.filter(
        (room) => room.floor.toString() === floor._id.toString()
      );

      const uiRooms = floorRooms.map((r) => ({
        ...r,
        id: r._id.toString(),
        floorName: floor.name,
        hostelName: hostel.name,
        floor: floor.number
      }));

      return {
        ...floor,
        id: floor._id.toString(),
        rooms: uiRooms,
      };
    });

    return NextResponse.json({
      ...hostel,
      id: hostel._id.toString(),
      floors: floorsWithRooms,
    });
  } catch (error) {
    console.error("Error fetching hostel:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await req.json();

    const updatedHostel = await Hostel.findByIdAndUpdate(id, body, { new: true }).lean();
    if (!updatedHostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    return NextResponse.json(updatedHostel);
  } catch (error) {
    console.error("Error updating hostel:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = params;

    // Delete hostel
    const deletedHostel = await Hostel.findByIdAndDelete(id).lean();
    if (!deletedHostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    // Delete all rooms associated with the hostel
    await Room.deleteMany({ hostel: id });

    // Note: allocations should ideally be cleaned up too but kept minimal here based on previous structure

    return NextResponse.json({ message: "Hostel deleted successfully" });
  } catch (error) {
    console.error("Error deleting hostel:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
