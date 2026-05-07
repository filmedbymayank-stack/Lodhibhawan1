export interface ReservationData {
  id: string;
  name: string;
  phone: string;
  guests: string;
  datetime: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Reached' | 'DidntReach' | 'Completed' | 'Ongoing' | 'SuggestedNewTime';
  tableNo?: string;
  suggestedDatetime?: string;
  rejectReason?: string;
  createdAt: string;
  paymentDoneAt?: string;
}
