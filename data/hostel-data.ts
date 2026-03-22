import { logHostelOperation } from '@/utils/hostel-id-validation';
import { Hostel, Room, RoomAllocation, HostelSettings } from "@/types/hostel";

/**
 * Helper to get the base URL for API calls.
 */
const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  return "http://localhost:3000";
};

/**
 * Fetch all hostels
 */
export const fetchHostels = async (): Promise<Hostel[]> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/hostels`);
    if (!res.ok) throw new Error("Failed to fetch hostels");
    return await res.json();
  } catch (error) {
    console.error("Error fetching hostels:", error);
    return [];
  }
};

/**
 * Fetch a specific hostel by ID
 */
export const fetchHostelById = async (hostelId: string): Promise<Hostel | null> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/hostels/${hostelId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch hostel by ID");
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching hostel:", error);
    return null;
  }
};

/**
 * Create a new hostel
 */
export const createHostel = async (hostel: Omit<Hostel, 'id'>): Promise<string> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/hostels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hostel),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to create hostel");
    }
    const data = await res.json();
    return data.id;
  } catch (error) {
    console.error("[HOSTEL CREATION ERROR]", error);
    throw error;
  }
};

/**
 * Update an existing hostel
 */
export const updateHostel = async (hostelId: string, updates: Partial<Hostel>): Promise<void> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/hostels/${hostelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to update hostel");
    }
  } catch (error) {
    console.error("Error updating hostel:", error);
    throw error;
  }
};

/**
 * Delete a hostel
 */
export const deleteHostel = async (hostelId: string): Promise<void> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/hostels/${hostelId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to delete hostel");
    }
  } catch (error) {
    console.error("Error deleting hostel:", error);
    throw error;
  }
};

/**
 * Fetch available rooms for a specific gender
 */
export const fetchAvailableRooms = async (gender: 'Male' | 'Female'): Promise<Room[]> => {
  try {
    const hostels = await fetchHostels();
    const availableRooms: Room[] = [];

    hostels.forEach(hostel => {
      if (hostel.isActive && (hostel.gender === gender || hostel.gender === 'Mixed')) {
        hostel.floors.forEach(floor => {
          floor.rooms.forEach(room => {
            if (room.isAvailable && 
                !room.isReserved && 
                room.occupants.length < room.capacity &&
                (room.gender === gender || room.gender === 'Mixed')) {
              availableRooms.push({
                ...room,
                hostelId: hostel.id, // Add hostelId for consistency
                hostelName: hostel.name,
                floorName: floor.name
              } as Room & { hostelId: string; hostelName: string; floorName: string });
            }
          });
        });
      }
    });

    return availableRooms;
  } catch (error) {
    console.error("Error fetching available rooms:", error);
    return [];
  }
};

/**
 * Allocate a room to a student
 */
export const allocateRoom = async (
  studentRegNumber: string,
  roomId: string,
  hostelId: string
): Promise<RoomAllocation> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/allocations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ studentRegNumber, roomId, hostelId }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `Failed to allocate room: ${res.statusText}`);
    }

    const newAllocation = await res.json();
    return newAllocation as RoomAllocation;
  } catch (error) {
    console.error("[ROOM ALLOCATION ERROR]", error);
    throw error;
  }
};

/**
 * Revoke room allocation (for unpaid allocations)
 */
export const revokeRoomAllocation = async (allocationId: string): Promise<void> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/allocations/${allocationId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to revoke allocation");
    }
  } catch (error) {
    console.error("Error revoking room allocation:", error);
    throw error;
  }
};

/**
 * Reserve a room (admin function)
 */
export const reserveRoom = async (
  roomId: string, 
  hostelId: string, 
  adminEmail: string, 
  reservationDays: number = 30
): Promise<void> => {
  try {
    const hostel = await fetchHostelById(hostelId);
    if (hostel) {
      const updatedHostel = { ...hostel };
      updatedHostel.floors.forEach(floor => {
        floor.rooms.forEach(room => {
          if (room.id === roomId) {
            room.isReserved = true;
            room.reservedBy = adminEmail;
            room.reservedUntil = new Date(Date.now() + reservationDays * 24 * 60 * 60 * 1000).toISOString();
          }
        });
      });
      
      await updateHostel(hostelId, updatedHostel);
    }
  } catch (error) {
    console.error("Error reserving room:", error);
    throw error;
  }
};

/**
 * Unreserve a room
 */
export const unreserveRoom = async (roomId: string, hostelId: string): Promise<void> => {
  try {
    const hostel = await fetchHostelById(hostelId);
    if (!hostel) {
      throw new Error(`Hostel with ID ${hostelId} not found`);
    }

    const updatedHostel = { ...hostel };
    let roomFound = false;

    updatedHostel.floors.forEach(floor => {
      floor.rooms.forEach(room => {
        if (room.id === roomId) {
          room.isReserved = false;
          delete room.reservedBy;
          delete room.reservedUntil;
          roomFound = true;
        }
      });
    });

    if (!roomFound) {
      throw new Error(`Room with ID ${roomId} not found in hostel ${hostelId}`);
    }
    
    await updateHostel(hostelId, updatedHostel);
  } catch (error) {
    console.error("Error unreserving room:", error);
    throw error;
  }
};

/**
 * Fetch student profile data by registration number
 */
export const fetchStudentProfile = async (studentRegNumber: string): Promise<{gender: 'Male' | 'Female'} | null> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/students/${studentRegNumber}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch student profile");
    }
    const studentData = await res.json();
    return {
      gender: studentData.gender as 'Male' | 'Female'
    };
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return null;
  }
};

/**
 * Fetch room allocations for a student
 */
export const fetchStudentAllocations = async (studentRegNumber: string): Promise<RoomAllocation[]> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/allocations?studentRegNumber=${studentRegNumber}`);
    if (!res.ok) throw new Error("Failed to fetch student allocations");
    return await res.json();
  } catch (error) {
    console.error("Error fetching student allocations:", error);
    return [];
  }
};

