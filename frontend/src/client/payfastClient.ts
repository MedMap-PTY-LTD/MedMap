// src/client/payfastClient.ts

export interface BookingRequest {
  doctorId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  doctorName: string;
  doctorSpecialization: string;
  appointmentDate: string;
  appointmentTime: string;
  endTime: string;
  consultationFee: number;
  notes?: string;
}

export async function createBookingAndPay(booking: BookingRequest) {
  // 1. Call your backend to create booking + get PayFast form
  const response = await fetch('/api/bookings/create-with-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  // 2. PayFast returns formHtml — inject and auto-submit
  //    This redirects the user to PayFast's hosted checkout
  if (data.formHtml) {
    const container = document.createElement('div');
    container.innerHTML = data.formHtml;
    document.body.appendChild(container);
    // The form auto-submits via its embedded <script>
  } else if (data.paymentUrl) {
    // Fallback: direct redirect
    window.location.href = data.paymentUrl;
  }
}