import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

// ✅ Initialize Supabase client
const supabase = createClient(environment.PROJECT_URL, environment.API_KEY);
 
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  logged_in = false;
  private teacher: any;
  private student: any;
  private admin: any = null;
 // ✅ Holds logged-in student details

  constructor() {}

  // ✅ Fetch all students
  async getStudents() {
    const { data, error } = await supabase.from('students').select('*'); // ✅ Fixed
    if (error) {
      console.error('❌ Error fetching students:', error);
      return null;
    }
    return data;
  }

  // ✅ Fetch students taught by a teacher
  async getStudentsByTeacher() {
    if (!this.teacher) {
      console.warn('⚠️ No teacher logged in.');
      return null;
    }

    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('year_id')
      .eq('teacher_id', this.teacher.id); // ✅ Fixed

    if (subjectsError || !subjects.length) {
      console.error('❌ Error fetching subjects:', subjectsError);
      return [];
    }

    const yearIds = subjects.map((s) => s.year_id);

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id, name, email, usn_number,
        sections (
          id, section_name, 
          year_table (
            _year, 
            course ( name )
          )
        )
      `)
      .in('sections.year_table.id', yearIds); // ✅ Fixed

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      return null;
    }

    return students;
  }

  async getStudentAttendanceRecords(studentId: number) {
    try {
        const { data, error } = await supabase
            .from('attendance_summary')
            .select(`
                subject_id, 
                attended_classes, 
                total_classes,
                subjects ( name ),
                attendance_log:attendance_log!inner ( status, date )
            `)
            .eq('student_id', studentId)
            .order('subject_id' , { ascending: true })
            .order('date', { referencedTable: 'attendance_log', ascending: false });

        if (error) {
            console.error('❌ Error fetching student attendance records:', error);
            return [];
        }

        if (!data || data.length === 0) {
            console.warn('⚠ No attendance records found for student:', studentId);
            return [];
        }

        console.log('✅ Attendance records fetched:', data);
        return data;
    } catch (error) {
        console.error('❌ Error fetching student attendance records:', error);
        return [];
    }
}



  async getAttendanceRecords(subjectId: number) {
  const { data, error } = await supabase
    .from('attendance_summary')
    .select('student_id, total_classes, attended_classes')
    .eq('subject_id', subjectId);

  if (error) {
    console.error('❌ Error fetching attendance records:', error);
    return [];
  }

  return data; // Returns attendance summary for all students in the subject
}


  // ✅ Mark attendance for students
  async markAttendance(subjectId: number, date: string, attendanceData: { student_id: number; status: boolean }[]) {
    try {
      const attendanceRecords = attendanceData.map(({ student_id, status }) => ({
        student_id,
        subject_id: subjectId,
        date: date,  // ✅ Use passed date instead of today's date
        status
      }));
  
      const { data, error } = await supabase.from('attendance_log').insert(attendanceRecords);
  
      if (error) {
        console.error('❌ Error inserting attendance:', error);
        return { success: false, message: 'Failed to mark attendance' };
      }
  
      await this.updateAttendanceSummary(attendanceRecords);
      return { success: true, message: 'Attendance marked successfully' };
    } catch (err) {
      console.error('❌ Unexpected error marking attendance:', err);
      return { success: false, message: 'Unexpected error' };
    }
  }
  

// ✅ Update attendance summary for each student
private async updateAttendanceSummary(attendanceRecords: { student_id: number; subject_id: number; status: boolean }[]) {
  try {
    for (const record of attendanceRecords) {
      // Fetch existing summary
      const { data: summary, error } = await supabase
        .from('attendance_summary')
        .select('id, total_classes, attended_classes')
        .eq('student_id', record.student_id)
        .eq('subject_id', record.subject_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching attendance summary:', error);
        continue;
      }

      if (summary) {
        // ✅ Update existing record
        const { error: updateError } = await supabase
          .from('attendance_summary')
          .update({
            total_classes: summary.total_classes + 1,
            attended_classes: summary.attended_classes + (record.status ? 1 : 0)
          })
          .eq('id', summary.id);

        if (updateError) console.error('❌ Error updating attendance summary:', updateError);
      } else {
        // ✅ Insert new record if not found
        const { error: insertError } = await supabase
          .from('attendance_summary')
          .insert({
            student_id: record.student_id,
            subject_id: record.subject_id,
            total_classes: 1,
            attended_classes: record.status ? 1 : 0
          });

        if (insertError) console.error('❌ Error inserting attendance summary:', insertError);
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error updating attendance summary:', err);
  }
}

async getMarksRecords(subjectId: number) {
  try {
    const { data, error } = await supabase
      .from('marks_summary')
      .select('student_id, ia1_marks, ia2_marks, total_ia')
      .eq('subject_id', subjectId);

    if (error) {
      console.error('❌ Error fetching marks records:', error);
      return [];
    }

    return data || []; // Return an empty array if no records exist
  } catch (err) {
    console.error('❌ Unexpected error fetching marks:', err);
    return [];
  }
}

async submitMarks(subjectId: number, marksData: { student_id: number; ia1_marks?: number; ia2_marks?: number; total_ia?: number }[]) {
  try {
    // Iterate over each student's marks and insert or update
    for (const mark of marksData) {
      const { data: existingMark, error } = await supabase
        .from('marks_summary')
        .select('id')
        .eq('student_id', mark.student_id)
        .eq('subject_id', subjectId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking existing marks:', error);
        continue;
      }

      if (existingMark) {
        // ✅ Update existing record
        const { error: updateError } = await supabase
          .from('marks_summary')
          .update({
            ia1_marks: mark.ia1_marks,
            ia2_marks: mark.ia2_marks,
            total_ia: mark.total_ia
          })
          .eq('id', existingMark.id);

        if (updateError) console.error('❌ Error updating marks:', updateError);
      } else {
        // ✅ Insert new record if not found
        const { error: insertError } = await supabase
          .from('marks_summary')
          .insert({
            student_id: mark.student_id,
            subject_id: subjectId,
            ia1_marks: mark.ia1_marks,
            ia2_marks: mark.ia2_marks,
            total_ia: mark.total_ia
          });

        if (insertError) console.error('❌ Error inserting marks:', insertError);
      }
    }

    return { success: true, message: 'Marks submitted successfully' };
  } catch (err) {
    console.error('❌ Unexpected error submitting marks:', err);
    return { success: false, message: 'Unexpected error' };
  }
}

  // ✅ Fetch complete student details (for dashboard)
  async getStudentDetails() {
    if (!this.student) {
      console.warn('⚠️ No student logged in.');
      return null;
    }

    const { data, error } = await supabase
  .from('subjects')
  .select(`
    id, name, _year, year_id,
    year_table!inner (
      id,
      course_id,
      sections!inner (
        id, section_name
      )
    )
  `)
  .eq('teacher_id', this.teacher.id);


    if (error) {
      console.error('❌ Error fetching student details:', error);
      return null;
    }

    return data;
  }

  // ✅ Login function (Fixed `this.supabase`)
  async login(email: string, password: string) {
    try {
      let query;
      let userType: 'students' | 'teachers' | 'admin' | null = null;
  
      // 🔍 Check if the user is an admin
      query = supabase.from('admin').select('id, name, email').eq('email', email).eq('password', password);
      let { data, error } = await query.single();
  
      if (data) {
        userType = 'admin';
      } else {
        // 🔍 Check if the user is a teacher
        query = supabase.from('teachers').select('id, name, email, subjects (id, name, year_id)').eq('email', email).eq('password', password);
        ({ data, error } = await query.single());
  
        if (data) {
          userType = 'teachers';
        } else {
          // 🔍 Check if the user is a student
          query = supabase.from('students').select(`
            id, name, email, usn_number, section_id, 
            sections (section_name, year_table (_year, course ( name ), subjects ( id, name )))
          `).eq('email', email).eq('password', password);
          ({ data, error } = await query.single());
  
          if (data) {
            userType = 'students';
          }
        }
      }
  
      if (!userType) {
        console.error("🔴 No matching user found");
        return { success: false, message: "Invalid email or password" };
      }
  
      // ✅ Store logged-in user
      if (userType === 'teachers') {
        this.teacher = data;
      } else if (userType === 'students') {
        this.student = data;
      } else if (userType === 'admin') {
        this.admin = data;
      }

  
      return { success: true, data, userType };
    } catch (err) {
      console.error("❌ API Error:", err);
      return { success: false, message: "Unexpected error. Please try again." };
    }
  }
  
  

   // ✅ Get logged-in student
   getLoggedInStudent() {
    return this.student || null;
  }

  // ✅ Logout function
  async logout() {
    console.log('🔴 Logging out...');
    this.logged_in = false;
    this.teacher = null;
    this.student = null;

    const { error } = await supabase.auth.signOut(); // ✅ Fixed
    if (error) console.error('❌ Supabase logout error:', error);

    localStorage.clear();
  }

  // ✅ Fetch single section by ID
  async getSectionById(sectionId: number) {
    return this.fetchSingleRecord('sections', sectionId);
  }

  // ✅ Fetch single year by ID
  async getYearById(yearId: number) {
    return this.fetchSingleRecord('year_table', yearId);
  }

 
  // 🔹 Reusable function for fetching a single record by ID
  private async fetchSingleRecord(table: string, id: number) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single(); // ✅ Fixed
    if (error) {
      console.error(`❌ Error fetching from ${table}:`, error);
      return null;
    }
    return data;
  }

  // ✅ Fetch subjects taught by the logged-in teacher
async getSubjectsByTeacher() {
  if (!this.teacher) {
    console.warn("⚠️ No teacher logged in.");
    return [];
  }

  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('teacher_id', this.teacher.id);

  if (error) {
    console.error('❌ Error fetching subjects:', error);
    return [];
  }

  return data;
}

// ✅ Fetch students by selected subject
async getStudentsBySubject(subjectId: number) {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id, name, email, usn_number,
      sections (
        id, section_name, 
        year_table (
          _year, 
          course ( name )
        )
      )
    `)
    .eq('sections.year_table.id', subjectId);

  if (error) {
    console.error('❌ Error fetching students for subject:', error);
    return [];
  }

  return data;
}



  // ✅ Fetch courses taught by a teacher
  async getTeacherCourses(teacherId: number) {
    try {
      // Fetch the distinct years (_year) associated with the teacher's subjects
      const { data: subjects, error: subjectError } = await supabase
        .from('subjects')
        .select('_year, year_id') // ✅ Fetching year_id explicitly
        .eq('teacher_id', teacherId);
  
      if (subjectError || !subjects.length) {
        console.error('❌ Error fetching teacher subjects:', subjectError);
        return [];
      }
  
      // Extract distinct year_ids from subjects
      const yearIds = [...new Set(subjects.map((s) => s.year_id))];
  
      if (yearIds.length === 0) {
        console.warn('⚠️ No year IDs found for the teacher');
        return [];
      }
  
      // Fetch the year entries that match the extracted year_ids
      const { data: years, error: yearError } = await supabase
        .from('year_table')
        .select('id, course_id') // ✅ Fetching only relevant fields
        .in('id', yearIds);
  
      if (yearError || !years.length) {
        console.error('❌ Error fetching years:', yearError);
        return [];
      }
  
      // Extract distinct course_ids linked to those years
      const courseIds = [...new Set(years.map((y) => y.course_id))];
  
      if (courseIds.length === 0) {
        console.warn('⚠️ No course IDs found for the selected years');
        return [];
      }
  
      // Fetch courses that match the extracted course_ids
      const { data: courses, error: courseError } = await supabase
        .from('course')
        .select('id, name') // ✅ Selecting only necessary fields
        .in('id', courseIds);
  
      if (courseError) {
        console.error('❌ Error fetching courses:', courseError);
        return [];
      }
  
      return courses;
    } catch (error) {
      console.error('❌ Unexpected error fetching teacher courses:', error);
      return [];
    }
  }
  

  // ✅ Fetch subjects taught by a teacher, grouped by year
  async getTeacherSubjectsByYear(teacherId: number) {
    try {
      const { data: subjects, error } = await supabase
        .from('subjects')
        .select('id, name, _year')
        .eq('teacher_id', teacherId); // ✅ Fixed

      if (error || !subjects.length) {
        console.error('❌ Error fetching teacher subjects:', error);
        return {};
      }

      // Group by year_id using Map
      return subjects.reduce((acc, sub) => {
        const yearId = sub._year;
        if (!yearId) return acc;
        acc[yearId] = acc[yearId] || [];
        acc[yearId].push(sub);
        return acc;
      }, {} as Record<number, any[]>);
      
    } catch (error) {
      console.error('❌ Unexpected error fetching subjects by year:', error);
      return {};
    }
  }

  // ✅ Get logged-in teacher
  getLoggedInTeacher() {
    if (!this.teacher) {
      console.warn("⚠️ No teacher logged in.");
      return null;
    }
    return this.teacher;
  }

  // ✅ Fetch all students
  async getAllStudents() {
    const { data, error } = await supabase.from('students').select(`
      id, name, email, usn_number, section_id,
      sections (section_name, year_table (_year, course ( name ), subjects ( id, name )))
    `);
    if (error) {
      console.error('❌ Error fetching all students:', error);
      return [];
    }
    return data;
  }

  // ✅ Fetch all teachers
  async getAllTeachers() {
    const { data, error } = await supabase.from('teachers').select(`
      id, name, email,
      subjects (id, name, year_id)
    `);
    if (error) {
      console.error('❌ Error fetching all teachers:', error);
      return [];
    }
    return data;
  }

  // ✅ Fetch all subjects
  async getAllSubjects() {
    const { data, error } = await supabase.from('subjects').select(`
      id, name, year_id,
      year_table (course (name))
    `);
    if (error) {
      console.error('❌ Error fetching all subjects:', error);
      return [];
    }
    return data;
  }
}
  
