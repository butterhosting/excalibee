import { Yexception } from "yexception";

export class FolderError {
  public static readonly NAME = "FolderError";

  public static readonly not_found = Yexception.field<{ id: string }>();
  public static readonly parent_not_found = Yexception.field<{ parentId: string }>();
  public static readonly circular_move = Yexception.field<{ id: string; parentId: string }>();
  public static readonly name_taken = Yexception.field<{ name: string }>();

  static {
    Yexception.initialize(this);
  }
}
