// Keep the original interface for compatibility
export interface StudentData {
  regNumber: string;
  name: string;
  surname: string;
  gender: "Male" | "Female";
  programme: string;
  part: "1" | "2" | "3" | "4" | "5";
  phone?: string;
  email?: string;
  // Additional fields for legacy data version
  createdAt?: string;
  updatedAt?: string;
  migrationSource?: string;
  migrationDate?: string;
}

// Cache for performance
let studentCache: StudentData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Helper to get the base URL for API calls.
 */
const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  return "http://localhost:3000";
};

/**
 * Fetch all students from Next.js API
 */
export const fetchAllStudentsFromAPI = async (): Promise<StudentData[]> => {
  try {
    const now = Date.now();
    
    // Return cached data if still valid
    if (studentCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return studentCache;
    }

    console.log('Fetching students from API...');
    const res = await fetch(`${getBaseUrl()}/api/students`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch students: ${res.statusText}`);
    }

    const students = await res.json() as StudentData[];
    
    // Update cache
    studentCache = students;
    cacheTimestamp = now;
    console.log(`Loaded ${students.length} students from API`);
    return students;
  } catch (error) {
    console.error("Error fetching students from API:", error);
    throw new Error("Failed to fetch students. Please ensure the backend is running.");
  }
};

/**
 * Find a student by registration number
 */
export const findStudentByRegNumber = async (regNumber: string): Promise<StudentData | undefined> => {
  try {
    // First try to get from cache
    if (studentCache) {
      const cachedStudent = studentCache.find(student => student.regNumber === regNumber);
      if (cachedStudent) {
        return cachedStudent;
      }
    }

    // If not in cache, fetch directly from API
    const res = await fetch(`${getBaseUrl()}/api/students/${regNumber}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 404) return undefined;
      throw new Error(`Failed to find student ${regNumber}`);
    }

    const studentData = await res.json() as StudentData;

    // Update cache with this student
    if (studentCache) {
      studentCache.push(studentData);
    }
    
    return studentData;
  } catch (error) {
    console.error("Error finding student by registration number:", error);
    throw new Error(`Failed to find student ${regNumber}.`);
  }
};

/**
 * Get students by programme
 */
export const getStudentsByProgramme = async (programme: string): Promise<StudentData[]> => {
  try {
    const students = await fetchAllStudentsFromAPI();
    return students.filter(student => student.programme === programme);
  } catch (error) {
    console.error("Error fetching students by programme:", error);
    throw new Error("Failed to fetch students by programme.");
  }
};

/**
 * Get students by gender
 */
export const getStudentsByGender = async (gender: "Male" | "Female"): Promise<StudentData[]> => {
  try {
    const students = await fetchAllStudentsFromAPI();
    return students.filter(student => student.gender === gender);
  } catch (error) {
    console.error("Error fetching students by gender:", error);
    throw new Error("Failed to fetch students by gender.");
  }
};

/**
 * Get students by part
 */
export const getStudentsByPart = async (part: "1" | "2" | "3" | "4" | "5"): Promise<StudentData[]> => {
  try {
    const students = await fetchAllStudentsFromAPI();
    return students.filter(student => student.part === part);
  } catch (error) {
    console.error("Error fetching students by part:", error);
    throw new Error("Failed to fetch students by part.");
  }
};

/**
 * Get student statistics
 */
export const getStudentStats = async () => {
  try {
    const students = await fetchAllStudentsFromAPI();
    const total = students.length;
    const maleCount = students.filter(s => s.gender === "Male").length;
    const femaleCount = students.filter(s => s.gender === "Female").length;
    
    const programmeCounts = students.reduce((acc, student) => {
      acc[student.programme] = (acc[student.programme] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      maleCount,
      femaleCount,
      programmeCounts
    };
  } catch (error) {
    console.error("Error calculating student statistics:", error);
    throw new Error("Failed to calculate student statistics.");
  }
};

/**
 * Search students by name or registration number
 */
export const searchStudents = async (searchTerm: string): Promise<StudentData[]> => {
  try {
    const students = await fetchAllStudentsFromAPI();
    const term = searchTerm.toLowerCase();
    
    return students.filter(student => 
      student.regNumber.toLowerCase().includes(term) ||
      student.name.toLowerCase().includes(term) ||
      student.surname.toLowerCase().includes(term) ||
      `${student.name} ${student.surname}`.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error("Error searching students:", error);
    throw new Error("Failed to search students.");
  }
};

/**
 * Verify if a student exists
 */
export const verifyStudentExists = async (regNumber: string): Promise<boolean> => {
  try {
    const student = await findStudentByRegNumber(regNumber);
    return !!student;
  } catch (error) {
    console.error("Error verifying student existence:", error);
    return false;
  }
};

/**
 * Clear the student cache (useful for admin operations)
 */
export const clearStudentCache = (): void => {
  studentCache = null;
  cacheTimestamp = 0;
  console.log("Student cache cleared");
};

/**
 * Preload student data into cache
 */
export const preloadStudentData = async (): Promise<void> => {
  try {
    await fetchAllStudentsFromAPI();
    console.log("Student data preloaded into cache");
  } catch (error) {
    console.error("Error preloading student data:", error);
  }
};
