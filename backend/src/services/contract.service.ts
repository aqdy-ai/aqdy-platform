import { Contract, IContract, ContractZodSchema } from '../models/contract.model.js';
import { logger } from '../utils/logger.js';

export class ContractService {
  // حفظ عقد جديد
  async saveContract(data: {
    filename: string;
    language: 'ar' | 'en';
    text: string;
    userId: string;
    fileSize: number;
  }): Promise<IContract> {
    const validated = ContractZodSchema.parse(data);
    const contract = new Contract(validated);
    await contract.save();
    logger.info(`✅ Contract saved: ${contract._id}`);
    return contract;
  }

  // جيب عقد بالـ ID
  async getContractById(contractId: string): Promise<IContract | null> {
    return await Contract.findById(contractId);
  }

  // جيب كل عقود الـ user
  async getContractsByUser(userId: string): Promise<IContract[]> {
    return await Contract.find({ userId }).sort({ uploadedAt: -1 });
  }

  // تحديث عقد
  async updateContract(
    contractId: string,
    data: Partial<IContract>
  ): Promise<IContract | null> {
    return await Contract.findByIdAndUpdate(contractId, data,{ returnDocument: 'after' } );
  }

  // مسح عقد
  async deleteContract(contractId: string): Promise<void> {
    await Contract.findByIdAndDelete(contractId);
    logger.info(`🗑️ Contract deleted: ${contractId}`);
  }
}

export const contractService = new ContractService();