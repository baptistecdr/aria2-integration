export default class AlertProps {
  constructor(
    public readonly show: boolean = false,
    public readonly message: string = "",
    public readonly variant: string = "",
  ) {}

  static success(message: string): AlertProps {
    return new AlertProps(true, message, "success");
  }

  static error(message: string): AlertProps {
    return new AlertProps(true, message, "danger");
  }
}
