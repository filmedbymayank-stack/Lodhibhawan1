export interface ReservationData {
  id: string;
  name: string;
  phone: string;
  guests: string;
  datetime: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  tableNo?: string;
  createdAt: string;
}
