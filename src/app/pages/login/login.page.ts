import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonItem, IonLabel, 
  IonCardHeader, IonInput, IonButton, IonCardSubtitle, IonCardTitle, IonCardContent, IonProgressBar, 
  IonNote, IonToast 
} from '@ionic/angular/standalone';
import { ApiService } from 'src/app/services/api.service';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonToast, IonNote, IonProgressBar, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, 
    IonGrid, IonRow, IonCol, IonCard, IonItem, IonLabel, IonCardHeader, IonInput, IonButton, 
    IonCardSubtitle, IonCardTitle, IonCardContent
  ]
})
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';  
  login_type: 'students' | 'teachers' | '' = '';
  
  message: string = '';
  color: string = '';
  isOpen: boolean = false;
  loading: boolean = false;

  apiService = inject(ApiService);
  navctrl = inject(NavController);

  constructor() {}

  ngOnInit() {
    console.log("🟢 Login page initialized");
    
    // Auto-login if user data is stored
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.navctrl.navigateForward(user.userType === 'teachers' ? '/teacher-dashboard' : '/student-dashboard');
    }
  }

  async showToast(message: string = 'Something went wrong', color: string) {
    this.message = message;
    this.color = color;
    this.isOpen = true;

    // ✅ Close toast after 2 seconds
    setTimeout(() => {
      this.isOpen = false;
    }, 2000);
  }

  async login() {
    if (!this.email || !this.password || !this.login_type) {
      this.showToast('⚠️ Please enter email, password & select login type', 'warning');
      return;
    }

    this.loading = true;

    try {
      const response = await this.apiService.login(this.email, this.password, this.login_type);
      this.loading = false;

      console.log("📢 API Response:", response);

      if (!response || !response.success || !response.data) { 
        this.password = '';
        this.showToast(response?.message ?? '❌ Login failed. Please try again.', 'danger');
        return;
      }

      const userData = response.data;
      const userType = response.userType 

      const userName = userData?.name || 'User';
      
      // Store user session
      localStorage.setItem('loggedInUser', JSON.stringify(userData));

      this.showToast(`✅ Welcome, ${userName}!`, 'success');
      
      setTimeout(() => {
        this.navctrl.navigateForward(userType === 'teachers' ? '/teacher-dashboard' : '/student-dashboard');
      }, 1500);
      
    } catch (error) {
      this.loading = false;
      console.error("❌ Login Error:", error);
      this.showToast('❌ An error occurred. Please try again.', 'danger');
    }
  }

  logout() {
    localStorage.removeItem('loggedInUser'); // Clears stored user data
    this.resetLogin();
    this.navctrl.navigateRoot('/login');
  }

  resetLogin() {
    this.email = '';
    this.password = '';
    this.login_type = '';
    this.message = '';
    this.color = '';
    this.isOpen = false;
    this.loading = false;
  }
}
