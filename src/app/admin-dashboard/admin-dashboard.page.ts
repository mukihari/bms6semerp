import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton } from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';  // ✅ Import NavController
import { ApiService } from '../services/api.service';  // ✅ Import ApiService

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class AdminDashboardPage implements OnInit {
  
  constructor(
    private apiService: ApiService,  // ✅ Inject ApiService
    private navCtrl: NavController   // ✅ Inject NavController
  ) {}

  ngOnInit() {}

  logout() {
    console.log("🚪 Logging out...");
    
    this.apiService.logout().then(() => {
      this.navCtrl.navigateRoot('/login');
    });
  }
}
