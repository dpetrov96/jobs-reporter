import { isContractEmploymentType } from "@jobs-reporter/shared";

export function EmploymentTypeBadge({ value }: { value: string }) {
  const isContract = isContractEmploymentType(value);

  return (
    <span
      className={
        isContract
          ? "rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"
          : "rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600"
      }
    >
      {value}
    </span>
  );
}
