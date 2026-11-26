export function passwordIssues(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 10) issues.push("at least 10 characters");
  if (!/[A-Za-z]/.test(pw)) issues.push("a letter");
  if (!/\d/.test(pw)) issues.push("a number");
  if (pw.length > 72) issues.push("72 characters or fewer");
  return issues;
}
