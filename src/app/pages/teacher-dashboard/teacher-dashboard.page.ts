import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonItem, IonLabel, 
  IonSkeletonText, IonSegmentButton, IonBadge, IonSegment, IonChip, IonSearchbar, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonDatetime
} from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api.service';
import { NavController } from '@ionic/angular';
 
@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.page.html',
  styleUrls: ['./teacher-dashboard.page.scss'],
  standalone: true,
  imports: [IonButton, IonSearchbar, IonChip, IonSegment, IonBadge, IonSegmentButton, IonSkeletonText, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonGrid, IonRow, IonCol, IonCard, IonItem, IonLabel, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonDatetime]
})

export class TeacherDashboardPage implements OnInit {
  api = inject(ApiService);
  navCtrl = inject(NavController);

  students: any[] = [];
  filteredStudents: any[] = [];
  selectedYear: number = 1;
  searchTerm: string = '';
  sections: string[] = [];
  selectedSection: string = 'all';
  selectedSubject: number | null = null;
  teacher: any = null;
  courses: any[] = [];
  subjectsByYear: any = {};
  isSubmitting: boolean = false;
  currentDate: string = new Date().toLocaleDateString();
  maxDate: string = new Date().toISOString().split('T')[0]; // Restricts to today
  selectedDate: string = new Date().toISOString().split('T')[0]; // ✅ Default to today
  attendanceEntries: Record<string, 'Present' | 'Absent'> = {};
  attendanceRecords: Record<string, { attended: number; total: number }> = {};
  marksEntries: { [key: number]: number } = {};  // ✅ Ensure it's properly initialized
  marksRecords: Record<string, { ia1: number; ia2: number; total: number }> = {}; // Stores fetched marks
  selectedIA: string = "IA1"; // Default IA selection

  constructor() {}

  async ngOnInit() {
    console.log('🏠 Home Page Initialized');
    await this.loadAllData();
  }

  async loadAllData() {
    try {
        await this.getTeacherDetails();
        await this.getStudentsByTeacher();
        await this.loadTeacherData();

        if (this.selectedSubject) {
            await this.loadAttendance(this.selectedSubject);
            await this.loadMarks(this.selectedSubject); // ✅ Added this line
        }
    } catch (error) {
        console.error("❌ Error loading data:", error);
    }
}

  async loadMarks(subjectId: number) {
    console.log("🔄 Fetching marks for subject:", subjectId); // ✅ Debug log before API call
    try {
        const records = await this.api.getMarksRecords(subjectId);
        console.log("📊 Marks Data from API:", records); // ✅ Debug log after API call

        this.marksRecords = records.reduce((acc, record) => {
            acc[record.student_id] = {
                ia1: record.ia1_marks || 0,
                ia2: record.ia2_marks || 0,
                total: record.total_ia || 0
            };
            return acc;
        }, {} as Record<string, { ia1: number; ia2: number; total: number }>);

        console.log("✅ Processed Marks Data:", this.marksRecords); // ✅ Debugging log
    } catch (error) {
        console.error("❌ Error fetching marks records:", error);
    }
}


async submitMarks() {
  if (!this.selectedSubject) {
    alert("❌ Please select a subject before submitting marks.");
    return;
  }

  const marksData = this.students
  .filter(student => {
    const marks = Number(this.marksEntries[student.id]); // ✅ Convert to number
    return !isNaN(marks) && marks !== 0; // ✅ Check if valid number
  })
  .map(student => ({
    student_id: student.id,
    subject_id: this.selectedSubject,
    ia1_marks: this.selectedIA === "IA1" ? Number(this.marksEntries[student.id]) || undefined : undefined,
    ia2_marks: this.selectedIA === "IA2" ? Number(this.marksEntries[student.id]) || undefined : undefined,
    total_ia: this.selectedIA === "TotalIA" ? Number(this.marksEntries[student.id]) || undefined : undefined,
    date: new Date().toISOString().split('T')[0]
  }));



  if (marksData.length === 0) {
    alert("⚠ No marks entered.");
    return;
  }

  try {
    const result = await this.api.submitMarks(this.selectedSubject, marksData);
    alert(result.message || "✅ Marks submitted successfully.");
    await this.loadMarks(this.selectedSubject);
  } catch (error) {
    console.error("❌ Error submitting marks:", error);
    alert("⚠ Failed to submit marks.");
  }
}

  
  segmentChanged(event: any) {
    this.selectedYear = Number(event.detail.value);
    this.updateSelectedSubject();
    this.filterStudents();
  }

  updateSelectedSubject() {
    if (this.subjectsByYear[this.selectedYear]?.length) {
      this.selectedSubject = this.subjectsByYear[this.selectedYear][0].id;
    } else {
      this.selectedSubject = null;
    }
  }