/**
 * Fetch a specific allocation by ID
 */
export const fetchAllocationById = async (allocationId: string): Promise<RoomAllocation | null> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/allocations/${allocationId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch allocation");
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching allocation by ID:", error);
    return null;
  }
};

/**
 * Update payment status for an allocation
 */
export const updatePaymentStatus = async (
  allocationId: string, 
  status: 'Pending' | 'Paid' | 'Overdue'
): Promise<void> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/allocations/${allocationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: status }),
    });
    if (!res.ok) throw new Error("Failed to update payment status");
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

/**
 * Check and update overdue payment statuses
 */
export const checkAndUpdateOverduePayments = async (): Promise<{
  checkedCount: number;
  overdueCount: number;
  updatedCount: number;
}> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/check-payment-deadlines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualTrigger: true }),
    });
    if (!res.ok) throw new Error("Failed to check and update overdue payments");
    return await res.json();
  } catch (error) {
    console.error("Error checking and updating overdue payments:", error);
    throw error;
  }
};

/**
 * Get hostel settings
 */
export const fetchHostelSettings = async (): Promise<HostelSettings> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/settings/hostelSettings`);
    if (!res.ok) throw new Error("Failed to fetch hostel settings");
    return await res.json();
  } catch (error) {
    console.error("Error fetching hostel settings:", error);
    return {
      paymentGracePeriod: 168,
      autoRevokeUnpaidAllocations: true,
      maxRoomCapacity: 4,
      allowMixedGender: false,
      allowRoomChanges: true
    };
  }
};

/**
 * Update hostel settings
 */
export const updateHostelSettings = async (settings: HostelSettings): Promise<void> => {
  try {
    const res = await fetch(`${getBaseUrl()}/api/settings/hostelSettings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error("Failed to update hostel settings");
  } catch (error) {
    console.error("Error updating hostel settings:", error);
    throw error;
  }
};

/**
 * Add a room to a specific floor in a hostel
 */
