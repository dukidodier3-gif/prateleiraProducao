export interface WeldingItem {
  id?: number;
  code: string;
  orderNumber: string;
  orderQuantity: number;
  sentAt: string;
}

export interface DatabaseWeldingItem extends WeldingItem {
  id: number;
}
