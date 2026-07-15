import { MemoryRepository } from "@/lib/repository/memory";
import type { OperatorRepository } from "@/lib/repository/interface";
import { SupabaseRepository } from "@/lib/repository/supabase";

let memoryRepository: MemoryRepository | null = null;

export function getRepository(): OperatorRepository {
  if (process.env.OPERATORLAYER_DATA_BACKEND === "memory") {
    if (!memoryRepository) {
      memoryRepository = new MemoryRepository();
    }
    return memoryRepository;
  }

  return new SupabaseRepository();
}
