import { AppError } from "@/lib/errors";
import type { ProcessingStatus } from "@/lib/types";

const allowedTransitions: Record<ProcessingStatus, ProcessingStatus[]> = {
  uploaded: ["extracting", "failed"],
  extracting: ["extracted", "failed"],
  extracted: ["extracting", "failed"],
  failed: ["extracting"],
};

export function assertStatusTransition(current: ProcessingStatus, next: ProcessingStatus) {
  if (!allowedTransitions[current].includes(next)) {
    throw new AppError(409, "invalid_status_transition", `Cannot transition source from ${current} to ${next}`);
  }
}