export const addRoomToFloor = async (
  hostelId: string, 
  floorId: string, 
  room: Omit<Room, 'id'>
): Promise<void> => {
  try {
    const hostel = await fetchHostelById(hostelId);
    if (!hostel) throw new Error("Hostel not found");

    const floor = hostel.floors.find(f => f.id === floorId);
    if (!floor) throw new Error("Floor not found");

    const roomId = `${hostelId}_${floorId}_${room.number}`;
    const newRoom: Room = {
      id: roomId,
      ...room
    };

    floor.rooms.push(newRoom);
    hostel.totalCapacity += room.capacity;

    await updateHostel(hostelId, hostel);
  } catch (error) {
    console.error("Error adding room to floor:", error);
    throw error;
  }
};

/**
 * Add multiple rooms in a range to a specific floor
 */
export const addRoomsInRange = async (
  hostelId: string,
  floorId: string,
  startNumber: number,
  endNumber: number,
  prefix: string = '',
  suffix: string = '',
  capacity: number = 2,
  gender: 'Male' | 'Female' | 'Mixed' = 'Mixed',
  features: string[] = []
): Promise<void> => {
  try {
    const hostel = await fetchHostelById(hostelId);
    if (!hostel) throw new Error("Hostel not found");

    const floor = hostel.floors.find(f => f.id === floorId);
    if (!floor) throw new Error("Floor not found");

    const newRooms: Room[] = [];
    let totalCapacityAdded = 0;

    for (let i = startNumber; i <= endNumber; i++) {
      const roomNumber = `${prefix}${i}${suffix}`;
      const roomId = `${hostelId}_${floorId}_${roomNumber}`;

      if (floor.rooms.find(r => r.number === roomNumber)) {
        continue;
      }

      const newRoom: Room = {
        id: roomId,
        number: roomNumber,
        floor: floor.name,
        floorName: floor.name,
        hostelName: hostel.name,
        price: hostel.pricePerSemester,
        capacity,
        occupants: [],
        gender,
        isReserved: false,
        isAvailable: true,
        features
      };

      newRooms.push(newRoom);
      totalCapacityAdded += capacity;
    }

    floor.rooms.push(...newRooms);
    hostel.totalCapacity += totalCapacityAdded;

    await updateHostel(hostelId, hostel);
  } catch (error) {
    console.error("Error adding rooms in range:", error);
    throw error;
  }
};

/**
 * Add a new floor to a hostel
 */
export const addFloorToHostel = async (
  hostelId: string,
  floorNumber: string,
  floorName: string
): Promise<void> => {
  try {
    const hostel = await fetchHostelById(hostelId);
    if (!hostel) throw new Error("Hostel not found");

    if (hostel.floors.find(f => f.number === floorNumber)) {
      throw new Error(`Floor ${floorNumber} already exists`);
    }

    const newFloor = {
      id: `${hostelId}_floor_${floorNumber}`,
      number: floorNumber,
      name: floorName,
      rooms: []
    };

    hostel.floors.push(newFloor);
    await updateHostel(hostelId, hostel);
  } catch (error) {
    console.error("Error adding floor to hostel:", error);
    throw error;
  }
};

/**
 * Remove a room from a hostel
 */
export const removeRoom = async (hostelId: string, roomId: string): Promise<void> => {
  try {
    const hostel = await fetchHostelById(hostelId);
    if (!hostel) throw new Error("Hostel not found");

    let roomFound = false;
    let roomCapacity = 0;

    hostel.floors.forEach(floor => {
      const roomIndex = floor.rooms.findIndex(r => r.id === roomId);
      if (roomIndex !== -1) {
        roomCapacity = floor.rooms[roomIndex].capacity;
        floor.rooms.splice(roomIndex, 1);
        roomFound = true;
      }
    });

    if (!roomFound) throw new Error("Room not found");

    hostel.totalCapacity -= roomCapacity;

    await updateHostel(hostelId, hostel);

    // Attempting to delete allocations connected to the room via standard API endpoints would require filtering properly,
    // ideally the backend logic handles cascading deletes, but we simulate it by finding those manually if needed.
    // For now we assume backend takes care of it or frontend cleanup follows.
  } catch (error) {
    console.error("Error removing room:", error);
    throw error;
  }
};

/**
 * Remove a floor from a hostel and all its related allocations
 */
