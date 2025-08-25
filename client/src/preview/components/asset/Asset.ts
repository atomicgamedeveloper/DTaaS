import { BackendInterface } from 'model/backend/interfaces/utilityInterfaces';

export interface Asset {
  name: string;
  path: string;
  type: string;
  isPrivate: boolean;
  backendInstance?: BackendInterface;
  fullDescription?: string;
}
