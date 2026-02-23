function isEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function isBinaPrintEnabled(): boolean {
  return isEnabled(process.env.ENABLE_BINA_PRINT) || isEnabled(process.env.NEXT_PUBLIC_ENABLE_BINA_PRINT);
}