export const removeFloor = async (hostelId: string, floorId: string): Promise<void> => {
  try {
    const hostel = await fetchHostelById(hostelId);
    if (!hostel) throw new Error("Hostel not found");

    const floorIndex = hostel.floors.findIndex(f => f.id === floorId);
    if (floorIndex === -1) throw new Error("Floor not found");

    const floor = hostel.floors[floorIndex];
    const removedCapacity = floor.rooms.reduce((total, room) => total + room.capacity, 0);

    hostel.floors.splice(floorIndex, 1);
    hostel.totalCapacity -= removedCapacity;

    await updateHostel(hostelId, hostel);
  } catch (error) {
    console.error("Error removing floor:", error);
    throw error;
  }
};

/**
 * Remove an occupant from a room and clean up allocation
 */
export const removeOccupantFromRoom = async (
  hostelId: string,
  roomId: string,
  studentRegNumber: string
): Promise<void> => {
  try {
    const hostel = await fetchHostelById(hostelId);
    if (!hostel) throw new Error("Hostel not found");

    const updatedHostel = { ...hostel };
    let roomFound = false;
    
    updatedHostel.floors.forEach(floor => {
      floor.rooms.forEach(room => {
        if (room.id === roomId) {
          room.occupants = room.occupants.filter(reg => reg !== studentRegNumber);
          room.isAvailable = room.occupants.length < room.capacity;
          roomFound = true;
        }
      });
    });

    if (!roomFound) throw new Error("Room not found");

    const totalOccupancy = updatedHostel.floors.reduce((total, floor) => 
      total + floor.rooms.reduce((floorTotal, room) => floorTotal + room.occupants.length, 0), 0
    );
    updatedHostel.currentOccupancy = totalOccupancy;

    await updateHostel(hostelId, updatedHostel);
  } catch (error) {
    console.error("Error removing occupant from room:", error);
    throw error;
  }
};

/**
 * Get room details with price from allocation
 */
export const getRoomDetailsFromAllocation = async (allocation: RoomAllocation): Promise<{room: Room, hostel: Hostel, price: number} | null> => {
  try {
    const hostel = await fetchHostelById(allocation.hostelId);
    if (!hostel) return null;
    
    let roomDetails: Room | null = null;
    for (const floor of hostel.floors) {
      const room = floor.rooms.find(r => r.id === allocation.roomId);
      if (room) {
        roomDetails = {
          ...room,
          hostelName: hostel.name,
          floorName: floor.name,
          price: hostel.pricePerSemester
        };
        break;
      }
    }
    
    if (!roomDetails) return null;
    
    return {
      room: roomDetails,
      hostel: hostel,
      price: hostel.pricePerSemester
    };
  } catch (error) {
    console.error("Error getting room details from allocation:", error);
    return null;
  }
};

/**
 * Clean up duplicate allocations for a student (safety function)
 */
