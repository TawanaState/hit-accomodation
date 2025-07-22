"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from "@/components/ui/select";
import { Table, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import * as XLSX from "xlsx";
import { fetchAllStudentsFromFirebase, StudentData } from "@/data/firebase-student-data";
import { fetchHostels } from "@/data/hostel-data";
import { fetchAllPayments } from "@/data/payment-data";
import { Hostel, Room, Payment } from "@/types/hostel";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { addDays, format as formatDate, parseISO } from "date-fns";
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';

interface RoomAllocation {
  id: string;
  studentRegNumber: string;
  roomId: string;
  hostelId: string;
  allocatedAt: string;
  paymentStatus: "Pending" | "Paid" | "Overdue";
  paymentDeadline: string;
  semester: string;
  academicYear: string;
  paymentId?: string;
}

type ReportRow = {
  name: string;
  regNo: string;
  phone: string;
  programme: string;
  roomNumber: string;
  floor: string;
  hostel: string;
  paymentStatus: string;
  checkinDate: string;
  signature: string;
};

// Utility to convert array of objects to worksheet with uppercase headers
function jsonToSheetWithCaps(data: any[]) {
  if (data.length === 0) return XLSX.utils.json_to_sheet([]);
  const uppercased = data.map(row => {
    const newRow: { [key: string]: any } = {};
    Object.keys(row).forEach(k => {
      newRow[k.toUpperCase()] = row[k];
    });
    return newRow;
  });
  return XLSX.utils.json_to_sheet(uppercased);
}

const ReportsPage = () => {
  const { user, loading: authLoading, role } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [allocations, setAllocations] = useState<RoomAllocation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<string>("All");
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  // State for canteen check-in report
  const [canteenStartDate, setCanteenStartDate] = useState<string>("");
  const [canteenEndDate, setCanteenEndDate] = useState<string>("");
  const [canteenLoading, setCanteenLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (role !== 'admin') {
        router.push('/unauthorized');
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, authLoading, role, router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [hostelsData, studentsData, paymentsData] = await Promise.all([
        fetchHostels(),
        fetchAllStudentsFromFirebase(),
        fetchAllPayments(),
      ]);
      setHostels(hostelsData);
      setStudents(studentsData);
      setPayments(paymentsData);

      // Fetch all allocations from Firestore
      const allocationsSnap = await getDocs(collection(db, "roomAllocations"));
      const allocationsDataState = allocationsSnap.docs.map(doc => Object.assign({}, doc.data(), { id: doc.id })) as RoomAllocation[];
      setAllocations(allocationsDataState);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Helper to abbreviate programme
  function abbreviateProgramme(programme: string): string {
    if (!programme) return "";
    return programme
      .replace(/^(BTECH|BSC|BENG|BBA|MSC|MBA|DIPLOMA|HONOURS|POSTGRADUATE|UNDERGRADUATE|CERTIFICATE|ADVANCED|\s)+/gi, "")
      .split(/\s+|_+/)
      .filter(Boolean)
      .map(word => word[0])
      .join("")
      .toUpperCase();
  }

  useEffect(() => {
    if (!loading) {
      // Join data for report
      const rows: ReportRow[] = allocations
        .filter(a => selectedHostel === "All" || a.hostelId === selectedHostel)
        .map(a => {
          const student = students.find(s => s.regNumber === a.studentRegNumber);
          const hostel = hostels.find(h => h.id === a.hostelId);
          let roomNumber = "";
          let floorName = "";
          let floorNumber = "";
          if (hostel) {
            for (const floor of hostel.floors) {
              const room = floor.rooms.find(r => r.id === a.roomId);
              if (room) {
                roomNumber = room.number;
                floorName = floor.name;
                floorNumber = floor.number;
                break;
              }
            }
          }
          // Only show approved payment if multiple payments exist for this allocation
          let paymentStatus: string = a.paymentStatus;
          const approvedPayment = payments.find(p => p.allocationId === a.id && p.status === 'Approved');
          if (approvedPayment) {
            paymentStatus = approvedPayment.status;
          }
          return {
            name: student ? `${student.name} ${student.surname}` : a.studentRegNumber,
            regNo: a.studentRegNumber,
            phone: student?.phone || "",
            programme: abbreviateProgramme(student?.programme || ""),
            roomNumber,
            floor: floorName || floorNumber,
            hostel: hostel?.name || a.hostelId,
            paymentStatus,
            checkinDate: "", // Leave blank
            signature: "",
          };
        })
        .sort((a, b) => {
          if (a.hostel !== b.hostel) return a.hostel.localeCompare(b.hostel);
          const floorA = parseInt(a.floor.match(/\d+/)?.[0] || a.floor) || 0;
          const floorB = parseInt(b.floor.match(/\d+/)?.[0] || b.floor) || 0;
          if (floorA !== floorB) return floorA - floorB;
          const roomA = parseInt(a.roomNumber.match(/\d+/)?.[0] || a.roomNumber) || 0;
          const roomB = parseInt(b.roomNumber.match(/\d+/)?.[0] || b.roomNumber) || 0;
          if (roomA !== roomB) return roomA - roomB;
          return a.roomNumber.localeCompare(b.roomNumber);
        });
      setReportRows(rows);
    }
  }, [loading, allocations, students, hostels, payments, selectedHostel]);

  // Export logic for Check-in Report
  const handleExportCheckinReport = async () => {
    setLoading(true);
    // Fetch latest data
    const [hostelsData, studentsData, paymentsData] = await Promise.all([
      fetchHostels(),
      fetchAllStudentsFromFirebase(),
      fetchAllPayments(),
    ]);
    const allocationsSnapCheckin = await getDocs(collection(db, "roomAllocations"));
    const allocationsDataCheckin = allocationsSnapCheckin.docs.map(doc => Object.assign({}, doc.data(), { id: doc.id })) as RoomAllocation[];
    // Join and filter data
    const rows = allocationsDataCheckin
      .filter(a => selectedHostel === "All" || a.hostelId === selectedHostel)
      .map(a => {
        const student = studentsData.find(s => s.regNumber === a.studentRegNumber);
        const hostel = hostelsData.find(h => h.id === a.hostelId);
        let roomNumber = "";
        let floorName = "";
        let floorNumber = "";
        if (hostel) {
          for (const floor of hostel.floors) {
            const room = floor.rooms.find(r => r.id === a.roomId);
            if (room) {
              roomNumber = room.number;
              floorName = floor.name;
              floorNumber = floor.number;
              break;
            }
          }
        }
        // Only show approved payment if multiple payments exist for this allocation
        let paymentStatus: string = a.paymentStatus;
        const approvedPayment = paymentsData.find(p => p.allocationId === a.id && p.status === 'Approved');
        if (approvedPayment) {
          paymentStatus = approvedPayment.status;
        }
        return {
          name: student ? `${student.name} ${student.surname}` : a.studentRegNumber,
          registration_number: a.studentRegNumber,
          gender: student?.gender || "",
          part: student?.part || "",
          hostel_name: hostel?.name || a.hostelId,
          room_number: roomNumber,
          floor: floorName || floorNumber,
          payment_status: paymentStatus,
          programme: abbreviateProgramme(student?.programme || ""),
          checkin_date: "", // Still blank unless specified
          signature: ""
        };
      })
      .sort((a, b) => {
        if (a.hostel_name !== b.hostel_name) return a.hostel_name.localeCompare(b.hostel_name);
        const floorA = parseInt((a.floor.match(/\d+/)?.[0] || a.floor) as string) || 0;
        const floorB = parseInt((b.floor.match(/\d+/)?.[0] || b.floor) as string) || 0;
        if (floorA !== floorB) return floorA - floorB;
        const roomA = parseInt((a.room_number.match(/\d+/)?.[0] || a.room_number) as string) || 0;
        const roomB = parseInt((b.room_number.match(/\d+/)?.[0] || b.room_number) as string) || 0;
        if (roomA !== roomB) return roomA - roomB;
        return a.room_number.localeCompare(b.room_number);
      });
    const ws = jsonToSheetWithCaps(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Check-in Report");
    XLSX.writeFile(wb, "checkin_report.xlsx");
    setLoading(false);
  };

  // Export logic for Accepted Students
  const handleExportAcceptedStudents = async () => {
    setLoading(true);
    // Fetch latest data
    const [hostelsData, studentsData, paymentsData] = await Promise.all([
      fetchHostels(),
      fetchAllStudentsFromFirebase(),
      fetchAllPayments(),
    ]);
    const allocationsSnapAccepted = await getDocs(collection(db, "roomAllocations"));
    const allocationsDataAccepted = allocationsSnapAccepted.docs.map(doc => Object.assign({}, doc.data(), { id: doc.id })) as RoomAllocation[];
    // Join and filter data
    const rows = allocationsDataAccepted
      .filter(a => selectedHostel === "All" || a.hostelId === selectedHostel)
      .map(a => {
        const student = studentsData.find(s => s.regNumber === a.studentRegNumber);
        const hostel = hostelsData.find(h => h.id === a.hostelId);
        let roomNumber = "";
        let floorName = "";
        let floorNumber = "";
        if (hostel) {
          for (const floor of hostel.floors) {
            const room = floor.rooms.find(r => r.id === a.roomId);
            if (room) {
              roomNumber = room.number;
              floorName = floor.name;
              floorNumber = floor.number;
              break;
            }
          }
        }
        // Only show approved payment if multiple payments exist for this allocation
        let paymentStatus: string = a.paymentStatus;
        const approvedPayment = paymentsData.find(p => p.allocationId === a.id && p.status === 'Approved');
        if (approvedPayment) {
          paymentStatus = approvedPayment.status;
        }
        return {
          name: student ? `${student.name} ${student.surname}` : a.studentRegNumber,
          registration_number: a.studentRegNumber,
          gender: student?.gender || "",
          part: student?.part || "",
          hostel_name: hostel?.name || a.hostelId,
          room_number: roomNumber,
          floor: floorName || floorNumber,
          payment_status: paymentStatus,
          programme: abbreviateProgramme(student?.programme || ""),
          signature: ""
        };
      })
      .sort((a, b) => {
        if (a.hostel_name !== b.hostel_name) return a.hostel_name.localeCompare(b.hostel_name);
        const floorA = parseInt((a.floor.match(/\d+/)?.[0] || a.floor) as string) || 0;
        const floorB = parseInt((b.floor.match(/\d+/)?.[0] || b.floor) as string) || 0;
        if (floorA !== floorB) return floorA - floorB;
        const roomA = parseInt((a.room_number.match(/\d+/)?.[0] || a.room_number) as string) || 0;
        const roomB = parseInt((b.room_number.match(/\d+/)?.[0] || b.room_number) as string) || 0;
        if (roomA !== roomB) return roomA - roomB;
        return a.room_number.localeCompare(b.room_number);
      });
    const ws = jsonToSheetWithCaps(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Accepted Students");
    XLSX.writeFile(wb, "accepted_students.xlsx");
    setLoading(false);
  };

  // Export logic for Payments
  const handleExportPayments = async () => {
    setLoading(true);
    const [hostelsData, paymentsData] = await Promise.all([
      fetchHostels(),
      fetchAllPayments(),
    ]);
    const allocationsSnapPayments = await getDocs(collection(db, "roomAllocations"));
    const allocationsDataPayments = allocationsSnapPayments.docs.map(doc => Object.assign({}, doc.data(), { id: doc.id })) as RoomAllocation[];
    // Filter payments by selected hostel
    const filteredPayments = paymentsData.filter(p => {
      if (selectedHostel === "All") return true;
      const alloc = allocationsDataPayments.find(a => a.id === p.allocationId);
      return alloc && alloc.hostelId === selectedHostel;
    });
    const data = filteredPayments.map(payment => {
      const alloc = allocationsDataPayments.find(a => a.id === payment.allocationId);
      let hostelName = '';
      let roomNumber = '';
      if (alloc) {
        const hostel = hostelsData.find(h => h.id === alloc.hostelId);
        hostelName = hostel?.name || '';
        for (const floor of hostel?.floors || []) {
          const room = floor.rooms.find(r => r.id === alloc.roomId);
          if (room) {
            roomNumber = room.number;
            break;
          }
        }
      }
      return {
        student_reg_number: payment.studentRegNumber,
        receipt_number: payment.receiptNumber,
        amount: payment.amount,
        status: payment.status,
        payment_method: payment.paymentMethod,
        submission_date: payment.submittedAt ? new Date(payment.submittedAt).toLocaleDateString() : '',
        approval_date: payment.approvedAt ? new Date(payment.approvedAt).toLocaleDateString() : '',
        approved_by: payment.approvedBy || '',
        hostel: hostelName,
        room_number: roomNumber,
        notes: payment.notes || ''
      };
    });
    const ws = jsonToSheetWithCaps(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, "payments_export.xlsx");
    setLoading(false);
  };

  // Export logic for Hostel Allocations
  const handleExportHostelAllocations = async () => {
    setLoading(true);
    const hostelsData = await fetchHostels();
    // Filter hostels by selected hostel
    const filteredHostels = selectedHostel === "All" ? hostelsData : hostelsData.filter(h => h.id === selectedHostel);
    const data: any[] = [];
    filteredHostels.forEach(hostel => {
      hostel.floors.forEach(floor => {
        floor.rooms.forEach(room => {
          if (room.occupants.length === 0) {
            data.push({
              hostel_name: hostel.name,
              floor_name: floor.name,
              room_number: room.number,
              room_capacity: room.capacity,
              room_gender: room.gender,
              occupant_registration_number: '',
              is_reserved: room.isReserved ? 'Yes' : 'No',
              reserved_by: room.reservedBy || '',
              reserved_until: room.reservedUntil || ''
            });
          } else {
            room.occupants.forEach(occ => {
              data.push({
                hostel_name: hostel.name,
                floor_name: floor.name,
                room_number: room.number,
                room_capacity: room.capacity,
                room_gender: room.gender,
                occupant_registration_number: occ,
                is_reserved: room.isReserved ? 'Yes' : 'No',
                reserved_by: room.reservedBy || '',
                reserved_until: room.reservedUntil || ''
              });
            });
          }
        });
      });
    });
    const ws = jsonToSheetWithCaps(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hostel Allocations");
    XLSX.writeFile(wb, "hostel_allocations.xlsx");
    setLoading(false);
  };

  // Helper to get hostel name for file naming
  function getHostelNameForFile() {
    if (selectedHostel === "All") return "All_Hostels";
    const h = hostels.find(h => h.id === selectedHostel);
    return h ? h.name.replace(/\s+/g, "_") : selectedHostel;
  }

  // Export logic for Canteen Check-in
  const handleExportCanteenCheckin = async () => {
    setCanteenLoading(true);
    // Fetch latest data
    const [hostelsData, studentsData] = await Promise.all([
      fetchHostels(),
      fetchAllStudentsFromFirebase(),
    ]);
    // Filter by hostel if needed
    let filteredHostels = hostelsData;
    if (selectedHostel !== "All") {
      filteredHostels = hostelsData.filter(h => h.id === selectedHostel);
    }
    // Get all students who are allocated to the selected hostel(s)
    const allocationsSnapCanteen = await getDocs(collection(db, "roomAllocations"));
    const allocationsDataCanteen = allocationsSnapCanteen.docs.map(doc => Object.assign({}, doc.data(), { id: doc.id })) as RoomAllocation[];
    const allowedHostelIds = filteredHostels.map(h => h.id);
    const filteredAllocations = allocationsDataCanteen.filter(a => allowedHostelIds.includes(a.hostelId));
    // Map reg numbers to allocations
    const regNumbers = filteredAllocations.map(a => a.studentRegNumber);
    const filteredStudents = studentsData.filter(s => regNumbers.includes(s.regNumber));

    // Generate date columns based on selected range
    let dateColumns: string[] = [];
    if (canteenStartDate && canteenEndDate) {
      const start = parseISO(canteenStartDate);
      const end = parseISO(canteenEndDate);
      let current = start;
      while (current <= end) {
        dateColumns.push(formatDate(current, "d-MMM"));
        current = addDays(current, 1);
      }
    } else {
      // Default: today + next 4 days
      let current = new Date();
      for (let i = 0; i < 5; i++) {
        dateColumns.push(formatDate(current, "d-MMM"));
        current = addDays(current, 1);
      }
    }

    // Compose rows
    const rows = filteredStudents.map(student => {
      const allocation = filteredAllocations.find(a => a.studentRegNumber === student.regNumber);
      const hostel = hostelsData.find(h => h.id === allocation?.hostelId);
      let roomNumber = "";
      if (allocation && hostel) {
        for (const floor of hostel.floors) {
          const room = floor.rooms.find(r => r.id === allocation.roomId);
          if (room) {
            roomNumber = room.number;
            break;
          }
        }
      }
      const base: { [key: string]: string } = {
        fullname: `${student.name} ${student.surname}`,
        regnumber: student.regNumber,
        programme: abbreviateProgramme(student.programme),
        hostel: hostel?.name || "",
        roomnumber: roomNumber,
      };
      // Add date columns, all blank
      dateColumns.forEach(date => {
        base[date] = "";
      });
      return base;
    });

    // Compose file name
    let fileName = `canteen_checkin_${getHostelNameForFile()}`;
    if (canteenStartDate && canteenEndDate) {
      fileName += `_${canteenStartDate}_to_${canteenEndDate}`;
    }
    fileName += ".xlsx";
    // Export
    const ws = jsonToSheetWithCaps(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Canteen Check-in");
    XLSX.writeFile(wb, fileName);
    setCanteenLoading(false);
  };

  if (authLoading || !isAuthorized) {
    return <LoadingSpinner />;
  }
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">System Reports</h1>
      <div className="flex items-center gap-4 mb-4">
        <Select value={selectedHostel} onValueChange={setSelectedHostel}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Hostel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Hostels</SelectItem>
            {hostels.map(h => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Check-in Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600">Export a list of all students with their check-in details, room, hostel, payment status, and programme abbreviation.</p>
            <Button onClick={handleExportCheckinReport} disabled={loading}>
              Export Check-in Report to Excel
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Accepted Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600">Export a list of all accepted students with their details, room, hostel, payment status, programme abbreviation, and signature.</p>
            <Button onClick={handleExportAcceptedStudents} disabled={loading}>
              Export Accepted Students to Excel
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600">Export all payment records, including status, method, dates, and related hostel/room info.</p>
            <Button onClick={handleExportPayments} disabled={loading}>
              Export Payments to Excel
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Hostel Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600">Export all hostel allocations, including room, floor, capacity, gender, and occupant details.</p>
            <Button onClick={handleExportHostelAllocations} disabled={loading}>
              Export Hostel Allocations to Excel
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Canteen Check-in</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600">Export a canteen check-in sheet for students, with tick columns for attendance. You can filter by hostel and select a date range for the report. The exported file name will include the hostel and date range.</p>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input type="date" value={canteenStartDate} onChange={e => setCanteenStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input type="date" value={canteenEndDate} onChange={e => setCanteenEndDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleExportCanteenCheckin} disabled={canteenLoading}>
              Export Canteen Check-in to Excel
            </Button>
          </CardContent>
        </Card>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : null}
    </div>
  );
};

export default ReportsPage; 