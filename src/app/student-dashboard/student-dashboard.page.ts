import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, 
  IonGrid, IonRow, IonCol, IonButton, IonList, IonItem, IonLabel 
} from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api.service';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.page.html',
  styleUrls: ['./student-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, 
    IonGrid, IonRow, IonCol, IonButton, IonList, IonItem, IonLabel
  ]
})
export class StudentDashboardPage implements OnInit {
  student: any = null;
  section: string = '';
  year: string = '';
  course: string = '';
  teachers: any[] = [];
  attendanceRecords: Record<string, { attended: number; total: number; }> = {};
  apiService = inject(ApiService);
  navCtrl = inject(NavController);
  currentDate: string = new Date().toISOString().split('T')[0]; 
  filteredStudents: any[] = []; 
  subjectNames: Record<string, string> = {};

  constructor() {}

  ngOnInit() {
    console.log("📌 Student Dashboard Loaded");
    this.loadStudentData();
  }

  async loadStudentAttendance(studentId: number) {
    try {
        const records = await this.apiService.getStudentAttendanceRecords(studentId);

        console.log("📥 Raw records fetched:", JSON.stringify(records, null, 2));

        if (!records || records.length === 0) {
            console.warn('⚠ No attendance records found');
            this.attendanceRecords = {}; // Reset UI
            this.subjectNames = {}; // Reset subject names
            return;
        }

        this.attendanceRecords = records.reduce<Record<string, { attended: number; total: number }>>(
            (acc, record) => {
                console.log("🔍 Processing record:", JSON.stringify(record, null, 2));

                const key = record.subject_id.toString();
                console.log("📌 Subject ID:", key);

                acc[key] = { 
                    attended: record.attended_classes || 0, 
                    total: record.total_classes || 0
                };

                return acc;
            },
            {}
        );

        console.log("📊 Final Attendance Data Processed:", JSON.stringify(this.attendanceRecords, null, 2));

        // ✅ Ensure subject names are loaded right after processing attendance
        this.loadSubjectNames(records);

    } catch (error) {
        console.error("❌ Error fetching attendance records:", error);
    }
}


async loadSubjectNames(records: any[]) {
  try {
      this.subjectNames = records.reduce<Record<string, string>>((acc, record) => {
          const key = record.subject_id.toString();
          acc[key] = record.subjects?.name ?? "Unknown Subject from loadSubjectNames";
          return acc;
      }, {});

      console.log("📌 Subject Names Loaded:", JSON.stringify(this.subjectNames, null, 2));
  } catch (error) {
      console.error("❌ Error loading subject names:", error);
  }
}




  async loadStudentData() {
    try {
      const studentDetails = await this.apiService.getLoggedInStudent();
      this.student = studentDetails;
  
      if (!this.student) {
        console.warn("⚠️ No student data found!");
        return;
      }
  
      const sectionDetails = await this.apiService.getSectionById(this.student.section_id);
      this.section = sectionDetails?.section_name || 'N/A';
  
      const yearDetails = await this.apiService.getYearById(sectionDetails?.year_id);
      this.year = yearDetails?._year || 'N/A';
  
      // Load attendance data after student data is loaded
      await this.loadStudentAttendance(this.student.id);
    } catch (error) {
      console.error("❌ Error fetching student data:", error);
    }
  }
  
  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  logout() {
    console.log("🚪 Logging out...");
    this.apiService.logout().then(() => {
      this.navCtrl.navigateRoot('/login');
    });
  }
}