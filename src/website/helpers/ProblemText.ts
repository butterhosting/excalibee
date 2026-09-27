import { DrawingError } from "@/errors/DrawingError";
import { FolderError } from "@/errors/FolderError";
import { ProblemDetails } from "@/models/internal/ProblemDetails";

export namespace ProblemText {
  export function of(error: unknown): string {
    if (ProblemDetails.isInstance(error)) {
      const name = error.details?.name;
      if (DrawingError.name_taken.matches(error)) {
        return `There is already a drawing named “${name}” here.`;
      }
      if (FolderError.name_taken.matches(error)) {
        return `There is already a folder named “${name}” here.`;
      }
      if (FolderError.circular_move.matches(error)) {
        return "A folder cannot be moved into itself.";
      }
      return error.problem;
    }
    return error instanceof Error ? error.message : JSON.stringify(error);
  }
}
