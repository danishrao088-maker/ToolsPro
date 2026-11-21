// "Save nahi hui tabdeeliyan hain" ka ek chhota nishan, taake menu ke links dabane se lamba article na ud jaye.
// (Browser band/refresh par chetavni editor khud lagata hai; yahan sirf app ke andar ke links ke liye hai.)
let hasUnsavedChanges = false;

export function setUnsavedChanges(value: boolean): void {
  hasUnsavedChanges = value;
}

export function confirmLeave(): boolean {
  return !hasUnsavedChanges || window.confirm("You have unsaved changes. Leave this page without saving?");
}
