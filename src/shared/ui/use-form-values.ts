import { useState } from "react";

// The values of a form as a single object, with a setter per field.
export function useFormValues<Values extends object>(initialValues: () => Values) {
  const [values, setValues] = useState(initialValues);
  const set = <Field extends keyof Values>(field: Field, value: Values[Field]) => setValues((previous) => ({ ...previous, [field]: value }));
  return [values, set] as const;
}
