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

    // Check if floors have rooms array we need to extract and save as separate documents
    if (body.floors && Array.isArray(body.floors)) {
      for (const floor of body.floors) {
        if (floor.rooms && Array.isArray(floor.rooms)) {
          // Process rooms for this floor
          for (const roomData of floor.rooms) {
            // Upsert room
            const roomQuery = roomData._id ? { _id: roomData._id } : { number: roomData.number, hostel: id, floor: floor.id || floor._id };
            await Room.findOneAndUpdate(
              roomQuery,
              {
                number: roomData.number,
                hostel: id,
                floor: floor.id || floor._id,
                price: roomData.price,
                capacity: roomData.capacity,
                occupants: roomData.occupants || [],
                gender: roomData.gender,
                isReserved: roomData.isReserved || false,
                reservedBy: roomData.reservedBy,
                reservedUntil: roomData.reservedUntil,
                isAvailable: roomData.isAvailable ?? true,
                features: roomData.features || [],
              },
              { upsert: true, new: true }
            );
          }
        }
      }

      // Remove the non-schema 'rooms' array from the floors before updating Hostel document
      body.floors = body.floors.map((floor: any) => {
        const { rooms, id, ...floorData } = floor;
        if (id && !floorData._id) floorData._id = id; // Ensure _id is maintained
        return floorData;
      });
    }

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
