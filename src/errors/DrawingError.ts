import { Yexception } from "yexception";

export class DrawingError {
  public static readonly NAME = "DrawingError";

  public static readonly not_found = Yexception.field<{ id: string }>();
  public static readonly folder_not_found = Yexception.field<{ folderId: string }>();
  public static readonly name_taken = Yexception.field<{ name: string }>();
  public static readonly no_thumbnail = Yexception.field<{ id: string }>();
  public static readonly invalid_thumbnail = Yexception.field();

  static {
    Yexception.initialize(this);
  }
}
