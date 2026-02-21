export type ProjectStatus = '見積' | '発注' | '施工' | '請求' | '入金' | '支払い' | 'キャンセル案件';

export interface ProjectFile {
  id: string;
  name: string;
  url: string;
}

export interface ConstructionStaff {
  id: string;
  name: string;
  zipCode: string;
  address: string;
  tel: string;
  email: string;
}

export interface BillingItem {
  id: string;
  name: string;
  amount: number;
  expectedPaymentDate: string;
  isBilled: boolean;
  isPaid: boolean;
}

export interface OutboundPayment {
  id: string;
  recipient: string;
  amount: number;
  expectedDate: string;
  isPaid: boolean;
}

export interface Project {
  id: string;
  status: ProjectStatus;
  
  // Schedule Dates
  estimateDate: string; // 見積提出予定日
  orderDate?: string;    // 発注予定日
  constructionStartDate?: string; // 着工予定日
  completionDate: string; // 完了予定日
  
  title: string;
  propertyName?: string;
  
  // Remarks
  estimateRemarks?: string;
  orderRemarks?: string;
  constructionRemarks?: string;
  billingRemarks?: string;
  paymentRemarks?: string;
  outboundPaymentRemarks?: string;

  // Customer Info
  customerName: string;
  customerZipCode: string;
  customerAddress: string;
  customerTel: string;
  customerEmail: string;

  // Multiple items
  constructionStaff: ConstructionStaff[];
  billingItems: BillingItem[];
  outboundPayments: OutboundPayment[];
  
  files?: ProjectFile[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  password?: string;
  remarks?: string;
  isActive: boolean;
}