  async fetchStudents(subjectId: number) {
    try {
      const students = await this.api.getStudentsBySubject(subjectId);
      console.log("📚 Students fetched for subject:", students);
      this.students = students || [];
      this.extractSections();
      this.filterStudents();
    } catch (error) {
      console.error("❌ Error fetching students:", error);
    }
  }
  
  async loadAttendance(subjectId: number) {
    try {
      const records = await this.api.getAttendanceRecords(subjectId);

      // ✅ Properly map attendance data
      this.attendanceRecords = records.reduce((acc, record) => {
        acc[record.student_id] = {
          attended: record.attended_classes,
          total: record.total_classes
        };
        return acc;
      }, {} as Record<string, { attended: number; total: number }>);

      console.log("📊 Attendance Data:", this.attendanceRecords);
    } catch (error) {
      console.error("❌ Error fetching attendance records:", error);
    }
  }

  async submitAttendance() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
  
    if (!this.selectedSubject) {
      alert("❌ Please select a subject before submitting attendance.");
      this.isSubmitting = false;
      return;
    }
  
    if (!this.selectedDate) {
      alert("❌ Please select a date for attendance.");
      this.isSubmitting = false;
      return;
    }
  
    const formattedDate = this.selectedDate.split('T')[0]; // Ensure date format is correct
  
    const attendanceData = this.students
      .filter(student => this.attendanceEntries[student.id] !== undefined)
      .map(student => ({
        student_id: student.id,
        subject_id: this.selectedSubject, // ✅ Ensure subject_id is included
        status: this.attendanceEntries[student.id] === 'Present',
        date: formattedDate // ✅ Use selected date
      }));
  
    if (attendanceData.length === 0) {
      alert("⚠ No attendance data found to submit.");
      this.isSubmitting = false;
      return;
    }
  
    try {
      const result = await this.api.markAttendance(this.selectedSubject, formattedDate, attendanceData);

      alert(result.message || "✅ Attendance marked successfully.");
      await this.loadAttendance(this.selectedSubject);
    } catch (error) {
      console.error("❌ Error submitting attendance:", error);
      alert("⚠ Failed to submit attendance. Please try again.");
    } finally {
      this.isSubmitting = false;
    }
  }
  
  updateSearch(event: any) {
    this.searchTerm = event.target.value || '';
    this.filterStudents();
  }

  extractSections() {
    console.log('📌 Raw sections:', this.students.map(s => s.sections));  
    this.sections = [...new Set(this.students.map(s => s.sections?.section_name || 'NA'))];
    console.log('✅ Extracted sections:', this.sections);
  }

  selectSection(section: string) {
    this.selectedSection = section;
    this.filterStudents();
  }

  filterStudents() {
    const searchLower = this.searchTerm.toLowerCase();
    this.filteredStudents = this.students.filter(student =>
      student.sections?.year_table?._year === this.selectedYear &&
      (this.selectedSection === 'all' || student.sections?.section_name === this.selectedSection) &&
      student.name.toLowerCase().includes(searchLower)
    );
    console.log("📋 Filtered Students:", this.filteredStudents);
  }

  get years(): string[] {
    return Object.keys(this.subjectsByYear || {});
  }

  async getTeacherDetails() {
    try {
      this.teacher = await this.api.getLoggedInTeacher();
      
      console.log("🟢 Retrieved Teacher Data:", this.teacher);

      if (!this.teacher || !this.teacher.id) {
        console.error("❌ No valid teacher found!");
        return;
      }

      console.log("✅ Teacher details loaded:", this.teacher);
    } catch (error) {
      console.error("❌ Error fetching teacher details:", error);
    }
  }

  async getStudentsByTeacher() {
    try {
      const students = await this.api.getStudentsByTeacher();
      console.log("📚 Students fetched by teacher:", students);
      this.students = students || [];
      this.extractSections();
      this.filterStudents();
    } catch (error) {
      console.error('❌ Error fetching students:', error);
    }
  }

  async loadTeacherData() {
    try {
      this.teacher = await this.api.getLoggedInTeacher();
      
      if (!this.teacher?.id) {
        console.warn("⚠ No valid teacher found.");
        return;
      }

      this.courses = await this.api.getTeacherCourses(this.teacher.id) || [];
      this.subjectsByYear = await this.api.getTeacherSubjectsByYear(this.teacher.id) || {};
      
      console.log("📚 Courses:", this.courses);

      this.updateSelectedSubject();

      console.log("📚 Subjects by Year:", this.subjectsByYear);
    } catch (error) {
      console.error("❌ Error fetching teacher data:", error);
    }
  }

  async logout() {
    console.log("🚪 Logging out...");
  
    // Clear all user session data
    localStorage.clear();
  
    // If API logout exists and is async, wait for it
    if (this.api.logout) {
      try {
        await this.api.logout(); 
      } catch (error) {
        console.error("❌ API Logout Error:", error);
      }
    }
  
    // Navigate to login page & force reload
    this.navCtrl.navigateRoot('/login', { replaceUrl: true });
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }
  
}