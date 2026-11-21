// The alert shown at the top of an options form.
export interface AlertProps {
  show: boolean;
  message: string;
  variant: "" | "success" | "danger";
}

export const AlertProps = {
  none(): AlertProps {
    return { show: false, message: "", variant: "" };
  },

  success(message: string): AlertProps {
    return { show: true, message, variant: "success" };
  },

  error(message: string): AlertProps {
    return { show: true, message, variant: "danger" };
  },
};
