export interface Part {
  id: string;
  code: string;
  componentType: "PLASMA" | "TUBO" | "COMPONENTES" | "PONTEIRA" | "REFORÇO";
  orderNumber: string;
  orderQuantity: number;      // Quantidade da OP
  itemQuantity: number;       // Quantidade do item
  location: string;
  status: "INCOMPLETO" | "COMPLETO";
  createdAt: string;
}

export interface DatabasePart extends Omit<Part, 'id'> {
  id?: number;
}

export interface CreatePartRequest extends Omit<Part, 'id' | 'createdAt'> {}

export interface UpdatePartRequest extends Omit<Part, 'id' | 'createdAt'> {}

export interface PartResponse {
  success: boolean;
  data?: Part | Part[];
  message?: string;
  error?: string;
}