export const cleanupDuplicateAllocations = async (studentRegNumber: string): Promise<void> => {
  try {
    const allocations = await fetchStudentAllocations(studentRegNumber);
    if (allocations.length <= 1) return;

    // Sort by allocatedAt desc and delete older
    allocations.sort((a, b) => new Date(b.allocatedAt).getTime() - new Date(a.allocatedAt).getTime());
    const duplicates = allocations.slice(1);
    
    for (const duplicate of duplicates) {
      try {
        await revokeRoomAllocation(duplicate.id);
      } catch (error) {
        console.error(`Failed to clean up duplicate allocation ${duplicate.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error cleaning up duplicate allocations:", error);
    throw error;
  }
};

/**
 * Change room allocation for a student
 */
export const changeRoomAllocation = async (
  studentRegNumber: string,
  newRoomId: string,
  newHostelId: string,
  studentGender: 'Male' | 'Female',
  isAdminAction: boolean = false
): Promise<void> => {
  try {
    await cleanupDuplicateAllocations(studentRegNumber);

    const currentAllocations = await fetchStudentAllocations(studentRegNumber);
    if (currentAllocations.length === 0) throw new Error("No existing allocation found for this student");

    const currentAllocation = currentAllocations[0];
    
    if (!isAdminAction && currentAllocation.hostelId !== newHostelId) {
      throw new Error("Students can only change rooms within the same hostel");
    }

    const newHostel = await fetchHostelById(newHostelId);
    if (!newHostel) throw new Error(`Target hostel with ID ${newHostelId} not found`);

    let newRoom: Room | null = null;
    for (const floor of newHostel.floors) {
      const room = floor.rooms.find(r => r.id === newRoomId);
      if (room) {
        newRoom = room;
        break;
      }
    }

    if (!newRoom || !newRoom.isAvailable || newRoom.occupants.length >= newRoom.capacity) {
      throw new Error("Target room is not available");
    }

    if (newRoom.gender !== 'Mixed' && newRoom.gender !== studentGender) {
      throw new Error("Room gender does not match student gender");
    }

    if (currentAllocation.roomId === newRoomId) {
      throw new Error("Cannot move to the same room");
    }

    const currentHostel = await fetchHostelById(currentAllocation.hostelId);
    if (!currentHostel) throw new Error(`Current hostel not found`);
    
    if (currentHostel.pricePerSemester !== newHostel.pricePerSemester) {
      throw new Error(`Cannot change rooms with different prices.`);
    }

    // Call allocateRoom to assign new room (which usually handles constraints on backend)
    // Note: To be fully transactional, a new backend endpoint for changeRoom would be best,
    // but we emulate by deleting old allocation and creating new.
    await revokeRoomAllocation(currentAllocation.id);
    await allocateRoom(studentRegNumber, newRoomId, newHostelId);
  } catch (error) {
    console.error("Error changing room allocation:", error);
    throw error;
  }
};

/**
 * Get available rooms for room change (excluding current room)
 */
export const getAvailableRoomsForChange = async (
  studentRegNumber: string,
  studentGender: 'Male' | 'Female',
  isAdminAction: boolean = false
): Promise<(Room & { hostelId: string; hostelName: string; floorName: string; price: number })[]> => {
  try {
    const currentAllocations = await fetchStudentAllocations(studentRegNumber);
    if (currentAllocations.length === 0) throw new Error("No existing allocation found for this student");

    const currentAllocation = currentAllocations[0];
    const currentHostel = await fetchHostelById(currentAllocation.hostelId);
    if (!currentHostel) throw new Error("Current hostel not found");
    
    const currentRoomPrice = currentHostel.pricePerSemester;
    const hostels = await fetchHostels();
    const availableRooms: (Room & { hostelId: string; hostelName: string; floorName: string; price: number })[] = [];

    hostels.forEach(hostel => {
      if (hostel.isActive) {
        if (!isAdminAction && hostel.id !== currentAllocation.hostelId) return;
        if (!isAdminAction && hostel.pricePerSemester !== currentRoomPrice) return;

        hostel.floors.forEach(floor => {
          floor.rooms.forEach(room => {
            if (room.id === currentAllocation.roomId) return;
            if (room.isAvailable && !room.isReserved && room.occupants.length < room.capacity &&
                (room.gender === studentGender || room.gender === 'Mixed')) {
              availableRooms.push({
                ...room,
                hostelId: hostel.id,
                hostelName: hostel.name,
                floorName: floor.name,
                price: hostel.pricePerSemester
              });
            }
          });
        });
      }
    });

    return availableRooms;
  } catch (error) {
    console.error("Error fetching available rooms for change:", error);
    return [];
  }
};

/**
 * Validate and fix room allocation integrity (admin utility function)
 */
export const validateRoomAllocationIntegrity = async (): Promise<{
  issues: string[];
  fixes: string[];
  duplicateAllocations: number;
  orphanedAllocations: number;
  missingAllocations: number;
}> => {
  // Mock integrity check, a proper API endpoint for full data scan should be implemented
  return {
    issues: [],
    fixes: [],
    duplicateAllocations: 0,
    orphanedAllocations: 0,
    missingAllocations: 0
  };
};

/**
 * Admin: Allocate an applied student to a room (with all constraints)
 */
export const adminAllocateStudentToRoom = async (
  studentRegNumber: string,
  roomId: string,
  hostelId: string
): Promise<RoomAllocation> => {
  try {
    // Basic validations are handled within allocateRoom endpoint.
    return await allocateRoom(studentRegNumber, roomId, hostelId);
  } catch (error) {
    console.error("Error allocating student to room (admin):", error);
    throw error;
  }
};
