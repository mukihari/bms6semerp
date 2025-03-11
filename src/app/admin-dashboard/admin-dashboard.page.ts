import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonGrid, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonChip, IonSegment, IonSegmentButton, IonSearchbar 
} from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonButton, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, ReactiveFormsModule, IonSegment, IonSegmentButton,
    IonGrid, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonChip, IonSearchbar
  ]
})
export class AdminDashboardPage implements OnInit {
  students: any[] = [];
  teachers: any[] = [];
  subjects: any[] = [];
  filteredStudents: any[] = [];
  years: number[] = [];
  sections: string[] = [];
  courses: string[] = [];
  selectedYear: number = 0;
  selectedSection: string = 'all';
  selectedCourse: string = 'all';
  searchQuery: string = '';

  constructor(
    private apiService: ApiService,
    private navCtrl: NavController
  ) {}

  async ngOnInit() {
    console.log("🏠 Admin Dashboard Initialized");
    await this.fetchData();
  }

  async fetchData() {
    try {
      this.students = await this.apiService.getAllStudents();
      this.teachers = await this.apiService.getAllTeachers();
      this.subjects = await this.apiService.getAllSubjects();
      this.extractYearsSectionsAndCourses();
      this.filterStudents();
      console.log("📚 Data fetched:", { students: this.students, teachers: this.teachers, subjects: this.subjects });
    } catch (error) {
      console.error("❌ Error fetching data:", error);
    }
  }

  extractYearsSectionsAndCourses() {
    const yearsSet = new Set<number>();
    const sectionsSet = new Set<string>();
    const coursesSet = new Set<string>();

    this.students.forEach(student => {
      if (student.sections?.year_table?._year) {
        yearsSet.add(student.sections.year_table._year);
      }
      if (student.sections?.section_name) {
        sectionsSet.add(student.sections.section_name);
      }
      if (student.sections?.year_table?.course?.name) {
        coursesSet.add(student.sections.year_table.course.name);
      }
    });

    this.years = Array.from(yearsSet).sort();
    this.sections = Array.from(sectionsSet);
    this.courses = Array.from(coursesSet);

    console.log("📆 Extracted Years:", this.years);
    console.log("🏷️ Extracted Sections:", this.sections);
    console.log("📚 Extracted Courses:", this.courses);
  }

  selectSection(section: string) {
    this.selectedSection = section;
    this.filterStudents();
  }

  selectCourse(course: string) {
    this.selectedCourse = course;
    this.filterStudents();
  }

  filterStudents() {
    const searchLower = this.searchQuery.toLowerCase();
    this.filteredStudents = this.students.filter(student =>
      (this.selectedYear === 0 || student.sections?.year_table?._year === this.selectedYear) &&
      (this.selectedSection === 'all' || student.sections?.section_name === this.selectedSection) &&
      (this.selectedCourse === 'all' || student.sections?.year_table?.course?.name === this.selectedCourse) &&
      student.name.toLowerCase().includes(searchLower)
    );
    console.log("📋 Filtered Students:", this.filteredStudents);
  }

  logout() {
    console.log("🚪 Logging out...");
    this.apiService.logout().then(() => {
      this.navCtrl.navigateRoot('/login');
    });
  }
}