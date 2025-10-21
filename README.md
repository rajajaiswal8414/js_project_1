import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppointmentResponseDTO } from '../../models/appointment-interface';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DoctorAppointmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/doctors/me/appointments`;

  getAppointmentsForDoctor(): Observable<AppointmentResponseDTO[]> {
    return this.http.get<AppointmentResponseDTO[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching appointments:', error);
        return of(this.getMockAppointments());
      })
    );
  }

  getAppointmentsByStatus(status: string): Observable<AppointmentResponseDTO[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<AppointmentResponseDTO[]>(this.apiUrl, { params });
  }

  getTodayAppointments(): Observable<AppointmentResponseDTO[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getAppointmentsForDoctor().pipe(
      map((appointments) => appointments.filter((apt) => apt.appointmentDate === today))
    );
  }

  confirmAppointment(appointmentId: number): Observable<AppointmentResponseDTO> {
    const url = `${environment.apiUrl}${environment.doctor.confirmAppointment}`.replace(
      '{appointmentId}',
      appointmentId.toString()
    );
    return this.http.post<AppointmentResponseDTO>(url, {});
  }

  rejectAppointment(appointmentId: number, reason: string): Observable<AppointmentResponseDTO> {
    const url = `${environment.apiUrl}${environment.doctor.rejectAppointment}`.replace(
      '{appointmentId}',
      appointmentId.toString()
    );
    return this.http.post<AppointmentResponseDTO>(url, { reason });
  }

  completeAppointment(appointmentId: number, consultationData: any): Observable<any> {
    const url = `${environment.apiUrl}/doctors/me/appointments/${appointmentId}/complete`;
    return this.http.post(url, consultationData);
  }

  rescheduleAppointment(appointmentId: number, newDate: string, newTime: string): Observable<any> {
    const url = `${environment.apiUrl}/doctors/me/appointments/${appointmentId}/reschedule`;
    return this.http.put(url, { newDate, newTime });
  }

  private getMockAppointments(): AppointmentResponseDTO[] {
    return [
      {
        appointmentId: 1,
        appointmentDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '09:30',
        reason: 'Regular Checkup',
        status: 'CONFIRMED',
        patient: {
          patientId: 1,
          name: 'Sarah Johnson',
          email: 'sarah@email.com',
          contactNumber: '+1-555-0101',
          address: '123 Main St',
          gender: 'Female',
          dateOfBirth: '1985-05-15',
          bloodGroup: 'A+',
        },
        doctor: {
          doctorId: 1,
          doctorName: 'Dr. John Smith',
          email: 'dr.smith@email.com',
          contactNumber: '+1-555-0100',
          specialization: 'Cardiology',
          licenseNumber: 'MED123456',
          yearsOfExperience: 10,
          consultationFee: 100,
          address: '123 Main St',
        },
      },
      {
        appointmentId: 2,
        appointmentDate: new Date().toISOString().split('T')[0],
        startTime: '10:30',
        endTime: '11:00',
        reason: 'Follow-up Visit',
        status: 'PENDING',
        patient: {
          patientId: 2,
          name: 'Michael Brown',
          email: 'michael@email.com',
          contactNumber: '+1-555-0102',
          address: '456 Oak Ave',
          gender: 'Male',
          dateOfBirth: '1978-12-20',
          bloodGroup: 'O+',
        },
        doctor: {
          doctorId: 1,
          doctorName: 'Dr. John Smith',
          email: 'dr.smith@email.com',
          contactNumber: '+1-555-0100',
          specialization: 'Cardiology',
          licenseNumber: 'MED123456',
          yearsOfExperience: 10,
          consultationFee: 100,
          address: '123 Main St',
        },
      },
      {
        appointmentId: 3,
        appointmentDate: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '14:30',
        reason: 'New Patient Consultation',
        status: 'PENDING',
        patient: {
          patientId: 3,
          name: 'Emma Wilson',
          email: 'emma@email.com',
          contactNumber: '+1-555-0103',
          address: '789 Pine Rd',
          gender: 'Female',
          dateOfBirth: '1990-08-25',
          bloodGroup: 'B+',
        },
        doctor: {
          doctorId: 1,
          doctorName: 'Dr. John Smith',
          email: 'dr.smith@email.com',
          contactNumber: '+1-555-0100',
          specialization: 'Cardiology',
          licenseNumber: 'MED123456',
          yearsOfExperience: 10,
          consultationFee: 100,
          address: '123 Main St',
        },
      },
    ];
  }
}



import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AvailabilitySlot } from '../../models/availabilityslot-interface';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DoctorAvailabilityService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getScheduledSlots(): Observable<AvailabilitySlot[]> {
    return this.http
      .get<AvailabilitySlot[]>(`${this.baseUrl}${environment.doctor.getAvailability}`)
      .pipe(catchError(() => of(this.getMockSlots())));
  }

  saveNewSlot(slot: AvailabilitySlot): Observable<AvailabilitySlot> {
    return this.http.post<AvailabilitySlot>(
      `${this.baseUrl}${environment.doctor.addAvailability}`,
      slot
    );
  }

  updateSlot(slot: AvailabilitySlot): Observable<AvailabilitySlot> {
    const url = `${this.baseUrl}${environment.doctor.updateAvailability}`
      .replace('{doctorId}', 'me')
      .replace('{availabilityId}', slot.id.toString());
    return this.http.put<AvailabilitySlot>(url, slot);
  }

  deleteSlot(id: number): Observable<void> {
    const url = `${this.baseUrl}${environment.doctor.updateAvailability}`
      .replace('{doctorId}', 'me')
      .replace('{availabilityId}', id.toString());
    return this.http.delete<void>(url);
  }

  private getMockSlots(): AvailabilitySlot[] {
    return [
      { id: 1, day: 'MONDAY', startTime: '09:00', endTime: '17:00', duration: 30 },
      { id: 2, day: 'TUESDAY', startTime: '09:00', endTime: '17:00', duration: 30 },
      { id: 3, day: 'WEDNESDAY', startTime: '09:00', endTime: '17:00', duration: 30 },
      { id: 4, day: 'THURSDAY', startTime: '09:00', endTime: '17:00', duration: 30 },
      { id: 5, day: 'FRIDAY', startTime: '09:00', endTime: '17:00', duration: 30 },
    ];
  }
}




import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationResponseDTO } from '../../models/notification-interface';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DoctorNotificationService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getNotifications(): Observable<NotificationResponseDTO[]> {
    return this.http
      .get<NotificationResponseDTO[]>(`${this.baseUrl}${environment.doctor.getNotifications}`)
      .pipe(catchError(() => of(this.getMockNotifications())));
  }

  markAsRead(notificationId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/notifications/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/doctors/me/notifications/read-all`, {});
  }

  private getMockNotifications(): NotificationResponseDTO[] {
    return [
      {
        id: 1,
        appointmentId: 2,
        recipientType: 'DOCTOR',
        recipientId: 1,
        title: 'New Appointment Request',
        message: 'Sarah Johnson requested an appointment for tomorrow at 9:00 AM',
        createdAt: new Date().toISOString(),
        read: false,
      },
      {
        id: 2,
        appointmentId: 1,
        recipientType: 'DOCTOR',
        recipientId: 1,
        title: 'Appointment Reminder',
        message: 'You have an appointment with Michael Brown in 30 minutes',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        read: false,
      },
      {
        id: 3,
        appointmentId: 3,
        recipientType: 'DOCTOR',
        recipientId: 1,
        title: 'Appointment Completed',
        message: 'Consultation with David Lee marked as completed',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: true,
      },
    ];
  }
}







