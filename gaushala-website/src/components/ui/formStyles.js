// Shared Tailwind classes so every admin form field looks consistent
// without repeating the same long className string everywhere.
export const labelClass = "mb-1.5 block text-sm font-medium text-brown-700";
export const inputClass =
  "w-full rounded-xl border border-brown-200 bg-white px-3.5 py-2.5 text-sm text-brown-800 placeholder:text-brown-300 transition-colors focus:border-pasture-400";
export const textareaClass = `${inputClass} resize-y`;
export const selectClass = `${inputClass} appearance-none`;