import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PatientResponseDTO } from '../../models/appointment-interface';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DoctorPatientService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/doctors/me/patients`;

  getPatients(): Observable<PatientResponseDTO[]> {
    return this.http.get<PatientResponseDTO[]>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Error fetching patients:', error);
        return of(this.getMockPatients());
      })
    );
  }

  getPatientById(patientId: number): Observable<PatientResponseDTO> {
    return this.http.get<PatientResponseDTO>(`${this.apiUrl}/${patientId}`);
  }

  getPatientMedicalRecords(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}/medical-records`);
  }

  searchPatients(searchTerm: string): Observable<PatientResponseDTO[]> {
    return this.getPatients().pipe(
      map((patients) =>
        patients.filter(
          (patient) =>
            patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  }

  private getMockPatients(): PatientResponseDTO[] {
    return [
      {
        patientId: 1,
        name: 'John Doe',
        email: 'john.doe@email.com',
        contactNumber: '+1-555-0123',
        address: '123 Main St, City, State',
        gender: 'Male',
        dateOfBirth: '1989-03-15',
        bloodGroup: 'O+',
      },
      {
        patientId: 2,
        name: 'Jane Smith',
        email: 'jane.smith@email.com',
        contactNumber: '+1-555-0124',
        address: '456 Oak Ave, City, State',
        gender: 'Female',
        dateOfBirth: '1992-07-22',
        bloodGroup: 'A+',
      },
      {
        patientId: 3,
        name: 'Robert Johnson',
        email: 'robert.j@email.com',
        contactNumber: '+1-555-0125',
        address: '789 Pine Rd, City, State',
        gender: 'Male',
        dateOfBirth: '1975-11-30',
        bloodGroup: 'B+',
      },
    ];
  }
}






import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Prescription } from '../../models/prescription-interface';
import { Patient } from '../../models/patient-interface';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DoctorPrescriptionService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getPrescriptionHistory(): Observable<Prescription[]> {
    return this.http
      .get<Prescription[]>(`${this.baseUrl}/doctors/me/prescriptions`)
      .pipe(catchError(() => of(this.getMockPrescriptions())));
  }

  getPatientList(): Observable<Patient[]> {
    return this.http
      .get<Patient[]>(`${this.baseUrl}/doctors/me/patients`)
      .pipe(catchError(() => of(this.getMockPatients())));
  }

  createPrescription(prescription: Partial<Prescription>): Observable<Prescription> {
    return this.http.post<Prescription>(`${this.baseUrl}/doctors/me/prescriptions`, prescription);
  }

  updatePrescription(prescription: Prescription): Observable<Prescription> {
    return this.http.put<Prescription>(
      `${this.baseUrl}/doctors/me/prescriptions/${prescription.id}`,
      prescription
    );
  }

  deletePrescription(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/doctors/me/prescriptions/${id}`);
  }

  private getMockPrescriptions(): Prescription[] {
    return [
      {
        id: 101,
        patientId: 1,
        patientName: 'Alice Johnson',
        date: new Date('2025-10-10'),
        diagnosis: 'Viral Infection',
        medications: [
          {
            name: 'Paracetamol',
            dosage: '500mg',
            instructions: 'Twice daily after meals',
            durationDays: 5,
          },
        ],
        status: 'Sent',
      },
      {
        id: 102,
        patientId: 2,
        patientName: 'Bob Smith',
        date: new Date('2025-10-14'),
        diagnosis: 'Headache and fever',
        medications: [
          {
            name: 'Ibuprofen',
            dosage: '400mg',
            instructions: 'As needed for pain',
            durationDays: 3,
          },
        ],
        status: 'Draft',
      },
    ];
  }

  private getMockPatients(): Patient[] {
    return [
      {
        patientId: 1,
        name: 'Alice Johnson',
        email: 'alice@email.com',
        contactNumber: '+1-555-0101',
        address: '123 Main St',
        gender: 'Female',
        dateOfBirth: '1989-03-15',
        bloodGroup: 'O+',
      },
      {
        patientId: 2,
        name: 'Bob Smith',
        email: 'bob@email.com',
        contactNumber: '+1-555-0102',
        address: '123 Main St',
        gender: 'Male',
        dateOfBirth: '1990-01-01',
        bloodGroup: 'A+',
      },
      {
        patientId: 3,
        name: 'Charlie Doe',
        email: 'charlie@email.com',
        contactNumber: '+1-555-0103',
        address: '123 Main St',
        gender: 'Male',
        dateOfBirth: '1990-01-01',
        bloodGroup: 'A+',
      },
    ];
  }
}






<body class="font-sans bg-gray-100 text-gray-800">
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="w-64 bg-white shadow-lg fixed h-full overflow-y-auto">
      <div class="px-6 py-8 border-b border-gray-200">
        <div class="text-2xl font-bold text-blue-600 flex items-center gap-2">⚕ MediCare</div>
      </div>
      <ul class="mt-6 space-y-1">
        <li>
          <a
            [routerLink]="['/doctor/dashboard']"
            class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
            >📊 Dashboard</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/appointments']"
            class="flex items-center gap-3 px-6 py-3 font-medium text-blue-600 bg-blue-50 border-l-4 border-blue-600"
            >📅 Appointments</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/patients']"
            class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
            >👥 Patients</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/availability']"
            class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
            >⏰ Availability</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/prescriptions']"
            class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
            >💊 Prescriptions</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/medical-records']"
            class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
            >📋 Medical Records</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/settings']"
            class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
            >⚙️ Settings</a
          >
        </li>
      </ul>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 ml-64 p-6">
      <!-- Top Bar -->
      <div class="bg-white rounded-xl shadow p-6 mb-6">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h1 class="text-2xl font-semibold text-gray-800">Appointments</h1>
            <div class="text-gray-500 text-sm mt-1">
              <a [routerLink]="['/doctor/dashboard']" class="text-blue-600">Dashboard</a> /
              Appointments
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-4">
          <!-- Search -->
          <div class="relative flex-1 min-w-[250px]">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by patient name..."
              id="search-input"
              class="w-full border-2 border-gray-300 rounded-lg py-2 px-10 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
              oninput="filterAppointments()"
            />
          </div>

          <!-- Date Filter -->
          <select
            id="date-filter"
            onchange="filterAppointments()"
            class="border-2 border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <!-- Status Filter -->
          <select
            id="status-filter"
            onchange="filterAppointments()"
            class="border-2 border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div
          class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition transform hover:-translate-y-1"
        >
          <div>
            <h3 class="text-gray-500 text-sm font-medium">Today's Appointments</h3>
            <p id="today-count" class="text-2xl font-bold text-gray-800">0</p>
          </div>
          <div class="text-3xl">📅</div>
        </div>
        <div
          class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition transform hover:-translate-y-1"
        >
          <div>
            <h3 class="text-gray-500 text-sm font-medium">Pending</h3>
            <p id="pending-count" class="text-2xl font-bold text-gray-800">0</p>
          </div>
          <div class="text-3xl">⏳</div>
        </div>
        <div
          class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition transform hover:-translate-y-1"
        >
          <div>
            <h3 class="text-gray-500 text-sm font-medium">Confirmed</h3>
            <p id="confirmed-count" class="text-2xl font-bold text-gray-800">0</p>
          </div>
          <div class="text-3xl">✅</div>
        </div>
        <div
          class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition transform hover:-translate-y-1"
        >
          <div>
            <h3 class="text-gray-500 text-sm font-medium">Completed</h3>
            <p id="completed-count" class="text-2xl font-bold text-gray-800">0</p>
          </div>
          <div class="text-3xl">✔️</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 border-b-2 border-gray-200 mb-6">
        <button class="py-2 px-4 font-semibold text-blue-600 border-b-2 border-blue-600">
          All Appointments
        </button>
        <button class="py-2 px-4 font-semibold text-gray-500 hover:text-blue-600 transition">
          Pending
        </button>
        <button class="py-2 px-4 font-semibold text-gray-500 hover:text-blue-600 transition">
          Confirmed
        </button>
        <button class="py-2 px-4 font-semibold text-gray-500 hover:text-blue-600 transition">
          Completed
        </button>
      </div>

      <!-- Appointments List -->
      <div class="grid gap-4" id="appointments-list">
        <!-- Appointment Cards will render here -->
      </div>
    </main>
  </div>

  <!-- Modals -->
  <!-- Details Modal -->
  <div class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50" id="details-modal">
    <div class="bg-white rounded-2xl p-6 max-w-lg w-11/12 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
        <h2 class="text-xl font-bold text-gray-800">Appointment Details</h2>
        <button class="text-gray-500 text-2xl" onclick="closeModal('details-modal')">×</button>
      </div>
      <div id="modal-details-content"></div>
    </div>
  </div>

  <!-- Notes Modal -->
  <div class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50" id="notes-modal">
    <div class="bg-white rounded-2xl p-6 max-w-lg w-11/12 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
        <h2 class="text-xl font-bold text-gray-800">Add Consultation Notes</h2>
        <button class="text-gray-500 text-2xl" onclick="closeModal('notes-modal')">×</button>
      </div>
      <form onsubmit="saveNotes(event)" class="space-y-4">
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Diagnosis</label>
          <input
            type="text"
            id="diagnosis"
            required
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500"
          />
        </div>
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Symptoms</label>
          <input
            type="text"
            id="symptoms"
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500"
          />
        </div>
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Notes</label>
          <textarea
            id="notes"
            placeholder="Enter consultation notes..."
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 min-h-[100px]"
          ></textarea>
        </div>
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Prescription</label>
          <textarea
            id="prescription"
            placeholder="Enter prescribed medications..."
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 min-h-[100px]"
          ></textarea>
        </div>
        <div class="flex gap-4">
          <button
            type="submit"
            class="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg hover:-translate-y-1 transition"
          >
            Save Notes
          </button>
          <button
            type="button"
            onclick="closeModal('notes-modal')"
            class="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Reschedule Modal -->
  <div
    class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50"
    id="reschedule-modal"
  >
    <div class="bg-white rounded-2xl p-6 max-w-lg w-11/12 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
        <h2 class="text-xl font-bold text-gray-800">Reschedule Appointment</h2>
        <button class="text-gray-500 text-2xl" onclick="closeModal('reschedule-modal')">×</button>
      </div>
      <form onsubmit="rescheduleAppointment(event)" class="space-y-4">
        <div>
          <label class="block text-gray-700 font-semibold mb-1">New Date</label>
          <input
            type="date"
            id="new-date"
            required
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500"
          />
        </div>
        <div>
          <label class="block text-gray-700 font-semibold mb-1">New Time</label>
          <input
            type="time"
            id="new-time"
            required
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500"
          />
        </div>
        <div>
          <label class="block text-gray-700 font-semibold mb-1">Reason</label>
          <textarea
            id="reschedule-reason"
            placeholder="Reason for rescheduling..."
            class="w-full border-2 border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-500 min-h-[100px]"
          ></textarea>
        </div>
        <div class="flex gap-4">
          <button
            type="submit"
            class="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 rounded-lg hover:shadow-lg hover:-translate-y-1 transition"
          >
            Reschedule
          </button>
          <button
            type="button"
            onclick="closeModal('reschedule-modal')"
            class="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</body>






import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DoctorAppointmentService } from '../../../core/services/doctor-appointment.service';
import { AppointmentResponseDTO } from '../../../models/appointment-interface';

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctor-appointments.html',
  styleUrls: ['./doctor-appointments.css'],
})
export class DoctorAppointments implements OnInit {
  appointments: AppointmentResponseDTO[] = [];
  filteredAppointments: AppointmentResponseDTO[] = [];

  // Filters
  searchTerm = '';
  dateFilter = 'all';
  statusFilter = 'all';
  currentTab = 'all';

  // Stats
  todayCount = 0;
  pendingCount = 0;
  confirmedCount = 0;
  completedCount = 0;

  constructor(private appointmentService: DoctorAppointmentService, private router: Router) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.appointmentService.getAppointmentsForDoctor().subscribe({
      next: (appointments) => {
        this.appointments = appointments;
        this.filteredAppointments = [...appointments];
        this.updateStats();
        this.filterAppointments();
      },
      error: (error) => {
        console.error('Error loading appointments:', error);
        this.appointments = [];
        this.filteredAppointments = [];
        this.updateStats();
      },
    });
  }

  updateStats(): void {
    const today = new Date().toISOString().split('T')[0];
    this.todayCount = this.appointments.filter((a) => a.appointmentDate === today).length;
    this.pendingCount = this.appointments.filter((a) => a.status === 'PENDING').length;
    this.confirmedCount = this.appointments.filter((a) => a.status === 'CONFIRMED').length;
    this.completedCount = this.appointments.filter((a) => a.status === 'COMPLETED').length;
  }

  filterAppointments(): void {
    let filtered = [...this.appointments];

    // Search filter
    if (this.searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.patient.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          a.reason.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (this.dateFilter !== 'all') {
      const today = new Date();
      filtered = filtered.filter((a) => {
        const appointmentDate = new Date(a.appointmentDate);
        switch (this.dateFilter) {
          case 'today':
            return a.appointmentDate === today.toISOString().split('T')[0];
          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            return a.appointmentDate === tomorrow.toISOString().split('T')[0];
          case 'week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(today.getDate() + 7);
            return appointmentDate >= today && appointmentDate <= weekFromNow;
          case 'month':
            const monthFromNow = new Date(today);
            monthFromNow.setMonth(today.getMonth() + 1);
            return appointmentDate >= today && appointmentDate <= monthFromNow;
          default:
            return true;
        }
      });
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === this.statusFilter);
    }

    // Tab filter
    if (this.currentTab !== 'all') {
      filtered = filtered.filter((a) => a.status === this.currentTab.toUpperCase());
    }

    this.filteredAppointments = filtered;
  }

  onSearchChange(): void {
    this.filterAppointments();
  }

  onFilterChange(): void {
    this.filterAppointments();
  }

  switchTab(tab: string): void {
    this.currentTab = tab;
    this.filterAppointments();
  }

  // Appointment Actions
  confirmAppointment(appointmentId: number): void {
    this.appointmentService.confirmAppointment(appointmentId).subscribe({
      next: () => {
        this.updateAppointmentStatus(appointmentId, 'CONFIRMED');
        alert('Appointment confirmed successfully!');
      },
      error: (error) => alert('Error confirming appointment: ' + error.message),
    });
  }

  rejectAppointment(appointmentId: number): void {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      this.appointmentService.rejectAppointment(appointmentId, reason).subscribe({
        next: () => {
          this.updateAppointmentStatus(appointmentId, 'REJECTED');
          alert('Appointment rejected successfully!');
        },
        error: (error) => alert('Error rejecting appointment: ' + error.message),
      });
    }
  }

  startConsultation(appointmentId: number): void {
    this.router.navigate(['/doctor/consultation', appointmentId]);
  }

  viewDetails(appointment: AppointmentResponseDTO): void {
    // Show modal or navigate to details page
    const details = `
      Patient: ${appointment.patient.name}
      Date: ${this.formatDisplayDate(appointment.appointmentDate)}
      Time: ${this.formatTime(appointment.startTime)} - ${this.formatTime(appointment.endTime)}
      Reason: ${appointment.reason}
      Status: ${appointment.status}
      Contact: ${appointment.patient.contactNumber}
      Email: ${appointment.patient.email}
    `;
    alert(details);
  }

  rescheduleAppointment(appointmentId: number): void {
    // Implement reschedule logic
    alert('Reschedule functionality to be implemented');
  }

  completeAppointment(appointmentId: number): void {
    const notes = prompt('Enter consultation notes:');
    if (notes) {
      this.appointmentService.completeAppointment(appointmentId, { notes }).subscribe({
        next: () => {
          this.updateAppointmentStatus(appointmentId, 'COMPLETED');
          alert('Appointment marked as completed!');
        },
        error: (error) => alert('Error completing appointment: ' + error.message),
      });
    }
  }

  private updateAppointmentStatus(appointmentId: number, status: string): void {
    const appointment = this.appointments.find((a) => a.appointmentId === appointmentId);
    if (appointment) {
      appointment.status = status;
      this.updateStats();
      this.filterAppointments();
    }
  }

  // UI Helpers
  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  formatDisplayDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
}





<body class="font-sans bg-gray-100 text-gray-800">
  <aside class="w-64 bg-white shadow-lg fixed h-full overflow-y-auto">
    <div class="px-6 py-8 border-b border-gray-200">
      <div class="text-2xl font-bold text-blue-600 flex items-center gap-2">⚕ MediCare</div>
    </div>
    <ul class="mt-6 space-y-1">
      <li>
        <a
          [routerLink]="['/doctor/dashboard']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >📊 Dashboard</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/appointments']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >📅 Appointments</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/patients']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >👥 Patients</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/availability']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-blue-600 bg-blue-50 border-l-4 border-blue-600 transition"
          >⏰ Availability</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/prescriptions']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >💊 Prescriptions</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/medical-records']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >📋 Medical Records</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/settings']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >⚙️ Settings</a
        >
      </li>
    </ul>
  </aside>

  <main class="ml-64 p-8 min-h-screen">
    <div class="flex justify-between items-start mb-6 bg-white rounded-xl shadow p-6">
      <div>
        <h1 class="text-2xl font-semibold text-gray-800">Manage Availability</h1>
        <div class="text-gray-500 text-sm mt-1">
          <a [routerLink]="['/doctor/dashboard']" class="text-blue-600">Dashboard</a> / Availability
        </div>
      </div>
    </div>

    <div class="flex border-b border-gray-200 mb-6">
      <button
        class="px-6 py-3 text-lg font-medium transition duration-150 ease-in-out"
        [ngClass]="{
          'border-b-4 border-blue-600 text-blue-600': currentTab === 'slots',
          'text-gray-500 hover:text-gray-700': currentTab !== 'slots'
        }"
        (click)="switchTab('slots')"
      >
        Scheduled Slots
      </button>
      <button
        class="px-6 py-3 text-lg font-medium transition duration-150 ease-in-out"
        [ngClass]="{
          'border-b-4 border-blue-600 text-blue-600': currentTab === 'add',
          'text-gray-500 hover:text-gray-700': currentTab !== 'add'
        }"
        (click)="switchTab('add')"
      >
        Add New Slot
      </button>
    </div>

    @if (currentTab === 'slots') {
    <div class="bg-white shadow-xl rounded-lg p-6">
      <h2 class="text-xl font-semibold mb-4 border-b pb-2">Recurring Availability</h2>
      <div *ngIf="scheduledSlots.length === 0" class="text-center py-10 text-gray-500">
        <div class="text-6xl mb-3">🗓️</div>
        <h3 class="text-lg font-semibold">No recurring slots found.</h3>
        <p>Add your weekly schedule in the 'Add New Slot' tab.</p>
      </div>

      <table
        *ngIf="scheduledSlots.length > 0"
        class="min-w-full divide-y divide-gray-200 patients-table"
      >
        <thead class="bg-gray-50">
          <tr>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Day
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Start Time
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              End Time
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Duration
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          @for (slot of scheduledSlots; track $index) {
          <tr>
            <td class="px-4 py-4 whitespace-nowrap font-medium text-gray-900">{{ slot.day }}</td>
            <td class="px-4 py-4 whitespace-nowrap">{{ slot.startTime }}</td>
            <td class="px-4 py-4 whitespace-nowrap">{{ slot.endTime }}</td>
            <td class="px-4 py-4 whitespace-nowrap">{{ slot.duration }} mins</td>
            <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button (click)="editSlot(slot)" class="text-blue-600 hover:text-blue-900 mr-4">
                Edit
              </button>
              <button (click)="deleteSlot(slot.id)" class="text-red-600 hover:text-red-900">
                Delete
              </button>
            </td>
          </tr>
          }
        </tbody>
      </table>
    </div>
    } @if (currentTab === 'add') {
    <div class="bg-white shadow-xl rounded-lg p-6">
      <h2 class="text-xl font-semibold mb-6 border-b pb-2">Add Recurring Weekly Availability</h2>

      <form (ngSubmit)="saveNewSlot()">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="day" class="block text-sm font-medium text-gray-700 mb-1"
              >Day of the Week</label
            >
            <select
              id="day"
              [(ngModel)]="newSlot.day"
              name="day"
              required
              class="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="" disabled>Select a Day</option>
              @for (day of daysOfWeek; track $index) {
              <option [value]="day">{{ day }}</option>
              }
            </select>
          </div>

          <div>
            <label for="startTime" class="block text-sm font-medium text-gray-700 mb-1"
              >Start Time</label
            >
            <input
              type="time"
              id="startTime"
              [(ngModel)]="newSlot.startTime"
              name="startTime"
              required
              class="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label for="endTime" class="block text-sm font-medium text-gray-700 mb-1"
              >End Time</label
            >
            <input
              type="time"
              id="endTime"
              [(ngModel)]="newSlot.endTime"
              name="endTime"
              required
              class="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label for="duration" class="block text-sm font-medium text-gray-700 mb-1"
              >Appointment Duration (Minutes)</label
            >
            <select
              id="duration"
              [(ngModel)]="newSlot.duration"
              name="duration"
              required
              class="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="" disabled>Select Duration</option>
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="45">45 Minutes</option>
              <option value="60">60 Minutes</option>
            </select>
          </div>
        </div>

        <div class="mt-8">
          <button
            type="submit"
            class="px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
          >
            {{ isEditMode ? 'Update Slot' : 'Save Availability' }}
          </button>
          <button
            type="button"
            (click)="resetForm()"
            class="ml-3 px-6 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-150"
          >
            {{ isEditMode ? 'Cancel Edit' : 'Clear' }}
          </button>
        </div>
      </form>
    </div>
    }
  </main>
</body>





import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AvailabilitySlot } from '../../../models/availabilityslot-interface';
import { DoctorAvailabilityService } from '../../../core/services/doctor-availability.service';

@Component({
  selector: 'app-doctor-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctor-availability.html',
  styleUrls: ['./doctor-availability.css'],
})
export class DoctorAvailability implements OnInit {
  currentTab: 'slots' | 'add' = 'slots';

  daysOfWeek: string[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  scheduledSlots: AvailabilitySlot[] = [];
  newSlot: Partial<AvailabilitySlot> = {
    day: '',
    startTime: '09:00',
    endTime: '17:00',
    duration: 30,
  };

  isEditMode = false;
  editingSlotId: number | null = null;

  constructor(private availabilityService: DoctorAvailabilityService) {}

  ngOnInit(): void {
    this.fetchScheduledSlots();
  }

  fetchScheduledSlots(): void {
    this.availabilityService.getScheduledSlots().subscribe({
      next: (slots) => {
        this.scheduledSlots = slots;
      },
      error: (error) => {
        console.error('Failed to fetch availability slots:', error);
        alert('Could not load availability. Please try again.');
      },
    });
  }

  switchTab(tab: 'slots' | 'add'): void {
    this.currentTab = tab;
    if (tab === 'add' && !this.isEditMode) {
      this.resetForm();
    }
  }

  saveNewSlot(): void {
    if (!this.validateSlot()) return;

    const slotData: AvailabilitySlot = {
      ...this.newSlot,
      duration: +this.newSlot.duration!,
    } as AvailabilitySlot;

    if (this.isEditMode && this.editingSlotId) {
      this.availabilityService.updateSlot({ ...slotData, id: this.editingSlotId }).subscribe({
        next: () => {
          alert('Slot updated successfully!');
          this.handleSuccessfulSubmission();
        },
        error: (error) => alert('Failed to update slot: ' + error.message),
      });
    } else {
      this.availabilityService.saveNewSlot(slotData).subscribe({
        next: () => {
          alert('Availability slot added successfully!');
          this.handleSuccessfulSubmission();
        },
        error: (error) => alert('Failed to save new slot: ' + error.message),
      });
    }
  }

  private validateSlot(): boolean {
    if (
      !this.newSlot.day ||
      !this.newSlot.startTime ||
      !this.newSlot.endTime ||
      !this.newSlot.duration
    ) {
      alert('Please fill in all required fields.');
      return false;
    }

    if (this.newSlot.startTime >= this.newSlot.endTime) {
      alert('End time must be after start time.');
      return false;
    }

    return true;
  }

  private handleSuccessfulSubmission(): void {
    this.fetchScheduledSlots();
    this.resetForm();
    this.switchTab('slots');
  }

  resetForm(): void {
    this.newSlot = {
      day: '',
      startTime: '09:00',
      endTime: '17:00',
      duration: 30,
    };
    this.isEditMode = false;
    this.editingSlotId = null;
  }

  editSlot(slot: AvailabilitySlot): void {
    this.newSlot = { ...slot };
    this.isEditMode = true;
    this.editingSlotId = slot.id;
    this.switchTab('add');
  }

  deleteSlot(id: number): void {
    if (confirm('Are you sure you want to delete this availability slot?')) {
      this.availabilityService.deleteSlot(id).subscribe({
        next: () => {
          this.scheduledSlots = this.scheduledSlots.filter((slot) => slot.id !== id);
          alert('Slot deleted successfully!');
        },
        error: (error) => alert('Failed to delete slot: ' + error.message),
      });
    }
  }

  getDayDisplay(day: string): string {
    const dayMap: { [key: string]: string } = {
      MONDAY: 'Monday',
      TUESDAY: 'Tuesday',
      WEDNESDAY: 'Wednesday',
      THURSDAY: 'Thursday',
      FRIDAY: 'Friday',
      SATURDAY: 'Saturday',
      SUNDAY: 'Sunday',
    };
    return dayMap[day] || day;
  }
}





<!-- DOCTOR DASHBOARD -->
<div id="doctor-dashboard" class="dashboard active">
  <!-- Loading Spinner -->
  <div
    *ngIf="isLoading"
    class="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50"
  >
    <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>

  <div class="flex min-h-screen bg-gray-100">
    <!-- Sidebar -->
    <aside class="w-64 bg-white shadow-lg p-6 flex-shrink-0">
      <div class="pb-6 border-b border-gray-200">
        <div class="text-2xl font-bold text-blue-600 flex items-center gap-2">⚕ MediCare</div>
      </div>
      <ul class="mt-4 space-y-1">
        <li>
          <a
            [routerLink]="['/doctor/dashboard']"
            class="flex items-center gap-2 px-4 py-2 font-medium text-gray-700 bg-blue-50 border-l-4 border-blue-600 rounded-r-md"
            >📊 Dashboard</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/appointments']"
            class="flex items-center gap-2 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:border-l-4 hover:border-blue-600 rounded-r-md"
            >📅 Appointments</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/patients']"
            class="flex items-center gap-2 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:border-l-4 hover:border-blue-600 rounded-r-md"
            >👥 Patients</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/availability']"
            class="flex items-center gap-2 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:border-l-4 hover:border-blue-600 rounded-r-md"
            >⏰ Availability</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/prescriptions']"
            class="flex items-center gap-2 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:border-l-4 hover:border-blue-600 rounded-r-md"
            >💊 Prescriptions</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/medical-records']"
            class="flex items-center gap-2 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:border-l-4 hover:border-blue-600 rounded-r-md"
            >📋 Medical Records</a
          >
        </li>
        <li>
          <a
            [routerLink]="['/doctor/settings']"
            class="flex items-center gap-2 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:border-l-4 hover:border-blue-600 rounded-r-md"
            >⚙️ Settings</a
          >
        </li>

        <li>
          <button
            (click)="logout()"
            class="flex items-center gap-2 px-4 py-2 font-medium text-red-600 hover:bg-gray-100 hover:border-l-4 hover:border-red-600 rounded-l w-full text-left"
          >
            🚪 Logout
          </button>
        </li>
      </ul>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-6 overflow-y-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Welcome back, {{ displayName }}</h1>
          <p class="text-gray-600">{{ displaySpecialty }}</p>
        </div>
        <div class="flex items-center gap-4">
          <!-- Refresh Button -->
          <button
            (click)="refreshData()"
            class="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-xl hover:bg-gray-200 transition"
            title="Refresh Data"
          >
            🔄
          </button>

          <!-- Notification -->
          <div class="relative">
            <button
              (click)="toggleNotifications()"
              class="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-xl hover:bg-gray-200 transition"
            >
              🔔
              <span
                *ngIf="unreadCount > 0"
                class="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white"
                >{{ unreadCount }}</span
              >
            </button>
            <div
              *ngIf="showNotifications"
              class="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-lg max-h-96 overflow-y-auto z-50"
            >
              <div class="flex justify-between items-center p-4 border-b">
                <h3 class="font-semibold text-gray-800">Notifications</h3>
                <button
                  (click)="markAllNotificationsAsRead()"
                  class="text-blue-600 text-sm font-medium"
                >
                  Mark all as read
                </button>
              </div>
              <div class="divide-y divide-gray-200">
                <div
                  *ngFor="let notification of notifications"
                  [class]="notification.read ? 'p-4' : 'p-4 bg-blue-50'"
                >
                  <h4 class="font-semibold text-gray-800">{{ notification.title }}</h4>
                  <p class="text-gray-600 text-sm">{{ notification.message }}</p>
                  <span class="text-gray-400 text-xs">{{
                    notification.createdAt | date : 'short'
                  }}</span>
                  <button
                    *ngIf="!notification.read"
                    (click)="markNotificationAsRead(notification.id)"
                    class="text-blue-600 text-xs mt-2 block"
                  >
                    Mark as read
                  </button>
                </div>
                <div *ngIf="notifications.length === 0" class="p-4 text-center text-gray-500">
                  No notifications
                </div>
              </div>
            </div>
          </div>

          <!-- Profile -->
          <div class="relative">
            <div
              (click)="toggleProfileMenu()"
              class="flex items-center gap-3 bg-gray-100 p-2 rounded-lg cursor-pointer hover:bg-gray-200 transition"
            >
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold flex items-center justify-center"
              >
                {{ getInitials(displayName || 'DR') }}
              </div>
              <div class="text-left">
                <div class="font-semibold text-gray-800 text-sm">
                  {{ displayName || 'Doctor' }}
                </div>
                <div class="text-gray-500 text-xs">
                  {{ displaySpecialty || 'Specialist' }}
                </div>
              </div>
              <span class="text-gray-500 text-xs">▼</span>
            </div>
            <div
              *ngIf="showProfileMenu"
              class="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg z-50"
            >
              <a
                [routerLink]="['/doctor/profile']"
                class="flex items-center gap-2 p-3 hover:bg-gray-100"
                >👤 My Profile</a
              >
              <a
                [routerLink]="['/doctor/settings']"
                class="flex items-center gap-2 p-3 hover:bg-gray-100"
                >⚙️ Settings</a
              >
              <a href="#" class="flex items-center gap-2 p-3 hover:bg-gray-100">💳 Billing</a>
              <a href="#" class="flex items-center gap-2 p-3 hover:bg-gray-100"
                >❓ Help & Support</a
              >
              <button
                (click)="logout()"
                class="flex items-center gap-2 p-3 text-red-600 hover:bg-gray-100 w-full text-left"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition"
        >
          <div>
            <h3 class="text-gray-500 text-sm font-medium mb-1">Today's Appointments</h3>
            <p class="text-2xl font-bold text-gray-800">{{ stats.todayAppointments }}</p>
          </div>
          <div class="text-3xl">📅</div>
        </div>
        <div
          class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition"
        >
          <div>
            <h3 class="text-gray-500 text-sm font-medium mb-1">Total Patients</h3>
            <p class="text-2xl font-bold text-gray-800">{{ stats.totalPatients }}</p>
          </div>
          <div class="text-3xl">👥</div>
        </div>
        <div
          class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition"
        >
          <div>
            <h3 class="text-gray-500 text-sm font-medium mb-1">Pending Reviews</h3>
            <p class="text-2xl font-bold text-gray-800">{{ stats.pendingReviews }}</p>
          </div>
          <div class="text-3xl">📝</div>
        </div>
        <div
          class="bg-white p-6 rounded-xl shadow flex justify-between items-center hover:shadow-lg transition"
        >
          <div>
            <h3 class="text-gray-500 text-sm font-medium mb-1">Avg. Rating</h3>
            <p class="text-2xl font-bold text-gray-800">{{ stats.averageRating }} ⭐</p>
          </div>
          <div class="text-3xl">⭐</div>
        </div>
      </div>

      <!-- Today's Appointments Section -->
      <div class="bg-white p-6 rounded-xl shadow mb-6">
        <div class="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
          <h2 class="text-lg font-semibold text-gray-800">Today's Appointments</h2>
          <button
            [routerLink]="['/doctor/appointments']"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition"
          >
            View All
          </button>
        </div>

        <div *ngIf="todaysAppointments.length === 0" class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">📅</div>
          <p>No appointments scheduled for today</p>
        </div>

        <!-- Appointment Cards -->
        <div
          *ngFor="let appointment of todaysAppointments"
          class="bg-blue-50 border-l-4 border-blue-600 p-4 rounded mb-4"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="font-semibold text-gray-800 text-lg">{{ appointment.patient.name }}</div>
              <div class="text-gray-500 text-sm mt-1">
                🕐 {{ formatTime(appointment.startTime) }} - {{ formatTime(appointment.endTime) }} -
                {{ appointment.reason }}
              </div>
              <div class="text-gray-500 text-sm">
                📞 {{ appointment.patient.contactNumber }} • 📧 {{ appointment.patient.email }}
              </div>
            </div>
            <span
              [class]="getAppointmentStatusClass(appointment.status)"
              class="px-3 py-1 rounded-full text-sm font-semibold"
            >
              {{ getAppointmentStatusText(appointment.status) }}
            </span>
          </div>
          <div class="flex gap-2 mt-4">
            <button
              *ngIf="appointment.status === 'PENDING'"
              (click)="confirmAppointment(appointment.appointmentId)"
              class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
            >
              Accept
            </button>
            <button
              *ngIf="appointment.status === 'PENDING'"
              (click)="rejectAppointment(appointment.appointmentId)"
              class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
            >
              Decline
            </button>
            <button
              *ngIf="appointment.status === 'CONFIRMED'"
              (click)="startConsultation(appointment.appointmentId)"
              class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
            >
              Start Consultation
            </button>
            <button
              (click)="viewRecords(appointment.patient.patientId)"
              class="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
            >
              View Records
            </button>
            <button
              (click)="rescheduleAppointment(appointment.appointmentId)"
              class="bg-blue-200 text-blue-700 px-4 py-2 rounded hover:bg-blue-300 transition"
            >
              Reschedule
            </button>
          </div>
        </div>
      </div>

      <!-- Upcoming Appointments Section -->
      <div class="bg-white p-6 rounded-xl shadow mb-6">
        <div class="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
          <h2 class="text-lg font-semibold text-gray-800">Upcoming Appointments</h2>
          <button
            [routerLink]="['/doctor/appointments']"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition"
          >
            View All
          </button>
        </div>

        <div *ngIf="upcomingAppointments.length === 0" class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">⏰</div>
          <p>No upcoming appointments</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full table-auto border-collapse">
            <thead class="bg-gray-100">
              <tr>
                <th class="text-left px-4 py-2 text-gray-700 font-semibold text-sm">Patient</th>
                <th class="text-left px-4 py-2 text-gray-700 font-semibold text-sm">Date & Time</th>
                <th class="text-left px-4 py-2 text-gray-700 font-semibold text-sm">Reason</th>
                <th class="text-left px-4 py-2 text-gray-700 font-semibold text-sm">Status</th>
                <th class="text-left px-4 py-2 text-gray-700 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr *ngFor="let appointment of upcomingAppointments" class="hover:bg-gray-50">
                <td class="px-4 py-2">
                  <div class="font-semibold text-gray-800">{{ appointment.patient.name }}</div>
                  <div class="text-gray-500 text-sm">{{ appointment.patient.contactNumber }}</div>
                </td>
                <td class="px-4 py-2 text-gray-700">
                  {{ appointment.appointmentDate | date : 'MMM d, y' }}<br />
                  <span class="text-sm"
                    >{{ formatTime(appointment.startTime) }} -
                    {{ formatTime(appointment.endTime) }}</span
                  >
                </td>
                <td class="px-4 py-2 text-gray-700">{{ appointment.reason }}</td>
                <td class="px-4 py-2">
                  <span
                    [class]="getAppointmentStatusClass(appointment.status)"
                    class="px-3 py-1 rounded-full text-sm font-semibold"
                  >
                    {{ getAppointmentStatusText(appointment.status) }}
                  </span>
                </td>
                <td class="px-4 py-2">
                  <div class="flex gap-2">
                    <button
                      (click)="viewRecords(appointment.patient.patientId)"
                      class="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition text-sm"
                    >
                      Records
                    </button>
                    <button
                      (click)="rescheduleAppointment(appointment.appointmentId)"
                      class="bg-blue-200 text-blue-700 px-3 py-1 rounded hover:bg-blue-300 transition text-sm"
                    >
                      Reschedule
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</div>






import { Doctor } from './../../../models/auth-doctor-interface';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorAuthService } from '../../../core/services/doctor-auth.service';
import { DoctorAppointmentService } from '../../../core/services/doctor-appointment.service';
import { DoctorNotificationService } from '../../../core/services/doctor-notification.service';
import { DoctorAvailabilityService } from '../../../core/services/doctor-availability.service';
import { DoctorPatientService } from '../../../core/services/doctor-patient.service';
import { AppointmentResponseDTO } from '../../../models/appointment-interface';
import { AvailabilitySlot } from '../../../models/availabilityslot-interface';
import { NotificationResponseDTO } from '../../../models/notification-interface';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './doctor-dashboard.html',
  styleUrls: ['./doctor-dashboard.css'],
})
export class DoctorDashboard implements OnInit, OnDestroy {
  private doctorAuthService = inject(DoctorAuthService);
  private router = inject(Router);
  private appointmentService = inject(DoctorAppointmentService);
  private notificationService = inject(DoctorNotificationService);
  private availabilityService = inject(DoctorAvailabilityService);
  private patientService = inject(DoctorPatientService);

  // Data
  todaysAppointments: AppointmentResponseDTO[] = [];
  upcomingAppointments: AppointmentResponseDTO[] = [];
  availability: AvailabilitySlot[] = [];
  notifications: NotificationResponseDTO[] = [];

  // Stats
  stats = {
    todayAppointments: 0,
    totalPatients: 0,
    pendingReviews: 0,
    averageRating: 4.8,
  };

  // UI State
  showNotifications = false;
  showProfileMenu = false;
  currentDoctor: any;
  isLoading = true;
  displayName = '';
  displaySpecialty = '';

  ngOnInit() {
    if (!this.doctorAuthService.canAccess('DOCTOR')) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.currentDoctor = this.doctorAuthService.getCurrentDoctor();
    console.log(this.currentDoctor);
    const doc: any = this.currentDoctor?.doctor || this.currentDoctor || {};
    this.displayName = doc.doctorName ?? doc.name ?? doc.username ?? 'Doctor';
    this.displaySpecialty = doc.specialization ?? doc.specialty ?? 'Specialist';
    this.loadDashboardData();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private loadDashboardData() {
    this.isLoading = true;

    // Load all data in parallel
    Promise.all([
      this.loadAppointments(),
      this.loadAvailability(),
      this.loadNotifications(),
      this.loadPatientStats(),
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  private async loadAppointments() {
    try {
      const [todayAppointments, allAppointments] = await Promise.all([
        this.appointmentService.getTodayAppointments().toPromise(),
        this.appointmentService.getAppointmentsForDoctor().toPromise(),
      ]);

      this.todaysAppointments = todayAppointments || [];
      this.upcomingAppointments = (allAppointments || [])
        .filter((apt) => apt.status === 'PENDING' || apt.status === 'CONFIRMED')
        .slice(0, 5);

      this.stats.todayAppointments = this.todaysAppointments.length;
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  }

  private async loadAvailability() {
    try {
      const slots = await this.availabilityService.getScheduledSlots().toPromise();
      this.availability = slots?.slice(0, 5) || [];
    } catch (error) {
      console.error('Error loading availability:', error);
    }
  }

  private async loadNotifications() {
    try {
      const notifications = await this.notificationService.getNotifications().toPromise();
      this.notifications = notifications?.slice(0, 5) || [];
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  private async loadPatientStats() {
    try {
      const patients = await this.patientService.getPatients().toPromise();
      this.stats.totalPatients = patients?.length || 0;
    } catch (error) {
      console.error('Error loading patient stats:', error);
    }
  }

  // Appointment Actions
  confirmAppointment(appointmentId: number) {
    this.appointmentService.confirmAppointment(appointmentId).subscribe({
      next: (updatedAppointment) => {
        this.updateAppointmentStatus(appointmentId, 'CONFIRMED');
        alert('Appointment confirmed successfully!');
      },
      error: (error) => this.handleError('Error confirming appointment', error),
    });
  }

  rejectAppointment(appointmentId: number) {
    const reason = prompt('Please enter reason for rejection:');
    if (reason) {
      this.appointmentService.rejectAppointment(appointmentId, reason).subscribe({
        next: (updatedAppointment) => {
          this.updateAppointmentStatus(appointmentId, 'REJECTED');
          alert('Appointment rejected successfully!');
        },
        error: (error) => this.handleError('Error rejecting appointment', error),
      });
    }
  }

  startConsultation(appointmentId: number) {
    this.router.navigate(['/doctor/consultation', appointmentId]);
  }

  viewRecords(patientId: number) {
    this.router.navigate(['/doctor/medical-records'], { queryParams: { patientId } });
  }

  rescheduleAppointment(appointmentId: number) {
    const newDate = prompt('Enter new date (YYYY-MM-DD):');
    const newTime = prompt('Enter new time (HH:MM):');

    if (newDate && newTime) {
      this.appointmentService.rescheduleAppointment(appointmentId, newDate, newTime).subscribe({
        next: () => {
          alert('Appointment rescheduled successfully!');
          this.loadAppointments();
        },
        error: (error) => this.handleError('Error rescheduling appointment', error),
      });
    }
  }

  private updateAppointmentStatus(appointmentId: number, status: string) {
    const appointment = this.todaysAppointments.find((apt) => apt.appointmentId === appointmentId);
    if (appointment) {
      appointment.status = status;
    }
  }

  // Notification Actions
  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  toggleProfileMenu() {
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  markNotificationAsRead(notificationId: number) {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        const notification = this.notifications.find((n) => n.id === notificationId);
        if (notification) {
          notification.read = true;
        }
      },
      error: (error) => this.handleError('Error marking notification as read', error),
    });
  }

  markAllNotificationsAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach((notification) => (notification.read = true));
        alert('All notifications marked as read!');
      },
      error: (error) => this.handleError('Error marking notifications as read', error),
    });
  }

  // UI Helpers
  getAppointmentStatusClass(status: string): string {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getAppointmentStatusText(status: string): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmed';
      case 'PENDING':
        return 'Pending';
      case 'REJECTED':
        return 'Rejected';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  private handleError(message: string, error: any) {
    console.error(message, error);
    alert(`${message}: ${error.message || 'Unknown error'}`);
  }

  logout() {
    this.doctorAuthService.logout();
    this.router.navigate(['/auth/login']);
  }

  refreshData() {
    this.loadDashboardData();
  }
}






<body class="font-sans bg-gray-100 text-gray-800">
  <!-- Sidebar -->
  <aside class="w-64 bg-white shadow-lg fixed h-full overflow-y-auto">
    <div class="px-6 py-8 border-b border-gray-200">
      <div class="text-2xl font-bold text-blue-600 flex items-center gap-2">⚕ MediCare</div>
    </div>
    <ul class="mt-6 space-y-1">
      <li>
        <a
          [routerLink]="['/doctor/dashboard']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >📊 Dashboard</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/appointments']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >📅 Appointments</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/patients']"
          class="flex items-center gap-2 px-4 py-2 font-medium text-gray-700 bg-blue-50 border-l-4 border-blue-600 rounded-r-md"
          >👥 Patients</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/availability']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >⏰ Availability</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/prescriptions']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >💊 Prescriptions</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/medical-records']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >📋 Medical Records</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/settings']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >⚙️ Settings</a
        >
      </li>
    </ul>
  </aside>

  <main class="main-content">
    <div class="top-bar">
      <div class="top-bar-header">
        <div>
          <h1>My Patients</h1>
          <div class="breadcrumb">
            <a [routerLink]="['/doctor/dashboard']">Dashboard</a> / Patients
          </div>
        </div>
        <div class="view-toggle">
          <button
            class="view-btn"
            [ngClass]="{ active: currentView === 'grid' }"
            (click)="switchView('grid')"
          >
            🔲 Grid
          </button>
          <button
            class="view-btn"
            [ngClass]="{ active: currentView === 'list' }"
            (click)="switchView('list')"
          >
            📋 List
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Search patients by name..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="refreshView()"
          />
        </div>
        <select class="filter-select" [(ngModel)]="genderFilter" (ngModelChange)="refreshView()">
          <option value="all">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <select class="filter-select" [(ngModel)]="ageFilter" (ngModelChange)="refreshView()">
          <option value="all">All Ages</option>
          <option value="0-18">0-18 years</option>
          <option value="19-35">19-35 years</option>
          <option value="36-60">36-60 years</option>
          <option value="60+">60+ years</option>
        </select>
        <select class="filter-select" [(ngModel)]="sortFilter" (ngModelChange)="refreshView()">
          <option value="name">Sort by Name</option>
          <option value="age">Sort by Age</option>
          <option value="visits">Sort by Visits</option>
          <option value="lastVisit">Sort by Last Visit</option>
        </select>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-info">
          <h3>Total Patients</h3>
          <p>{{ totalCount }}</p>
        </div>
        <div class="stat-icon">👥</div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <h3>New This Month</h3>
          <p>{{ newCount }}</p>
        </div>
        <div class="stat-icon">✨</div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <h3>Active Treatments</h3>
          <p>{{ activeCount }}</p>
        </div>
        <div class="stat-icon">💊</div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <h3>Follow-ups Due</h3>
          <p>{{ followupCount }}</p>
        </div>
        <div class="stat-icon">🔔</div>
      </div>
    </div>

    @if (currentView === 'grid') {
    <div class="patients-grid">
      <div *ngIf="filteredPatients.length === 0" class="empty-state" style="grid-column: 1 / -1">
        <div class="empty-icon">👥</div>
        <h3>No patients found</h3>
        <p>Try adjusting your filters or search criteria</p>
      </div>

      @for (patient of filteredPatients; track $index) {
      <div class="patient-card">
        <div class="patient-header">
          <div class="patient-avatar">{{ getInitials(patient.name) }}</div>
          <div class="patient-info">
            <h3>{{ patient.name }}</h3>
            <div class="patient-details">{{ patient.age }} years • {{ patient.gender }}</div>
          </div>
        </div>

        <div class="patient-stats">
          <div class="patient-stat">
            <div class="stat-number">{{ patient.totalVisits }}</div>
            <div class="stat-text">Visits</div>
          </div>
          <div class="patient-stat">
            <div class="stat-number">{{ patient.activeTreatments }}</div>
            <div class="stat-text">Active</div>
          </div>
          <div class="patient-stat">
            <div class="stat-number">{{ getDaysSinceVisit(patient.lastVisit) }}</div>
            <div class="stat-text">Days Ago</div>
          </div>
        </div>

        <div style="color: #718096; font-size: 0.9rem; margin-bottom: 1rem">
          📞 {{ patient.phone }}<br />
          📧 {{ patient.email }}
        </div>

        <div class="patient-actions">
          <button class="btn btn-primary btn-sm" (click)="viewProfile(patient)" style="flex: 1">
            View Profile
          </button>
          <button class="btn btn-success btn-sm" (click)="bookAppointment(patient)">📅</button>
          <button class="btn btn-secondary btn-sm" (click)="sendMessage(patient)">💬</button>
        </div>
      </div>
      }
    </div>
    } @if (currentView === 'list') {
    <div class="patients-table">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Age</th>
            <th>Gender</th>
            <th>Phone</th>
            <th>Last Visit</th>
            <th>Total Visits</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @if (filteredPatients.length === 0) {
          <tr>
            <td colspan="7" style="text-align: center; padding: 3rem">
              <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>No patients found</h3>
                <p>Try adjusting your filters or search criteria</p>
              </div>
            </td>
          </tr>
          } @for (patient of filteredPatients; track $index) {
          <tr>
            <td>
              <div class="patient-cell">
                <div class="patient-avatar-sm">{{ getInitials(patient.name) }}</div>
                <div>
                  <div style="font-weight: 600; color: #2d3748">{{ patient.name }}</div>
                  <div style="font-size: 0.85rem; color: #718096">{{ patient.email }}</div>
                </div>
              </div>
            </td>
            <td>{{ patient.age }}</td>
            <td>{{ patient.gender }}</td>
            <td>{{ patient.phone }}</td>
            <td>{{ formatVisitDate(patient.lastVisit) }}</td>
            <td>{{ patient.totalVisits }}</td>
            <td>
              <div style="display: flex; gap: 0.5rem">
                <button class="btn btn-primary btn-sm" (click)="viewProfile(patient)">View</button>
                <button class="btn btn-success btn-sm" (click)="bookAppointment(patient)">
                  Book
                </button>
              </div>
            </td>
          </tr>
          }
        </tbody>
      </table>
    </div>
    }
  </main>

  <div class="modal" [ngClass]="{ show: showProfileModal }" (click)="closeModal()">
    @if (selectedPatient) {
    <div class="modal-content" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <h2 class="modal-title">Patient Profile</h2>
        <button class="close-btn" (click)="closeModal()">×</button>
      </div>

      <div id="profile-content">
        <div class="profile-section">
          <div class="profile-avatar-lg">{{ getInitials(selectedPatient.name) }}</div>
          <div class="profile-details">
            <h2 class="profile-name">{{ selectedPatient.name }}</h2>
            <div class="profile-meta">
              {{ selectedPatient.age }} years • {{ selectedPatient.gender }} • Patient since
              {{ formatVisitDate(selectedPatient.registrationDate) }}
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 1rem">
              <button class="btn btn-success btn-sm" (click)="bookAppointment(selectedPatient)">
                📅 Book Appointment
              </button>
              <button class="btn btn-primary btn-sm" (click)="viewMedicalRecords(selectedPatient)">
                📋 Medical Records
              </button>
              <button class="btn btn-secondary btn-sm" (click)="sendMessage(selectedPatient)">
                💬 Message
              </button>
            </div>
          </div>
        </div>

        <h3 class="section-title">Contact Information</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Phone</div>
            <div class="info-value">{{ selectedPatient.phone }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email</div>
            <div class="info-value">{{ selectedPatient.email }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Blood Group</div>
            <div class="info-value">{{ selectedPatient.bloodGroup }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Address</div>
            <div class="info-value">{{ selectedPatient.address }}</div>
          </div>
        </div>

        <h3 class="section-title">Health Statistics</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Total Visits</div>
            <div class="info-value">{{ selectedPatient.totalVisits }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Active Treatments</div>
            <div class="info-value">{{ selectedPatient.activeTreatments }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Last Visit</div>
            <div class="info-value">{{ formatVisitDate(selectedPatient.lastVisit) }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Registration Date</div>
            <div class="info-value">{{ formatVisitDate(selectedPatient.registrationDate) }}</div>
          </div>
        </div>

        <h3 class="section-title">Medical History</h3>
        <div class="timeline">
          <div *ngFor="let record of selectedPatient.medicalHistory" class="timeline-item">
            <div class="timeline-content">
              <div class="timeline-date">
                {{ formatVisitDate(record.date) }} • {{ record.type }}
              </div>
              <div class="timeline-text">{{ record.notes }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    }
  </div>
</body>







import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Patient interface
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  bloodGroup: string;
  address: string;
  totalVisits: number;
  activeTreatments: number;
  lastVisit: string;
  registrationDate: string;
  medicalHistory: Array<{
    date: string;
    type: string;
    notes: string;
  }>;
}

@Component({
  selector: 'app-patient-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './patient-management.html',
  styleUrl: './patient-management.css',
})
export class PatientManagement implements OnInit {
  // View state
  currentView: 'grid' | 'list' = 'grid';
  showProfileModal = false;
  selectedPatient: Patient | null = null;

  // Filter state
  searchTerm = '';
  genderFilter = 'all';
  ageFilter = 'all';
  sortFilter = 'name';

  // Statistics
  totalCount = 0;
  newCount = 0;
  activeCount = 0;
  followupCount = 0;

  // Sample data - replace with actual service calls
  patients: Patient[] = [
    {
      id: '1',
      name: 'John Doe',
      age: 35,
      gender: 'Male',
      phone: '+1-555-0123',
      email: 'john.doe@email.com',
      bloodGroup: 'O+',
      address: '123 Main St, City, State',
      totalVisits: 5,
      activeTreatments: 2,
      lastVisit: '2024-01-15',
      registrationDate: '2023-06-01',
      medicalHistory: [
        { date: '2024-01-15', type: 'Checkup', notes: 'Regular checkup, all vitals normal' },
        { date: '2023-12-10', type: 'Follow-up', notes: 'Follow-up for medication' }
      ]
    },
    {
      id: '2',
      name: 'Jane Smith',
      age: 28,
      gender: 'Female',
      phone: '+1-555-0124',
      email: 'jane.smith@email.com',
      bloodGroup: 'A+',
      address: '456 Oak Ave, City, State',
      totalVisits: 3,
      activeTreatments: 1,
      lastVisit: '2024-01-10',
      registrationDate: '2023-08-15',
      medicalHistory: [
        { date: '2024-01-10', type: 'Consultation', notes: 'Initial consultation for symptoms' }
      ]
    }
  ];

  get filteredPatients(): Patient[] {
    let filtered = [...this.patients];

    // Search filter
    if (this.searchTerm) {
      filtered = filtered.filter(patient =>
        patient.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Gender filter
    if (this.genderFilter !== 'all') {
      filtered = filtered.filter(patient => patient.gender === this.genderFilter);
    }

    // Age filter
    if (this.ageFilter !== 'all') {
      filtered = filtered.filter(patient => {
        const age = patient.age;
        switch (this.ageFilter) {
          case '0-18': return age >= 0 && age <= 18;
          case '19-35': return age >= 19 && age <= 35;
          case '36-60': return age >= 36 && age <= 60;
          case '60+': return age > 60;
          default: return true;
        }
      });
    }

    // Sort filter
    filtered.sort((a, b) => {
      switch (this.sortFilter) {
        case 'name': return a.name.localeCompare(b.name);
        case 'age': return a.age - b.age;
        case 'visits': return b.totalVisits - a.totalVisits;
        case 'lastVisit': return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
        default: return 0;
      }
    });

    return filtered;
  }

  ngOnInit() {
    this.calculateStats();
  }

  calculateStats() {
    this.totalCount = this.patients.length;
    this.newCount = this.patients.filter(p => {
      const regDate = new Date(p.registrationDate);
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return regDate >= monthAgo;
    }).length;
    this.activeCount = this.patients.reduce((sum, p) => sum + p.activeTreatments, 0);
    this.followupCount = this.patients.filter(p => {
      const lastVisit = new Date(p.lastVisit);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 30;
    }).length;
  }

  switchView(view: 'grid' | 'list') {
    this.currentView = view;
  }

  refreshView() {
    // This method is called when filters change
    // The filteredPatients getter will automatically update
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getDaysSinceVisit(lastVisit: string): number {
    const visitDate = new Date(lastVisit);
    const now = new Date();
    return Math.floor((now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  formatVisitDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  viewProfile(patient: Patient) {
    this.selectedPatient = patient;
    this.showProfileModal = true;
  }

  closeModal() {
    this.showProfileModal = false;
    this.selectedPatient = null;
  }

  bookAppointment(patient: Patient) {
    // Implement booking logic
    console.log('Booking appointment for:', patient.name);
  }

  sendMessage(patient: Patient) {
    // Implement messaging logic
    console.log('Sending message to:', patient.name);
  }

  viewMedicalRecords(patient: Patient) {
    // Implement medical records view
    console.log('Viewing medical records for:', patient.name);
  }
}






<body class="font-sans bg-gray-100 text-gray-800">
  <aside class="w-64 bg-white shadow-lg fixed h-full overflow-y-auto">
    <div class="px-6 py-8 border-b border-gray-200">
      <div class="text-2xl font-bold text-blue-600 flex items-center gap-2">⚕ MediCare</div>
    </div>
    <ul class="mt-6 space-y-1">
      <li>
        <a
          [routerLink]="['/doctor/patients']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >👥 Patients</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/prescriptions']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-blue-600 bg-blue-50 border-l-4 border-blue-600 transition"
          >💊 Prescriptions</a
        >
      </li>
      <li>
        <a
          [routerLink]="['/doctor/availability']"
          class="flex items-center gap-3 px-6 py-3 font-medium text-gray-600 hover:bg-gray-100 hover:text-blue-600 hover:border-l-4 hover:border-blue-600 transition"
          >⏰ Availability</a
        >
      </li>
    </ul>
  </aside>

  <main class="ml-64 p-8 min-h-screen">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-800">Manage Prescriptions</h1>
      <div class="text-sm text-gray-500 mt-1">
        <a [routerLink]="['/doctor/dashboard']" class="hover:underline">Dashboard</a> /
        Prescriptions
      </div>
    </div>

    <div class="flex border-b border-gray-200 mb-6">
      <button
        class="px-6 py-3 text-lg font-medium transition duration-150 ease-in-out"
        [ngClass]="{
          'border-b-4 border-blue-600 text-blue-600': currentTab === 'history',
          'text-gray-500 hover:text-gray-700': currentTab !== 'history'
        }"
        (click)="switchTab('history')"
      >
        History
      </button>
      <button
        class="px-6 py-3 text-lg font-medium transition duration-150 ease-in-out"
        [ngClass]="{
          'border-b-4 border-blue-600 text-blue-600': currentTab === 'create',
          'text-gray-500 hover:text-gray-700': currentTab !== 'create'
        }"
        (click)="switchTab('create')"
      >
        Create New
      </button>
    </div>

    <div *ngIf="currentTab === 'history'" class="bg-white shadow-xl rounded-lg p-6">
      <h2 class="text-xl font-semibold mb-4 border-b pb-2">Recent Prescriptions</h2>

      <div *ngIf="prescriptionHistory.length === 0" class="text-center py-10 text-gray-500">
        <div class="text-6xl mb-3">📄</div>
        <h3 class="text-lg font-semibold">No prescriptions found.</h3>
        <p>Start a new prescription using the 'Create New' tab.</p>
      </div>

      <div class="overflow-x-auto">
        <table *ngIf="prescriptionHistory.length > 0" class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Patient
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Date
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Meds Count
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let p of prescriptionHistory">
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">{{ p.patientName }}</div>
                <div class="text-sm text-gray-500">{{ p.diagnosis }}</div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ p.date | date }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ p.medications.length }}
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <span
                  [ngClass]="{
                    'bg-green-100 text-green-800': p.status === 'Sent',
                    'bg-yellow-100 text-yellow-800': p.status === 'Draft'
                  }"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ p.status }}
                </span>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  (click)="viewPrescription(p)"
                  class="text-blue-600 hover:text-blue-900 mr-3"
                >
                  View
                </button>
                <button
                  *ngIf="p.status === 'Draft'"
                  (click)="deletePrescription(p.id)"
                  class="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div *ngIf="currentTab === 'create'" class="bg-white shadow-xl rounded-lg p-6">
      <h2 class="text-xl font-semibold mb-6 border-b pb-2">
        {{ isEditMode ? 'Edit Prescription' : 'Create New Prescription' }}
      </h2>

      <form (ngSubmit)="savePrescription()">
        <div class="mb-5">
          <label for="patient" class="block text-sm font-medium text-gray-700 mb-1"
            >Select Patient</label
          >
          <select
            id="patient"
            [(ngModel)]="newPrescription.patientId"
            name="patient"
            required
            class="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="" disabled>Search or Select a Patient</option>
            <option *ngFor="let p of patientList" [ngValue]="p.id">
              {{ p.name }} ({{ p.age }} years)
            </option>
          </select>
        </div>

        <div class="mb-5">
          <label for="diagnosis" class="block text-sm font-medium text-gray-700 mb-1"
            >Diagnosis / Notes</label
          >
          <textarea
            id="diagnosis"
            [(ngModel)]="newPrescription.diagnosis"
            name="diagnosis"
            rows="2"
            class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 sm:text-sm"
            placeholder="e.g., Acute Bronchitis, follow-up in 7 days"
          ></textarea>
        </div>

        <h3 class="text-lg font-semibold mt-8 mb-4 border-b pb-2">Medications</h3>

        <div
          *ngFor="let med of newPrescription.medications; let i = index"
          class="border p-4 rounded-lg mb-4 bg-gray-50 grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
        >
          <div class="md:col-span-4">
            <label class="block text-sm font-medium text-gray-700">Medication Name</label>
            <input
              type="text"
              [(ngModel)]="med.name"
              [name]="'medName' + i"
              required
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 sm:text-sm"
              placeholder="e.g., Amoxicillin 500mg"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700">Dosage</label>
            <input
              type="text"
              [(ngModel)]="med.dosage"
              [name]="'medDose' + i"
              required
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 sm:text-sm"
              placeholder="e.g., 1 tablet"
            />
          </div>

          <div class="md:col-span-3">
            <label class="block text-sm font-medium text-gray-700">Frequency / Instructions</label>
            <input
              type="text"
              [(ngModel)]="med.instructions"
              [name]="'medInstruct' + i"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 sm:text-sm"
              placeholder="e.g., twice daily after meals"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700">Duration (Days)</label>
            <input
              type="number"
              [(ngModel)]="med.durationDays"
              [name]="'medDuration' + i"
              class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 sm:text-sm"
              min="1"
            />
          </div>

          <div class="md:col-span-1 flex justify-end">
            <button
              type="button"
              (click)="removeMedication(i)"
              class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm text-lg"
            >
              &times;
            </button>
          </div>
        </div>

        <button
          type="button"
          (click)="addMedication()"
          class="mt-2 px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 hover:bg-blue-50 transition duration-150"
        >
          + Add Medication
        </button>

        <div class="mt-8 pt-4 border-t flex justify-end space-x-3">
          <button
            type="button"
            (click)="saveDraft()"
            class="px-6 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-150"
          >
            Save Draft
          </button>
          <button
            type="submit"
            class="px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
          >
            {{ isEditMode ? 'Update & Send' : 'Send Prescription' }}
          </button>
        </div>
      </form>
    </div>
  </main>
</body>






// doctor-prescriptions.component.ts (New Component)

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Prescription, Medication } from '../../../models/prescription-interface';
import { Patient } from '../../../models/patient-interface';
import { DoctorPrescriptionService } from '../../../core/services/doctor-prescription.service';

@Component({
  selector: 'app-doctor-prescriptions',
  templateUrl: './prescription-management.html',
  imports: [CommonModule, FormsModule, RouterLink],
})
export class DoctorPrescriptions implements OnInit {
  currentTab: 'history' | 'create' = 'history';
  prescriptionHistory: Prescription[] = [];
  patientList: Patient[] = [];
  isEditMode: boolean = false;

  newPrescription: Partial<Prescription> = {
    patientId: null as any,
    diagnosis: '',
    medications: [{ name: '', dosage: '', instructions: '', durationDays: 7 }],
    status: 'Draft',
  };

  constructor(private prescriptionService: DoctorPrescriptionService) {}

  ngOnInit(): void {
    this.fetchPrescriptionHistory();
    this.fetchPatientList();
  }

  // --- Data Fetching ---

  fetchPrescriptionHistory(): void {
    this.prescriptionService.getPrescriptionHistory().subscribe({
      next: (data) => {
        this.prescriptionHistory = data;
      },
      error: (err) => {
        console.error('Failed to fetch prescription history:', err);
        // Fallback for development:
        this.prescriptionHistory = [
          {
            id: 101,
            patientId: 1,
            patientName: 'Alice Johnson',
            date: new Date('2025-10-10'),
            diagnosis: 'Viral Infection',
            medications: [
              {
                name: 'Paracetamol',
                dosage: '500mg',
                instructions: 'Twice daily',
                durationDays: 5,
              },
            ],
            status: 'Sent',
          },
          {
            id: 102,
            patientId: 2,
            patientName: 'Bob Smith',
            date: new Date('2025-10-14'),
            diagnosis: 'Headache',
            medications: [
              { name: 'Ibuprofen', dosage: '400mg', instructions: 'As needed', durationDays: 3 },
            ],
            status: 'Draft',
          },
        ];
      },
    });
  }

  fetchPatientList(): void {
    this.prescriptionService.getPatientList().subscribe({
      next: (data: Patient[]) => {
        this.patientList = data;
      },
      error: (err) => {
        console.error('Failed to fetch patient list:', err);
        // Fallback for development:
        this.patientList = [
          {
            patientId: 1,
            name: 'Alice Johnson',
            email: 'alice@email.com',
            contactNumber: '+1-555-0101',
            address: '123 Main St',
            gender: 'Female',
            dateOfBirth: '1989-03-15',
            bloodGroup: 'O+',
          },
          {
            patientId: 2,
            name: 'Bob Smith',
            email: 'bob@email.com',
            contactNumber: '+1-555-0102',
            address: '456 High St',
            gender: 'Male',
            dateOfBirth: '1985-07-22',
            bloodGroup: 'A+',
          },
          {
            patientId: 3,
            name: 'Charlie Doe',
            email: 'charlie@email.com',
            contactNumber: '+1-555-0103',
            address: '789 Lake Rd',
            gender: 'Male',
            dateOfBirth: '1992-11-05',
            bloodGroup: 'B+',
          },
        ];
      },
    });
  }

  // --- UI Logic ---

  switchTab(tab: 'history' | 'create'): void {
    this.currentTab = tab;
    if (tab === 'create' && !this.isEditMode) {
      this.resetForm();
    }
  }

  // --- Medication List Management ---

  addMedication(): void {
    this.newPrescription.medications!.push({
      name: '',
      dosage: '',
      instructions: '',
      durationDays: 7,
    });
  }

  removeMedication(index: number): void {
    this.newPrescription.medications!.splice(index, 1);
  }

  // --- Form Submission Logic ---

  saveDraft(): void {
    this.newPrescription.status = 'Draft';
    this.savePrescription(true);
  }

  savePrescription(isDraft: boolean = false): void {
    // Basic validation
    if (!this.newPrescription.patientId || !this.newPrescription.medications?.length) {
      alert('Please select a patient and add at least one medication.');
      return;
    }

    // Set final status if not saving as draft
    if (!isDraft) {
      this.newPrescription.status = 'Sent';
    }

    // Assign patient name for display/backend use
    const patient = this.patientList.find((p) => p.patientId === this.newPrescription.patientId);
    this.newPrescription.patientName = patient ? patient.name : 'Unknown Patient';
    this.newPrescription.date = new Date(); // Set current date

    if (this.isEditMode && this.newPrescription.id) {
      // Update existing prescription
      this.prescriptionService.updatePrescription(this.newPrescription as Prescription).subscribe({
        next: () => {
          alert(`Prescription updated and ${this.newPrescription.status} successfully!`);
          this.handleSuccessfulSubmission();
        },
        error: (err) => console.error('Update failed:', err),
      });
    } else {
      // Create new prescription
      this.prescriptionService.createPrescription(this.newPrescription).subscribe({
        next: () => {
          alert(`Prescription ${this.newPrescription.status} successfully!`);
          this.handleSuccessfulSubmission();
        },
        error: (err) => console.error('Creation failed:', err),
      });
    }
  }

  private handleSuccessfulSubmission(): void {
    this.fetchPrescriptionHistory();
    this.resetForm();
    this.switchTab('history');
  }

  viewPrescription(p: Prescription): void {
    // Logic to open a modal or navigate to a detailed view for printing/review
    alert(`Viewing Prescription # ${p.id} for ${p.patientName}.`);
  }

  deletePrescription(id: number): void {
    if (confirm('Are you sure you want to delete this draft prescription?')) {
      this.prescriptionService.deletePrescription(id).subscribe({
        next: () => {
          this.prescriptionHistory = this.prescriptionHistory.filter((p) => p.id !== id);
          alert('Draft deleted successfully.');
        },
        error: (err) => console.error('Delete failed:', err),
      });
    }
  }

  editPrescription(p: Prescription): void {
    this.newPrescription = { ...p };
    this.isEditMode = true;
    this.switchTab('create');
  }

  resetForm(): void {
    this.newPrescription = {
      patientId: null as any,
      diagnosis: '',
      medications: [{ name: '', dosage: '', instructions: '', durationDays: 7 }],
      status: 'Draft',
    };
    this.isEditMode = false;
  }
}
